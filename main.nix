{
  config,
  pkgs,
  lib,
  ...
}:

let
  adminPanelPort = 3039;
  unstable =
    import
      (builtins.fetchTarball {
        url = "https://github.com/NixOS/nixpkgs/archive/nixos-unstable.tar.gz";
      })
      {
        config.allowUnfree = true;
      };
in
{
  imports = [
    # ./caddy.nix
    # ./jelly-fin.nix
    # ./copyparty.nix
  ];

  programs.nix-ld.enable = true;
  programs.nix-ld.libraries = with pkgs; [
    stdenv.cc.cc
    zlib
    openssl
  ];

  environment.systemPackages = with pkgs; [
    wget
    neovim
    git
    gh
    uv

    jellyfin
    jellyfin-web
    jellyfin-ffmpeg

    gcc
    libgcc
    gnumake

    unzip
    exiftool

    wireguard-tools

    unstable.bun

  ];

  users.mutableUsers = false;

  users.users.root = {
    isSystemUser = true;
    hashedPasswordFile = "/etc/password-files/media-user.pwd";
  };

  users.users.media = {
    isNormalUser = true;
    description = "media";
    extraGroups = [
      "wheel"
      "networkmanager"
      "video"
      "render"
    ];
    hashedPasswordFile = "/etc/password-files/media-user.pwd";

    openssh = {
      authorizedKeys.keys = [
        "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPILB1e574eEu9S0gC3BF5bPl2ILUIRo56YxFsBQGGDq ahse03@gmail.com"
      ];
    };
  };

  networking = {
    networkmanager.enable = true;
    hostName = "mediabox";

    firewall = {
      allowedTCPPorts = [
        80
        443
        22
        445
        adminPanelPort
      ];
      allowedUDPPorts = [
        443
        5353
      ];
      trustedInterfaces = [ "wg0" ];

    };

    wireguard.interfaces.wg0 = {
      ips = [ "10.100.0.2/24" ];

      privateKeyFile = "/etc/wireguard/private.key";

      peers = [
        {
          publicKey = "HhQuvJiUmoL2Oz939m51R80Zah2ua6KNHfm/j0VxOxg=";
          endpoint = "147.93.127.164:51820";
          allowedIPs = [ "10.100.0.1/32" ];

          persistentKeepalive = 25;
        }
      ];
    };
  };

  services.openssh.enable = true;

  services.openssh.settings = {
    PasswordAuthentication = true;
    AllowUsers = [
      "root"
      "media"
    ];
    PermitRootLogin = "yes";
  };

  # enable .local domain
  services.avahi = {
    enable = true;
    nssmdns4 = true;
    publish = {
      enable = true;
      addresses = true;
      workstation = true;
    };
  };

  # enable network NAS
  services.samba = {
    enable = true;
    openFirewall = false;

    settings = {
      global = {
        "workgroup" = "WORKGROUP";
        "server string" = "mediabox";
        "security" = "user";

        "server min protocol" = "SMB2";
        "server max protocol" = "SMB3";

        "use sendfile" = "yes";
        "aio read size" = "1";
        "aio write size" = "1";

        "disable netbios" = "yes";
        "smb ports" = "445";
      };

      "media" = {
        path = "/home/media";
        browseable = "yes";
        writeable = "yes";

        "valid users" = "media";
        "force user" = "media";
        "force group" = "users";

        "create mask" = "0664";
        "directory mask" = "0775";

      };
    };
  };

  services.caddy = {
    enable = true;
    globalConfig = ''
      servers {
        protocols h1 h2 h3
      }
    '';

    virtualHosts."server.ahse.no" = {
      extraConfig = ''
        reverse_proxy localhost:8096

        header {
          Strict-Transport-Security "max-age=31536000; IncludeSubDomains"
        }
      '';
    };
    virtualHosts."jellyfin.homelab.ahse.no" = {
      extraConfig = ''
        reverse_proxy localhost:8096

        header {
          Strict-Transport-Security "max-age=31536000; IncludeSubDomains"
        }
      '';
    };
    virtualHosts."admin.homelab.ahse.no" = {
      extraConfig = ''
        reverse_proxy localhost:${toString adminPanelPort}

        header {
          Strict-Transport-Security "max-age=31536000; IncludeSubDomains"
        }
      '';
    };
    virtualHosts."cp.homelab.ahse.no" = {
      extraConfig = ''
        request_body {
          max_size 1024MB
        }

        reverse_proxy localhost:3923 {
          flush_interval -1
          transport http {
            read_timeout 610m
            write_timeout 610m
            response_header_timeout 610m
          }
        }
      '';
    };
  };

  /*
    let copyparty-src = builtins.fetchGit {
        url = "https://github.com/9001/copyparty.git";
        rev = "hovudstraum";
      }; in

      services.copyparty = {
        enable = true;
        settings = {
          accounts = {
            aleks.passwordFile = "/etc/password-files/media-user.pwd";
          };
          volumes = {
            "/" = {
    	  path = "/home/media/";
    	  access = {
    	    r = "*";
    	    rw = [ "aleks" ];
    	  };
    	};
          };
        };
      };
  */

  services.jellyfin = {
    enable = true;
    openFirewall = true;
    user = "media";
  };

  systemd.services.jellyfin.environment.LIBVA_DRIVER_NAME = "iHD";
  environment.sessionVariables = {
    LIBVA_DRIVER_NAME = "iHD";
    LD_LIBRARY_PATH = "${pkgs.stdenv.cc.cc.lib}/lib";
  };

  hardware.graphics = {
    enable = true;
    extraPackages = with pkgs; [
      intel-ocl # Generic OpenCL support

      intel-media-driver

      intel-compute-runtime

      vpl-gpu-rt

    ];
  };

  systemd.services.admin-panel-build = {
    description = "Admin panel build";
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      User = "media";
      WorkingDirectory = "/home/media/homelab/admin-panel";
      ExecStart = "${unstable.bun}/bin/bun run ci-build";
      ExecStartPost = "+${pkgs.systemd}/bin/systemctl try-restart admin-panel.service";
    };
  };

  systemd.paths.admin-panel-build = {
    wantedBy = [ "multi-user.target" ];
    pathConfig = {
      PathChanged = [
        "/home/media/homelab/admin-panel/src"
        "/home/media/homelab/admin-panel/package.json"
        "/home/media/homelab/admin-panel/bun.lock"
      ];
      TriggerLimitIntervalSec = "10s"; # Prevent rapid-fire rebuilds
      TriggerLimitBurst = 1;
    };
  };

  systemd.services.admin-panel = {
    description = "Admin panel";
    after = [
      "network.target"
      "admin-panel-build.service"
    ];
    requires = [ "admin-panel-build.service" ];
    wantedBy = [ "multi-user.target" ];

    environment = {
      PORT = toString adminPanelPort;
      NODE_ENV = "production";
      HOMELAB_REPO_PATH = "/home/media/homelab";
    };

    path = [
      unstable.bun
      pkgs.git
      pkgs.openssh
    ];

    serviceConfig = {
      Type = "simple";
      User = "media";
      Group = "users";
      WorkingDirectory = "/home/media/homelab/admin-panel";
      ConditionPathExists = "/home/media/homelab/admin-panel/.output";

      PAMName = "login";
      Environment = [
        "HOME=/home/media"
        "USER=media"
        "PATH=/run/current-system/sw/bin:/run/current-system/sw/sbin"
      ];

      ExecStart = "${pkgs.bash}/bin/bash -l -c '${unstable.bun}/bin/bun run .output/server/index.mjs'";

      Restart = "on-failure";
      RestartSec = 5;
      TimeoutStopSec = "30s";
      KillSignal = "SIGINT";
    };
  };

}
