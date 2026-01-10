/**
 * AlgoGate extension popup script
 * Displays gate status and allows quick actions.
 */

// CONFIG object available via script tag in HTML

let gateStatus = null;
let updateInterval = null;

/**
 * Format seconds into "MM:SS" display.
 */
function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Request current gate status from background.
 */
function requestGateStatus() {
  chrome.runtime.sendMessage(
    { type: MSG.GET_GATE_STATUS },
    (response) => {
      if (response && response.data) {
        gateStatus = response.data;
        renderStatus();
      }
    }
  );
}

/**
 * Render the status display based on current gate state.
 */
function renderStatus() {
  const display = document.getElementById('status-display');
  if (!display) return;

  display.innerHTML = '';

  if (!gateStatus.locked) {
    // UNLOCKED
    display.innerHTML = `
      <div class="status-header">Unlocked</div>
      <div class="status-message">You have access to social media</div>
      <div class="timer">${formatSeconds(gateStatus.secondsRemaining)}</div>
    `;
  } else if (gateStatus.graceActive) {
    // GRACE ACTIVE - Subtle with explanation
    display.innerHTML = `
      <div class="status-header">Locked</div>
      <div class="status-message">Working on LeetCode...</div>
      <div class="timer-small">${formatSeconds(gateStatus.graceSecondsRemaining)}</div>
      <div class="timer-caption">Time until reward eligibility</div>
    `;
  } else if (gateStatus.graceOffered) {
    // GRACE OFFERED - Verbose explanation
    display.innerHTML = `
      <div class="status-header">Reward Earned!</div>
      <div class="status-message">You've been working on LeetCode for 30 minutes. As a reward, you can unlock access to social media for the next 30 minutes.</div>
      <div class="button-group">
        <button id="accept-grace-btn" class="button">Claim Access</button>
        <button id="decline-grace-btn" class="button secondary">No Thanks</button>
      </div>
    `;
    
    const acceptBtn = document.getElementById('accept-grace-btn');
    const declineBtn = document.getElementById('decline-grace-btn');

    acceptBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: MSG.ACCEPT_GRACE,
        payload: { graceDuration: CONFIG.GRACE_UNLOCK_DURATION }
      }, () => {
        requestGateStatus();
      });
    });

    declineBtn.addEventListener('click', () => {
      window.close();
    });
  } else {
    // LOCKED
    display.innerHTML = `
      <div class="status-header">Locked</div>
      <div class="status-message">Solve a LeetCode problem to unlock</div>
      <div class="button-group">
        <a href="https://leetcode.com/problemset/" target="_blank" class="button" style="text-decoration: none;">Go to LeetCode</a>
      </div>
    `;
  }

  // Start/update timer if unlocked or grace active
  if (!gateStatus.locked || gateStatus.graceActive) {
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      requestGateStatus();
    }, CONFIG.BLOCKED_PAGE_UPDATE_INTERVAL);
  } else {
    if (updateInterval) clearInterval(updateInterval);
  }
}

/**
 * Listen for messages from background (gate status updates).
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === MSG.GATE_STATUS) {
    gateStatus = message.payload;
    renderStatus();
  }
});

/**
 * Initialize on popup load.
 */
window.addEventListener('load', () => {
  requestGateStatus();

  // Refresh status every 2 seconds while popup is open
  setInterval(() => {
    requestGateStatus();
  }, CONFIG.POPUP_UPDATE_INTERVAL);
});