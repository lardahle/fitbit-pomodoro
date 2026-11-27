# Sideloading onto Fitbit Sense 2 / Versa 4 from Linux (no Google account working)

Working method as of 2026-11-26. Installs a **device-only** app/clockface over **USB**,
bypassing the Google-account login 403 and the Developer Relay entirely. No phone needed.

> Context: Google migrated Fitbit accounts to Google sign-in. The official SDK CLI login
> (client `22D2CP`, api.fitbit.com/oauth2/authorize) returns **403** for migrated accounts,
> and the Gallery private-link install fails in the Google Health app ("content not available").
> Third-party gallery installs end **2026-11-28**. USB sideloading via the dev bridge still works.

## 0. The gotcha that wasted hours
The watch would not enumerate on USB — turned out to be a **stuck pogo pin on the charging
cable** (one sat lower than the rest, not springing back). The Sense 2 charger carries USB
D+/D- on its 4 pins; a stuck data pin = charges but no USB. Clean the pin with isopropyl +
work it with a wooden toothpick until it springs flush. Then the watch appears as:
`Bus ... Device ...: ID 2687:fd13 Fitbit Inc. Sense 2` (CDC serial debug host).

## 1. Device prerequisites
- Phone: Fitbit/Health app → Developer Menu → Developer Bridge ON (not actually required for
  USB-only, but harmless).
- Watch: Settings → Developer bridge → USB debugging ON. Keep on the charger cable, plugged in.

## 2. Linux USB permission (one-time, needs sudo)
```bash
sudo cp tools/51-fitbit.rules /etc/udev/rules.d/51-fitbit.rules
sudo udevadm control --reload-rules && sudo udevadm trigger
# then unplug/reseat the watch on the cable
```
Verify: `lsusb | grep 2687` shows the Sense 2, and its /dev/bus/usb/* node is group `plugdev`,
mode 0660 (writable by you).

## 3. Local SDK CLI patches
The stock `@fitbit/sdk-cli` (in `src/node_modules`) blocks USB installs three ways; patched
copies are in `tools/sideload-patches/`. Apply after any `yarn install` (node_modules is
regenerated). Paths are under `src/node_modules/@fitbit/sdk-cli/lib/`:

- **`cli.js`** `main()` — skip cloud login entirely. The Google-account login opens a browser,
  403s, and the loopback server (127.0.0.1:13579) hangs forever waiting for a code. Patched to
  go straight to the `fitbit$` prompt.
- **`models/HostConnections.js`** `listOfType()` — the Developer Relay call runs first and
  **throws** on 403, before USB is enumerated. Patched to swallow the relay error so USB hosts
  still list.
- **`commands/install.js`** — if an app has a companion and no phone connects, install aborts
  the **whole** thing (including the device component). Patched: no phone → skip companion,
  install device-only. (`const hasCompanion` → `let`, abort → `hasCompanion = false`.)

Re-apply quickly:
```bash
cp tools/sideload-patches/cli.js            src/node_modules/@fitbit/sdk-cli/lib/cli.js
cp tools/sideload-patches/HostConnections.js src/node_modules/@fitbit/sdk-cli/lib/models/HostConnections.js
cp tools/sideload-patches/install.js        src/node_modules/@fitbit/sdk-cli/lib/commands/install.js
```

## 4. Build + install
```bash
cd src
export FITBIT_QA_COMMANDS=1      # exposes the USB debug host
npx fitbit-build                 # build (deviceApi 10.1.0 for hera/rhea)
npx fitbit                       # opens the fitbit$ shell
# at the prompt:
fitbit$ connect device           # auto-connects the only Sense 2
fitbit$ install                  # installs ./build/app.fba device component over USB
```
Expect: `Sideloading app: 100% completed` → `App install complete (full)` → `Launching app`.
A trailing `MethodCallTimeout ... app.launchComponent` is a harmless launch-ack timeout, not an
install failure.

## Limitations
- **Device-only.** The phone companion/settings component can't install (needs the relay, 403).
  The clockface runs with default durations baked into source; change them in `app/settings.js`
  presets and reinstall, since the phone settings screen is unavailable.
- Build targets proposed API off; `access_aod` is rejected by GAM for private faces, so the
  always-on screen falls back to the system's generic clock (see package.json history).
- Unsigned reflashing / custom firmware is **not** possible — Apollo4 secure boot. This is
  sideloading of signed-SDK apps only.
