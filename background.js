/**
 * AlgoGate background service worker
 *
 * This file uses Chrome Declarative Net Request (DNR) to block a hardcoded list of domains.
 * DNR rules run in the network stack (not in JavaScript) and are:
 * - Declarative: you describe match conditions plus an action; the browser enforces them.
 * - Fast: evaluated in native code before requests are sent; no long-running listeners needed.
 * - Scoped by permissions: rules only apply to hosts covered by host_permissions in manifest.json.
 *
 * Rule anatomy used here:
 * - id: unique per rule (integer).
 * - priority: higher wins when multiple match; we keep all at 1 for simplicity.
 * - action: block (deny the request).
 * - condition: urlFilter string in ABP-style syntax (||domain^ matches domain + subdomains) and resourceTypes.
 *
 * Dynamic rules: stored by Chrome and persisted across restarts. We overwrite them on install/update.
 */

/**
 * Domains to block. Update this list to change what the extension blocks.
 * Though you should also update manifest.json's host_permissions to match.
 */
const BLOCKED_DOMAINS = [
  'facebook.com',
  'x.com',
  'instagram.com',
  'tiktok.com',
  'youtube.com',
  'reddit.com'
];

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
        "extensionPath": "/blocked.html"
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
 * Register rules when the extension is installed or updated.
 */
chrome.runtime.onInstalled.addListener(() => {
  refreshRules();
});
