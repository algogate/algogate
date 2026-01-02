# AlgoGate - Release Notes

## Version 1.0.0 - Initial Release

### Overview
AlgoGate is a browser extension that helps developers stay productive by blocking access to distracting social media sites until they solve a new LeetCode problem.

### Features

#### Core Functionality
- ✅ **Smart Site Blocking**: Blocks configurable list of social media sites
- ✅ **LeetCode Integration**: Automatically detects solved problems on LeetCode
- ✅ **Access Management**: Grants temporary access after solving problems
- ✅ **Grace Period**: Emergency access when you can't solve a problem
- ✅ **State Persistence**: Remembers solved problems and settings

#### User Interface
- ✅ **Modern Popup**: Clean, responsive UI with status and statistics
- ✅ **Block Screen**: Beautiful blocking page with instructions
- ✅ **Notifications**: Visual feedback when problems are solved
- ✅ **Settings Panel**: Configure all aspects of the extension

#### Customization
- ✅ **Custom Sites**: Add/remove sites from blocked list
- ✅ **Duration Control**: Set access duration (15-480 minutes)
- ✅ **Grace Period**: Configure grace period length (5-120 minutes)
- ✅ **Enable/Disable**: Toggle extension on/off

### Default Blocked Sites
- Instagram
- TikTok
- YouTube
- Twitter / X
- Facebook
- Reddit

### Technical Details

#### Browser Support
- ✅ Chrome (Manifest V3)
- ✅ Edge (Manifest V3)
- ✅ Brave (Manifest V3)
- ⚠️ Firefox (Temporary add-on only)

#### Permissions Required
- `storage`: Save settings and solved problems locally
- `tabs`: Open LeetCode in new tabs
- `notifications`: Show success notifications
- `host_permissions`: Access to LeetCode and blocked sites

#### Architecture
- **Background Service Worker**: Central state management
- **Content Scripts**: 
  - LeetCode detector (runs on leetcode.com)
  - Site blocker (runs on social media sites)
- **Popup UI**: Configuration and status display

### Known Limitations

1. **LeetCode Detection**: 
   - Works on leetcode.com (not cn.leetcode.com)
   - Relies on DOM structure (may break with UI updates)
   - 2-second polling interval (room for optimization)

2. **Problem Tracking**:
   - Tracks problems solved while extension is active
   - Doesn't import previous LeetCode history
   - Problems tracked by ID/title only

3. **Blocking**:
   - Only blocks sites in the configured list
   - Works on main domain and subdomains
   - Can be bypassed by disabling extension (by design)

### Security & Privacy

- ✅ All data stored locally in browser
- ✅ No external API calls or data transmission
- ✅ No user tracking or analytics
- ✅ Only monitors LeetCode for solution detection
- ✅ Proper domain matching to prevent false positives
- ✅ Input validation for all settings

### Installation

See [README.md](README.md) for detailed installation instructions.

### Future Improvements

Potential enhancements for future versions:
- Better LeetCode detection using MutationObserver
- Support for other coding platforms (HackerRank, CodeForces, etc.)
- Dark mode for popup
- Statistics dashboard
- Problem difficulty tracking
- Weekly/monthly goals
- Achievement system
- Import LeetCode history
- Export/import settings
- Keyboard shortcuts
- Multiple language support

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

### Testing

See [TESTING.md](TESTING.md) for the testing checklist and procedures.

### License

MIT License - See [LICENSE](LICENSE) for details.

---

**Keep grinding! 💪**
