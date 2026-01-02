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
  solvedProblemTimestamps: {}, // Track when each problem was solved
  accessGrantedUntil: 0,
  gracePeriodMinutes: 30,
  accessDurationMinutes: 60,
  isEnabled: true,
  lastSolvedProblem: null,
  graceBlockStartedAt: null, // Track when grace period blocking started
  graceBlockSite: null // Track which site triggered grace blocking
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
    startGracePeriod(message.url)
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
    'solvedProblemTimestamps',
    'accessDurationMinutes',
    'isEnabled',
    'graceBlockStartedAt',
    'graceBlockSite'
  ]);
  
  if (!settings.isEnabled) {
    return { message: 'Extension is disabled' };
  }
  
  // Check if this problem was already solved
  const solvedProblems = settings.solvedProblems || [];
  const solvedProblemTimestamps = settings.solvedProblemTimestamps || {};
  const problemId = problemData.problemId || problemData.title;
  
  if (solvedProblems.includes(problemId)) {
    // Check if this problem was solved AFTER the extension was installed
    const solveTimestamp = solvedProblemTimestamps[problemId];
    
    if (!solveTimestamp) {
      // Problem was in the list but has no timestamp - likely from before we tracked timestamps
      // To prevent gaming, we won't grant access for re-solving old problems
      return { 
        alreadySolved: true, 
        message: 'This problem was already solved before. Try a new problem!' 
      };
    }
    
    // Check if problem was solved recently (within last 5 minutes) 
    // This handles the grace period scenario
    const timeSinceSolved = Date.now() - solveTimestamp;
    if (timeSinceSolved < 5 * 60 * 1000) {
      // Recently solved - this might be during a grace period wait
      // Allow access as they genuinely just solved it
    } else {
      return { 
        alreadySolved: true, 
        message: 'This problem was already solved before. Try a new problem!' 
      };
    }
  }
  
  // Add to solved problems with timestamp
  solvedProblems.push(problemId);
  solvedProblemTimestamps[problemId] = Date.now();
  
  // Grant access for the configured duration
  const accessDurationMs = (settings.accessDurationMinutes || 60) * 60 * 1000;
  const accessGrantedUntil = Date.now() + accessDurationMs;
  
  // Clear any active grace block since they solved a problem
  await chrome.storage.local.set({
    solvedProblems,
    solvedProblemTimestamps,
    accessGrantedUntil,
    graceBlockStartedAt: null,
    graceBlockSite: null,
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
    'accessGrantedUntil',
    'graceBlockStartedAt',
    'graceBlockSite',
    'gracePeriodMinutes'
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
  
  // Check if access is still valid (from solving a problem)
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
  
  // Check if user is in a grace period block for this site
  if (settings.graceBlockStartedAt && settings.graceBlockSite) {
    const graceDurationMs = (settings.gracePeriodMinutes || 30) * 60 * 1000;
    const graceElapsed = now - settings.graceBlockStartedAt;
    
    // Check if this is the same site that started the grace block
    const graceBlockHostname = settings.graceBlockSite.toLowerCase();
    const isSameSite = hostname === graceBlockHostname || hostname.endsWith('.' + graceBlockHostname);
    
    if (isSameSite && graceElapsed < graceDurationMs) {
      // Still in grace period blocking - show countdown
      const remainingMs = graceDurationMs - graceElapsed;
      const remainingMinutes = Math.ceil(remainingMs / 60000);
      return { 
        hasAccess: false, 
        reason: 'grace_blocking',
        remainingMinutes,
        message: `Wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} or solve a LeetCode problem`
      };
    } else if (isSameSite && graceElapsed >= graceDurationMs) {
      // Grace period has elapsed - grant access and clear the block
      const accessDurationMs = (settings.accessDurationMinutes || 60) * 60 * 1000;
      const accessGrantedUntil = now + accessDurationMs;
      
      await chrome.storage.local.set({
        graceBlockStartedAt: null,
        graceBlockSite: null,
        accessGrantedUntil
      });
      
      chrome.notifications?.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'AlgoGate: Grace Period Complete',
        message: 'You waited it out! Access granted temporarily.'
      });
      
      const remainingMinutes = Math.ceil(accessDurationMs / 60000);
      return { 
        hasAccess: true, 
        reason: 'grace_completed',
        remainingMinutes
      };
    }
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

// Start grace period - blocks for the duration, then grants access
async function startGracePeriod(siteUrl) {
  const settings = await chrome.storage.local.get(['gracePeriodMinutes']);
  
  // Extract hostname from the site URL
  let hostname;
  try {
    hostname = new URL(siteUrl).hostname.toLowerCase();
  } catch (e) {
    hostname = siteUrl; // Fallback if URL parsing fails
  }
  
  // Start the grace block timer
  await chrome.storage.local.set({ 
    graceBlockStartedAt: Date.now(),
    graceBlockSite: hostname
  });
  
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'AlgoGate: Grace Period Started',
    message: `Stay blocked for ${settings.gracePeriodMinutes} minutes to earn access, or solve a LeetCode problem now!`
  });
  
  return { 
    graceBlockStartedAt: Date.now(),
    gracePeriodMinutes: settings.gracePeriodMinutes 
  };
}
