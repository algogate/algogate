# Testing AlgoGate

This document explains how to test the AlgoGate browser extension.

## Manual Testing Checklist

### 1. Installation Test
- [ ] Load extension in Chrome/Edge/Brave developer mode
- [ ] Extension icon appears in toolbar
- [ ] No console errors on installation

### 2. Popup UI Test
- [ ] Click extension icon to open popup
- [ ] Verify status shows "Access Blocked" initially
- [ ] Verify statistics show 0 problems solved
- [ ] Verify settings are displayed with default values
- [ ] Toggle extension on/off and verify status changes
- [ ] Change settings and click Save
- [ ] Verify settings persist after closing popup

### 3. Blocking Functionality Test
- [ ] Navigate to a blocked site (e.g., youtube.com)
- [ ] Verify block screen appears
- [ ] Verify block screen shows proper messaging
- [ ] Click "Go to LeetCode" button
- [ ] Verify LeetCode opens in new tab

### 4. Grace Period Test
- [ ] Navigate to a blocked site
- [ ] Click "Use Grace Period" button
- [ ] Verify access is granted
- [ ] Verify remaining time is shown in popup
- [ ] Verify access reminder appears on allowed sites

### 5. LeetCode Detection Test
- [ ] Go to leetcode.com
- [ ] Pick any problem
- [ ] Submit a correct solution
- [ ] Wait for "Accepted" verdict
- [ ] Verify AlgoGate success notification appears on LeetCode
- [ ] Verify browser notification is shown
- [ ] Verify popup now shows "Access Granted" status
- [ ] Navigate to a previously blocked site
- [ ] Verify site is now accessible
- [ ] Verify access reminder is shown

### 6. Solved Problem Tracking Test
- [ ] Solve multiple LeetCode problems
- [ ] Verify problem count increases in popup
- [ ] Solve the same problem again
- [ ] Verify it doesn't grant new access
- [ ] Verify "already solved" message appears

### 7. Access Expiration Test
- [ ] Set access duration to 1 minute in settings
- [ ] Solve a new LeetCode problem
- [ ] Verify access is granted
- [ ] Wait for access to expire (1 minute)
- [ ] Try to access blocked site
- [ ] Verify block screen appears again

### 8. Custom Blocked Sites Test
- [ ] Add a new site to blocked sites list (e.g., github.com)
- [ ] Save settings
- [ ] Navigate to the newly added site
- [ ] Verify block screen appears
- [ ] Remove site from blocked list
- [ ] Save settings
- [ ] Verify site is now accessible

### 9. Disable Extension Test
- [ ] Toggle extension off in popup
- [ ] Navigate to blocked sites
- [ ] Verify sites are accessible
- [ ] Toggle extension back on
- [ ] Verify blocking resumes

## Common Issues & Debugging

### Extension doesn't load
- Check browser console for errors
- Verify manifest.json is valid
- Try reloading the extension

### LeetCode detection not working
- Open browser console on leetcode.com
- Look for "AlgoGate: LeetCode detector initialized" message
- Check for "AlgoGate: Problem solved!" message after submission
- Verify you're on leetcode.com (not cn.leetcode.com)

### Block screen doesn't appear
- Check if extension is enabled in popup
- Verify the site is in blocked sites list
- Check browser console for errors
- Try reloading the page

### Settings not saving
- Check browser console for errors
- Verify chrome.storage permissions in manifest
- Try reopening the extension popup

## Performance Testing

### Memory Usage
- Open browser task manager
- Load extension
- Navigate to various sites
- Verify memory usage is reasonable (< 50MB)

### CPU Usage
- Monitor CPU usage while extension is active
- Should be minimal when idle
- Brief spikes during LeetCode detection are acceptable

## Browser Compatibility

Test on:
- [ ] Google Chrome (latest)
- [ ] Microsoft Edge (latest)
- [ ] Brave Browser (latest)
- [ ] Firefox (latest) - requires temporary add-on loading

## Automated Testing (Future)

Currently, the extension relies on manual testing. Future improvements could include:
- Unit tests for background.js functions
- Integration tests for content scripts
- E2E tests using Puppeteer or Playwright
- Mock LeetCode DOM for detector testing
