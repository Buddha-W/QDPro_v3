
/**
 * Error Detection Script for QDPro
 * Automatically identifies and reports JavaScript errors
 */

(function() {
  // Initialize error detection
  console.log('Error detection script loaded');
  
  // Track and report syntax errors
  window.addEventListener('error', function(event) {
    // Create error report
    const errorReport = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? event.error.stack : 'No stack trace available',
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    
    console.error('JavaScript Error Detected:', errorReport);
    
    // Display error notification
    showErrorNotification(errorReport.message, errorReport.filename, errorReport.lineno);
    
    // Attempt to fix common issues automatically
    attemptAutoFix(errorReport);
  });
  
  function showErrorNotification(message, file, line) {
    // Create error notification element if it doesn't exist
    if (!document.getElementById('error-notification')) {
      const notification = document.createElement('div');
      notification.id = 'error-notification';
      notification.style.position = 'fixed';
      notification.style.bottom = '20px';
      notification.style.right = '20px';
      notification.style.backgroundColor = '#f44336';
      notification.style.color = 'white';
      notification.style.padding = '15px';
      notification.style.borderRadius = '5px';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.zIndex = '10000';
      notification.style.maxWidth = '400px';
      notification.style.wordBreak = 'break-word';
      
      document.body.appendChild(notification);
    }
    
    // Update notification content
    const notification = document.getElementById('error-notification');
    notification.innerHTML = `<strong>JavaScript Error:</strong><br>${message}<br>File: ${file}<br>Line: ${line}`;
    
    // Auto-hide after 8 seconds
    setTimeout(() => {
      if (notification && document.body.contains(notification)) {
        notification.style.display = 'none';
      }
    }, 8000);
  }
  
  function attemptAutoFix(errorReport) {
    // Add automatic fixes for known error patterns
    if (errorReport.message.includes('Invalid or unexpected token')) {
      console.log('Attempting to fix syntax error...');
      
      // Check for template literals in older browsers
      if (errorReport.stack && errorReport.stack.includes('`')) {
        console.log('Detected template literal compatibility issue');
      }
      
      // Check for missing semicolons
      if (errorReport.stack && /[{]\s*[a-zA-Z0-9_$]+\s*[}]/.test(errorReport.stack)) {
        console.log('Detected possible missing semicolon');
      }
    }
  }
  
  // Add this script to the head to ensure early loading
  document.addEventListener('DOMContentLoaded', function() {
    // Perform additional checks once DOM is ready
    checkDOMStructure();
  });
  
  function checkDOMStructure() {
    // Check for common HTML structure issues
    const scriptTags = document.querySelectorAll('script');
    scriptTags.forEach(script => {
      if (script.innerHTML.includes('${')) {
        console.warn('Potential template literal in script that might cause syntax errors:', script);
      }
    });
  }
})();
