
// Debug script to ensure map is loading properly
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking map initialization...');
  
  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container element not found!');
    return;
  }
  
  console.log('Map container found, dimensions:', mapContainer.offsetWidth, 'x', mapContainer.offsetHeight);
  
  // Check if Leaflet is loaded
  if (!window.L) {
    console.error('Leaflet library not loaded!');
    return;
  }
  
  console.log('Leaflet library loaded correctly');
  
  // Check if map object exists
  if (!window.map) {
    console.log('Map object not initialized yet, this might be normal if initialization happens after this script');
  } else {
    console.log('Map object exists');
  }
  
  // Listen for map initialization
  const checkMapInterval = setInterval(function() {
    if (window.map && window.map instanceof L.Map) {
      console.log('Map successfully initialized');
      clearInterval(checkMapInterval);
    }
  }, 500);
  
  // Timeout after 10 seconds
  setTimeout(function() {
    clearInterval(checkMapInterval);
    if (!window.map || !(window.map instanceof L.Map)) {
      console.error('Map failed to initialize within timeout period');
    }
  }, 10000);
});
