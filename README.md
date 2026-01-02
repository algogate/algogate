# AlgoGate 🔒

A browser extension that blocks social media access until you solve a LeetCode problem you haven't solved before.

## Overview

AlgoGate helps you stay productive by blocking access to time-wasting social media sites (Instagram, TikTok, YouTube, Twitter/X, Facebook, Reddit, etc.) until you solve a new LeetCode problem. Perfect for developers who want to combine productivity with coding practice!

## Features

- 🔒 **Smart Blocking**: Blocks customizable list of social media sites
- ✅ **LeetCode Detection**: Automatically detects when you solve a new problem
- ⏰ **Grace Period**: Can't solve a problem right now? Use the grace period for temporary access
- ⚙️ **Customizable**: Configure blocked sites, access duration, and grace period length
- 📊 **Statistics**: Track how many problems you've solved
- 🎨 **Beautiful UI**: Clean, modern interface with status indicators

## How It Works

1. When you try to visit a blocked social media site, you'll see a block screen
2. Click "Go to LeetCode" to open LeetCode's problem set
3. Solve a problem you haven't solved before
4. Once your solution is accepted, access is automatically granted!
5. Enjoy your social media time for the configured duration (default: 60 minutes)

## Installation

### Chrome/Chromium-based browsers (Chrome, Edge, Brave, etc.)

1. Clone or download this repository
   ```bash
   git clone https://github.com/algogate/algogate.git
   cd algogate
   ```

2. Open your browser and navigate to the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`

3. Enable "Developer mode" (toggle in the top-right corner)

4. Click "Load unpacked"

5. Select the `algogate` directory

6. The extension is now installed! Look for the 🔒 icon in your toolbar

### Firefox

1. Clone or download this repository
   ```bash
   git clone https://github.com/algogate/algogate.git
   cd algogate
   ```

2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`

3. Click "Load Temporary Add-on"

4. Select the `manifest.json` file from the `algogate` directory

Note: Firefox temporary add-ons are removed when you close the browser. For permanent installation, you'll need to package and sign the extension.

## Configuration

Click the AlgoGate extension icon to open the popup and configure:

- **Enable/Disable**: Toggle the extension on or off
- **Access Duration**: How long you get access after solving a problem (15-480 minutes)
- **Grace Period**: Length of temporary access when you can't solve a problem (5-120 minutes)
- **Blocked Sites**: Customize which sites to block (one per line)

## Default Blocked Sites

- instagram.com
- tiktok.com  
- youtube.com
- twitter.com / x.com
- facebook.com
- reddit.com

You can add or remove sites in the settings!

## How LeetCode Detection Works

The extension monitors the LeetCode website for signs that you've successfully solved a problem:

1. Watches for "Accepted" status in submission results
2. Extracts problem information (title, ID, difficulty)
3. Checks if this is a new problem you haven't solved before
4. Grants access if it's a new solution!

## Grace Period

Can't solve a problem right now but really need access? Click "Use Grace Period" on the block screen or in the popup. This gives you temporary access for the configured duration (default: 30 minutes).

## Privacy & Data

- All data is stored locally in your browser using Chrome's storage API
- No data is sent to external servers
- The extension only monitors LeetCode.com for problem solutions
- Your solved problems list is stored locally and never shared

## Development

The extension consists of:

- `manifest.json` - Extension configuration
- `background.js` - Service worker for state management
- `leetcode-detector.js` - Content script that detects solved problems on LeetCode
- `blocker.js` - Content script that blocks social media sites
- `popup.html/js/css` - Extension popup UI
- `icons/` - Extension icons

## Contributing

Contributions are welcome! Feel free to:

- Report bugs
- Suggest new features
- Submit pull requests
- Improve documentation

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Keep Grinding! 💪

Remember: Every problem you solve makes you a better developer. Use AlgoGate to turn procrastination into practice!
