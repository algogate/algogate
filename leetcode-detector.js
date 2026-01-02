// Content script for LeetCode.com
// Detects when a user successfully solves a problem

(function() {
  'use strict';
  
  console.log('AlgoGate: LeetCode detector initialized');
  
  let lastCheckedProblem = null;
  let checkInterval = null;
  
  // Start monitoring for problem solutions
  function startMonitoring() {
    // Check immediately
    checkForSolution();
    
    // Then check periodically
    if (checkInterval) {
      clearInterval(checkInterval);
    }
    checkInterval = setInterval(checkForSolution, 2000);
  }
  
  // Check if a problem was just solved
  function checkForSolution() {
    // Method 1: Check for success notification/modal
    const successIndicators = [
      // Success notification text
      document.querySelector('[data-e2e-locator="submission-result"]'),
      // Accepted status
      ...document.querySelectorAll('[class*="accepted"]'),
      ...document.querySelectorAll('[class*="Accepted"]'),
      // Success message
      ...document.querySelectorAll('div, span')
    ].filter(el => {
      if (!el || !el.textContent) return false;
      const text = el.textContent.toLowerCase();
      return text.includes('accepted') || 
             text.includes('success') ||
             text.includes('congratulations');
    });
    
    if (successIndicators.length > 0) {
      // Extract problem information
      const problemInfo = extractProblemInfo();
      
      // Avoid duplicate notifications for the same problem
      const problemKey = `${problemInfo.problemId}_${problemInfo.title}`;
      if (lastCheckedProblem === problemKey) {
        return;
      }
      
      lastCheckedProblem = problemKey;
      
      // Verify it's actually accepted (not just "Wrong Answer" text containing "Accepted")
      const isAccepted = Array.from(document.querySelectorAll('*')).some(el => {
        const classList = Array.from(el.classList || []).join(' ').toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();
        
        // Look for explicit "Accepted" verdict
        return (classList.includes('accepted') || text === 'accepted') &&
               !text.includes('wrong') &&
               !text.includes('error') &&
               !text.includes('failed');
      });
      
      if (isAccepted) {
        console.log('AlgoGate: Problem solved!', problemInfo);
        notifyProblemSolved(problemInfo);
      }
    }
  }
  
  // Extract problem information from the page
  function extractProblemInfo() {
    // Try to get problem title
    let title = 'Unknown Problem';
    const titleSelectors = [
      '[data-cy="question-title"]',
      'div[data-track-load="description_content"] a',
      'div.question-title',
      '.css-v3d350',
      'div[class*="title"]'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = document.querySelector(selector);
      if (titleEl && titleEl.textContent.trim()) {
        title = titleEl.textContent.trim();
        break;
      }
    }
    
    // Try to extract problem ID from URL or title
    let problemId = null;
    const urlMatch = window.location.pathname.match(/\/problems\/([^\/]+)/);
    if (urlMatch) {
      problemId = urlMatch[1];
    } else {
      // Extract from title like "1. Two Sum"
      const titleMatch = title.match(/^(\d+)\.\s*/);
      if (titleMatch) {
        problemId = titleMatch[1];
      }
    }
    
    // Get difficulty if available
    let difficulty = 'Unknown';
    const difficultyEl = document.querySelector('[diff], [data-difficulty], .difficulty');
    if (difficultyEl) {
      difficulty = difficultyEl.textContent.trim();
    }
    
    return {
      problemId: problemId || title,
      title: title,
      difficulty: difficulty,
      url: window.location.href,
      timestamp: Date.now()
    };
  }
  
  // Notify background script about solved problem
  function notifyProblemSolved(problemInfo) {
    chrome.runtime.sendMessage({
      type: 'LEETCODE_SOLVED',
      data: problemInfo
    }, response => {
      if (chrome.runtime.lastError) {
        console.error('AlgoGate: Error sending message:', chrome.runtime.lastError);
        return;
      }
      
      if (response && response.success) {
        console.log('AlgoGate: Problem registered successfully', response.data);
        
        // Show visual feedback on the page
        showSuccessFeedback(response.data);
      } else if (response && response.data && response.data.alreadySolved) {
        console.log('AlgoGate: Problem was already solved');
      }
    });
  }
  
  // Show success feedback on the page
  function showSuccessFeedback(data) {
    // Create a temporary overlay notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px 30px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 32px;">🎉</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">AlgoGate: Access Granted!</div>
          <div style="font-size: 14px; opacity: 0.9;">
            ${data.alreadySolved ? 'Problem already solved' : 'New problem solved! Enjoy your access.'}
          </div>
        </div>
      </div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(400px);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.transition = 'all 0.3s ease-out';
      notification.style.transform = 'translateX(400px)';
      notification.style.opacity = '0';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
  
  // Start monitoring when page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startMonitoring);
  } else {
    startMonitoring();
  }
  
  // Also monitor for navigation changes (SPA)
  let lastUrl = window.location.href;
  new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      lastCheckedProblem = null; // Reset for new problem
      console.log('AlgoGate: Page navigation detected, resetting monitor');
    }
  }).observe(document.body, { childList: true, subtree: true });
  
})();
