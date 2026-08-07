# VISION.md — Clocki

## What this is
Clocki is a lightweight, frameless desktop floating timer overlay built with Electron, TypeScript, and HTML/CSS. It displays a minimalist cyberpunk cyan timer overlay showing cumulative work time (in hours format `X.XXh`) for the current date.

## Core thesis
Subtle, ubiquitous context awareness helps users track daily dedicated focus without workflow friction. Clocki lives cleanly above all windows with zero UI chrome, minimal desktop footprint (66x24px), instant hotkey controls, and automatic day-boundary resets.

## Map
- `src/main.ts`: Main process handling single-instance lock, window positioning, state persistence (`~/.local/share/clocki/state.json`), global hotkeys, and renderer IPC.
- `src/overlay.html`: Frameless transparent floating window UI with scanlines, click-drag handling, double-click reset, and mouse action listeners.
- `clocki.sh`: Helper launcher script running Electron in non-sandboxed mode.
- `AGENTS.md`: Symlinked harness rules pointing to `~/Desktop/p/skills/dev/AGENTS.md`.

## Honest state (Dated: 2026-08-07)
- **Built & Verified**:
  - Frameless floating desktop overlay timer (`0.00h`).
  - Left-click timer toggle (pause/resume).
  - Double-click overlay timer reset (`0.00h`).
  - Right-click window hide.
  - Global hotkeys: `Ctrl+Alt+C` (toggle focus), `Ctrl+Alt+H` (show/hide overlay), `Ctrl+Alt+R` (reset timer).
  - Single-instance lock and CLI parameter handling (`--reset`).
- **Aspirational / Unproven**:
  - Auto-start desktop service integration / systemd unit / desktop entry.

## What this file is for
This document serves as a rapid cold re-entry point for coding agents to immediately understand project identity, architectural bounds, verified status, and operating rules without re-analyzing the whole codebase.
