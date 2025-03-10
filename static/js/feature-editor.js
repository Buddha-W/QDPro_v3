
// Global variables
let activeEditingLayer = null;

/**
 * Opens the feature editor for a specific layer
 * @param {L.Layer} layer - The layer to edit
 */
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer", layer);
  
  // Store reference to active layer being edited
  activeEditingLayer = layer;
  
  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');
  
  // Check if modal exists before proceeding
  if (!modal) {
    console.error("Modal not found in the DOM");
    createFeaturePropertiesModal();
    return openFeatureEditor(layer); // Try again after creating the modal
  }

  // Get the form
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Form not found in the DOM");
    return;
  }

  // Reset form
  form.reset();
  
  // Get properties from the layer
  const properties = layer.feature ? layer.feature.properties || {} : {};
  
  // Fill the form with current properties
  if (properties.name) document.getElementById('name').value = properties.name;
  if (properties.type) document.getElementById('type').value = properties.type;
  if (properties.description) document.getElementById('description').value = properties.description;
  
  // Handle facility-specific properties
  if (document.getElementById('is_facility')) {
    document.getElementById('is_facility').checked = properties.is_facility || false;
  }
  
  // Handle explosive-specific properties
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.checked = properties.has_explosive || false;
    
    // Show/hide explosive section
    const explosiveSection = document.getElementById('explosiveSection');
    if (explosiveSection) {
      explosiveSection.style.display = hasExplosiveCheckbox.checked ? 'block' : 'none';
    }
    
    // Set net explosive weight if available
    if (properties.net_explosive_weight && document.getElementById('net_explosive_weight')) {
      document.getElementById('net_explosive_weight').value = properties.net_explosive_weight;
    }
  }
  
  // Show the modal
  modal.style.display = 'block';
}

/**
 * Closes the feature properties modal
 */
function closeFeaturePropertiesModal() {
  console.log("Closing feature properties modal");
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  } else {
    console.warn("Modal element not found when trying to close");
  }
  
  // Reset active editing layer
  activeEditingLayer = null;
}

/**
 * Saves the feature properties from the form to the active layer
 */
function saveFeatureProperties() {
  console.log("Saving feature properties");
  if (!activeEditingLayer) {
    console.error("No active layer to save properties to");
    return;
  }
  
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Form not found");
    return;
  }
  
  // Initialize feature if it doesn't exist
  if (!activeEditingLayer.feature) {
    activeEditingLayer.feature = {
      type: 'Feature',
      properties: {},
      geometry: activeEditingLayer.toGeoJSON ? activeEditingLayer.toGeoJSON().geometry : null
    };
  }
  
  // Get form values
  const name = document.getElementById('name').value;
  const type = document.getElementById('type').value;
  const description = document.getElementById('description').value;
  
  // Update properties
  activeEditingLayer.feature.properties.name = name;
  activeEditingLayer.feature.properties.type = type;
  activeEditingLayer.feature.properties.description = description;
  
  // Handle facility-specific properties
  if (document.getElementById('is_facility')) {
    activeEditingLayer.feature.properties.is_facility = document.getElementById('is_facility').checked;
  }
  
  // Handle explosive-specific properties
  if (document.getElementById('has_explosive')) {
    activeEditingLayer.feature.properties.has_explosive = document.getElementById('has_explosive').checked;
    
    if (activeEditingLayer.feature.properties.has_explosive && document.getElementById('net_explosive_weight')) {
      activeEditingLayer.feature.properties.net_explosive_weight = document.getElementById('net_explosive_weight').value;
    }
  }
  
  // Close the modal
  closeFeaturePropertiesModal();
  
  // Update layer popup if it has one
  if (activeEditingLayer.getPopup && activeEditingLayer.getPopup()) {
    const popup = activeEditingLayer.getPopup();
    if (popup && typeof createPopupContent === 'function') {
      popup.setContent(createPopupContent(activeEditingLayer.feature.properties));
    }
  }
  
  // Save project state if available
  if (typeof saveProjectState === 'function') {
    saveProjectState();
  }
}

/**
 * Creates the feature properties modal if it doesn't exist
 */
function createFeaturePropertiesModal() {
  console.log("Creating feature properties modal");
  
  // Check if modal already exists
  if (document.getElementById('featurePropertiesModal')) {
    return;
  }
  
  // Create modal HTML
  const modalHTML = `
    <div id="featurePropertiesModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Feature Properties</h2>
          <span class="close" onclick="closeFeaturePropertiesModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="featurePropertiesForm">
            <div class="form-group">
              <label for="name">Name:</label>
              <input type="text" id="name" name="name" />
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
                <label for="net_explosive_weight">Net Explosive Weight:</label>
                <input type="number" id="net_explosive_weight" name="net_explosive_weight" />
              </div>
            </div>
            <div class="form-group">
              <label for="type">Type:</label>
              <select id="type" name="type">
                <option value="Facility">Facility</option>
                <option value="Boundary">Boundary</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="form-group">
              <label for="description">Description:</label>
              <textarea id="description" name="description"></textarea>
            </div>
            <div class="form-actions">
              <button type="button" id="savePropertiesBtn" class="btn btn-primary" onclick="saveFeatureProperties()">Save</button>
              <button type="button" class="btn btn-secondary" onclick="closeFeaturePropertiesModal()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;
  
  // Add the modal to the document
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Setup has_explosive checkbox handler
  document.getElementById('has_explosive').addEventListener('change', function() {
    toggleExplosiveSection();
  });
}

/**
 * Toggles the visibility of the explosive section based on the has_explosive checkbox
 */
function toggleExplosiveSection() {
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  const explosiveSection = document.getElementById('explosiveSection');
  
  if (hasExplosiveCheckbox && explosiveSection) {
    explosiveSection.style.display = hasExplosiveCheckbox.checked ? 'block' : 'none';
  }
}

/**
 * Adds click handlers to a layer for editing
 * @param {L.Layer} layer - The layer to add handlers to
 */
function addLayerClickHandlers(layer) {
  if (!layer) return;
  
  layer.on('click', function(e) {
    // Prevent the click from propagating to the map
    L.DomEvent.stopPropagation(e);
    
    // Open the feature editor for this layer
    openFeatureEditor(layer);
  });
}

/**
 * Setup all layer edit handlers for existing layers
 */
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.error("Map not initialized, cannot setup layer handlers");
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
}

/**
 * Setup the map click handler for deselecting active features
 */
function setupMapClickHandler() {
  if (!window.map) {
    console.error("Map not initialized, cannot setup map click handler");
    return;
  }
  
  window.map.on('click', function() {
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

// Make functions globally available
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.toggleExplosiveSection = toggleExplosiveSection;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.setupMapClickHandler = setupMapClickHandler;

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
      
      // Setup map and layer handlers
      setupMapClickHandler();
      setupAllLayerEditHandlers();
    }
  }, 100);
});
