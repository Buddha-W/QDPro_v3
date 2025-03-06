
// Feature Editor script
let editingLayer = null;
let previousPopup = null;

// Function to add click handlers to a layer
function addLayerClickHandlers(layer) {
  if (!layer) return;
  
  // Add a direct click handler to the layer
  layer.on('click', function(e) {
    console.log("Layer clicked:", layer);
    
    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);
    
    // Close any existing modals
    closeFeaturePropertiesModal();
    
    // Open the property editor for this layer
    openFeatureEditor(layer);
  });
}

// Function to reset all layers to be interactive
function resetLayerInteractivity() {
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.feature && typeof layer.setStyle === 'function') {
        // Make layers interactive again
        layer.setStyle({ interactive: true });
      }
    });
  }
}

// Close all popups on the map
function closeAllPopups() {
  console.log("Closing all popups");
  
  if (window.map) {
    window.map.closePopup();
  }
  
  if (previousPopup) {
    previousPopup.remove();
    previousPopup = null;
  }
  
  // Reset layer interactivity
  resetLayerInteractivity();
}

// Close the feature properties modal
function closeFeaturePropertiesModal() {
  console.log("Closing feature properties modal");
  
  const featurePropertiesModal = document.getElementById('featurePropertiesModal');
  if (featurePropertiesModal) {
    featurePropertiesModal.style.display = 'none';
  }
  
  // Reset global state
  window.activeEditLayer = null;
  editingLayer = null;
  
  // Reset layer interactivity
  resetLayerInteractivity();
}

// Open the feature editor modal for a given layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);
  
  // Set global active editing layer
  window.activeEditLayer = layer;
  editingLayer = layer;
  
  // Get properties from the layer
  const properties = layer.feature ? (layer.feature.properties || {}) : {};
  
  // Get the modal and form
  const modal = document.getElementById('featurePropertiesModal');
  const form = document.getElementById('featurePropertiesForm');
  
  if (!modal || !form) {
    console.error("Modal or form not found");
    return;
  }
  
  // Fill the form with current properties
  const nameField = document.getElementById('name');
  if (nameField) nameField.value = properties.name || '';
  
  const isFacilityCheckbox = document.getElementById('is_facility');
  if (isFacilityCheckbox) {
    isFacilityCheckbox.checked = properties.is_facility || false;
  }
  
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.checked = properties.has_explosive || false;
    
    // Show/hide explosive section
    const explosiveSection = document.getElementById('explosiveSection');
    if (explosiveSection) {
      explosiveSection.style.display = hasExplosiveCheckbox.checked ? 'block' : 'none';
    }
  }
  
  const newField = document.getElementById('net_explosive_weight');
  if (newField) newField.value = properties.net_explosive_weight || '';
  
  const typeField = document.getElementById('type');
  if (typeField) typeField.value = properties.type || '';
  
  const descriptionField = document.getElementById('description');
  if (descriptionField) descriptionField.value = properties.description || '';
  
  // Show the modal
  modal.style.display = 'block';
}

// Save the feature properties
function saveFeatureProperties() {
  console.log("Saving feature properties");
  
  // Get the current editing layer
  const currentEditingLayer = window.activeEditLayer;
  if (!currentEditingLayer) {
    console.error("No active editing layer");
    return;
  }
  
  // Initialize feature if it doesn't exist
  if (!currentEditingLayer.feature) {
    currentEditingLayer.feature = {
      type: 'Feature',
      properties: {},
      geometry: currentEditingLayer.toGeoJSON ? currentEditingLayer.toGeoJSON().geometry : null
    };
  }
  
  // Ensure properties object exists
  if (!currentEditingLayer.feature.properties) {
    currentEditingLayer.feature.properties = {};
  }
  
  // Get form values
  const nameField = document.getElementById('name');
  const isFacilityCheckbox = document.getElementById('is_facility');
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  const newField = document.getElementById('net_explosive_weight');
  const typeField = document.getElementById('type');
  const descriptionField = document.getElementById('description');
  
  // Update properties
  if (nameField) currentEditingLayer.feature.properties.name = nameField.value;
  if (isFacilityCheckbox) currentEditingLayer.feature.properties.is_facility = isFacilityCheckbox.checked;
  if (hasExplosiveCheckbox) currentEditingLayer.feature.properties.has_explosive = hasExplosiveCheckbox.checked;
  if (newField) currentEditingLayer.feature.properties.net_explosive_weight = newField.value;
  if (typeField) currentEditingLayer.feature.properties.type = typeField.value;
  if (descriptionField) currentEditingLayer.feature.properties.description = descriptionField.value;
  
  // Update popup content if needed
  if (currentEditingLayer.getPopup()) {
    const popupContent = createPopupContent(currentEditingLayer.feature.properties);
    currentEditingLayer.setPopupContent(popupContent);
  }
  
  // Close the modal
  closeFeaturePropertiesModal();
  
  // Save to server if needed
  const featureId = currentEditingLayer.feature.id || currentEditingLayer._leaflet_id;
  
  // Call save function if it exists
  if (typeof saveFeatureToServer === 'function') {
    saveFeatureToServer(currentEditingLayer);
  }
}

// Create popup content for a feature
function createPopupContent(properties) {
  let content = '<div class="feature-popup">';
  content += `<h3>${properties.name || 'Unnamed Feature'}</h3>`;
  
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  
  if (properties.description) {
    content += `<p><strong>Description:</strong> ${properties.description}</p>`;
  }
  
  if (properties.is_facility) {
    content += `<p><strong>Facility:</strong> Yes</p>`;
  }
  
  if (properties.has_explosive) {
    content += `<p><strong>Contains Explosives:</strong> Yes</p>`;
    
    if (properties.net_explosive_weight) {
      content += `<p><strong>NEW:</strong> ${properties.net_explosive_weight}</p>`;
    }
  }
  
  content += `<button onclick="openFeatureEditor(window.activeEditLayer)">Edit Properties</button>`;
  content += '</div>';
  
  return content;
}

// Initialize layer click handlers
function initializeLayerClickHandlers() {
  console.log("Initializing layer click handlers");
  
  if (!window.map) {
    console.error("Map not initialized");
    return;
  }
  
  // Add handlers to all existing layers
  window.map.eachLayer(function(layer) {
    // Only add handlers to feature layers (polygons, markers, etc.)
    if (layer.feature || (layer.toGeoJSON && typeof layer.toGeoJSON === 'function')) {
      addLayerClickHandlers(layer);
    }
  });
}

// Set up handlers for all layers
function setupAllLayerEditHandlers() {
  console.log("Setting up all layer edit handlers");
  
  // Initialize layer click handlers
  initializeLayerClickHandlers();
  
  // Set up event listener for explosive checkbox
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const section = document.getElementById('explosiveSection');
      if (section) {
        section.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
  
  // Set up event listener for save button
  const saveButton = document.getElementById('savePropertiesBtn');
  if (saveButton) {
    saveButton.addEventListener('click', saveFeatureProperties);
  }
  
  // Set up event listener for close button
  const closeButton = document.getElementById('closeFeaturePropertiesBtn');
  if (closeButton) {
    closeButton.addEventListener('click', closeFeaturePropertiesModal);
  }
  
  // Close modal when clicking outside of it
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('featurePropertiesModal');
    if (modal && event.target === modal) {
      closeFeaturePropertiesModal();
    }
  });
  
  // Set up map click event to close popups
  if (window.map) {
    window.map.on('click', function() {
      closeAllPopups();
      closeFeaturePropertiesModal();
    });
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialized");
  setupAllLayerEditHandlers();
});

// Export functions for use in other scripts
window.addLayerClickHandlers = addLayerClickHandlers;
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.saveFeatureProperties = saveFeatureProperties;
window.closeAllPopups = closeAllPopups;
