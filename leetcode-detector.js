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
    // Look specifically for the submission result panel that appears after code submission
    // This is more reliable than scanning for keywords that might appear in problem descriptions
    
    // Method 1: Check for the specific submission result container
    const submissionResult = document.querySelector('[data-e2e-locator="submission-result"]');
    
    // Method 2: Look for elements with submission-related classes in the result panel area
    const resultPanel = document.querySelector('[class*="result"]');
    
    if (!submissionResult && !resultPanel) {
      return; // No submission result visible
    }
    
    // Only check within the submission result area to avoid false positives from problem descriptions
    const searchContext = submissionResult || resultPanel || document;
    
    // Look for "Accepted" verdict specifically in the result context
    const acceptedElements = Array.from(searchContext.querySelectorAll('*')).filter(el => {
      const classList = Array.from(el.classList || []).join(' ').toLowerCase();
      const text = (el.textContent || '').trim();
      
      // Must have "accepted" in class or be exactly "Accepted" text
      const hasAcceptedClass = classList.includes('accepted');
      const isAcceptedText = text === 'Accepted';
      
      // Ensure it's not a negative result
      const isNegative = text.toLowerCase().includes('wrong') ||
                        text.toLowerCase().includes('error') ||
                        text.toLowerCase().includes('failed') ||
                        text.toLowerCase().includes('runtime error') ||
                        text.toLowerCase().includes('time limit');
      
      return (hasAcceptedClass || isAcceptedText) && !isNegative;
    });
    
    // Additional check: look for the green success color typically used for accepted submissions
    const hasSuccessIndicator = Array.from(searchContext.querySelectorAll('*')).some(el => {
      const computedStyle = window.getComputedStyle(el);
      const color = computedStyle.color || '';
      const bgColor = computedStyle.backgroundColor || '';
      
      // Check for green colors commonly used for success (rgb values for various shades of green)
      const isGreenish = color.includes('rgb(0, 184, 163)') || // LeetCode success green
                        color.includes('rgb(46, 204, 113)') ||
                        bgColor.includes('rgb(0, 184, 163)') ||
                        bgColor.includes('rgb(46, 204, 113)');
      
      const text = (el.textContent || '').trim();
      return isGreenish && text === 'Accepted';
    });
    
    if (acceptedElements.length > 0 || hasSuccessIndicator) {
      // Extract problem information
      const problemInfo = extractProblemInfo();
      
      // Avoid duplicate notifications for the same problem
      const problemKey = `${problemInfo.problemId}_${problemInfo.title}`;
      if (lastCheckedProblem === problemKey) {
        return;
      }
      
      lastCheckedProblem = problemKey;
      
      console.log('AlgoGate: Problem solved!', problemInfo);
      notifyProblemSolved(problemInfo);
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
