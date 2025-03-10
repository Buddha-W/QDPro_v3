/**
 * Feature Editor Initialization Module
 * Handles drawing tools and feature property editing
 */

// Feature editor state
window.featureEditor = {
  activeFeature: null
};

/**
 * Initialize the feature editor when the map is ready
 */
function initializeFeatureEditor() {
  console.log('Initializing feature editor...');
  setupEventHandlers(); // Call the new setup function

  if (!window.map) {
    console.error('Map is not initialized');
    return;
  }

  // Initialize drawn items layer if not already done
  if (!window.drawnItems) {
    window.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);
  }

  // Set up Leaflet.Draw controls
  const drawControl = new L.Control.Draw({
    edit: {
      featureGroup: window.drawnItems
    },
    draw: {
      polyline: true,
      polygon: true,
      rectangle: true,
      circle: true,
      marker: true
    }
  });

  window.map.addControl(drawControl);

  // Handle newly created features
  window.map.on('draw:created', function(e) {
    const layer = e.layer;

    // Initialize feature properties
    layer.feature = {
      type: 'Feature',
      properties: {
        name: 'New Feature',
        type: e.layerType,
        description: ''
      }
    };

    // Add the layer to our feature group
    window.drawnItems.addLayer(layer);

    // Add click handler for editing properties
    addLayerClickHandlers(layer);

    // Open properties editor for the new feature
    openFeatureEditor(layer.feature.properties, layer);
  });

  // Set up edit handlers for features
  window.map.on('draw:edited', function(e) {
    console.log('Features edited:', e.layers);
  });

  window.map.on('draw:deleted', function(e) {
    console.log('Features deleted:', e.layers);
  });

  console.log('Feature editor initialized');
}

/**
 * Add click handlers to a layer for property editing
 */
function addLayerClickHandlers(layer) {
  if (!layer) return;

  layer.on('click', function(e) {
    L.DomEvent.stopPropagation(e);

    // Open the feature editor for this layer
    if (layer.feature && layer.feature.properties) {
      openFeatureEditor(layer.feature.properties, layer);
    } else {
      openFeatureEditor({}, layer);
    }
  });
}

/**
 * Set up event handlers for buttons and UI elements
 */
function setupEventHandlers() {
  // Add event listener for save button
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'save-feature-button') {
      saveFeatureProperties();
    }
  });

  // Add event listener for close button
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'close-feature-button') {
      closeFeatureEditor();
    }
  });

  // File menu event listeners
  document.addEventListener('click', function(e) {
    if (e.target && e.target.id === 'newProject') {
      console.log('New project action');
      if (window.drawnItems) {
        window.drawnItems.clearLayers();
      }
      if (window.facilitiesLayer) window.facilitiesLayer.clearLayers();
      if (window.arcsLayer) window.arcsLayer.clearLayers();
    }

    if (e.target && e.target.id === 'saveProject') {
      console.log('Save project action');
      saveProject();
    }

    if (e.target && e.target.id === 'loadProject') {
      console.log('Load project action');
      loadProject();
    }
  });
}

/**
 * Save the properties of the active feature
 */
function saveFeatureProperties() {
  const layer = window.featureEditor.activeFeature;
  if (!layer) {
    console.error('No active feature to save');
    return;
  }

  // Initialize feature and properties if they don't exist
  if (!layer.feature) {
    layer.feature = { type: 'Feature', properties: {} };
  }

  // Get values from form
  const name = document.getElementById('feature-name').value;
  const description = document.getElementById('feature-description').value;

  // Update feature properties
  layer.feature.properties.name = name;
  layer.feature.properties.description = description;

  // Update popup if it exists
  if (layer.getPopup()) {
    layer.setPopup(createPopupContent(layer));
  } else {
    layer.bindPopup(createPopupContent(layer));
  }

  // Close the modal
  closeFeatureEditor();

  console.log('Feature properties saved:', layer.feature.properties);
}

/**
 * Close the feature editor modal
 */
function closeFeatureEditor() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.featureEditor.activeFeature = null;
}

/**
 * Load project data from the server
 */
function loadProject() {
  console.log('Loading project...');
  fetch('/api/load')
    .then(response => response.json())
    .then(data => {
      console.log('Project loaded:', data);

      // Clear existing layers
      window.drawnItems.clearLayers();

      // Add features to map
      if (data.features && data.features.length > 0) {
        const geoJsonLayer = L.geoJSON(data.features, {
          onEachFeature: function(feature, layer) {
            window.drawnItems.addLayer(layer);

            // Bind popup if properties exist
            if (feature.properties) {
              layer.bindPopup(createPopupContent(layer));
            }

            // Add click event for editing
            layer.on('click', function() {
              if (window.editMode) {
                openFeatureEditor(layer);
              }
            });
          }
        });

        console.log(`Loaded ${data.features.length} features`);
      } else {
        console.log('No features found in project');
      }
    })
    .catch(error => {
      console.error('Error loading project:', error);
    });
}

function closeFacilityModal() {
  const modal = document.getElementById('facilityPropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.currentFacilityLayer = null;
}

// QDPro Feature Editor Initialization
// Handles feature editing, properties, and related UI

document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor initializer loaded');

  // Wait for map to be initialized
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      initializeFeatureEditor();
      setupAllLayerEditHandlers(); //Call this after map is initialized
    }
  }, 100);

  // Set up event listeners for the feature editor
  setupFeatureEditorListeners();
});

/**
 * Set up event listeners for the feature editor UI
 */
function setupFeatureEditorListeners() {
  // If needed in the future
}

/**
 * Set up click handlers for all layers that have features
 */
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.error('Map is not initialized');
    return;
  }

  window.map.eachLayer(function(layer) {
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
  });

  console.log('All layer edit handlers set up');
}

function saveProject() {
  console.log('Saving project...');

  // Collect GeoJSON for all layers
  const layers = [];

  if (window.drawnItems) {
    window.drawnItems.eachLayer(function(layer) {
      if (layer.toGeoJSON) {
        layers.push(layer.toGeoJSON());
      }
    });
  }

  // Create data object
  const data = {
    layers: layers,
    metadata: {
      name: 'My Project',
      created: new Date().toISOString(),
      version: '1.0'
    }
  };

  // Send data to server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(result => {
      console.log('Project saved:', result);
      alert('Project saved successfully!');
    })
    .catch(error => {
      console.error('Error saving project:', error);
      alert('Error saving project: ' + error.message);
    });
}


function createPopupContent(layer) {
  // This function needs to be implemented based on your actual popup content requirements
  return "Popup content for layer: " + layer.feature.properties.name;
}

// Make functions available globally
window.initializeFeatureEditor = initializeFeatureEditor;
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeatureEditor = closeFeatureEditor;
window.loadProject = loadProject;
window.saveProject = saveProject;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.setupFeatureEditorListeners = setupFeatureEditorListeners;
window.setupEventHandlers = setupEventHandlers;
window.closeFacilityModal = closeFacilityModal;


/**
 * Create a new layer for drawing
 */
function createNewLayer() {
  const layerName = prompt('Enter layer name:');
  if (!layerName) return;

  // Add to layer select dropdown
  const layerSelect = document.getElementById('draw-to-layer');
  const option = document.createElement('option');
  option.value = layerName;
  option.text = layerName;
  layerSelect.add(option);

  // Select the new layer
  layerSelect.value = layerName;

  // Create a new feature group for this layer
  window.layers = window.layers || {};
  window.layers[layerName] = new L.FeatureGroup();
  window.map.addLayer(window.layers[layerName]);

  console.log(`Created new layer: ${layerName}`);
}

// Add event listener for the new layer button
document.addEventListener('DOMContentLoaded', function() {
  const newLayerBtn = document.getElementById('new-layer-btn');
  if (newLayerBtn) {
    newLayerBtn.addEventListener('click', createNewLayer);
  }
});