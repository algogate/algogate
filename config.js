/**
 * AlgoGate Configuration
 * Centralized configuration for easy testing and adjustment.
 */

const CONFIG = Object.freeze({
  // Blocked domains list (auto-generated from manifest.json host_permissions)
  BLOCKED_DOMAINS: (() => {
    const manifest = chrome.runtime.getManifest();
    const hostPermissions = manifest.host_permissions || [];
    
    return hostPermissions
      .map(pattern => {
        // Extract domain from patterns like "*://*.domain.com/*"
        const match = pattern.match(/\*:\/\/\*\.([^\/]+)\/\*/);
        return match ? match[1] : null;
      })
      .filter(domain => domain !== null);
  })(),

  // Timer durations (in milliseconds)
  UNLOCK_DURATION: 60 * 60 * 1000,        // 60 minutes after solving a problem
  GRACE_DURATION: 30 * 60 * 1000,          // 30 minutes grace period on /problems/
  GRACE_UNLOCK_DURATION: 30 * 60 * 1000,   // 30 minutes if user accepts grace offer

  // Polling intervals (in milliseconds)
  DETECT_CHECK_INTERVAL: 2000,            // How often to check for new problems/solutions on LeetCode
  BLOCKED_PAGE_UPDATE_INTERVAL: 1000,     // How often to update blocked page timer
  POPUP_UPDATE_INTERVAL: 2000,            // How often to update popup timer
  BACKGROUND_REFRESH_INTERVAL: 5000,      // How often background checks status

  // DOM stability checks for LeetCode SPA navigation
  TITLE_POLL_INTERVAL: 250,               // How often to poll for title updates
  TITLE_POLL_MAX_ATTEMPTS: 20,            // Max attempts before timeout (20 * 250ms = 5 seconds)
  TITLE_POLL_INITIAL_DELAY: 200,          // Initial delay before starting title poll
  DOM_STABILIZATION_DELAY: 100            // Delay after title detected before checking solution
});
