// Global variables for feature editing
let map;
let activeEditingLayer = null;

// Ensure openFeatureEditor is defined on window immediately
window.openFeatureEditor = function(layerData) {
  console.log("Opening feature editor for", layerData);
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    console.log("Opening modal for", layerData);
    modal.style.display = 'block';

    // Store the active layer for later use
    window.activeEditingLayer = layerData;

    // Populate form fields if available
    const nameField = document.getElementById('feature_name');
    if (nameField && layerData && layerData.properties) {
      nameField.value = layerData.properties.name || '';
    } else if (nameField && layerData && layerData.name) {
      nameField.value = layerData.name || '';
    }
  } else {
    console.error("Feature properties modal not found");
  }
};

/**
 * Initialize feature editor with the map instance
 * @param {L.Map} mapInstance - The Leaflet map instance
 */
function initFeatureEditor(mapInstance) {
  if (!mapInstance) {
    console.error('Cannot initialize feature editor: map instance is required');
    return;
  }

  map = mapInstance;
  console.log('Feature editor initialized with map instance');
}

/**
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.activeEditingLayer = null;
}

/**
 * Save the edited feature properties
 */
function saveFeatureProperties() {
  console.log("Saving feature properties");
  if (!window.activeEditingLayer) {
    console.error("No active editing layer");
    return;
  }

  const nameField = document.getElementById('feature_name');
  if (nameField) {
    if (window.activeEditingLayer.feature) {
      if (!window.activeEditingLayer.feature.properties) {
        window.activeEditingLayer.feature.properties = {};
      }
      window.activeEditingLayer.feature.properties.name = nameField.value;
    } else if (typeof window.activeEditingLayer === 'object') {
      // Handle direct property objects
      window.activeEditingLayer.name = nameField.value;
    }

    // Update the layer's popup if it has one
    if (window.activeEditingLayer.getPopup) {
      const popup = window.activeEditingLayer.getPopup();
      if (popup) {
        popup.setContent(nameField.value);
      }
    }
  }

  closeFeaturePropertiesModal();
}

/**
 * Toggle the visibility of the explosive section
 */
function toggleExplosiveSection() {
  const checkbox = document.getElementById('has_explosive');
  const explosiveSection = document.getElementById('explosiveSection');

  if (checkbox && explosiveSection) {
    explosiveSection.style.display = checkbox.checked ? 'block' : 'none';
  }
}

/**
 * Add click handlers to a layer for feature editing
 * @param {L.Layer} layer - The Leaflet layer
 */
function addLayerClickHandlers(layer) {
  if (!layer) return;

  layer.on('click', function(e) {
    L.DomEvent.stopPropagation(e);

    // Set this as the active editing layer
    activeEditingLayer = layer;

    // Open the feature editor for this layer
    if (layer.feature && layer.feature.properties) {
      window.openFeatureEditor(layer.feature.properties);
    } else {
      window.openFeatureEditor(layer);
    }
  });
}

/**
 * Set up click handlers for all layers that have features
 */
function setupAllLayerEditHandlers() {
  if (!map) {
    console.error('Map is not initialized');
    return;
  }

  map.eachLayer(function(layer) {
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

/**
 * Set up map click handler to deselect active layers
 */
function setupMapClickHandler() {
  if (!map) {
    console.error('Map is not initialized');
    return;
  }

  map.on('click', function() {
    // Close any open modal on map click
    closeFeaturePropertiesModal();
    activeEditingLayer = null;
  });

  console.log('Map click handler set up');
}

/**
 * Clear all polygon layers from the map
 */
function clearLayers() {
  if (!map) {
    console.error('Map is not initialized');
    return;
  }

  map.eachLayer(function(layer) {
    // Remove only polygon layers (but keep the base tile layer)
    if (layer instanceof L.Polygon || layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  console.log('All polygon layers cleared');
}

/**
 * Load project data from localStorage
 */
function loadProject() {
  clearLayers();

  const projectData = JSON.parse(localStorage.getItem("savedProject"));
  if (!projectData || !projectData.layers) {
    console.error("No valid project data found.");
    return;
  }

  projectData.layers.forEach(layer => {
    const polygonLayer = L.polygon(layer.coordinates).addTo(map);

    // Set feature properties
    polygonLayer.feature = {
      type: "Feature",
      properties: {
        name: layer.name,
        ...layer  // spread any other properties
      }
    };

    // Add click handler to open feature editor
    addLayerClickHandlers(polygonLayer);
  });

  console.log('Project loaded successfully.');
}

/**
 * Save project data to localStorage
 */
function saveProject() {
  const layers = [];

  map.eachLayer(function(layer) {
    if (layer instanceof L.Polygon) {
      const layerData = {
        name: layer.feature?.properties?.name || 'Unnamed Feature',
        coordinates: []
      };

      // Get coordinates
      if (layer.getLatLngs) {
        const latLngs = layer.getLatLngs();
        if (latLngs && latLngs.length > 0) {
          // Handle potential nested arrays in polygons
          let coordinates = latLngs;
          if (Array.isArray(latLngs[0]) && latLngs[0].length > 0) {
            coordinates = latLngs[0];  // First ring of coordinates
          }

          layerData.coordinates = coordinates.map(latLng => [latLng.lat, latLng.lng]);
        }
      }

      layers.push(layerData);
    }
  });

  localStorage.setItem("savedProject", JSON.stringify({ layers }));
  console.log('Project saved successfully.');
}

/**
 * Create the feature properties modal if it doesn't exist
 */
function createFeaturePropertiesModal() {
  let modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'featurePropertiesModal';
    modal.className = 'modal';
    modal.style.display = 'none';

    const modalContent = `
      <div class="modal-content">
        <span class="close" onclick="closeFeaturePropertiesModal()">&times;</span>
        <h2>Feature Properties</h2>
        <form id="featurePropertiesForm">
          <div class="form-group">
            <label for="feature_name">Name:</label>
            <input type="text" id="feature_name" name="name">
          </div>
          <div class="form-group">
            <button type="button" onclick="saveFeatureProperties()">Save</button>
            <button type="button" onclick="closeFeaturePropertiesModal()">Cancel</button>
          </div>
        </form>
      </div>
    `;

    modal.innerHTML = modalContent;
    document.body.appendChild(modal);
    console.log('Feature properties modal created');
  }
}

// Make functions globally available
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.toggleExplosiveSection = toggleExplosiveSection;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.setupMapClickHandler = setupMapClickHandler;
window.clearLayers = clearLayers;
window.loadProject = loadProject;
window.saveProject = saveProject;

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor module loaded");

  // Create the modal if it doesn't exist
  createFeaturePropertiesModal();

  // Wait for map to be available
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      console.log("Map is ready, setting up feature editor");

      // Initialize the feature editor with the map
      initFeatureEditor(window.map);

      // Setup map and layer handlers
      setupMapClickHandler();
      setupAllLayerEditHandlers();
    }
  }, 100);
});

// Export for module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initFeatureEditor,
    openFeatureEditor: window.openFeatureEditor,
    closeFeaturePropertiesModal,
    saveFeatureProperties,
    toggleExplosiveSection
  };
}