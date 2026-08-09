# Clocki ⏱️

> A minimalist, frameless desktop floating timer overlay for tracking daily focus hours.

![Clocki Banner](assets/banner.jpg)

<p align="center">
  <img src="assets/preview.png" alt="Clocki UI Overlay" width="200" />
</p>

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

---

## Features

- **Frameless Overlay**: Compact $66 \times 24\text{px}$ floating HUD with cyberpunk cyan scanlines.
- **Always on Top**: Stays above workspaces without interrupting focus.
- **Instant Controls**:
  - **Left Click**: Pause / Resume timer.
  - **Double Click**: Reset timer to `0.00h`.
  - **Right Click**: Hide overlay window.
  - **Drag**: Click & drag anywhere on the overlay to reposition.
- **Global Hotkeys**:
  - `Ctrl+Alt+C`: Toggle pause/resume.
  - `Ctrl+Alt+H`: Show / Hide window.
  - `Ctrl+Alt+R`: Reset timer.
- **Persistence & Auto-Reset**: Automatic session logging to `~/.local/share/clocki/state.json` and automatic daily reset at midnight.

---

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm

### Installation & Run

```bash
# Install dependencies
npm install

# Build TypeScript sources
npm run build

# Start overlay
./clocki.sh
```

---

## Resetting the Timer

You can reset the timer at any time using any of the following methods:
1. **Double-click** directly on the overlay timer.
2. Press **`Ctrl+Alt+R`** globally from anywhere.
3. Press **`Ctrl+R`** when the overlay is focused.
4. Launch with CLI flag: `./clocki.sh --reset`

---

## License

MIT © [Masih Moafi](https://github.com/masihmoafi)

---

## Support / Buy me a coffee

If you'd like to support Clocki, you can send Solana (SOL) to the public address below. Public addresses and QR codes are safe to share — never commit or share private keys.

<p align="center">
  <img src="assets/sol.png" alt="Solana QR" width="160" />
</p>

```
22xpLshLqecFBLx9NjvRZaitHYVH8xZXgW9TQwDFnm98
```

In the app: press Ctrl+Alt+S (or Command+Alt+S on macOS) or middle-click the overlay to open the QR image in your default image viewer/wallet app.

