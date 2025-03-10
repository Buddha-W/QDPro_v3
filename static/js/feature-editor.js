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
 * Open the feature editor for a selected layer
 * @param {Object} layerData - Data associated with the layer
 */
// Redefine the implementation of the already-declared window.openFeatureEditor
window.openFeatureEditor = function(layerData) {
  console.log("Opening feature editor for", layerData);

  if (!layerData) {
    console.error("No layer data provided to openFeatureEditor");
    return;
  }
  
  // Create the modal if it doesn't exist
  let modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.log("Creating feature properties modal");
    modal = document.createElement('div');
    modal.id = 'featurePropertiesModal';
    modal.className = 'modal';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // Create header
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const modalTitle = document.createElement('h2');
    modalTitle.textContent = 'Feature Properties';
    
    const closeBtn = document.createElement('span');
    closeBtn.id = 'closeFeaturePropertiesBtn';
    closeBtn.className = 'close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('onclick', 'closeFeaturePropertiesModal()');
    
    modalHeader.appendChild(modalTitle);
    modalHeader.appendChild(closeBtn);
    
    // Create body
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    // Create form
    const form = document.createElement('form');
    form.id = 'featurePropertiesForm';
    
    // Name field
    const nameGroup = document.createElement('div');
    nameGroup.className = 'form-group';
    
    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'name');
    nameLabel.textContent = 'Name:';
    
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'name';
    nameInput.name = 'name';
    
    nameGroup.appendChild(nameLabel);
    nameGroup.appendChild(nameInput);
    
    // Is facility field
    const facilityGroup = document.createElement('div');
    facilityGroup.className = 'form-group';
    
    const facilityLabel = document.createElement('label');
    facilityLabel.setAttribute('for', 'is_facility');
    facilityLabel.textContent = 'Is Facility:';
    
    const facilityInput = document.createElement('input');
    facilityInput.type = 'checkbox';
    facilityInput.id = 'is_facility';
    facilityInput.name = 'is_facility';
    
    facilityGroup.appendChild(facilityLabel);
    facilityGroup.appendChild(facilityInput);
    
    // Has explosive field
    const explosiveGroup = document.createElement('div');
    explosiveGroup.className = 'form-group';
    
    const explosiveLabel = document.createElement('label');
    explosiveLabel.setAttribute('for', 'has_explosive');
    explosiveLabel.textContent = 'Has Explosive:';
    
    const explosiveInput = document.createElement('input');
    explosiveInput.type = 'checkbox';
    explosiveInput.id = 'has_explosive';
    explosiveInput.name = 'has_explosive';
    explosiveInput.setAttribute('onchange', 'toggleExplosiveSection()');
    
    explosiveGroup.appendChild(explosiveLabel);
    explosiveGroup.appendChild(explosiveInput);
    
    // Explosive section
    const explosiveSection = document.createElement('div');
    explosiveSection.id = 'explosiveSection';
    explosiveSection.style.display = 'none';
    
    // Save button
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'form-group button-group';
    
    const saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.textContent = 'Save';
    saveButton.className = 'save-btn';
    saveButton.setAttribute('onclick', 'saveFeatureProperties()');
    
    buttonGroup.appendChild(saveButton);
    
    // Add all to form
    form.appendChild(nameGroup);
    form.appendChild(facilityGroup);
    form.appendChild(explosiveGroup);
    form.appendChild(explosiveSection);
    form.appendChild(buttonGroup);
    
    modalBody.appendChild(form);
    
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Populate the form fields with the layer's properties
  const nameField = document.getElementById('name');
  if (nameField) {
    nameField.value = layerData.name || "";
  }

  // Handle facility checkbox
  const isFacilityCheckbox = document.getElementById('is_facility');
  if (isFacilityCheckbox) {
    isFacilityCheckbox.checked = layerData.is_facility || false;
  }

  // Handle explosive checkbox
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.checked = layerData.has_explosive || false;
    toggleExplosiveSection();
  }

  // Show the modal
  modal.style.display = 'block';

  // Store the active layer for later use when saving
  activeEditingLayer = layerData;
}

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
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required>
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
      <input type="checkbox" id="has_explosive" name="has_explosive" >
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
      <button type="button" id="saveFeaturePropertiesBtn">Save</button>
      <button type="button" id="closeFeaturePropertiesBtn">Cancel</button>
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
 * Close the feature properties modal
 */
window.closeFeaturePropertiesModal = function() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }
  activeEditingLayer = null;
}

/**
 * Save the feature properties from the form to the layer
 */
window.saveFeatureProperties = function() {
  if (!activeEditingLayer) {
    console.error("No active editing layer");
    return;
  }

  // Get form values
  const nameField = document.getElementById('name');
  if (nameField) {
    activeEditingLayer.name = nameField.value;
  }

  const isFacilityCheckbox = document.getElementById('is_facility');
  if (isFacilityCheckbox) {
    activeEditingLayer.is_facility = isFacilityCheckbox.checked;
  }

  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    activeEditingLayer.has_explosive = hasExplosiveCheckbox.checked;
  }

  // Close the modal
  window.closeFeaturePropertiesModal();

  // Update project data in localStorage
  saveProject();

  console.log("Feature properties saved", activeEditingLayer);
}

function toggleExplosiveSection() {
  const hasExplosive = document.getElementById('has_explosive').checked;
  const explosiveSection = document.getElementById('explosiveSection');

  if (explosiveSection) {
    explosiveSection.style.display = hasExplosive ? 'block' : 'none';
  }
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
/**
 * Toggle the explosive section based on the checkbox state
 */
function toggleExplosiveSection() {
  const hasExplosive = document.getElementById('has_explosive');
  const explosiveSection = document.getElementById('explosiveSection');
  
  if (explosiveSection) {
    explosiveSection.style.display = hasExplosive && hasExplosive.checked ? 'block' : 'none';
  }
}
