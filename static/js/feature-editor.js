
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
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = "none";
  }
  activeEditingLayer = null;
  selectedFeatureProps = null;
}

/**
 * Save feature properties to the active layer
 */
function saveFeatureProperties() {
  console.log("Saving feature properties");

  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Form not found");
    return;
  }

  // Get form values
  const name = document.getElementById('name').value;
  const type = document.getElementById('type').value;
  const description = document.getElementById('description').value;
  
  // Get optional fields if they exist
  let isFacility = false;
  if (document.getElementById('is_facility')) {
    isFacility = document.getElementById('is_facility').checked;
  }
  
  let hasExplosive = false;
  let netExplosiveWeight = 0;
  let hazardDivision = "1.1";
  
  if (document.getElementById('has_explosive')) {
    hasExplosive = document.getElementById('has_explosive').checked;
    
    if (hasExplosive) {
      if (document.getElementById('net_explosive_weight')) {
        netExplosiveWeight = parseFloat(document.getElementById('net_explosive_weight').value) || 0;
      }
      
      if (document.getElementById('hazard_division')) {
        hazardDivision = document.getElementById('hazard_division').value;
      }
    }
  }

  // Update selected feature properties
  const updatedProperties = {
    name,
    type,
    description,
    is_facility: isFacility,
    has_explosive: hasExplosive,
    net_explosive_weight: netExplosiveWeight,
    hazard_division: hazardDivision
  };

  console.log("Updated properties:", updatedProperties);

  // Update the active editing layer if available
  if (activeEditingLayer && activeEditingLayer.feature) {
    activeEditingLayer.feature.properties = {
      ...activeEditingLayer.feature.properties,
      ...updatedProperties
    };
    
    // Update popup content if applicable
    if (typeof updateLayerPopup === 'function') {
      updateLayerPopup(activeEditingLayer);
    }
    
    // Update layer style if applicable
    if (typeof updateLayerStyle === 'function') {
      updateLayerStyle(activeEditingLayer, type);
    }
  }

  // Save to project data if needed
  saveProjectData();

  // Close the modal
  closeFeaturePropertiesModal();
}

/**
 * Toggle the explosive section based on checkbox state
 */
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
      openFeatureEditor(layer.feature.properties);
    } else {
      // Default properties if none exist
      openFeatureEditor({
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
  if (!map) {
    console.error("Map is not initialized, cannot setup layer handlers");
    return;
  }
  
  map.eachLayer(function(layer) {
    // Check if this is a feature layer
    if (layer.feature) {
      addLayerClickHandlers(layer);
    }
    
    // Check if this is a layer group
    if (layer.eachLayer) {
      layer.eachLayer(function(sublayer) {
        if (sublayer.feature) {
          addLayerClickHandlers(sublayer);
        }
      });
    }
  });
  
  console.log("All layer edit handlers set up");
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
 * Save project data to localStorage
 */
function saveProjectData() {
  // Collect all layers with their properties
  const layers = [];
  
  if (map) {
    map.eachLayer(function(layer) {
      if (layer.feature && layer.feature.properties) {
        // Get coordinates depending on the layer type
        let coordinates = [];
        
        if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
          coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
        } else if (layer instanceof L.Marker) {
          const latlng = layer.getLatLng();
          coordinates = [[latlng.lat, latlng.lng]];
        }
        
        if (coordinates.length > 0) {
          layers.push({
            ...layer.feature.properties,
            coordinates
          });
        }
      }
    });
  }
  
  // Save to localStorage
  localStorage.setItem("savedProject", JSON.stringify({ layers }));
  console.log("Project data saved");
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
