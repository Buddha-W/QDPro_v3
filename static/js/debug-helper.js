
/**
 * Debug Helper for QDPro
 * Provides diagnostic functions and error recovery
 */

(function() {
  console.log('Debug helper loaded');
  
  // Wait for DOM to be fully loaded
  document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing debug helper');
    checkDependencies();
    monitorMapInitialization();
  });
  
  // Check if all required dependencies are loaded
  function checkDependencies() {
    const dependencies = [
      { name: 'Leaflet', check: () => window.L !== undefined },
      { name: 'Leaflet.Draw', check: () => window.L && window.L.Draw !== undefined },
      { name: 'jQuery', check: () => window.jQuery !== undefined || window.$ !== undefined }
    ];
    
    console.log('Checking dependencies...');
    
    let allLoaded = true;
    dependencies.forEach(dep => {
      const isLoaded = dep.check();
      console.log(`${dep.name}: ${isLoaded ? 'LOADED' : 'MISSING'}`);
      if (!isLoaded) {
        allLoaded = false;
      }
    });
    
    if (!allLoaded) {
      console.warn('Some dependencies are missing. This may cause functionality issues.');
    }
  }
  
  // Monitor map initialization
  function monitorMapInitialization() {
    console.log('Monitoring map initialization...');
    
    // Check map container
    const mapContainer = document.getElementById('map');
    if (!mapContainer) {
      console.error('Map container (#map) not found in the DOM');
      displayError('Map container not found. Check your HTML structure.');
      return;
    }
    
    // Check container dimensions
    const containerWidth = mapContainer.offsetWidth;
    const containerHeight = mapContainer.offsetHeight;
    console.log(`Map container dimensions: ${containerWidth}x${containerHeight}px`);
    
    if (containerWidth === 0 || containerHeight === 0) {
      console.warn('Map container has zero width or height. Check CSS styling.');
      fixMapContainerStyles(mapContainer);
    }
    
    // Check if map is already initialized
    if (window.map) {
      console.log('Map already initialized');
      validateMap(window.map);
    } else {
      // Wait for map to initialize
      const checkInterval = setInterval(function() {
        if (window.map) {
          console.log('Map initialized');
          clearInterval(checkInterval);
          validateMap(window.map);
        }
      }, 500);
      
      // Timeout after 10 seconds
      setTimeout(function() {
        clearInterval(checkInterval);
        if (!window.map) {
          console.error('Map failed to initialize within timeout period');
          attemptMapRecovery();
        }
      }, 10000);
    }
  }
  
  // Validate the map object
  function validateMap(map) {
    try {
      console.log('Validating map object...');
      
      // Check if map is a Leaflet map
      const isLeafletMap = map instanceof L.Map;
      console.log(`Is Leaflet map: ${isLeafletMap}`);
      
      if (!isLeafletMap) {
        console.error('Map is not a valid Leaflet map instance');
        attemptMapRecovery();
        return;
      }
      
      // Check map size
      const size = map.getSize();
      console.log(`Map size: ${size.x}x${size.y}px`);
      
      if (size.x === 0 || size.y === 0) {
        console.warn('Map has zero width or height. Will attempt to fix...');
        map.invalidateSize(true);
      }
      
      // Check base layers
      const hasBaseLayers = map._layers && Object.keys(map._layers).length > 0;
      console.log(`Has base layers: ${hasBaseLayers}`);
      
      if (!hasBaseLayers) {
        console.warn('Map has no base layers. Map may appear blank.');
        addEmergencyBaseLayer(map);
      }
      
      // Monitor map events
      monitorMapEvents(map);
      
    } catch (err) {
      console.error('Error validating map:', err);
    }
  }
  
  // Monitor map events for errors
  function monitorMapEvents(map) {
    // Listen for error events
    map.on('error', function(e) {
      console.error('Map error event:', e);
    });
    
    // Listen for tile load errors
    map.on('tileerror', function(e) {
      console.warn('Tile error:', e);
    });
    
    // Monitor map interactions
    map.on('click', function(e) {
      console.log('Map clicked at:', e.latlng);
    });
  }
  
  // Fix map container styles if needed
  function fixMapContainerStyles(container) {
    console.log('Attempting to fix map container styles...');
    
    // Add minimum dimensions if container has none
    if (container.offsetWidth === 0) {
      container.style.width = '100%';
    }
    
    if (container.offsetHeight === 0) {
      container.style.height = '500px';
    }
    
    // Make sure container is visible
    container.style.display = 'block';
    container.style.visibility = 'visible';
    
    // Force reflow
    container.offsetHeight;
    
    console.log('Fixed container dimensions:', container.offsetWidth, 'x', container.offsetHeight);
  }
  
  // Add emergency base layer if map has none
  function addEmergencyBaseLayer(map) {
    console.log('Adding emergency base layer...');
    
    try {
      const emergencyLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: "anonymous"
      });
      
      emergencyLayer.addTo(map);
      console.log('Emergency base layer added');
    } catch (err) {
      console.error('Failed to add emergency base layer:', err);
    }
  }
  
  // Attempt to recover map if initialization failed
  function attemptMapRecovery() {
    console.log('Attempting map recovery...');
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // Clear the container
    mapContainer.innerHTML = '';
    
    // Fix container styles
    fixMapContainerStyles(mapContainer);
    
    // Create new map
    try {
      console.log('Creating recovery map...');
      const recoveryMap = L.map('map', {
        center: [39.8283, -98.5795], // Center of US
        zoom: 5
      });
      
      // Add basic base layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        crossOrigin: "anonymous"
      }).addTo(recoveryMap);
      
      // Set as global map
      window.map = recoveryMap;
      
      // Create emergency overlay layer
      window.overlayLayers = {
        "Features": new L.FeatureGroup()
      };
      window.overlayLayers.Features.addTo(recoveryMap);
      
      console.log('Recovery map created successfully');
      
      // Notify other components
      document.dispatchEvent(new Event('map-initialized'));
      
    } catch (err) {
      console.error('Map recovery failed:', err);
      displayError('Failed to create map. Please refresh the page.');
    }
  }
  
  // Display error to user
  function displayError(message) {
    console.error(message);
    
    // Create error notification if it doesn't exist
    if (!document.getElementById('error-notification')) {
      const notification = document.createElement('div');
      notification.id = 'error-notification';
      notification.style.position = 'fixed';
      notification.style.top = '20px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.backgroundColor = '#f44336';
      notification.style.color = 'white';
      notification.style.padding = '15px';
      notification.style.borderRadius = '5px';
      notification.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
      notification.style.zIndex = '10000';
      notification.style.textAlign = 'center';
      
      document.body.appendChild(notification);
    }
    
    // Update notification content
    const notification = document.getElementById('error-notification');
    notification.textContent = message;
    
    // Add refresh button
    const refreshButton = document.createElement('button');
    refreshButton.textContent = 'Refresh Page';
    refreshButton.style.marginLeft = '10px';
    refreshButton.style.padding = '5px 10px';
    refreshButton.addEventListener('click', function() {
      window.location.reload();
    });
    
    notification.appendChild(refreshButton);
  }
  
  // Make diagnostic functions available globally
  window.QDDebug = {
    checkDependencies,
    validateMap,
    attemptMapRecovery,
    fixMapContainerStyles,
    addEmergencyBaseLayer
  };
})();
