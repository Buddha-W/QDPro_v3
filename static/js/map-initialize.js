/**
 * Map Initialization Module
 * Handles map creation and base layer management
 */

// Global map reference
let map;

/**
 * Initialize the Leaflet map
 */
function initMap() {
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
 * Load a saved project from localStorage
 */
function loadProject() {
  if (typeof window.clearLayers !== 'function') {
    console.error('clearLayers function not available');
    return;
  }

  window.clearLayers();

  const projectData = JSON.parse(localStorage.getItem('savedProject'));
  if (!projectData || !projectData.layers) {
    console.error('No valid project data found');
    return;
  }

  projectData.layers.forEach(layer => {
    // Create polygon from coordinates
    const polygonLayer = L.polygon(layer.coordinates).addTo(map);

    // Set feature properties
    polygonLayer.feature = {
      type: 'Feature',
      properties: {
        name: layer.name,
        ...layer // spread any other properties
      }
    };

    // Add click handler to open the feature editor
    polygonClickHandler(polygonLayer, layer);
  });

  console.log('Project loaded successfully');
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

/**
 * Setup click handlers for all existing layers
 */
function setupAllLayerEditHandlers() {
  console.log("Setting up all layer edit handlers");

  // Check if drawn items layer collection exists
  if (window.drawnItems) {
    window.drawnItems.eachLayer(function(layer) {
      addLayerClickHandlers(layer);
    });
  } else {
    console.warn("drawnItems layer collection not found");
  }

  // If we have feature groups or other collections, process them too
  if (window.map) {
    window.map.eachLayer(function(layer) {
      // Check if this is a feature layer or group
      if (layer.feature || layer.eachLayer) {
        if (layer.feature) {
          addLayerClickHandlers(layer);
        }

        // If this is a layer group, process its sub-layers
        if (layer.eachLayer) {
          layer.eachLayer(function(sublayer) {
            if (sublayer.feature) {
              addLayerClickHandlers(sublayer);
            }
          });
        }
      }
    });
  }
}

// Make functions globally available
window.initMap = initMap;
window.polygonClickHandler = polygonClickHandler;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;


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

function ensureSampleData() {
  if (!localStorage.getItem("savedProject")) {
    localStorage.setItem("savedProject", JSON.stringify(sampleProjectData));
    console.log("Sample project data created");
  }
}

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

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Map initialization module loaded");

  // Initialize the map
  initMap();

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

  // Make functions globally available
  window.initMap = initMap;
  window.loadProject = loadProject;
  window.clearLayers = clearLayers;

  //added from edited snippet
  console.log("Map initialization script loaded");

  // Initialize the map if not already done
  if (!window.map) {
    console.log("Creating map instance");

    // Create map centered on default location
    window.map = L.map('map', {
      center: [39.8283, -98.5795], // Center of the US
      zoom: 5
    });

    // Add base map layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(window.map);

    console.log("Map initialized successfully");
  }

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