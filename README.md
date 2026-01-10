# AlgoGate

AlgoGate is a Chrome browser extension that blocks social media sites until you solve a LeetCode problem, with built-in timers and grace periods to encourage focused coding sessions.

## How It Works

**Core Mechanism**: DNR (Declarative Net Request) blocks 17 social media sites at the browser network layer—fast, reliable, and no long-running listeners needed.

**Three-State System**:
1. **LOCKED** — Social media blocked. User must solve a LeetCode problem to unlock.
2. **GRACE** — User navigates to `/problems/` while locked. 30-minute timer starts; solving a problem triggers a 60-minute unlock window.
3. **GRACE_OFFERED** — Grace timer expires. User can claim a 30-minute access reward by clicking "Claim Access" in the blocked page or popup.

**Detection & Messaging**:
- A content script on `leetcode.com` detects when a new problem is opened and when it's solved.
- Messages (`MSG`) route between the LeetCode detector, background service worker, and popup/blocked pages.
- Storage tracks unlock times, grace state, and offer flags across extension sessions.

## Blocked Domains
facebook.com, x.com, twitter.com, instagram.com, tiktok.com, youtube.com, reddit.com, linkedin.com, tumblr.com, bsky.app, pinterest.com, discord.com, snapchat.com, telegram.org, whatsapp.com, messenger.com, twitch.tv

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension metadata, permissions, and service worker entry point |
| `background.js` | DNR rule management; gate state machine (lock/unlock/grace); storage schema |
| `config.js` | Centralized config: blocked domains, timers (60m unlock, 30m grace), polling intervals |
| `messages.js` | Message type constants and validation for inter-component communication |
| `detect-solved.js` | Content script for LeetCode; detects new problems and solution badges |
| `pages/blocked/blocked.html`, `.js`, `.css` | Redirect page shown when social sites are blocked |
| `pages/popup/popup.html`, `.js`, `.css` | Extension popup; shows gate status and "Claim Access" button |

## Install & Run

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the `algogate/` folder

## Debug

1. Navigate to `chrome://extensions`
2. Under **AlgoGate**, click **Service worker** → **Inspect**
3. Check the Console for logs:
   - `AlgoGate: updated N blocking rules`
   - `AlgoGate: 🆕 New problem detected: { slug, title, url, seenAt }`
   - `AlgoGate: ✅ Problem solved: { slug, isNewSolve, timestamp }`

## Configuration

To change blocked domains:
1. Edit `host_permissions` in `manifest.json`
2. Config.js auto-extracts domains from manifest
3. Reload the extension in `chrome://extensions`

To adjust timers (unlock duration, grace duration, polling intervals), edit the `CONFIG` object in [config.js](config.js).
