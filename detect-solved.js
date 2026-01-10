// Task: detect when a NEW problem is opened, then when THAT problem is solved (Accepted OR already-solved badge), log to console.
// if the problem was solved BEFORE the extension existed, we still detect it and log the solved timestamp from the page.

(function () {
  "use strict";

  console.log("AlgoGate: LeetCode detector initialized");

  // Track current problem and whether we already logged "solved" for it
  let currentProblemSlug = null;
  let solvedLoggedForCurrent = false;

  // Track whether we're waiting for DOM to stabilize (to prevent premature checks)
  let waitingForDomStability = false;

  // periodic checking
  let checkInterval = null;

  // Returns the slug from URLs 
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
  }

  // Check if we're on /problems/ path (any subpath)
  function isOnProblemsPath() {
    return /^\/problems\//.test(window.location.pathname);
  }

  // Best-effort title (meta is usually stable)
  function getProblemTitle() {
    const og = document.querySelector('meta[property="og:title"]')?.content;
    if (og) return og.replace(" - LeetCode", "").trim();

    const h1 = document.querySelector("h1")?.textContent?.trim();
    return h1 || currentProblemSlug || "Unknown Problem";
  }

  // Called when we detect we’re on a new problem slug
  function handleNewProblem(slug) {
    currentProblemSlug = slug;
    solvedLoggedForCurrent = false; // reset solved state for the new problem

    console.log("AlgoGate: 🆕 New problem detected:", {
      slug: currentProblemSlug,
      title: getProblemTitle(),
      url: window.location.href,
      seenAt: new Date().toISOString(),
    });

    // For problem description pages, wait for title element to update
    if (isOnProblemDescriptionPage()) {
      waitingForDomStability = true; // Block interval checks
      waitForTitleElement(slug);
    } else {
      // For other pages (submissions, editorial, etc.), check immediately
      waitingForDomStability = false;
      checkForSolution();
    }
  }

  // Check if we're on a problem description page (not submissions, editorial, etc.)
  function isOnProblemDescriptionPage() {
    const path = window.location.pathname;
    return /^\/problems\/[^\/]+\/?$/.test(path) || /^\/problems\/[^\/]+\/description\/?/.test(path);
  }

  /**
   * Wait for the problem title div to appear/update using polling.
   * This ensures the DOM has fully updated before checking solved status.
   */
  function waitForTitleElement(slug) {
    let attempts = 0;
    const maxAttempts = 20; // 20 * 250ms = 5 seconds max

    const checkTitle = () => {
      // User navigated away
      if (currentProblemSlug !== slug) return;

      attempts++;
      
      // Look for the specific title div
      const titleDiv = document.querySelector('div.text-title-large a[href^="/problems/"]');
      
      if (titleDiv) {
        const titleHref = titleDiv.getAttribute('href') || "";

        // Check if the href matches our current slug
        if (titleHref.includes(`/problems/${slug}`)) {
          waitingForDomStability = false; // Allow interval checks now
          // Wait a bit for old DOM to fully clear before checking solution
          setTimeout(checkForSolution, 100);
          return;
        }
      }

      // Timeout - proceed anyway
      if (attempts >= maxAttempts) {
        waitingForDomStability = false; // Allow interval checks now
        // Wait a bit for DOM to stabilize even on timeout
        setTimeout(checkForSolution, 100);
        return;
      }

      // Check again
      setTimeout(checkTitle, 250);
    };

    // Start checking after a brief initial delay
    setTimeout(checkTitle, 200);
  }


  /**
   * Detect if users already solved the problem long ago.
   * Looks for the specific "Solved" badge structure with checkmark SVG.
   */
  function pageLooksSolvedAlready() {
    // Look for divs with "Solved" text that have the success message styling
    const divs = document.querySelectorAll('div.text-body, div[class*="text-message-success"]');

    for (const div of divs) {
      const text = (div.textContent || "").trim();
      
      // Must contain "Solved" text
      if (!/^Solved$/i.test(text)) continue;

      // Must have success styling (green checkmark)
      const hasSvg = div.querySelector('svg');
      const hasSuccessClass = 
        div.className.includes('text-message-success') ||
        (hasSvg && hasSvg.className.baseVal && hasSvg.className.baseVal.includes('text-message-success'));

      if (hasSvg && hasSuccessClass) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse timestamp formats.
   * Returns milliseconds since epoch, or null if we can't parse.
   */
  function parseLeetCodeDateToMs(text) {
    if (!text) return null;
    const t = text.trim().replace(/\s+/g, " ");

    // Format A: "May 01, 2024 03:25" or "May 1, 2024 3:25 PM"
    let m = t.match(
      /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i
    );
    if (m) {
      const [, monStrRaw, dayStr, yearStr, hhStr, mmStr, ampmRaw] = m;
      const monStr = monStrRaw[0].toUpperCase() + monStrRaw.slice(1, 3).toLowerCase();

      const monthMap = {
        Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
        Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
      };

      const month = monthMap[monStr];
      if (month === undefined) return null;

      let hh = Number(hhStr);
      const mm = Number(mmStr);
      const day = Number(dayStr);
      const year = Number(yearStr);

      // Handle AM/PM if present
      if (ampmRaw) {
        const ampm = ampmRaw.toUpperCase();
        if (ampm === "PM" && hh < 12) hh += 12;
        if (ampm === "AM" && hh === 12) hh = 0;
      }

      const d = new Date(year, month, day, hh, mm, 0, 0); // local time
      const ms = d.getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    // Format B: "2024-05-01 03:25" (optionally with seconds)
    m = t.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m) {
      const [, y, mo, d, hh, mm, ss] = m;
      const date = new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(hh),
        Number(mm),
        ss ? Number(ss) : 0,
        0
      );
      const ms = date.getTime();
      return Number.isFinite(ms) ? ms : null;
    }

    // Final fallback: let JS try (may work for other formats)
    const ms = Date.parse(t);
    return Number.isFinite(ms) ? ms : null;
  }

  /**
   * Find a likely "submission time" from the page (best-effort).
   * We scan some common spans and also a small chunk of page text for date-like strings.
   * Then we pick the most recent timestamp that isn't in the future.
   */
  function findBestTimestampMsFromDom() {
    const candidates = [];

    // Your earlier "timestamp spans" idea (often contains submitted-at text)
    document.querySelectorAll("span.max-w-full.truncate").forEach((el) => {
      const ms = parseLeetCodeDateToMs(el.textContent);
      if (ms) candidates.push(ms);
    });

    // Lightweight text scan for patterns like "May 1, 2024 3:25" in top chunk
    const chunk = (document.body?.innerText || "").slice(0, 8000);

    const regexA = /\b[A-Za-z]{3}\s+\d{1,2},\s+\d{4}\s+\d{1,2}:\d{2}(?:\s*(?:AM|PM))?\b/gi;
    const matchesA = chunk.match(regexA) || [];
    for (const s of matchesA) {
      const ms = parseLeetCodeDateToMs(s);
      if (ms) candidates.push(ms);
    }

    const regexB = /\b\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}(?::\d{2})?\b/g;
    const matchesB = chunk.match(regexB) || [];
    for (const s of matchesB) {
      const ms = parseLeetCodeDateToMs(s);
      if (ms) candidates.push(ms);
    }

    if (candidates.length === 0) return null;

    const now = Date.now();
    const past = candidates.filter((ms) => ms <= now + 5000); // allow tiny skew
    if (past.length === 0) return null;

    // most recent past timestamp
    return Math.max(...past);
  }

  // Monitoring
  function startMonitoring() {
    // Check for new problem (which will trigger delayed solution check if it's a new problem)
    checkForNewProblem();
    
    // Don't check solution immediately - let handleNewProblem's timeout handle it
    // to avoid race conditions with DOM updates

    // check every 2 seconds for new problems and solutions
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      checkForNewProblem();
      checkForSolution();
      notifyUrlChanged(); // Check and notify about /problems/ path changes
    }, 2000);

    // Initial URL change notification
    notifyUrlChanged();
  }

  /**
   * Notify background if user is on /problems/ path or left it.
   * This controls grace timer pause/resume.
   */
  let lastOnProblemsState = null;
  function notifyUrlChanged() {
    const isOnProblems = isOnProblemsPath();

    // Only notify when state changes
    if (lastOnProblemsState === isOnProblems) {
      return;
    }
    lastOnProblemsState = isOnProblems;

    chrome.runtime.sendMessage({
      type: MSG.URL_CHANGED,
      payload: { isOnProblems: isOnProblems }
    }).catch((err) => {
      console.error('AlgoGate: Failed to send URL_CHANGED:', err);
    });

    // If on /problems/ and locked, try to start grace timer
    if (isOnProblems) {
      checkIfShouldStartGrace();
    }
  }

  /**
   * Check current gate status and start grace timer if locked and on /problems/.
   */
  function checkIfShouldStartGrace() {
    chrome.runtime.sendMessage(
      { type: MSG.GET_GATE_STATUS },
      (response) => {
        if (response && response.data && response.data.locked) {
          // User is locked, on /problems/, and not already in grace - start it
          if (!response.data.graceActive && !response.data.graceOffered) {
            chrome.runtime.sendMessage({
              type: MSG.START_GRACE_TIMER
            }).catch((err) => {
              console.error('AlgoGate: Failed to send START_GRACE_TIMER:', err);
            });
          }
        }
      }
    );
  }

  // Detects when we navigated to a new problem 
  function checkForNewProblem() {
    const slug = getProblemSlug();
    if (!slug) return; // not on /problems/... page

    if (slug !== currentProblemSlug) {
      handleNewProblem(slug);
    }
  }

  /**
   * Detects if the current problem is solved
   *  - Case 1: Fresh submission UI shows "Accepted"
   *  - Case 2: Problem already solved (Solved badge/status) even without a fresh submission
   *
   * Timestamp behavior:
   *  - If we can parse a timestamp from the page and it’s in the past, we log THAT time.
   *  - If we can’t find a timestamp for "already solved", we log solvedAt: null (so we don’t lie with "now").
   */
  function checkForSolution() {
    // Must be on a problem first
    if (!currentProblemSlug) return;

    // If we already logged solved for this problem, don’t spam
    if (solvedLoggedForCurrent) return;

    // Don't check if we're still waiting for DOM to stabilize
    if (waitingForDomStability) return;

    // Case 1: "Accepted" result appears after submitting 
    const submissionResultSpan = document.querySelector(
      'span[data-e2e-locator="submission-result"]'
    );

    if (submissionResultSpan) {
      const resultText = submissionResultSpan.textContent.trim();
      if (resultText === "Accepted") {
        solvedLoggedForCurrent = true;

        const tsMs = findBestTimestampMsFromDom(); // best-effort
        const solvedAtMs = tsMs || Date.now();
        const solvedAtIso = new Date(solvedAtMs).toISOString();

        console.log("AlgoGate: ✅ Problem solved (Accepted)!", {
          slug: currentProblemSlug,
          title: getProblemTitle(),
          url: window.location.href,
          solvedAt: solvedAtIso,
          source: tsMs ? "parsed-timestamp" : "fallback-now",
        });

        // Send LEETCODE_SOLVED message to background (isNewSolve=true for fresh Accepted)
        chrome.runtime.sendMessage({
          type: MSG.LEETCODE_SOLVED,
          payload: {
            problemSlug: currentProblemSlug,
            timestamp: solvedAtMs,
            title: getProblemTitle(),
            isNewSolve: true
          }
        }).catch((err) => {
          console.error('AlgoGate: Failed to send LEETCODE_SOLVED:', err);
        });

        return;
      }
    }

    // Case 2: Already solved BEFORE extension
    if (pageLooksSolvedAlready()) {
      solvedLoggedForCurrent = true;

      const tsMs = findBestTimestampMsFromDom(); // might be null on some pages
      console.log("AlgoGate: ✅ Problem already solved (badge)!", {
        slug: currentProblemSlug,
        title: getProblemTitle(),
        url: window.location.href,
        solvedAt: tsMs ? new Date(tsMs).toISOString() : null,
        source: tsMs ? "parsed-timestamp" : "unknown",
      });

      // Send LEETCODE_SOLVED message to background (isNewSolve=false for already-solved badge)
      chrome.runtime.sendMessage({
        type: MSG.LEETCODE_SOLVED,
        payload: {
          problemSlug: currentProblemSlug,
          timestamp: tsMs || Date.now(),
          title: getProblemTitle(),
          isNewSolve: false
        }
      }).catch((err) => {
        console.error('AlgoGate: Failed to send LEETCODE_SOLVED:', err);
      });
    }
  }

  // Start monitoring on load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startMonitoring);
  } else {
    startMonitoring();
  }

  // SPA navigation detection
  let lastUrl = window.location.href;

  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // When URL changes, re-check problem slug right away (this will reset solved state)
      checkForNewProblem();

      console.log("AlgoGate: 🔁 SPA navigation detected:", currentUrl);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();