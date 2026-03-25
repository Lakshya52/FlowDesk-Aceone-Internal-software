# FlowDesk Desktop Implementation Guide

This guide explains how to build, run, and distribute the FlowDesk Electron desktop application.

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Access to the FlowDesk frontend and backend APIs

## Folder Structure

```text
desktop/
├── assets/
│   ├── loading.html    # Themed loading screen
│   └── icon.ico        # (You should add your own icons here)
├── src/
│   ├── main.ts         # Main process logic
│   └── preload.ts      # Context bridge for security
├── package.json        # Build and dependency configuration
├── tsconfig.json       # TypeScript setup
└── .env                # Environment variables (production URL)
```

## Setup Instructions

1.  **Install Dependencies**:
    ```bash
    cd desktop
    npm install
    ```

2.  **Configuration**:
    Update the `.env` file with your production URL:
    ```env
    FRONTEND_URL=https://your-production-url.onrender.com
    ```

3.  **Run in Development**:
    ```bash
    npm run dev
    ```

## Build & Distribution

The project uses `electron-builder` to generate production installers.

### Build Commands

- **Windows Installer (.exe)**:
  ```bash
  npm run dist:win
  ```
  This generates both a standard NSIS installer and a portable `.exe` in the `release/` folder.

- **macOS Disk Image (.dmg)**:
  ```bash
  npm run dist:mac
  ```

- **Linux AppImage**:
  ```bash
  npm run dist:linux
  ```

### Auto-Update Support

The app includes `electron-updater`. To enable auto-updates, ensure the `publish` section in `package.json` points to your GitHub repository. Once you release a new version on GitHub, the app will automatically check and prompt the user to update.

## Security Features

- **Context Isolation**: Enabled to separate Electron's internal APIs from the web app.
- **Node Integration**: Disabled in the renderer to prevent XSS attacks from accessing system-level APIs.
- **Sandbox**: Enabled for maximum security.
- **Preload Bridge**: A secure bridge `electronAPI` is exposed to the frontend via `preload.ts`.

## Tips for Distribution

1.  **Code Signing**: For professional distribution (to avoid Windows SmartScreen or macOS warnings), you should sign your application with a developer certificate.
2.  **App Icons**: Replace the placeholder icons in the `assets/` folder with your brand's `.ico`, `.icns`, and `.png` files.
