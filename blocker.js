// Content script for blocked sites
// Blocks access until LeetCode problem is solved or grace period is active

(function() {
  'use strict';
  
  console.log('AlgoGate: Blocker initialized');
  
  let accessStatus = null;
  let checkingAccess = false;
  
  // Check access status
  async function checkAccess() {
    if (checkingAccess) return;
    checkingAccess = true;
    
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CHECK_ACCESS',
        url: window.location.href
      });
      
      accessStatus = response;
      
      if (!response.hasAccess) {
        blockPage();
      } else {
        // Allow access but might want to show a reminder
        if (response.reason === 'granted' && response.remainingMinutes) {
          showAccessReminder(response.remainingMinutes);
        }
      }
    } catch (error) {
      console.error('AlgoGate: Error checking access:', error);
    } finally {
      checkingAccess = false;
    }
  }
  
  // Block the page
  function blockPage() {
    console.log('AlgoGate: Blocking page access');
    
    // Create overlay instead of clearing page
    // Remove any existing block screen first
    const existingBlock = document.getElementById('algogate-block-screen');
    if (existingBlock) {
      return; // Already blocked
    }
    
    // Create block screen overlay
    const blockScreen = document.createElement('div');
    blockScreen.id = 'algogate-block-screen';
    blockScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;
    
    blockScreen.innerHTML = `
      <div style="
        background: white;
        border-radius: 24px;
        padding: 60px 80px;
        max-width: 600px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      ">
        <div style="font-size: 80px; margin-bottom: 20px;">🔒</div>
        <h1 style="
          font-size: 36px;
          font-weight: 700;
          color: #1a202c;
          margin: 0 0 16px 0;
        ">Access Blocked</h1>
        <p style="
          font-size: 18px;
          color: #4a5568;
          line-height: 1.6;
          margin: 0 0 32px 0;
        ">
          Time to grind! Solve a new LeetCode problem to unlock access to this site.
        </p>
        
        <div style="
          background: #f7fafc;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 32px;
        ">
          <div style="
            font-size: 14px;
            color: #718096;
            margin-bottom: 12px;
            font-weight: 500;
          ">How it works:</div>
          <ol style="
            text-align: left;
            color: #4a5568;
            font-size: 16px;
            line-height: 1.8;
            margin: 0;
            padding-left: 20px;
          ">
            <li>Go to <a href="https://leetcode.com/problemset/" target="_blank" style="color: #667eea; text-decoration: none; font-weight: 600;">LeetCode.com</a></li>
            <li>Solve a problem you haven't solved before</li>
            <li>Get your submission accepted</li>
            <li>Access will be automatically granted!</li>
          </ol>
        </div>
        
        <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
          <button id="algogate-goto-leetcode" style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          ">Go to LeetCode</button>
          
          <button id="algogate-grace-period" style="
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
            padding: 14px 32px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          ">Use Grace Period</button>
        </div>
        
        <div style="
          margin-top: 24px;
          font-size: 13px;
          color: #a0aec0;
        ">
          Can't solve a problem? Use the grace period for temporary access.
        </div>
      </div>
    `;
    
    // Add hover effects via inline event listeners
    const goToLeetCodeBtn = blockScreen.querySelector('#algogate-goto-leetcode');
    goToLeetCodeBtn.addEventListener('mouseenter', () => {
      goToLeetCodeBtn.style.transform = 'translateY(-2px)';
      goToLeetCodeBtn.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.4)';
    });
    goToLeetCodeBtn.addEventListener('mouseleave', () => {
      goToLeetCodeBtn.style.transform = 'translateY(0)';
      goToLeetCodeBtn.style.boxShadow = 'none';
    });
    goToLeetCodeBtn.addEventListener('click', () => {
      window.location.href = 'https://leetcode.com/problemset/';
    });
    
    const gracePeriodBtn = blockScreen.querySelector('#algogate-grace-period');
    gracePeriodBtn.addEventListener('mouseenter', () => {
      gracePeriodBtn.style.background = '#667eea';
      gracePeriodBtn.style.color = 'white';
      gracePeriodBtn.style.transform = 'translateY(-2px)';
    });
    gracePeriodBtn.addEventListener('mouseleave', () => {
      gracePeriodBtn.style.background = 'white';
      gracePeriodBtn.style.color = '#667eea';
      gracePeriodBtn.style.transform = 'translateY(0)';
    });
    gracePeriodBtn.addEventListener('click', handleGracePeriod);
    
    document.documentElement.appendChild(blockScreen);
    
    // Prevent scrolling of page beneath
    document.body.style.overflow = 'hidden';
  }
  
  // Handle grace period activation
  async function handleGracePeriod() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'START_GRACE_PERIOD'
      });
      
      if (response.success) {
        // Reload the page to grant access
        window.location.reload();
      }
    } catch (error) {
      console.error('AlgoGate: Error starting grace period:', error);
      alert('Failed to start grace period. Please try again.');
    }
  }
  
  // Show access reminder at top of page
  function showAccessReminder(remainingMinutes) {
    // Only show once per page load
    if (document.getElementById('algogate-reminder')) return;
    
    const reminder = document.createElement('div');
    reminder.id = 'algogate-reminder';
    reminder.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483646;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    
    reminder.innerHTML = `
      <span style="font-weight: 600;">⏰ AlgoGate:</span>
      <span style="margin-left: 8px;">
        ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''} of access remaining
      </span>
      <button id="algogate-dismiss-reminder" style="
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        padding: 4px 12px;
        border-radius: 4px;
        margin-left: 16px;
        cursor: pointer;
        font-size: 12px;
      ">Dismiss</button>
    `;
    
    document.body.appendChild(reminder);
    
    document.getElementById('algogate-dismiss-reminder').addEventListener('click', () => {
      reminder.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (reminder.parentNode) {
        reminder.style.transition = 'opacity 0.3s';
        reminder.style.opacity = '0';
        setTimeout(() => reminder.remove(), 300);
      }
    }, 10000);
  }
  
  // Prevent any sneaky bypasses
  function preventBypass() {
    // Disable common bypass techniques
    document.addEventListener('DOMContentLoaded', (e) => {
      if (!accessStatus || !accessStatus.hasAccess) {
        e.stopImmediatePropagation();
      }
    }, true);
    
    // Prevent back button bypass
    window.addEventListener('popstate', () => {
      if (!accessStatus || !accessStatus.hasAccess) {
        checkAccess();
      }
    });
  }
  
  // Initialize
  checkAccess();
  preventBypass();
  
  // Periodically recheck access (in case it expires while on the page)
  setInterval(checkAccess, 60000); // Check every minute
  
})();
