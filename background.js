// Background service worker for AlgoGate extension
// Manages state and coordinates between content scripts

// Default settings
const DEFAULT_SETTINGS = {
  blockedSites: [
    'instagram.com',
    'tiktok.com',
    'youtube.com',
    'twitter.com',
    'x.com',
    'facebook.com',
    'reddit.com'
  ],
  solvedProblems: [],
  accessGrantedUntil: 0,
  gracePeriodMinutes: 30,
  accessDurationMinutes: 60,
  isEnabled: true,
  lastSolvedProblem: null
};

// Initialize extension on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('AlgoGate installed');
  
  // Load existing settings or set defaults
  const result = await chrome.storage.local.get(DEFAULT_SETTINGS);
  await chrome.storage.local.set(result);
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LEETCODE_SOLVED') {
    handleLeetCodeSolved(message.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (message.type === 'CHECK_ACCESS') {
    checkAccess(message.url)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ hasAccess: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'GET_STATUS') {
    getStatus()
      .then(status => sendResponse(status))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  
  if (message.type === 'UPDATE_SETTINGS') {
    updateSettings(message.settings)
      .then(result => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (message.type === 'START_GRACE_PERIOD') {
    startGracePeriod()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle LeetCode problem solved
async function handleLeetCodeSolved(problemData) {
  console.log('LeetCode problem solved:', problemData);
  
  const settings = await chrome.storage.local.get([
    'solvedProblems',
    'accessDurationMinutes',
    'isEnabled'
  ]);
  
  if (!settings.isEnabled) {
    return { message: 'Extension is disabled' };
  }
  
  // Check if this problem was already solved
  const solvedProblems = settings.solvedProblems || [];
  const problemId = problemData.problemId || problemData.title;
  
  if (solvedProblems.includes(problemId)) {
    return { 
      alreadySolved: true, 
      message: 'This problem was already solved before' 
    };
  }
  
  // Add to solved problems
  solvedProblems.push(problemId);
  
  // Grant access for the configured duration
  const accessDurationMs = (settings.accessDurationMinutes || 60) * 60 * 1000;
  const accessGrantedUntil = Date.now() + accessDurationMs;
  
  await chrome.storage.local.set({
    solvedProblems,
    accessGrantedUntil,
    lastSolvedProblem: {
      ...problemData,
      solvedAt: Date.now()
    }
  });
  
  // Notify user
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'AlgoGate: Access Granted! 🎉',
    message: `You solved "${problemData.title}"! Access granted for ${settings.accessDurationMinutes} minutes.`
  });
  
  return {
    granted: true,
    accessGrantedUntil,
    problemsSolved: solvedProblems.length
  };
}

// Check if user has access to a URL
async function checkAccess(url) {
  const settings = await chrome.storage.local.get([
    'isEnabled',
    'blockedSites',
    'accessGrantedUntil'
  ]);
  
  if (!settings.isEnabled) {
    return { hasAccess: true, reason: 'disabled' };
  }
  
  // Extract hostname from URL for proper domain matching
  let hostname;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch (e) {
    return { hasAccess: true, reason: 'invalid_url' };
  }
  
  // Check if URL is in blocked sites using proper domain matching
  const isBlocked = settings.blockedSites.some(site => {
    const normalizedSite = site.toLowerCase();
    // Match exact domain or subdomain
    return hostname === normalizedSite || hostname.endsWith('.' + normalizedSite);
  });
  
  if (!isBlocked) {
    return { hasAccess: true, reason: 'not_blocked' };
  }
  
  // Check if access is still valid
  const now = Date.now();
  if (settings.accessGrantedUntil && settings.accessGrantedUntil > now) {
    const remainingMs = settings.accessGrantedUntil - now;
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    return { 
      hasAccess: true, 
      reason: 'granted',
      remainingMinutes
    };
  }
  
  return { 
    hasAccess: false, 
    reason: 'blocked',
    message: 'Solve a LeetCode problem to gain access'
  };
}

// Get current status
async function getStatus() {
  const settings = await chrome.storage.local.get([
    'isEnabled',
    'blockedSites',
    'solvedProblems',
    'accessGrantedUntil',
    'gracePeriodMinutes',
    'accessDurationMinutes',
    'lastSolvedProblem'
  ]);
  
  const now = Date.now();
  const hasAccess = settings.accessGrantedUntil && settings.accessGrantedUntil > now;
  const remainingMs = hasAccess ? settings.accessGrantedUntil - now : 0;
  const remainingMinutes = Math.ceil(remainingMs / 60000);
  
  return {
    isEnabled: settings.isEnabled ?? true,
    hasAccess,
    remainingMinutes,
    totalProblemsSolved: (settings.solvedProblems || []).length,
    blockedSitesCount: (settings.blockedSites || []).length,
    lastSolvedProblem: settings.lastSolvedProblem,
    settings: {
      gracePeriodMinutes: settings.gracePeriodMinutes || 30,
      accessDurationMinutes: settings.accessDurationMinutes || 60,
      blockedSites: settings.blockedSites || []
    }
  };
}

// Update settings
async function updateSettings(newSettings) {
  await chrome.storage.local.set(newSettings);
  return { success: true };
}

// Start grace period
async function startGracePeriod() {
  const settings = await chrome.storage.local.get(['gracePeriodMinutes']);
  
  const gracePeriodMs = (settings.gracePeriodMinutes || 30) * 60 * 1000;
  const accessGrantedUntil = Date.now() + gracePeriodMs;
  
  await chrome.storage.local.set({ accessGrantedUntil });
  
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'AlgoGate: Grace Period Started',
    message: `You have ${settings.gracePeriodMinutes} minutes of access.`
  });
  
  return { accessGrantedUntil };
}
