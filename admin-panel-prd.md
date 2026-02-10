# Product Requirements Document (PRD)

## Overview

Build a lightweight web admin panel for managing NixOS configuration on a homelab server. The panel must display the current Nix configuration, show Git status including whether there are unpulled changes, allow pulling updates, and execute `nixos-rebuild switch` while streaming terminal output. If `sudo` prompts for a password, the user must be able to supply it securely.

## Goals

- Provide visibility into the current NixOS configuration.
- Detect Git divergence, including unpulled changes.
- Allow safe, manual pull and rebuild operations.
- Surface live command output to the user.
- Support `sudo` password entry when required.
- Basic login for system users. You need to authenticate to access the admin panel.

## Users & Use Cases

- **Homelab admin** wants to quickly check if the server is out of date and apply updates.
- **Homelab admin** needs to view configuration state without SSH.

## Assumptions

- The server stores the NixOS configuration in a Git repository (e.g., `/etc/nixos` or a configured path).
- The admin panel runs on the same machine or has secure access to execute commands.
- `nixos-rebuild switch` requires `sudo`.

## Functional Requirements

### 1) View Nix Configuration

- Display the current Nix configuration directory path.
- Show the current `configuration.nix` and `flake.nix` (if present) as read-only text with syntax highlighting.
- Provide a “last updated” timestamp based on file mtime.

### 2) Git Status & Unpulled Changes

- Show:
  - Current branch.
  - Local status (clean/dirty).
  - Ahead/behind counts vs remote.
- Identify “unpulled changes” as `behind > 0`.
- Provide a refresh action.

### 3) Pull Changes

- Button to run `git pull` for the config repository.
- Confirm dialog before execution.
- Show streaming output and final status (success/failure).
- If conflicts occur, surface error output and stop.

### 4) NixOS Rebuild

- Button to run `sudo nixos-rebuild switch`.
- Confirm dialog with warning about service restarts.
- Show streaming terminal output in real time.
- Final status includes exit code and duration.

### 5) Sudo Password Handling

- If the command prompts for a password, the UI must request it.
- Password entry must be masked.
- Password should not be stored; only used for the current command.
- Support a retry flow if authentication fails.

## Non-Functional Requirements

- **Security**: HTTPS required, local-only binding by default, CSRF protection, and no password persistence.
- **Reliability**: Commands should run in a controlled environment with timeouts.
- **Observability**: Log command start/stop, exit codes, and errors (redact passwords).
- **Performance**: Render status updates within 1s of refresh.

## Technical Constraints

- Fullstack framework: TanStack Start.
- Runtime and package manager: Bun.

## UX Requirements

- Single-page dashboard with:
  - Nix config viewer (read-only, collapsible sections).
  - Git status card with refresh and pull button.
  - Rebuild card with run button and live output panel.
- Live output panel supports auto-scroll and pause.
- Clear success/error banners.

## API Requirements (Proposed)

Base: `/api`

### GET `/config`

- Returns: repo path, file contents, timestamps.

### GET `/git/status`

- Returns: branch, dirty, ahead, behind, lastFetch, rawSummary.

### POST `/git/pull`

- Runs `git pull` and streams output (SSE or websocket).

### POST `/nixos/rebuild`

- Runs `sudo nixos-rebuild switch` and streams output (SSE or websocket).

### POST `/auth/sudo`

- Provides sudo password for an in-flight command session.

## Backend Command Handling

- Use a command runner with:
  - PTY support for streaming.
  - Prompt detection for `sudo` (e.g., “password for”).
  - Session IDs for in-flight commands.
  - Sanitized logs.

## Security Considerations

- Restrict access via IP allowlist or local network only.
- Use a single admin credential or OS user login.
- Ensure the command runner only executes allowlisted commands.

## Success Metrics

- Time from opening panel to checking status: < 5s.
- Rebuild success rate > 95% in normal usage.
