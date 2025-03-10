// Global variables for feature editing
let map;
let activeEditingLayer = null;
let selectedFeatureProps = null;

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
 * Open the feature editor for a selected layer
 * @param {Object} layerData - Data associated with the layer
 */
function openFeatureEditor(layerData) {
  console.log("Opening feature editor for layer", layerData);

  if (!layerData) {
    console.error('Layer data is missing or incomplete');
    return;
  }

  // Store the selected feature properties
  selectedFeatureProps = layerData;

  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');

  // Check if modal exists before proceeding
  if (!modal) {
    console.error("Modal not found in the DOM");
    createFeaturePropertiesModal();
    return openFeatureEditor(layerData); // Try again after creating the modal
  }

  // Get the form
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Form not found in the DOM");
    return;
  }

  // Reset form
  form.reset();

  // Fill the form with current properties
  if (layerData.name) document.getElementById('name').value = layerData.name;
  if (layerData.type) document.getElementById('type').value = layerData.type;
  if (layerData.description) document.getElementById('description').value = layerData.description;

  // Handle facility-specific properties
  if (document.getElementById('is_facility')) {
    document.getElementById('is_facility').checked = layerData.is_facility || false;
  }

  // Handle explosive-specific properties
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.checked = layerData.has_explosive || false;
    toggleExplosiveSection();
  }

  // Show the modal
  modal.style.display = "block";
}

/**
 * Creates the modal for feature properties if it doesn't exist in the DOM
 */
function createFeaturePropertiesModal() {
  console.log("Creating feature properties modal");

  // Check if modal already exists
  if (document.getElementById('featurePropertiesModal')) {
    return;
  }

  // Create modal element
  const modalElement = document.createElement('div');
  modalElement.id = 'featurePropertiesModal';
  modalElement.className = 'modal';

  // Set modal content HTML
  modalElement.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Feature Properties</h2>
        <span id="closeFeaturePropertiesBtn" class="close" onclick="closeFeaturePropertiesModal()">&times;</span>
      </div>
      <div class="modal-body">
        <form id="featurePropertiesForm">
          <div class="form-group">
            <label for="name">Name:</label>
            <input type="text" id="name" name="name" />
          </div>
          <div class="form-group">
            <label for="type">Type:</label>
            <input type="text" id="type" name="type" />
          </div>
          <div class="form-group">
            <label for="description">Description:</label>
            <textarea id="description" name="description"></textarea>
          </div>
          <div class="form-group">
            <label for="is_facility">Is Facility:</label>
            <input type="checkbox" id="is_facility" name="is_facility" />
          </div>
          <div class="form-group">
            <label for="has_explosive">Has Explosive:</label>
            <input type="checkbox" id="has_explosive" name="has_explosive" onchange="toggleExplosiveSection()" />
          </div>
          <div id="explosiveSection" style="display:none;">
            <div class="form-group">
              <label for="explosive_type">Explosive Type:</label>
              <select id="explosive_type" name="explosive_type">
                <option value="1.1">1.1 - Mass Explosion</option>
                <option value="1.2">1.2 - Projection but not Mass Explosion</option>
                <option value="1.3">1.3 - Fire and Minor Blast</option>
                <option value="1.4">1.4 - Moderate Fire</option>
              </select>
            </div>
            <div class="form-group">
              <label for="net_explosive_weight">Net Explosive Weight (lbs):</label>
              <input type="number" id="net_explosive_weight" name="net_explosive_weight" min="0" />
            </div>
          </div>
          <div class="form-actions">
            <button type="button" onclick="saveFeatureProperties()">Save</button>
            <button type="button" onclick="closeFeaturePropertiesModal()">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Append modal to document body
  document.body.appendChild(modalElement);

  console.log("Feature properties modal created");
}

/**
 * Toggle the explosive section visibility based on checkbox state
 */
function toggleExplosiveSection() {
  const hasExplosive = document.getElementById('has_explosive').checked;
  const explosiveSection = document.getElementById('explosiveSection');
  if (explosiveSection) {
    explosiveSection.style.display = hasExplosive ? 'block' : 'none';
  }
}

/**
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = "none";
  }
}

/**
 * Save the feature properties from the form
 */
function saveFeatureProperties() {
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Form not found");
    return;
  }

  // Get form values
  const properties = {
    name: document.getElementById('name').value,
    type: document.getElementById('type').value,
    description: document.getElementById('description').value
  };

  // Handle facility-specific and explosive-specific properties
  if (document.getElementById('is_facility')) {
    properties.is_facility = document.getElementById('is_facility').checked;
  }

  if (document.getElementById('has_explosive')) {
    properties.has_explosive = document.getElementById('has_explosive').checked;

    if (properties.has_explosive) {
      properties.explosive_type = document.getElementById('explosive_type').value;
      properties.net_explosive_weight = parseFloat(document.getElementById('net_explosive_weight').value);
    }
  }

  // Update the active layer if it exists
  if (activeEditingLayer) {
    // Update the layer's feature properties
    if (!activeEditingLayer.feature) {
      activeEditingLayer.feature = { type: "Feature", properties: {} };
    }
    activeEditingLayer.feature.properties = properties;

    // Update any visual styling based on properties
    if (activeEditingLayer.setStyle) {
      // Example: change style based on type
      const color = properties.has_explosive ? '#ff3300' : '#3388ff';
      activeEditingLayer.setStyle({ color: color });
    }

    // Update popup content if the layer has a popup
    if (activeEditingLayer.getPopup()) {
      activeEditingLayer.setPopupContent(createPopupContent(properties));
    }
  }

  // Close the modal
  closeFeaturePropertiesModal();

  console.log("Feature properties saved:", properties);
}

/**
 * Create popup content based on properties
 * @param {Object} properties - Feature properties
 * @returns {String} HTML content for popup
 */
function createPopupContent(properties) {
  let content = '<div class="feature-popup">';
  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }
  content += '</div>';
  return content;
}

/**
 * Add click handlers to all layers
 * @param {Array} layers - Array of layers to add handlers to
 */
function addLayerClickHandlers(layers) {
  if (!Array.isArray(layers)) {
    console.error("Expected array of layers, got:", typeof layers);
    return;
  }

  layers.forEach(layer => {
    layer.on('click', function(e) {
      // Stop propagation to prevent map click handler from firing
      L.DomEvent.stopPropagation(e);

      // Set this as the active editing layer
      activeEditingLayer = layer;

      // Get layer data/properties
      const layerData = layer.feature ? layer.feature.properties : {};

      // Open the feature editor
      openFeatureEditor(layerData);
    });
  });
}

/**
 * Set up click handlers for all map layers
 */
function setupAllLayerEditHandlers() {
  if (!map) {
    console.error("Map not initialized, cannot setup layer handlers");
    return;
  }

  const layers = [];
  map.eachLayer(function(layer) {
    // Only add handlers to vector layers (polygons, markers, etc.)
    if (layer instanceof L.Path || layer instanceof L.Marker) {
      layers.push(layer);
    }
  });

  addLayerClickHandlers(layers);
}

/**
 * Set up the map click handler for deselecting features
 */
function setupMapClickHandler() {
  if (!map) {
    console.error("Map not initialized, cannot setup map click handler");
    return;
  }

  map.on('click', function() {
    // Deselect any active editing layer
    if (activeEditingLayer) {
      // Remove any visual indication of selection
      if (activeEditingLayer.setStyle) {
        activeEditingLayer.setStyle({ color: '#3388ff' });
      }
    }

    // Clear active editing layer
    activeEditingLayer = null;
  });
}

/**
 * Clear all layers from the map
 */
function clearLayers() {
  if (!map) {
    console.error("Cannot clear layers: map is not initialized");
    return;
  }

  map.eachLayer(function(layer) {
    // Don't remove the base tile layer
    if (layer instanceof L.TileLayer) {
      return;
    }

    // Remove all other layers
    map.removeLayer(layer);
  });
}

/**
 * Load project from localStorage
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
      openFeatureEditor(polygonLayer.feature.properties);
    });
  });

  console.log('Project loaded successfully.');
}

// Make functions globally available
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.toggleExplosiveSection = toggleExplosiveSection;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.setupMapClickHandler = setupMapClickHandler;
window.clearLayers = clearLayers;
window.loadProject = loadProject;

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