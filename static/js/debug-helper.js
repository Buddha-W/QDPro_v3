
/**
 * Debug helper script for QDPro
 * Helps identify and report JavaScript errors
 */

// Error handling and reporting
window.addEventListener('error', function(event) {
  console.error('JavaScript Error:', {
    message: event.message,
    source: event.filename,
    lineNo: event.lineno,
    colNo: event.colno,
    error: event.error
  });
  
  // Add visual error indicator for dev environment
  const errorBadge = document.createElement('div');
  errorBadge.style.position = 'fixed';
  errorBadge.style.bottom = '10px';
  errorBadge.style.right = '10px';
  errorBadge.style.backgroundColor = 'red';
  errorBadge.style.color = 'white';
  errorBadge.style.padding = '5px 10px';
  errorBadge.style.borderRadius = '5px';
  errorBadge.style.zIndex = '10000';
  errorBadge.innerHTML = `Error: ${event.message}`;
  document.body.appendChild(errorBadge);
  
  // Auto-remove after 8 seconds
  setTimeout(() => {
    if (document.body.contains(errorBadge)) {
      document.body.removeChild(errorBadge);
    }
  }, 8000);
});

// Document ready check
document.addEventListener('DOMContentLoaded', function() {
  console.log('Debug helper loaded and DOM ready');
  
  // Check for key elements
  const elementsToCheck = [
    { id: 'editLocationModal', type: 'Edit Location Modal' },
    { id: 'active-locations', type: 'Active Locations Tab' },
    { id: 'recycle-bin', type: 'Recycle Bin Tab' }
  ];
  
  elementsToCheck.forEach(item => {
    const element = document.getElementById(item.id);
    if (!element) {
      console.warn(`${item.type} (${item.id}) not found in DOM`);
    } else {
      console.log(`${item.type} found in DOM`);
    }
  });
  
  // Extra checks for dynamic loading
  if (typeof showTab === 'function') {
    console.log('showTab function defined correctly');
  } else {
    console.warn('showTab function not found - tabs might not work');
  }
  
  if (typeof openEditModal === 'function') {
    console.log('openEditModal function defined correctly');
  } else {
    console.warn('openEditModal function not found - edit functionality might not work');
  }
});
