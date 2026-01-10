# AlgoGate

AlgoGate is a Chrome browser extension that blocks distracting social media sites until you grind the LeetCode you promised to.

## Current Status (MVP)
✅ Blocks a hardcoded list of social domains using Chrome Declarative Net Request (DNR).  
🚧 LeetCode solve detection + unlocking logic is planned but not implemented yet.

## How it works
AlgoGate uses **Declarative Net Request (DNR)** to block navigation requests at the browser network layer.

- Blocking is implemented as **dynamic DNR rules** created from a domain list in `background.js`.
- Rules are installed on **extension install/update** via `chrome.runtime.onInstalled`.
- Rules match top-level and iframe navigations using:
    - `urlFilter: "||domain^"` (matches the domain and subdomains)
    - `resourceTypes: ["main_frame", "sub_frame"]`

Why DNR?
- Fast and reliable: rules run in the network stack (native) before requests are sent.
- No long-running JS listeners required.

## Files
- `manifest.json` — Extension metadata, permissions, host permissions, background service worker entry.
- `background.js` — Builds and installs dynamic DNR rules to block the configured domains.
- `README.md` — Project documentation.

## Install / Run locally
1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `algogate/` folder (the one containing `manifest.json`)

## Debugging (view logs)
Because this is MV3, the background script runs as a **service worker**.

1. Go to `chrome://extensions`
2. Find **AlgoGate**
3. Click **Service worker** → **Inspect**
4. Check the Console for logs like:
    - `AlgoGate: updated N blocking rules`

## Configure blocked sites
To add/remove blocked sites:
1. Update `BLOCKED_DOMAINS` in `background.js`
2. Update `host_permissions` in `manifest.json` to include the same domains

Then reload the extension in `chrome://extensions`.

## Roadmap
Planned next steps:
- Detect when a **NEW** LeetCode problem is solved (`leetcode.com`) using a content script
- Define message schemas for event routing (LeetCode watcher → background → UI)
- Add unlock window logic (temporarily disable DNR rules after solve)
- Add popup UI + optional top bar countdown
