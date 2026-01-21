{
  modulesPath,
  lib,
  pkgs,
  ...
} @ args:
{
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
    (modulesPath + "/profiles/qemu-guest.nix")
    ./disk-config.nix
  ];
  boot.loader.grub = {
    efiSupport = true;
    efiInstallAsRemovable = true;
  };
  services.openssh.enable = true;

  environment.systemPackages = map lib.lowPrio [
    pkgs.curl
    pkgs.gitMinimal
    pkgs.neovim
  ];

  users.users.root.initialPassword = "1234";
  users.users.root.openssh.authorizedKeys.keys = [
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPILB1e574eEu9S0gC3BF5bPl2ILUIRo56YxFsBQGGDq ahse03@gmail.com"
  ];

  system.stateVersion = "24.05";
}
