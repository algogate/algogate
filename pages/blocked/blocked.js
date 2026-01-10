/**
 * AlgoGate blocked page script
 * Displays current gate status and handles user interactions.
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
        renderUI();
      }
    }
  );
}

/**
 * Render the UI based on current gate status.
 */
function renderUI() {
  const heading = document.getElementById('blocked-text');
  const message = document.getElementById('message');
  const timer = document.getElementById('timer');

  if (!heading || !message || !timer) return;

  // Clear any existing buttons
  const existingButtons = document.querySelectorAll('.button');
  existingButtons.forEach(btn => btn.remove());

  if (!gateStatus.locked) {
    // UNLOCKED: Show access granted
    heading.textContent = 'Unlocked';
    message.textContent = 'You have access to social media!';
    timer.textContent = formatSeconds(gateStatus.secondsRemaining);
    timer.style.color = '#4CAF50';
  } else if (gateStatus.graceActive) {
    // GRACE ACTIVE: Subtle - keep focus on solving
    heading.textContent = 'Site Blocked';
    message.textContent = "You're working on LeetCode. Keep going!";
    timer.textContent = formatSeconds(gateStatus.graceSecondsRemaining);
    timer.style.color = '#666';
    timer.style.fontSize = '24px';
  } else if (gateStatus.graceOffered) {
    // GRACE OFFERED: Explicit reward earned
    heading.textContent = 'You Earned a Reward!';
    message.textContent = 'You worked for 30 minutes. Claim 30 minutes of access?';
    timer.textContent = '';
    
    // Add claim button
    const acceptBtn = document.createElement('button');
    acceptBtn.className = 'button';
    acceptBtn.textContent = 'Claim Access';
    acceptBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: MSG.ACCEPT_GRACE,
        payload: { graceDuration: CONFIG.GRACE_UNLOCK_DURATION }
      }, () => requestGateStatus());
    });

    // Add decline button
    const declineBtn = document.createElement('button');
    declineBtn.className = 'button decline';
    declineBtn.textContent = 'No Thanks';
    declineBtn.addEventListener('click', () => {
      window.history.back();
    });

    document.body.appendChild(acceptBtn);
    document.body.appendChild(declineBtn);
  } else {
    // FULLY LOCKED: Show lock message
    heading.textContent = 'Site Blocked';
    message.textContent = 'This website is not allowed until you GET GOOD AT LEETCODE.';
    timer.textContent = '';
    
    // Add LeetCode button
    const leetcodeBtn = document.createElement('a');
    leetcodeBtn.href = 'https://leetcode.com/problemset/';
    leetcodeBtn.className = 'button';
    leetcodeBtn.textContent = 'Go to LeetCode';
    document.body.appendChild(leetcodeBtn);
  }
}

/**
 * Initialize on page load.
 */
document.addEventListener('DOMContentLoaded', () => {
  requestGateStatus();

  // Update every second
  updateInterval = setInterval(() => {
    requestGateStatus();
  }, CONFIG.BLOCKED_PAGE_UPDATE_INTERVAL);

  // Listen for status broadcasts
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MSG.GATE_STATUS) {
      gateStatus = message.payload;
      renderUI();
    }
  });
});
