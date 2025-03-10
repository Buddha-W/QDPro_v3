/**
 * Map Initialization Helper
 * Provides utilities for ensuring proper map initialization
 */

// Check if map is ready for use
function isMapReady() {
  if (!window.map) {
    console.log("Map is not yet initialized");
    return false;
  }

  // Check for required methods
  if (typeof window.map.setView !== 'function') {
    console.log("Map is missing essential methods");

    // Try to patch essential methods if Leaflet is available
    if (typeof L !== 'undefined') {
      console.log("Attempting to patch missing map methods");

      if (typeof window.map.setView !== 'function') {
        window.map.setView = function(center, zoom) {
          console.log("Using patched setView method:", center, zoom);
          // Try to update internal properties
          if (window.map._zoom !== undefined) window.map._zoom = zoom;
          if (window.map._lastCenter !== undefined) window.map._lastCenter = L.latLng(center);
          return window.map;
        };
      }

      if (typeof window.map.flyTo !== 'function') {
        window.map.flyTo = function(center, zoom, options) {
          console.log("Using patched flyTo method:", center, zoom);
          return window.map.setView(center, zoom);
        };
      }

      if (typeof window.map.getCenter !== 'function') {
        window.map.getCenter = function() {
          return window.map._lastCenter || L.latLng(39.8283, -98.5795);
        };
      }

      if (typeof window.map.getZoom !== 'function') {
        window.map.getZoom = function() {
          return window.map._zoom || 4;
        };
      }

      return true; // Return true after patching
    }

    return false;
  }

  return true;
}

// Function to try initializing map
window.initializeMap = function() {
  if (window.isMapReady()) {
    console.log("Map already initialized");
    return true;
  }

  console.log("Attempting to initialize map");

  // Check if Leaflet is available
  if (typeof L === 'undefined') {
    console.error("Leaflet library not loaded");
    return false;
  }

  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error("Map container not found");
    return false;
  }

  try {
    // Create the map if it doesn't exist
    if (!window.map) {
      window.map = L.map('map', {
        center: [39.8283, -98.5795], // Default US center
        zoom: 4,
        zoomControl: true
      });

      // Add a base layer - should be replaced by your layer system later
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(window.map);

      console.log("Map created successfully");
    } 
    // Patch the map if it exists but is missing methods
    else {
      console.log("Patching existing map with missing methods");

      if (typeof window.map.setView !== 'function') {
        window.map.setView = function(center, zoom) {
          console.log("Using patched setView method:", center, zoom);
          try {
            window.map._zoom = zoom;
            if (window.map._lastCenter) {
              window.map._lastCenter = L.latLng(center);
            }
          } catch (e) {
            console.error("Error updating map state:", e);
          }
          return window.map;
        };
      }

      if (typeof window.map.getCenter !== 'function') {
        window.map.getCenter = function() {
          return window.map._lastCenter || L.latLng(39.8283, -98.5795);
        };
      }

      if (typeof window.map.getZoom !== 'function') {
        window.map.getZoom = function() {
          return window.map._zoom || 4;
        };
      }
    }

    // Track map state if not already doing so
    if (typeof window.map.on === 'function') {
      window.map.on('moveend', function() {
        window.map._lastCenter = window.map.getCenter();
        window.map._zoom = window.map.getZoom();
        console.log("Updated map state:", window.map._lastCenter, window.map._zoom);
      });
    }

    // Notify that map is ready
    if (typeof window.notifyMapReady === 'function') {
      window.notifyMapReady();
    }

    return true;
  } catch (e) {
    console.error("Error initializing map:", e);
    return false;
  }
};

// Initialize the map when document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Checking map initialization status on page load");

  // Wait a short time for other scripts to load
  setTimeout(function() {
    window.initializeMap();

    // Set up a check to periodically verify map status
    setInterval(function() {
      if (!window.isMapReady()) {
        console.log("Map not ready, attempting to fix");
        window.initializeMap();
      }
    }, 5000); // Check every 5 seconds
  }, 1000);
});


/**
 * Map initialization and helper functions
 */

// Make sure global namespace exists
if (typeof window.QDProEditor === 'undefined') {
  window.QDProEditor = {};
}

// Function to initialize map correctly
function initializeMap() {
  console.log("Initializing map...");

  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  // Create map if it doesn't exist
  if (!window.map) {
    try {
      // Create a basic map with default settings
      window.map = L.map('map', {
        center: [39.8283, -98.5795], // Default to center of US
        zoom: 4,
        maxZoom: 19
      });

      // Store initial values
      window.map._lastCenter = window.map.getCenter();
      window.map._zoom = window.map.getZoom();

      // Add a default tile layer if none exists
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(window.map);

      console.log("Map initialized successfully");

      // Store center and zoom whenever they change
      window.map.on('moveend', function() {
        window.map._lastCenter = window.map.getCenter();
        window.map._zoom = window.map.getZoom();
      });
    } catch (error) {
      console.error("Error initializing map:", error);
    }
  }

  return window.map;
}

// Initialize on document load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Document loaded, initializing map...");

  // Try to initialize map
  const map = initializeMap();

  if (map) {
    console.log("Map initialized successfully in DOMContentLoaded");
  } else {
    console.warn("Map initialization failed in DOMContentLoaded");

    // Retry after a delay
    setTimeout(initializeMap, 1000);
  }
});

// Expose functions globally
window.initializeMap = initializeMap;


/**
 * Map initialization and error handling for QDPro
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer script loaded');

  // Check if the map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found. Please check your HTML.');
    showErrorNotification('Map container not found', 'DOM error', 0);
    return;
  }

  // Make sure Leaflet is loaded
  if (typeof L === 'undefined') {
    console.error('Leaflet library not loaded. Check script inclusion order.');
    showErrorNotification('Leaflet library not loaded', 'Script error', 0);
    return;
  }

  // Initialize map error handlers
  setupMapErrorHandlers();
});

function setupMapErrorHandlers() {
  // Override Leaflet's error handling for tile loading
  if (L && L.TileLayer) {
    const originalOnError = L.TileLayer.prototype._tileOnError;

    L.TileLayer.prototype._tileOnError = function(done, tile, e) {
      console.warn('Tile load error:', e);

      // Try to fall back to OpenStreetMap if another provider fails
      if (this._url && !this._url.includes('openstreetmap')) {
        console.log('Attempting to fall back to OpenStreetMap tiles');

        // Only attempt fallback once to prevent loops
        if (!this._hasAttemptedFallback) {
          this._hasAttemptedFallback = true;

          // Create a fallback layer using OpenStreetMap
          const fallbackLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
          });

          // If this tile layer is attached to a map, add the fallback
          if (this._map) {
            this._map.removeLayer(this);
            fallbackLayer.addTo(this._map);

            // Show a notification about the fallback
            if (typeof showErrorNotification === 'function') {
              showErrorNotification('Map tile provider error - switched to OpenStreetMap', 'Map error', 0);
            }
          }
        }
      }

      // Call the original error handler
      return originalOnError.call(this, done, tile, e);
    };
  }

  /**
 * QDPro Map Initializer
 * Handles map initialization and common error recovery
 */

// Handle issues with Leaflet Draw
function initializeMapErrorHandling() {
  if (L && L.Draw) {
    // Fix for draw handlers
    const checkForDrawErrors = function() {
      const mapInstance = window.QDPro && window.QDPro.map;
      if (!mapInstance) return;

      // Check if there are any phantom drawing modes active
      for (const type in L.Draw.Event.CREATED) {
        const drawControl = mapInstance._toolbars && mapInstance._toolbars[type.toLowerCase()];
        if (drawControl && drawControl._active) {
          console.warn('Found active drawing mode that might be stuck:', type);

          // Try to deactivate it
          try {
            drawControl.disable();
          } catch (e) {
            console.error('Failed to disable draw control:', e);
          }
        }
      }
    };

    // Run this check periodically
    setInterval(checkForDrawErrors, 30000);
  }
}

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer loaded');
  initializeMapErrorHandling();
});
}

// Helper to show error notifications if not defined elsewhere
function showErrorNotification(message, source, line) {
  // Skip if already defined in error-detector.js
  if (window.showErrorNotification) {
    return window.showErrorNotification(message, source, line);
  }

  console.error(`${source} (${line}): ${message}`);

  // Create a simple notification
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#f44336';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '10000';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
  notification.innerHTML = `<strong>Error:</strong> ${message}`;

  // Add a close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.marginLeft = '10px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.float = 'right';
  closeBtn.onclick = function() {
    document.body.removeChild(notification);
  };

  notification.appendChild(closeBtn);
  document.body.appendChild(notification);

  // Auto-hide after 8 seconds
  setTimeout(function() {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 8000);
}


/**
 * Map initialization script for QDPro
 * Handles map setup and ensures proper loading
 */

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing map...');
  initializeMap();
});

function initializeMap() {
  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found!');
    return;
  }

  // Check if map is already initialized
  if (window.map) {
    console.log('Map already initialized');
    return;
  }

  try {
    // Initialize the map with a default view
    window.map = L.map('map', {
      center: [39.8283, -98.5795], // Center of US
      zoom: 5,
      zoomControl: true
    });

    // Add base layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: "anonymous"
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      crossOrigin: "anonymous"
    });

    // Add layers to map
    osmLayer.addTo(window.map);

    // Setup base layers control
    const baseLayers = {
      "Street Map": osmLayer,
      "Satellite": satelliteLayer
    };

    // Create overlay layers object for features
    window.overlayLayers = {
      "Features": new L.FeatureGroup()
    };

    // Add overlay layers to map
    window.overlayLayers.Features.addTo(window.map);

    // Setup layer control
    L.control.layers(baseLayers, window.overlayLayers).addTo(window.map);

    // Initialize draw controls if available
    if (L.Control.Draw) {
      initializeDrawControls();
    }

    console.log('Map initialized successfully');

    // Dispatch event that map is ready
    document.dispatchEvent(new Event('map-initialized'));
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

function initializeDrawControls() {
  // Setup draw options
  const drawOptions = {
    position: 'topleft',
    draw: {
      polyline: {
        shapeOptions: {
          color: '#f357a1',
          weight: 3
        }
      },
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          timeout: 1000
        },
        shapeOptions: {
          color: '#bada55'
        }
      },
      circle: {
        shapeOptions: {
          color: '#662d91'
        }
      },
      marker: true
    },
    edit: {
      featureGroup: window.overlayLayers.Features
    }
  };

  // Add draw control to map
  window.drawControl = new L.Control.Draw(drawOptions);
  window.map.addControl(window.drawControl);

  // Setup draw events
  window.map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;

    // Add default properties
    layer.feature = {
      type: 'Feature',
      properties: {
        id: Date.now().toString(),
        name: 'New Feature',
        type: event.layerType,
        description: ''
      }
    };

    // Add layer to feature group
    window.overlayLayers.Features.addLayer(layer);

    // Open edit popup for new feature
    if (typeof openEditPopup === 'function') {
      openEditPopup(layer);
    }
  });
}