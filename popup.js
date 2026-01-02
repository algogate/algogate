// Popup JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  // Load and display current status
  await loadStatus();
  
  // Setup event listeners
  setupEventListeners();
  
  // Refresh status periodically
  setInterval(loadStatus, 5000);
});

// Load current status from background
async function loadStatus() {
  try {
    const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
    updateUI(status);
  } catch (error) {
    console.error('Error loading status:', error);
  }
}

// Update UI with status
function updateUI(status) {
  // Update access status
  const statusIcon = document.getElementById('status-icon');
  const statusTitle = document.getElementById('status-title');
  const statusSubtitle = document.getElementById('status-subtitle');
  const accessCard = document.getElementById('access-status');
  
  if (!status.isEnabled) {
    statusIcon.textContent = '⏸️';
    statusTitle.textContent = 'Extension Disabled';
    statusSubtitle.textContent = 'Enable to start blocking';
    accessCard.className = 'status-card status-disabled';
  } else if (status.hasAccess) {
    statusIcon.textContent = '✅';
    statusTitle.textContent = 'Access Granted';
    statusSubtitle.textContent = `${status.remainingMinutes} minute${status.remainingMinutes !== 1 ? 's' : ''} remaining`;
    accessCard.className = 'status-card status-granted';
  } else {
    statusIcon.textContent = '🔒';
    statusTitle.textContent = 'Access Blocked';
    statusSubtitle.textContent = 'Solve a LeetCode problem to unlock';
    accessCard.className = 'status-card status-blocked';
  }
  
  // Update stats
  document.getElementById('problems-solved').textContent = status.totalProblemsSolved || 0;
  document.getElementById('blocked-sites').textContent = status.blockedSitesCount || 0;
  
  // Update settings
  document.getElementById('enable-toggle').checked = status.isEnabled ?? true;
  document.getElementById('access-duration').value = status.settings.accessDurationMinutes || 60;
  document.getElementById('grace-period-duration').value = status.settings.gracePeriodMinutes || 30;
  document.getElementById('blocked-sites-list').value = (status.settings.blockedSites || []).join('\n');
  
  // Update last solved problem
  if (status.lastSolvedProblem) {
    document.getElementById('last-solved-section').style.display = 'block';
    document.getElementById('last-problem-title').textContent = status.lastSolvedProblem.title || 'Unknown';
    document.getElementById('last-problem-difficulty').textContent = status.lastSolvedProblem.difficulty || 'Unknown';
    
    const solvedTime = new Date(status.lastSolvedProblem.solvedAt);
    const timeAgo = getTimeAgo(solvedTime);
    document.getElementById('last-problem-time').textContent = timeAgo;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Go to LeetCode button
  document.getElementById('goto-leetcode').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://leetcode.com/problemset/' });
  });
  
  // Enable/disable toggle
  document.getElementById('enable-toggle').addEventListener('change', async (e) => {
    try {
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: { isEnabled: e.target.checked }
      });
      showNotification(e.target.checked ? 'Extension enabled' : 'Extension disabled', 'success');
      await loadStatus();
    } catch (error) {
      showNotification('Failed to update settings', 'error');
    }
  });
  
  // Save settings button
  document.getElementById('save-settings').addEventListener('click', async () => {
    try {
      const accessDuration = parseInt(document.getElementById('access-duration').value);
      const gracePeriod = parseInt(document.getElementById('grace-period-duration').value);
      
      // Validate input ranges
      if (isNaN(accessDuration) || accessDuration < 15 || accessDuration > 480) {
        showNotification('Access duration must be between 15 and 480 minutes', 'error');
        return;
      }
      
      if (isNaN(gracePeriod) || gracePeriod < 5 || gracePeriod > 120) {
        showNotification('Grace period must be between 5 and 120 minutes', 'error');
        return;
      }
      
      const blockedSitesText = document.getElementById('blocked-sites-list').value;
      const blockedSites = blockedSitesText
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      
      if (blockedSites.length === 0) {
        showNotification('You must have at least one blocked site', 'error');
        return;
      }
      
      await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: {
          accessDurationMinutes: accessDuration,
          gracePeriodMinutes: gracePeriod,
          blockedSites: blockedSites
        }
      });
      
      showNotification('Settings saved successfully!', 'success');
      await loadStatus();
    } catch (error) {
      showNotification('Failed to save settings', 'error');
    }
  });
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#4299e1'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 14px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Get time ago string
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}
