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
    // Multi-method approach to detect LeetCode acceptance
    // LeetCode UI changes frequently, so we use multiple detection strategies
    
    // Strategy 1: Look for common submission result containers
    const resultContainers = [
      document.querySelector('[data-e2e-locator="submission-result"]'),
      document.querySelector('[class*="submission-result"]'),
      document.querySelector('[id*="submission-result"]'),
      document.querySelector('[class*="result"]'),
      document.querySelector('[data-region="submission-result"]'),
      // Look for divs that commonly contain submission results
      ...Array.from(document.querySelectorAll('div')).filter(div => {
        const id = (div.id || '').toLowerCase();
        const className = (div.className || '').toLowerCase();
        return id.includes('result') || className.includes('result') || 
               id.includes('submission') || className.includes('submission');
      })
    ].filter(Boolean);
    
    // Strategy 2: Also check the entire document but with stricter criteria
    // to avoid false positives from problem descriptions
    const searchContexts = resultContainers.length > 0 ? resultContainers : [document];
    
    let foundAcceptance = false;
    
    for (const searchContext of searchContexts) {
      // Look for "Accepted" text with various criteria
      const acceptedElements = Array.from(searchContext.querySelectorAll('*')).filter(el => {
        const classList = Array.from(el.classList || []).join(' ').toLowerCase();
        const text = (el.textContent || '').trim();
        const textLower = text.toLowerCase();
        
        // Skip if element is too large (likely contains full problem description)
        if (text.length > 1000) return false;
        
        // Look for "Accepted" in various forms
        const hasAcceptedClass = classList.includes('accepted') || classList.includes('ac');
        const isAcceptedText = text === 'Accepted' || textLower === 'accepted';
        const containsAccepted = textLower === 'accepted' || 
                                (text.length < 100 && textLower.includes('accepted'));
        
        // Ensure it's not a negative result
        const isNegative = textLower.includes('wrong answer') ||
                          textLower.includes('runtime error') ||
                          textLower.includes('time limit exceeded') ||
                          textLower.includes('memory limit') ||
                          textLower.includes('compile error') ||
                          textLower.includes('output limit') ||
                          (textLower.includes('wrong') && textLower.includes('answer'));
        
        // Positive indicators
        if (isNegative) return false;
        
        return hasAcceptedClass || isAcceptedText || 
               (containsAccepted && searchContext !== document);
      });
      
      // Strategy 3: Look for green success colors with "Accepted" text
      const hasSuccessIndicator = Array.from(searchContext.querySelectorAll('*')).some(el => {
        const text = (el.textContent || '').trim();
        if (text.length > 100 || text !== 'Accepted') return false;
        
        const computedStyle = window.getComputedStyle(el);
        const color = computedStyle.color || '';
        const bgColor = computedStyle.backgroundColor || '';
        
        // Check for green colors (LeetCode uses various shades)
        const hasGreenColor = color.includes('rgb(0, 184, 163)') || 
                             color.includes('rgb(46, 204, 113)') ||
                             color.includes('rgb(0, 175, 155)') ||
                             color.includes('rgb(67, 160, 71)') ||
                             bgColor.includes('rgb(0, 184, 163)') ||
                             bgColor.includes('rgb(46, 204, 113)') ||
                             bgColor.includes('rgb(0, 175, 155)');
        
        return hasGreenColor;
      });
      
      // Strategy 4: Look for SVG checkmark icons that appear with accepted status
      const hasCheckmarkIcon = Array.from(searchContext.querySelectorAll('svg')).some(svg => {
        const svgClass = (svg.className.baseVal || '').toLowerCase();
        const parentText = (svg.parentElement?.textContent || '').trim();
        return (svgClass.includes('check') || svgClass.includes('success')) && 
               parentText === 'Accepted';
      });
      
      if (acceptedElements.length > 0 || hasSuccessIndicator || hasCheckmarkIcon) {
        foundAcceptance = true;
        break;
      }
    }
    
    if (foundAcceptance) {
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
