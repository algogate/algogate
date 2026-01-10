/**
 * AlgoGate extension popup script
 * Displays gate status and allows quick actions.
 */

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
    // GRACE ACTIVE
    display.innerHTML = `
      <div class="status-header">Grace Period</div>
      <div class="status-message">Complete a problem to unlock!</div>
      <div class="timer grace">${formatSeconds(gateStatus.graceSecondsRemaining)}</div>
    `;
  } else if (gateStatus.graceOffered) {
    // GRACE OFFERED
    display.innerHTML = `
      <div class="status-header">Grace Ended</div>
      <div class="status-message">Unlock for 30 more minutes?</div>
      <div class="button-group">
        <button id="accept-grace-btn" class="button">Unlock 30m</button>
        <button id="decline-grace-btn" class="button secondary">Cancel</button>
      </div>
    `;
    
    const acceptBtn = document.getElementById('accept-grace-btn');
    const declineBtn = document.getElementById('decline-grace-btn');

    acceptBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: MSG.ACCEPT_GRACE,
        payload: { graceDuration: 30 * 60 * 1000 }
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
    }, 1000);
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
  }, 2000);
});