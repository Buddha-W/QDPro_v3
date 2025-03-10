/**
 * Map Initialization Module
 * Handles map creation and base layer management
 */

// Global map reference
let map;

/**
 * Initialize the Leaflet map
 */
function initializeMap() {
  console.log('Initializing map...');

  // Create map if it doesn't exist
  if (!map) {
    map = L.map('map').setView([40.7128, -74.0060], 13);

    // Add base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    // Make map globally available
    window.map = map;

    console.log('Map initialized successfully');
  }
}

/**
 * Set up error handling for map components
 */
function setupMapErrorHandling() {
  // Add global error handler for map interaction
  if (map) {
    map.on('error', function(e) {
      console.error('Map error:', e.error);
      showErrorNotification('Map error: ' + e.error.message);
    });
  }
}

/**
 * Sample data used for testing
 */
function ensureSampleData() {
  if (!localStorage.getItem('savedProject')) {
    const sampleProject = {
      layers: [
        {
          name: 'Example Area',
          coordinates: [
            [40.7128, -74.0060],
            [40.7200, -74.0100],
            [40.7150, -74.0200]
          ]
        }
      ]
    };
    localStorage.setItem('savedProject', JSON.stringify(sampleProject));
    console.log('Sample data created');
  }
}

/**
 * Load a project from the server API
 */
function loadProject() {
  console.log('Loading project from API...');
  fetch('/api/load')
    .then(response => response.json())
    .then(data => {
      console.log('Project loaded:', data);

      if (data.features && data.features.length > 0) {
        // Clear existing features
        if (window.featureEditor && window.featureEditor.drawnItems) {
          window.featureEditor.drawnItems.clearLayers();
        } else {
          clearLayers();
        }

        // Add features to map
        data.features.forEach(feature => {
          try {
            const layer = L.geoJSON(feature).addTo(map);
            if (typeof window.addLayerClickHandlers === 'function') {
              layer.eachLayer(l => window.addLayerClickHandlers(l));
            }
          } catch (err) {
            console.error('Error adding feature:', err);
          }
        });
      }
    })
    .catch(error => {
      console.error('Error loading project:', error);
      // Fall back to localStorage
      loadFromLocalStorage();
    });
}

/**
 * Load project from localStorage as fallback
 */
function loadFromLocalStorage() {
  try {
    const savedProject = localStorage.getItem('savedProject');
    if (savedProject) {
      const project = JSON.parse(savedProject);
      if (project.layers && project.layers.length > 0) {
        project.layers.forEach(layer => {
          if (layer.coordinates) {
            const polygon = L.polygon(layer.coordinates).addTo(map);
            polygon.feature = {
              type: 'Feature',
              properties: {
                name: layer.name
              }
            };
            if (typeof window.addLayerClickHandlers === 'function') {
              window.addLayerClickHandlers(polygon);
            }
          }
        });
      }
    }
  } catch (e) {
    console.error('Error loading from localStorage:', e);
  }
}

/**
 * Clear all layers except the base tile layer
 */
function clearLayers() {
  if (!map) {
    console.error("Map is not initialized");
    return;
  }

  map.eachLayer(layer => {
    // Only remove polygons (leave the tile layer intact)
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });

  console.log("Layers cleared");
}

/**
 * Set up layer edit handlers
 */
function setupAllLayerEditHandlers() {
  if (map) {
    map.eachLayer(layer => {
      if (layer instanceof L.Polygon || layer instanceof L.Marker) {
        if (typeof window.addLayerClickHandlers === 'function') {
          window.addLayerClickHandlers(layer);
        }
      }
    });
  }
}

// Initialize the map on document load
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer loaded');

  // Initialize map if not already done
  if (!window.map) {
    initializeMap();
  }

  // Set up error handling for map components
  setupMapErrorHandling();

  // Ensure we have sample data
  ensureSampleData();

  // Add edit button functionality if present
  const editButton = document.getElementById('editButton');
  if (editButton) {
    editButton.addEventListener('click', function() {
      if (typeof window.openFeatureEditor === 'function') {
        window.openFeatureEditor({
          name: "Test Feature",
          type: "Polygon",
          description: "This is a test feature"
        });
      } else {
        console.error("openFeatureEditor function not found");
        alert("Cannot test editor: openFeatureEditor not loaded");
      }
    });
  }

  // Load project data after a short delay to ensure all scripts are loaded
  setTimeout(function() {
    loadProject();
  }, 300);

  // Setup click handlers for all layers
  setupAllLayerEditHandlers();
});

// Helper to show error notifications if not defined elsewhere
function showErrorNotification(message) {
  console.error(message);

  if (typeof window.showNotification === 'function') {
    window.showNotification('error', message);
  } else {
    alert(message);
  }
}

/**
 * Setup polygon click handler
 * @param {L.Polygon} polygonLayer - The polygon layer
 * @param {Object} layerData - The layer data
 */
function polygonClickHandler(polygonLayer, layerData) {
  if (typeof window.openFeatureEditor !== 'function') {
    console.error('openFeatureEditor function not available');
    return;
  }

  polygonLayer.on('click', function(e) {
    // Stop propagation to prevent map click from firing
    L.DomEvent.stopPropagation(e);

    // Open feature editor
    window.openFeatureEditor(layerData);
  });
}


/**
 * Add click handlers to a layer
 * @param {Object} layer - The Leaflet layer to add click handlers to
 */
function addLayerClickHandlers(layer) {
  if (!layer) return;

  layer.on('click', function(e) {
    // Stop propagation to prevent map click handler from firing
    L.DomEvent.stopPropagation(e);

    if (layer.feature && layer.feature.properties) {
      window.openFeatureEditor(layer.feature.properties);
    } else {
      console.warn("Layer clicked doesn't have feature properties", layer);
      // Create default properties if needed
      layer.feature = layer.feature || {
        type: 'Feature',
        properties: {
          name: 'Unnamed Feature'
        }
      };
      window.openFeatureEditor(layer.feature.properties);
    }
  });
}

// Sample project data for testing
const sampleProjectData = {
  layers: [
    {
      name: "Polygon A",
      type: "Facility",
      description: "A test polygon",
      coordinates: [
        [40.7128, -74.0060],
        [40.7228, -74.0160],
        [40.7328, -74.0060]
      ]
    },
    {
      name: "Polygon B",
      type: "Zone",
      description: "Another test polygon",
      coordinates: [
        [41.7128, -75.0060],
        [41.7228, -75.0160],
        [41.7328, -75.0060]
      ]
    }
  ]
};


/**
 * Clear all polygon layers but keep the base map
 */
function clearLayers() {
  if (!map) {
    console.error("Map is not initialized");
    return;
  }

  map.eachLayer(layer => {
    // Only remove polygons (leave the tile layer intact)
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });

  console.log("Layers cleared");
}

// Make functions globally available
window.initMap = initializeMap;
window.polygonClickHandler = polygonClickHandler;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.initializeMap = initializeMap;
window.initializeDrawControls = initializeDrawControls;
window.setupMapErrorHandling = setupMapErrorHandling;
window.showErrorNotification = showErrorNotification;


// Make sure we add the CSS for the modal
const modalCss = document.createElement('style');
modalCss.textContent = `
.modal {
  display: none;
  position: fixed;
  z-index: 9999;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.5);
}

.modal-content {
  background-color: #f8f8f8;
  margin: 10% auto;
  padding: 20px;
  border: 1px solid #888;
  width: 50%;
  max-width: 500px;
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ddd;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
}

.close {
  color: #aaa;
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
}

.close:hover {
  color: #000;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type="text"] {
  width: 100%;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.button-group {
  text-align: right;
  margin-top: 20px;
}

.save-btn {
  background-color: #4CAF50;
  color: white;
  padding: 8px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.save-btn:hover {
  background-color: #45a049;
}
`;
document.head.appendChild(modalCss);


// Global handler for layer clicks
window.handleLayerClick = function(layer) {
  console.log('Layer clicked:', layer);
  if (layer.feature && layer.feature.properties) {
    console.log('Feature properties:', layer.feature.properties);

    // Open appropriate editor based on feature type
    if (typeof openEditPopup === 'function') {
      openEditPopup(layer);
    }
  }
};

// Helper to show error notifications
function showErrorNotification(message, source, line) {
  console.error(message, source, line);

  // Use built-in notification function if available
  if (typeof window.showErrorNotification === 'function') {
    window.showErrorNotification(message, source, line);
  } else {
    // Create a simple notification if the main one isn't available
    const notification = document.createElement('div');
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.backgroundColor = '#f44336';
    notification.style.color = 'white';
    notification.style.padding = '15px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '5000';
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(function() {
      notification.remove();
    }, 5000);
  }
}

// Initialize Leaflet.Draw controls
function initializeDrawControls() {
  // Create draw control
  window.drawControl = new L.Control.Draw({
    draw: {
      polyline: true,
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          message: '<strong>Error:</strong> Shape edges cannot cross!'
        },
        shapeOptions: {
          color: '#3388ff'
        }
      },
      circle: true,
      rectangle: true,
      marker: true
    },
    edit: {
      featureGroup: window.drawnItems,
      remove: true
    }
  });
  window.map.addControl(window.drawControl);

  // Set up event listeners for draw events
  window.map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    window.drawnItems.addLayer(layer);

    // Open edit popup for the newly created layer
    if (typeof openEditPopup === 'function') {
      openEditPopup(layer);
    }
  });
}

// Set up error handling for map components
function setupMapErrorHandling() {
  // Handle issues with Leaflet Draw
  if (L && L.Draw) {
    // Fix for draw handlers
    const checkForDrawErrors = function() {
      if (window.map && window.drawControl) {
        try {
          // Ensure handlers are properly initialized
          if (!window.drawControl._toolbars.draw._modes.polygon.handler) {
            console.warn('Reinitializing draw controls due to missing handlers');
            window.map.removeControl(window.drawControl);
            initializeDrawControls();
          }
        } catch (e) {
          console.error('Error checking draw handlers:', e);
        }
      }
    };

    // Check periodically
    setInterval(checkForDrawErrors, 5000);
  }
}

// Helper to show error notifications if not defined elsewhere
function showErrorNotification(message, source, line) {
  // Skip if already defined in error-detector.js
  if (window.showErrorNotificationDefined) return;

  console.error(`Error: ${message} in ${source}:${line}`);

  // Create notification element
  const notification = document.createElement('div');
  notification.style.position = 'fixed';
  notification.style.bottom = '20px';
  notification.style.right = '20px';
  notification.style.backgroundColor = '#f44336';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.borderRadius = '5px';
  notification.style.zIndex = '9999';
  notification.textContent = `Error: ${message}`;

  // Add close button
  const closeButton = document.createElement('span');
  closeButton.style.marginLeft = '15px';
  closeButton.style.fontWeight = 'bold';
  closeButton.style.cursor = 'pointer';
  closeButton.textContent = '✕';
  closeButton.onclick = function() {
    document.body.removeChild(notification);
  };
  notification.appendChild(closeButton);

  // Add to body
  document.body.appendChild(notification);

  // Auto remove after 10 seconds
  setTimeout(function() {
    if (document.body.contains(notification)) {
      document.body.removeChild(notification);
    }
  }, 10000);
}

//QDPro Map Initialization Script
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer loaded');

  // Initialize map if not already done
  if (!window.map) {
    initializeMap();
  }

  // Set up error handling for map components
  setupMapErrorHandling();

  // Ensure we have sample data
  ensureSampleData();

    // Add edit button functionality if present
  const editButton = document.getElementById('editButton');
  if (editButton) {
    editButton.addEventListener('click', function() {
      if (typeof window.openFeatureEditor === 'function') {
        window.openFeatureEditor({
          name: "Test Feature",
          type: "Polygon",
          description: "This is a test feature"
        });
      } else {
        console.error("openFeatureEditor function not found");
        alert("Cannot test editor: openFeatureEditor not loaded");
      }
    });
  }

  // Load project data after a short delay to ensure all scripts are loaded
  setTimeout(function() {
    loadProject();
  }, 300);


  // Setup click handlers for all layers
  setupAllLayerEditHandlers();

  // Map click event to close modal when clicking outside
  window.map.on('click', function(e) {
    // Only close if clicking on the map background, not a feature
    if (e.originalEvent && !e.originalEvent.target.closest('.leaflet-interactive')) {
      if (typeof window.closeFeaturePropertiesModal === 'function') {
        window.closeFeaturePropertiesModal();
      }
    }
  });

  // Setup draw create event
  if (window.map.editControl) {
    window.map.on('draw:created', function(e) {
      const layer = e.layer;

      // Initialize feature properties
      layer.feature = {
        type: 'Feature',
        properties: {
          name: 'New Feature',
          type: 'Polygon',
          description: ''
        },
        geometry: layer.toGeoJSON().geometry
      };

      // Add layer to map
      window.drawnItems.addLayer(layer);

      // Add click handlers
      addLayerClickHandlers(layer);

      // Open feature editor
      if (typeof window.openFeatureEditor === 'function') {
        window.openFeatureEditor(layer.feature.properties);
      }
    });
  }

  // Load any saved layers
  if (typeof loadProject === 'function') {
    loadProject();
  }
});