
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
/**
 * Feature Editor Module
 * Handles feature selection, editing, and property management
 */

// Global map variable (will be initialized in the map module)
let map;

// Global variables for feature editing
let activeEditLayer = null;
let selectedFeatureProps = null;

/**
 * Initialize the feature editor with the map instance
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
  if (!map) {
    console.error('Cannot open feature editor: map is not initialized');
    return;
  }
  
  if (!layerData) {
    console.error('Layer data is missing or incomplete');
    return;
  }
  
  console.log('Opening feature editor for:', layerData.name || 'Unnamed feature');
  
  // Store the selected feature properties
  selectedFeatureProps = layerData;
  
  // Open the modal for editing properties
  openFeaturePropertiesModal(layerData);
}

/**
 * Open the modal for editing feature properties
 * @param {Object} layerData - Data associated with the layer
 */
function openFeaturePropertiesModal(layerData) {
  // Get the modal element
  const modal = document.getElementById('featurePropertiesModal');
  
  if (!modal) {
    console.error('Feature properties modal not found in the DOM');
    // Create a simple alert as fallback
    alert(`Editing feature: ${layerData.name || 'Unnamed feature'}`);
    return;
  }
  
  // Populate form fields with layer data
  document.getElementById('name').value = layerData.name || '';
  
  if (layerData.properties) {
    document.getElementById('description').value = layerData.properties.description || '';
    document.getElementById('type').value = layerData.properties.type || 'Other';
    
    // Set checkboxes based on properties
    document.getElementById('is_facility').checked = layerData.properties.is_facility || false;
    document.getElementById('has_explosive').checked = layerData.properties.has_explosive || false;
    
    // Show/hide explosive section based on has_explosive value
    const explosiveSection = document.getElementById('explosiveSection');
    if (explosiveSection) {
      explosiveSection.style.display = layerData.properties.has_explosive ? 'block' : 'none';
    }
    
    // Set explosive weight if available
    if (document.getElementById('net_explosive_weight')) {
      document.getElementById('net_explosive_weight').value = 
        layerData.properties.has_explosive ? (layerData.properties.net_explosive_weight || '') : '';
    }
  }
  
  // Display the modal
  modal.style.display = 'block';
}

/**
 * Close the feature properties modal
 */
function closeFeaturePropertiesModal() {
  // Get the modal element
  const modal = document.getElementById('featurePropertiesModal');
  
  // Hide the modal
  if (modal) {
    modal.style.display = 'none';
  } else {
    console.warn("Modal element not found when trying to close");
  }

  // Reset active editing layer
  activeEditLayer = null;
  selectedFeatureProps = null;
}

/**
 * Save the changes made to feature properties
 */
function saveFeatureProperties() {
  if (!selectedFeatureProps) {
    console.error('No feature selected for saving properties');
    return;
  }
  
  // Get values from the form
  const name = document.getElementById('name').value;
  const description = document.getElementById('description').value;
  const type = document.getElementById('type').value;
  const is_facility = document.getElementById('is_facility').checked;
  const has_explosive = document.getElementById('has_explosive').checked;
  
  // Update the properties object
  if (!selectedFeatureProps.properties) {
    selectedFeatureProps.properties = {};
  }
  
  // Update basic properties
  selectedFeatureProps.name = name;
  selectedFeatureProps.properties.description = description;
  selectedFeatureProps.properties.type = type;
  selectedFeatureProps.properties.is_facility = is_facility;
  selectedFeatureProps.properties.has_explosive = has_explosive;
  
  // Handle explosive properties if needed
  if (has_explosive) {
    const net_explosive_weight = parseFloat(document.getElementById('net_explosive_weight').value) || 0;
    selectedFeatureProps.properties.net_explosive_weight = net_explosive_weight;
  }
  
  // Update any other custom properties as needed
  
  console.log('Feature properties saved:', selectedFeatureProps);
  
  // Save project to localStorage or server
  saveProject();
  
  // Close the modal
  closeFeaturePropertiesModal();
}

/**
 * Clear all editable layers from the map
 */
function clearLayers() {
  if (!map) {
    console.error('Cannot clear layers: map is not initialized');
    return;
  }
  
  map.eachLayer(function(layer) {
    // Only remove non-base layers (polygons, markers, etc.)
    if (layer instanceof L.Marker || 
        layer instanceof L.Polygon || 
        layer instanceof L.Polyline || 
        layer instanceof L.Circle) {
      map.removeLayer(layer);
    }
  });
  
  console.log('All editable layers cleared from map');
}

/**
 * Set up click handlers for features in a layer group
 * @param {L.LayerGroup} layerGroup - Layer group containing features
 * @param {Array} layerDataArray - Array of data objects for the features
 */
function setupFeatureClickHandlers(layerGroup, layerDataArray) {
  if (!map || !layerGroup || !Array.isArray(layerDataArray)) {
    console.error('Cannot setup click handlers: missing required parameters');
    return;
  }
  
  // Match each layer with its corresponding data
  layerGroup.eachLayer(function(layer, index) {
    const layerData = layerDataArray[index];
    
    if (layerData) {
      // Attach click handler to the layer
      layer.on('click', function(e) {
        // Prevent click from propagating to the map
        L.DomEvent.stopPropagation(e);
        
        // Set this as the active editing layer
        activeEditLayer = layer;
        
        // Open the feature editor
        openFeatureEditor(layerData);
      });
    }
  });
}

/**
 * Load project data and display on the map
 * @param {Object} projectData - Project data containing layers and features
 */
function loadProject(projectData) {
  if (!map) {
    console.error('Cannot load project: map is not initialized');
    return;
  }
  
  // Clear existing layers
  clearLayers();
  
  if (!projectData || !projectData.layers) {
    console.warn('No project data available to load');
    return;
  }
  
  // Create layer groups for each layer in the project
  Object.keys(projectData.layers).forEach(layerName => {
    const layerData = projectData.layers[layerName];
    const layerGroup = L.featureGroup().addTo(map);
    
    // Add each feature to the layer group
    layerData.features.forEach(feature => {
      let featureLayer;
      
      // Create the appropriate type of feature based on geometry
      if (feature.geometry.type === 'Polygon') {
        featureLayer = L.polygon(feature.geometry.coordinates).addTo(layerGroup);
      } else if (feature.geometry.type === 'Point') {
        featureLayer = L.marker(feature.geometry.coordinates).addTo(layerGroup);
      } else if (feature.geometry.type === 'LineString') {
        featureLayer = L.polyline(feature.geometry.coordinates).addTo(layerGroup);
      }
      
      // Set layer style if available
      if (feature.style && featureLayer.setStyle) {
        featureLayer.setStyle(feature.style);
      }
      
      // Attach click handler
      featureLayer.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        activeEditLayer = featureLayer;
        openFeatureEditor(feature);
      });
    });
    
    // Store the layer group
    window.QDPro.layers[layerName] = layerGroup;
  });
  
  console.log('Project loaded successfully');
}

/**
 * Save the current project state
 */
function saveProject() {
  if (!map) {
    console.error('Cannot save project: map is not initialized');
    return;
  }
  
  // Build project data object from current layers
  const projectData = {
    name: window.QDPro.currentProjectName || 'Untitled Project',
    layers: {}
  };
  
  // For each layer group, extract features and properties
  Object.keys(window.QDPro.layers).forEach(layerName => {
    const layerGroup = window.QDPro.layers[layerName];
    const features = [];
    
    layerGroup.eachLayer(layer => {
      // Extract geometry based on layer type
      let geometry = {
        type: 'Unknown',
        coordinates: []
      };
      
      if (layer instanceof L.Polygon) {
        geometry.type = 'Polygon';
        geometry.coordinates = layer.getLatLngs();
      } else if (layer instanceof L.Marker) {
        geometry.type = 'Point';
        geometry.coordinates = [layer.getLatLng().lat, layer.getLatLng().lng];
      } else if (layer instanceof L.Polyline) {
        geometry.type = 'LineString';
        geometry.coordinates = layer.getLatLngs();
      }
      
      // Get properties from the layer or use defaults
      const properties = layer.feature ? layer.feature.properties : {};
      
      // Create feature object
      const feature = {
        name: layer.feature ? layer.feature.name : 'Unnamed Feature',
        geometry: geometry,
        properties: properties
      };
      
      features.push(feature);
    });
    
    projectData.layers[layerName] = {
      name: layerName,
      features: features
    };
  });
  
  // Save to localStorage
  try {
    localStorage.setItem('savedProject', JSON.stringify(projectData));
    console.log('Project saved successfully');
  } catch (e) {
    console.error('Error saving project to localStorage:', e);
  }
  
  // You could also implement server-side saving here
}

// Ensure the feature editor is correctly initialized when the page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('Feature editor script loaded');
  
  // The map should be initialized elsewhere, but we'll check for it
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      initFeatureEditor(window.map);
    }
  }, 100);
  
  // Set up event handlers for the explosive checkbox
  const explosiveCheckbox = document.getElementById('has_explosive');
  if (explosiveCheckbox) {
    explosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
});

// Export functions for global use
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.clearLayers = clearLayers;
window.loadProject = loadProject;
window.saveProject = saveProject;
