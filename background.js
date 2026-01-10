/**
 * AlgoGate background service worker
 *
 * This file uses Chrome Declarative Net Request (DNR) to block a hardcoded list of domains.
 * DNR rules run in the network stack (not in JavaScript) and are:
 * - Declarative: you describe match conditions plus an action; the browser enforces them.
 * - Fast: evaluated in native code before requests are sent; no long-running listeners needed.
 * - Scoped by permissions: rules only apply to hosts covered by host_permissions in manifest.json.
 *
 * Core state machine:
 * - LOCKED: user cannot access blocked sites
 * - UNLOCKED: user can access for 60 minutes after solving a problem
 * - GRACE: user is on /problems/ and has 30-minute grace timer (can be paused if they navigate away)
 * - GRACE_OFFERED: 30-minute grace expired, user can optionally unlock for 30 minutes
 */

// Load message definitions and config
importScripts('messages.js');
importScripts('config.js');

// Extract config values for convenience
const BLOCKED_DOMAINS = CONFIG.BLOCKED_DOMAINS;

/**
 * Build DNR rules from the domain list.
 * - urlFilter uses ||domain^ to match the domain and its subdomains.
 * - resourceTypes limited to frames to avoid over-blocking assets.
 */
const buildRules = () =>
  BLOCKED_DOMAINS.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { 
      "type": "redirect",
      "redirect": {
        "extensionPath": `/pages/blocked/blocked.html`
      }
    },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame', 'sub_frame']
    }
  }));

/**
 * Replace all existing dynamic rules with freshly built rules from BLOCKED_DOMAINS.
 * This ensures the rule set matches the current code each time the extension installs/updates.
 */
const refreshRules = () => {
  const rules = buildRules();

  chrome.declarativeNetRequest.getDynamicRules((existingRules) => {
    const removeRuleIds = existingRules.map((rule) => rule.id);

    chrome.declarativeNetRequest.updateDynamicRules(
      { addRules: rules, removeRuleIds },
      () => {
        if (chrome.runtime.lastError) {
          console.error('AlgoGate: failed to update blocking rules', chrome.runtime.lastError);
          return;
        }
        console.log(`AlgoGate: updated ${rules.length} blocking rules`);
      }
    );
  });
};

/**
 * Remove all blocking rules (unlock social sites).
 */
const unlockSites = async () => {
  const ruleIds = BLOCKED_DOMAINS.map((_, i) => i + 1);
  return new Promise((resolve) => {
    chrome.declarativeNetRequest.updateDynamicRules(
      { removeRuleIds: ruleIds },
      () => {
        if (chrome.runtime.lastError) {
          console.error('AlgoGate: failed to unlock sites', chrome.runtime.lastError);
          resolve(false);
          return;
        }
        console.log('AlgoGate: sites unlocked (DNR rules removed)');
        resolve(true);
      }
    );
  });
};

/**
 * Re-add all blocking rules (lock social sites).
 */
const lockSites = async () => {
  const rules = buildRules();
  return new Promise((resolve) => {
    chrome.declarativeNetRequest.updateDynamicRules(
      { addRules: rules },
      () => {
        if (chrome.runtime.lastError) {
          console.error('AlgoGate: failed to lock sites', chrome.runtime.lastError);
          resolve(false);
          return;
        }
        console.log('AlgoGate: sites locked (DNR rules added)');
        resolve(true);
      }
    );
  });
};

/**
 * Initialize storage schema on first run or upgrade.
 */
const initializeStorage = async () => {
  const result = await chrome.storage.local.get();
  
  // Only set defaults for fields that don't exist
  const defaults = {};
  if (!('unlockUntil' in result)) defaults.unlockUntil = null;
  if (!('graceStarted' in result)) defaults.graceStarted = null;
  if (!('graceExpires' in result)) defaults.graceExpires = null;
  if (!('graceOffered' in result)) defaults.graceOffered = false;
  if (!('lastRedirectedDomain' in result)) defaults.lastRedirectedDomain = null;
  if (!('lastRedirectedAt' in result)) defaults.lastRedirectedAt = null;

  if (Object.keys(defaults).length > 0) {
    await chrome.storage.local.set(defaults);
  }
};

/**
 * Calculate current gate status (locked/unlocked, grace state, timers).
 */
const calculateGateStatus = async () => {
  const storage = await chrome.storage.local.get([
    'unlockUntil',
    'graceStarted',
    'graceExpires',
    'graceOffered'
  ]);

  const now = Date.now();
  
  // Check if main unlock is still active
  const unlockUntil = storage.unlockUntil || null;
  const isUnlocked = unlockUntil && now < unlockUntil;
  const secondsRemaining = isUnlocked ? Math.max(0, Math.floor((unlockUntil - now) / 1000)) : 0;

  // Check if grace timer is active
  const graceStarted = storage.graceStarted || null;
  const graceExpires = storage.graceExpires || null;
  const graceOffered = storage.graceOffered || false;
  
  const graceActive = graceStarted && graceExpires && now < graceExpires && !graceOffered;
  const graceSecondsRemaining = graceActive ? Math.max(0, Math.floor((graceExpires - now) / 1000)) : 0;

  return {
    locked: !isUnlocked,
    unlockUntil,
    secondsRemaining,
    graceActive,
    graceSecondsRemaining,
    graceOffered
  };
};

/**
 * Broadcast gate status to all tabs.
 */
const broadcastGateStatus = async () => {
  const status = await calculateGateStatus();
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    chrome.tabs.sendMessage(tab.id, {
      type: MSG.GATE_STATUS,
      payload: status
    }).catch(() => {
      // Tab may not have listener, ignore
    });
  }
};

/**
 * Handle problem solved: only unlock if it's a NEWLY solved problem.
 * Already-solved problems are tracked but don't grant access.
 * Cancel any grace timer and offer when unlocking.
 */
const handleProblemSolved = async (payload) => {
  const isNewSolve = payload.isNewSolve !== false; // default to true if not specified
  console.log('AlgoGate: Problem detected!', { ...payload, isNewSolve });

  const now = Date.now();

  // Store in history regardless of whether it's new or already-solved
  const storage = await chrome.storage.local.get('solvedProblems');
  const solves = storage.solvedProblems || [];
  solves.push({
    slug: payload.problemSlug,
    timestamp: payload.timestamp || now,
    title: payload.title || 'Unknown Problem',
    isNewSolve: isNewSolve
  });
  await chrome.storage.local.set({ solvedProblems: solves });

  // Only unlock if this is a NEW solve
  if (!isNewSolve) {
    console.log('AlgoGate: Already-solved problem detected, not granting access');
    return;
  }

  console.log('AlgoGate: NEW problem solved! Granting 60-minute access.');

  const unlockDuration = CONFIG.UNLOCK_DURATION;

  // Clear any grace state (real unlock replaces grace)
  await chrome.storage.local.set({
    unlockUntil: now + unlockDuration,
    graceStarted: null,
    graceExpires: null,
    graceOffered: false
  });

  // Cancel grace alarm if active
  chrome.alarms.clear('graceTimer', () => {
    console.log('AlgoGate: Grace timer cancelled (real unlock)');
  });

  // Unlock sites immediately
  await unlockSites();

  // Set alarm to re-lock after 60 minutes
  chrome.alarms.create('relockTimer', { 
    when: now + unlockDuration
  });

  // Broadcast new status
  await broadcastGateStatus();
};

/**
 * Start grace timer: user is on /problems/ while locked.
 * 30-minute countdown before offering unlock option.
 */
const handleStartGraceTimer = async () => {
  const storage = await chrome.storage.local.get('graceStarted');
  
  // Don't restart if already active
  if (storage.graceStarted) {
    console.log('AlgoGate: Grace timer already active, ignoring START_GRACE_TIMER');
    return;
  }

  const now = Date.now();
  const graceDuration = CONFIG.GRACE_DURATION;
  const graceExpires = now + graceDuration;

  await chrome.storage.local.set({
    graceStarted: now,
    graceExpires: graceExpires,
    graceOffered: false
  });

  // Set alarm to expire after 30 minutes
  chrome.alarms.create('graceTimer', {
    when: graceExpires
  });

  console.log('AlgoGate: Grace timer started, 30 minutes');
  await broadcastGateStatus();
};

/**
 * URL changed: user may have navigated away from /problems/.
 * If they left, pause the grace timer (clear alarm but keep state).
 * If they returned, resume the timer.
 */
const handleUrlChanged = async (payload) => {
  const isOnProblems = payload.isOnProblems;
  const storage = await chrome.storage.local.get(['graceStarted', 'graceExpires']);

  if (!isOnProblems && storage.graceStarted) {
    // User left /problems/ - pause grace timer by clearing alarm
    // (can be resumed if they return to /problems/)
    console.log('AlgoGate: User left /problems/, pausing grace timer');
    chrome.alarms.clear('graceTimer', () => {});
    // Don't clear storage - grace state is paused, not cancelled
  } else if (isOnProblems && storage.graceStarted && storage.graceExpires) {
    // User returned to /problems/ - resume grace timer
    const now = Date.now();
    if (now < storage.graceExpires) {
      console.log('AlgoGate: User returned to /problems/, resuming grace timer');
      chrome.alarms.create('graceTimer', {
        when: storage.graceExpires
      });
    }
  }

  await broadcastGateStatus();
};

/**
 * Grace timer expired: offer user the option to unlock for 30 minutes.
 * (No notification per user request - only inform via UI)
 */
const handleGraceTimerExpired = async () => {
  console.log('AlgoGate: Grace timer expired, offering unlock option');

  await chrome.storage.local.set({ graceOffered: true });
  await broadcastGateStatus();
};

/**
 * User accepts grace unlock: grant 30 minutes of access.
 */
const handleAcceptGrace = async (payload) => {
  const graceDuration = payload.graceDuration || CONFIG.GRACE_UNLOCK_DURATION;

  const now = Date.now();
  await chrome.storage.local.set({
    unlockUntil: now + graceDuration,
    graceStarted: null,
    graceExpires: null,
    graceOffered: false
  });

  // Unlock sites
  await unlockSites();

  // Set alarm to re-lock after grace duration
  chrome.alarms.create('relockTimer', {
    when: now + graceDuration
  });

  console.log(`AlgoGate: Grace unlock accepted, ${graceDuration / 1000 / 60} minutes granted`);
  await broadcastGateStatus();
};

/**
 * Unlock timer expired: re-lock social sites.
 */
const handleRelockTimerExpired = async () => {
  console.log('AlgoGate: Unlock timer expired, re-locking sites');

  await chrome.storage.local.set({
    unlockUntil: null,
    graceStarted: null,
    graceExpires: null,
    graceOffered: false
  });

  // Re-add blocking rules
  await lockSites();
  await broadcastGateStatus();
};

/**
 * Register rules when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener(async () => {
  await initializeStorage();
  refreshRules();
  console.log('AlgoGate: Extension installed/updated');
});

/**
 * On browser startup: check if unlock expired while browser was closed.
 */
chrome.runtime.onStartup.addListener(async () => {
  await initializeStorage();
  const storage = await chrome.storage.local.get('unlockUntil');
  const now = Date.now();

  if (storage.unlockUntil && now > storage.unlockUntil) {
    console.log('AlgoGate: Unlock expired during browser closure, re-locking');
    await handleRelockTimerExpired();
  } else if (storage.unlockUntil) {
    // Unlock still active, make sure sites are unlocked and set alarm
    console.log('AlgoGate: Restoring unlock state after browser restart');
    const remainingTime = storage.unlockUntil - now;
    if (remainingTime > 0) {
      chrome.alarms.create('relockTimer', {
        when: storage.unlockUntil
      });
    }
  } else {
    // Locked state - ensure rules are in place
    console.log('AlgoGate: Browser startup with locked state');
    refreshRules();
  }
});

/**
 * Handle alarm events (grace timer and relock timer).
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'graceTimer') {
    await handleGraceTimerExpired();
  } else if (alarm.name === 'relockTimer') {
    await handleRelockTimerExpired();
  }
});

/**
 * Handle redirect tracking (when user hits blocked site).
 */
chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(
  async ({ rule, request }) => {
    // Only care about navigation redirects
    if (request.type !== "main_frame") return;
    
    // Extract original domain
    const originalUrl = new URL(request.url);
    const domain = originalUrl.hostname;

    const { lastRedirectedDomain } = await chrome.storage.local.get("lastRedirectedDomain");
    
    // Store redirect info
    if (lastRedirectedDomain !== domain) {
      const now = Date.now();
      console.log('AlgoGate: Redirect detected for domain:', domain);
      await chrome.storage.local.set({
        lastRedirectedDomain: domain,
        lastRedirectedAt: now,
        ruleId: rule.ruleId
      });
    }
  }
);

/**
 * Handle incoming messages from content scripts and UIs.
 */
chrome.runtime.onMessage.addListener(
  (message, sender, sendResponse) => {
    // Validate message
    const validation = validateMessage(message);
    if (!validation.ok) {
      console.error('AlgoGate: Invalid message received:', validation.error);
      sendResponse({ error: validation.error });
      return;
    }

    const { type, payload } = message;

    // Handle messages asynchronously
    (async () => {
      try {
        if (type === MSG.LEETCODE_SOLVED) {
          await handleProblemSolved(payload);
          sendResponse({ success: true });

        } else if (type === MSG.START_GRACE_TIMER) {
          await handleStartGraceTimer();
          sendResponse({ success: true });

        } else if (type === MSG.URL_CHANGED) {
          await handleUrlChanged(payload);
          sendResponse({ success: true });

        } else if (type === MSG.ACCEPT_GRACE) {
          await handleAcceptGrace(payload);
          sendResponse({ success: true });

        } else if (type === MSG.GET_GATE_STATUS) {
          const status = await calculateGateStatus();
          sendResponse({ success: true, data: status });

        } else if (type === 'GET_REDIRECT_TIME') {
          // Legacy message support for blocked.js timer
          const { lastRedirectedAt } = await chrome.storage.local.get('lastRedirectedAt');
          sendResponse({ data: lastRedirectedAt });

        } else {
          sendResponse({ error: `Unknown message type: ${type}` });
        }
      } catch (err) {
        console.error('AlgoGate: Error handling message:', err);
        sendResponse({ error: err.message });
      }
    })();

    // REQUIRED for async responses
    return true;
  }
);