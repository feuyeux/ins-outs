# Verification Report

2026-09-07, Apple Silicon Mac.

- Type check and production build passed. 11 rule tests (including 1,000-hand random simulation) and 2 multiplayer tests passed.
- Chromium + WebKit: 8 UI tests passed (full game, settings, history, 390/360px portrait, landscape).
- Chromium offline: production build reload works after disconnect. 120-frame sampling: median and P95 frame interval ~16.7ms.
- Electron macOS: local launch and deal confirmed. Apple Silicon + Intel DMG generated; Intel not verified on hardware. Packages not signed or notarized.
- Android: debug APK built. Local emulator failed to start; native runtime not verified.
- iOS: project configured. Xcode missing matching iOS 26.5 SDK/simulator runtime; build blocked by system component error. No distributable package produced.
- Windows and Linux: build config and CI in place. Windows cross-packaging failed due to network error downloading dependencies; neither verified on hardware.
- WebKit automation reported internal error on offline toggle; offline tests explicitly skipped for this engine.
- Docker: deployment files provided. Docker not installed in test environment; container not verified.
