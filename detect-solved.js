// Task: detect when a NEW problem is opened, then when THAT problem is solved (Accepted), log to console.

(function () {
  "use strict";

  console.log("AlgoGate: LeetCode detector initialized");

  // Track current problem (slug) and whether we already logged "solved" for it
  let currentProblemSlug = null;
  let solvedLoggedForCurrent = false;

  // Optional: if you still want periodic checking
  let checkInterval = null;

  // Returns the slug from URLs like /problems/two-sum/...
  function getProblemSlug() {
    const match = window.location.pathname.match(/\/problems\/([^/]+)/);
    return match ? match[1] : null;
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

    console.log("AlgoGate:  New problem detected:", {
      slug: currentProblemSlug,
      title: getProblemTitle(),
      url: window.location.href,
      seenAt: new Date().toISOString(),
    });
  }

  function startMonitoring() {
    // Check once immediately
    checkForNewProblem();
    checkForSolution();

    // check every 2 seconds
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(() => {
      checkForNewProblem();
      checkForSolution();
    }, 2000);
  }

  // Detects when we navigated to a new problem (slug changes)
  function checkForNewProblem() {
    const slug = getProblemSlug();
    if (!slug) return; // not on /problems/... page

    if (slug !== currentProblemSlug) {
      handleNewProblem(slug);
    }
  }

  // Detects if the current problem is solved (Accepted appeared)
  function checkForSolution() {
    // Must be on a problem first
    if (!currentProblemSlug) return;

    // If we already logged solved for this problem, don’t spam
    if (solvedLoggedForCurrent) return;

    // Look for the exact “Accepted” submission element
    const submissionResultSpan = document.querySelector(
      'span[data-e2e-locator="submission-result"]'
    );

    if (!submissionResultSpan) return;

    const resultText = submissionResultSpan.textContent.trim();
    if (resultText !== "Accepted") return;

    // Mark as solved so we don’t log again every 2 seconds
    solvedLoggedForCurrent = true;

    console.log("AlgoGate:  Problem solved (Accepted)!", {
      slug: currentProblemSlug,
      title: getProblemTitle(),
      url: window.location.href,
      solvedAt: new Date().toISOString(),
    });
  }

  //monitoring on load
 
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startMonitoring);
  } else {
    startMonitoring();
  }

  // SPA navigation detection
  // This resets/updates immediately when LeetCode changes URL without full reload.
  let lastUrl = window.location.href;

  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;

      // When URL changes, re-check problem slug right away
      checkForNewProblem();

      //  You can log navigation too
      console.log("AlgoGate: SPA navigation detected:", currentUrl);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();