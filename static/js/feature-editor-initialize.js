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


function closeFacilityModal() {
  const modal = document.getElementById('facilityPropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.currentFacilityLayer = null;
}

// Feature Editor Initialization for QDPro
// Handles feature editing, properties, and related UI

// Function to setup the new layer dialog
function setupNewLayerDialog() {
    // Get the dialog elements
    const newLayerBtn = document.getElementById('newLayerBtn');
    const newLayerDialog = document.getElementById('newLayerDialog');
    const newLayerForm = document.getElementById('newLayerForm');
    const closeNewLayerBtn = document.getElementById('closeNewLayerBtn');

    // If elements don't exist, return
    if (!newLayerBtn || !newLayerDialog || !newLayerForm) {
        console.log('New layer dialog elements not found');
        return;
    }

    // Open dialog when new layer button is clicked
    newLayerBtn.addEventListener('click', function() {
        newLayerDialog.style.display = 'block';
    });

    // Close dialog when close button is clicked
    if (closeNewLayerBtn) {
        closeNewLayerBtn.addEventListener('click', function() {
            newLayerDialog.style.display = 'none';
        });
    }

    // Handle form submission
    newLayerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form values
        const layerName = document.getElementById('newLayerName').value;
        const layerColor = document.getElementById('newLayerColor').value;

        // Create new layer
        createNewLayer(layerName, layerColor);

        // Reset form and close dialog
        newLayerForm.reset();
        newLayerDialog.style.display = 'none';
    });
}

// Function to create a new custom layer
function createNewLayer(name, color) {
    if (!name) {
        alert('Layer name is required');
        return;
    }

    // Check if layer already exists
    if (window.customLayers && window.customLayers[name]) {
        alert('A layer with this name already exists');
        return;
    }

    // Create new feature group
    const newLayer = new L.FeatureGroup();

    // Set custom style for the layer if color is provided
    if (color) {
        newLayer.options = {
            style: {
                color: color,
                fillColor: color,
                fillOpacity: 0.4
            }
        };
    }

    // Add to map
    window.map.addLayer(newLayer);

    // Add to custom layers
    if (!window.customLayers) {
        window.customLayers = {};
    }
    window.customLayers[name] = newLayer;

    // Add to overlay controls if they exist
    if (window.layerControl) {
        window.layerControl.addOverlay(newLayer, name);
    }

    // Update draw-to-layer select if it exists
    if (typeof window.updateDrawToLayerSelect === 'function') {
        window.updateDrawToLayerSelect();
    }

    console.log(`New layer "${name}" created`);
}

// Function to save the current project
function saveProject() {
    console.log('Saving project...');

    // Check if save function exists in map-initialize.js
    if (typeof saveLayers === 'function') {
        saveLayers();
        return;
    }

    // Fallback if saveLayers function is not available
    // Collect all layers
    var allLayers = [];

    // Process drawn items
    window.drawnItems.eachLayer(function(layer) {
        if (layer.toGeoJSON) {
            allLayers.push({
                geometry: layer.toGeoJSON().geometry,
                properties: layer.properties || {},
                layerType: 'drawnItems'
            });
        }
    });

    // Process ESQD arcs if they exist
    if (window.esqdArcs) {
        window.esqdArcs.eachLayer(function(layer) {
            if (layer.toGeoJSON) {
                allLayers.push({
                    geometry: layer.toGeoJSON().geometry,
                    properties: layer.properties || {},
                    layerType: 'esqdArc'
                });
            }
        });
    }

    // Process custom layers
    var customLayersData = {};
    if (window.customLayers) {
        for (var layerName in window.customLayers) {
            customLayersData[layerName] = true;
            window.customLayers[layerName].eachLayer(function(layer) {
                if (layer.toGeoJSON) {
                    allLayers.push({
                        geometry: layer.toGeoJSON().geometry,
                        properties: layer.properties || {},
                        layerType: 'custom',
                        customLayerName: layerName
                    });
                }
            });
        }
    }

    // Send data to server
    fetch('/api/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            layers: allLayers,
            customLayers: customLayersData
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Project saved:', data);
        if (data.status === 'success') {
            alert('Project saved successfully');
        } else {
            alert('Error saving project: ' + data.message);
        }
    })
    .catch(error => {
        console.error('Error saving project:', error);
        alert('Error saving project: ' + error.message);
    });
}

function loadProject() {
    console.log('Loading project...');
    fetch('/api/load')
    .then(response => response.json())
    .then(data => {
        console.log('Project loaded:', data);

        // Check if load function exists in map-initialize.js
        if (typeof loadLayers === 'function') {
            loadLayers();
            return;
        }

        // Fallback if loadLayers function is not available
        if (data.layers) {
            // Clear existing layers
            window.drawnItems.clearLayers();
            if (window.esqdArcs) window.esqdArcs.clearLayers();

            // Recreate custom layers if they exist in the data
            if (data.customLayers) {
                for (var layerName in data.customLayers) {
                    if (!window.customLayers[layerName]) {
                        window.customLayers[layerName] = new L.FeatureGroup();
                        window.map.addLayer(window.customLayers[layerName]);
                    } else {
                        window.customLayers[layerName].clearLayers();
                    }
                }
            }

            // Add layers from the data
            data.layers.forEach(layerData => {
                try {
                    var geoJson = L.geoJSON(layerData.geometry);
                    geoJson.eachLayer(function(layer) {
                        // Set properties
                        layer.properties = layerData.properties;

                        // Add to appropriate layer
                        if (layerData.layerType === 'esqdArc' && window.esqdArcs) {
                            window.esqdArcs.addLayer(layer);
                        } else if (layerData.customLayerName && window.customLayers[layerData.customLayerName]) {
                            window.customLayers[layerData.customLayerName].addLayer(layer);
                        } else {
                            window.drawnItems.addLayer(layer);
                        }

                        // Store in layer store if it exists
                        if (window.layerStore) {
                            var layerId = L.Util.stamp(layer);
                            window.layerStore[layerId] = layer;
                        }

                        // Bind popup if it's a facility and the function exists
                        if (layer.properties.facility_type && typeof window.openFacilityEditPopup === 'function') {
                            layer.on('click', function() {
                                window.openFacilityEditPopup(layer);
                            });
                        }
                    });
                } catch (e) {
                    console.error('Error processing layer:', e);
                }
            });

            // Update the draw-to-layer select if it exists
            if (typeof window.updateDrawToLayerSelect === 'function') {
                window.updateDrawToLayerSelect();
            }

            // Trigger QD calculations if necessary
            if (typeof calculateQD === 'function') {
                calculateQD();
            }
        }
    })
    .catch(error => {
        console.error('Error loading project:', error);
    });
}

/**
 * Load project data from the server
 */


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
window.createNewLayer = createNewLayer;
window.setupNewLayerDialog = setupNewLayerDialog;


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


function initializeUIControls() {
    // Setup Save button
    const saveBtn = document.getElementById('saveProjectBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProject);
    }

    // Setup Load button
    const loadBtn = document.getElementById('loadProjectBtn');
    if (loadBtn) {
        loadBtn.addEventListener('click', loadProject);
    }
}

// Call initialization functions
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeUIControls();
} else {
    document.addEventListener('DOMContentLoaded', initializeUIControls);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Feature editor initialization script loaded');

    // Setup New Layer functionality
    setupNewLayerDialog();

    // Load existing project data
    loadProject();
});