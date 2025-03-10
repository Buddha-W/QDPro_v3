// Global variables for feature editing
let map;
let activeEditingLayer = null;
let selectedFeatureProps = null;

// Ensure openFeatureEditor is defined on window immediately
// This declaration at the top ensures the function is available globally
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
    if (nameField && layerData && layerData.feature && layerData.feature.properties) {
      nameField.value = layerData.feature.properties.name || '';
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
window.closeFeaturePropertiesModal = function() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  window.activeEditingLayer = null;
};

/**
 * Save the edited feature properties
 */
window.saveFeatureProperties = function() {
  console.log("Saving feature properties");
  if (!window.activeEditingLayer) {
    console.error("No active editing layer");
    return;
  }

  const nameField = document.getElementById('feature_name');
  if (nameField && window.activeEditingLayer.feature) {
    if (!window.activeEditingLayer.feature.properties) {
      window.activeEditingLayer.feature.properties = {};
    }
    window.activeEditingLayer.feature.properties.name = nameField.value;

    // Update the layer's popup if it has one
    if (window.activeEditingLayer.getPopup) {
      const popup = window.activeEditingLayer.getPopup();
      if (popup) {
        popup.setContent(nameField.value);
      }
    }
  }

  window.closeFeaturePropertiesModal();
};

/**
 * Toggle the explosive section visibility
 */
window.toggleExplosiveSection = function() {
  const hasExplosive = document.getElementById('has_explosive');
  const explosiveSection = document.getElementById('explosiveSection');

  if (hasExplosive && explosiveSection) {
    explosiveSection.style.display = hasExplosive.checked ? 'block' : 'none';
  }
};

// Export functions for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initFeatureEditor,
    openFeatureEditor: window.openFeatureEditor,
    closeFeaturePropertiesModal: window.closeFeaturePropertiesModal,
    saveFeatureProperties: window.saveFeatureProperties,
    toggleExplosiveSection: window.toggleExplosiveSection
  };
}

// Initialize on DOM content loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor script loaded");
});


/**
 * Create the feature properties modal if it doesn't exist
 */
function createFeaturePropertiesModal() {
  console.log("Creating feature properties modal");

  // Check if modal already exists
  if (document.getElementById('featurePropertiesModal')) {
    console.log("Modal already exists, skipping creation");
    return;
  }

  // Create modal container
  const modal = document.createElement('div');
  modal.id = 'featurePropertiesModal';
  modal.className = 'modal';

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  // Create form
  const form = document.createElement('form');
  form.id = 'featurePropertiesForm';

  // Create form contents
  form.innerHTML = `
    <h3>Feature Properties</h3>
    <div class="form-group">
      <label for="feature_name">Name:</label>
      <input type="text" id="feature_name" name="feature_name" required>
    </div>
    <div class="form-group">
      <label for="type">Type:</label>
      <select id="type" name="type">
        <option value="Polygon">Polygon</option>
        <option value="Marker">Marker</option>
        <option value="Line">Line</option>
      </select>
    </div>
    <div class="form-group">
      <label for="description">Description:</label>
      <textarea id="description" name="description"></textarea>
    </div>
    <div class="form-group">
      <label for="is_facility">Is Facility:</label>
      <input type="checkbox" id="is_facility" name="is_facility">
    </div>
    <div class="form-group">
      <label for="has_explosive">Has Explosive:</label>
      <input type="checkbox" id="has_explosive" name="has_explosive" onchange="toggleExplosiveSection()">
    </div>
    <div id="explosiveSection" style="display:none;">
      <div class="form-group">
        <label for="net_explosive_weight">Net Explosive Weight (lbs):</label>
        <input type="number" id="net_explosive_weight" name="net_explosive_weight" min="0">
      </div>
      <div class="form-group">
        <label for="hazard_division">Hazard Division:</label>
        <select id="hazard_division" name="hazard_division">
          <option value="1.1">1.1 - Mass Detonation</option>
          <option value="1.2">1.2 - Non-mass Detonation, Fragment Producing</option>
          <option value="1.3">1.3 - Mass Fire, Minor Blast or Fragment</option>
          <option value="1.4">1.4 - Moderate Fire, No Blast or Fragment</option>
        </select>
      </div>
    </div>
    <div class="button-group">
      <button type="button" onclick="saveFeatureProperties()">Save</button>
      <button type="button" onclick="closeFeaturePropertiesModal()">Cancel</button>
    </div>
  `;

  // Add form to modal content
  modalContent.appendChild(form);
  modal.appendChild(modalContent);

  // Add modal to document body
  document.body.appendChild(modal);

  console.log("Feature properties modal created successfully");
}

/**
 * Add click handlers to a layer
 * @param {L.Layer} layer - The layer to add click handlers to
 */
function addLayerClickHandlers(layer) {
  if (!layer) {
    console.error("Cannot add click handlers to undefined layer");
    return;
  }

  layer.on('click', function(e) {
    L.DomEvent.stopPropagation(e);
    activeEditingLayer = layer;

    // Use layer's feature properties if available
    if (layer.feature && layer.feature.properties) {
      window.openFeatureEditor(layer.feature.properties);
    } else {
      // Default properties if none exist
      window.openFeatureEditor({
        name: "New Feature",
        type: "Polygon",
        description: ""
      });
    }
  });
}

/**
 * Setup click handlers for all existing layers
 */
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.error("Map not initialized, cannot set up layer handlers");
    return;
  }

  window.map.eachLayer(function(layer) {
    if (layer instanceof L.Path) {
      addLayerClickHandlers(layer);
    }

    // Handle layer groups
    if (layer.eachLayer) {
      layer.eachLayer(function(sublayer) {
        if (sublayer instanceof L.Path) {
          addLayerClickHandlers(sublayer);
        }
      });
    }
  });

  console.log("Layer edit handlers set up");
}

/**
 * Save the current project to localStorage
 */
function saveProject() {
  if (!window.map) {
    console.error("Map not initialized, cannot save project");
    return;
  }

  const projectData = {
    layers: []
  };

  window.map.eachLayer(function(layer) {
    if (layer instanceof L.Path && layer.feature) {
      projectData.layers.push(layer.feature.properties);
    }
  });

  localStorage.setItem("savedProject", JSON.stringify(projectData));
  console.log("Project saved with", projectData.layers.length, "layers");
}



/**
 * Setup map click handler to deactivate editing
 */
function setupMapClickHandler() {
  if (!map) {
    console.error("Map is not initialized, cannot setup map click handler");
    return;
  }

  map.on('click', function() {
    // Deactivate any active editing when clicking on the map
    activeEditingLayer = null;
  });

  console.log("Map click handler set up");
}

/**
 * Clear all polygon layers from the map
 */
function clearLayers() {
  if (!map) {
    console.error("Map is not initialized.");
    return;
  }

  map.eachLayer(function(layer) {
    // Only remove feature layers, not base layers
    if (layer instanceof L.Polygon ||
        layer instanceof L.Polyline ||
        layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  console.log("All layers cleared");
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
    polygonLayer.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      activeEditingLayer = polygonLayer;
      window.openFeatureEditor(polygonLayer.feature.properties);
    });
  });

  console.log('Project loaded successfully.');
}


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

// Make functions globally available (updated to reflect changes)
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.toggleExplosiveSection = toggleExplosiveSection;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.setupMapClickHandler = setupMapClickHandler;
window.clearLayers = clearLayers;
window.loadProject = loadProject;
window.saveProject = saveProject;


console.log("Feature editor module loaded");