
/**
 * Handles editing of GeoJSON features on the map
 */

// Global vars for tracking state
let editingLayer = null;

// Close any open popups on the map
function closeAllPopups() {
  console.log("Closing all popups");
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.closePopup) {
        layer.closePopup();
      }
    });
  }
}

// Function to create popup content for a feature
function createPopupContent(layer) {
  const properties = layer.feature ? (layer.feature.properties || {}) : {};
  
  let content = '<div class="feature-popup">';
  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  content += `<button class="popup-edit-btn" onclick="window.openFeatureEditor(this._layer)">Edit Properties</button>`;
  content += '</div>';
  
  // Store layer reference directly on the button when popup is added
  setTimeout(() => {
    const buttons = document.querySelectorAll('.popup-edit-btn');
    buttons.forEach(btn => {
      btn._layer = layer;
    });
  }, 10);
  
  return content;
}

// Add click handlers to a layer for editing
function addLayerClickHandlers(layer) {
  console.log("Adding click handlers to layer");
  
  if (!layer) return;
  
  // Ensure the layer has a feature property
  if (!layer.feature) {
    layer.feature = {
      type: 'Feature',
      properties: {
        name: 'New Feature',
        type: 'Polygon',
        description: ''
      },
      geometry: layer.toGeoJSON().geometry
    };
  }
  
  // Add a popup to the layer
  layer.bindPopup(createPopupContent(layer), {
    closeButton: true,
    className: 'feature-popup-container'
  });
  
  // Add click event
  layer.on('click', function(e) {
    console.log("Layer clicked:", e.target.feature ? e.target.feature.properties.name : "unnamed layer");
    
    // Close any existing property modal first
    closeFeaturePropertiesModal();
    
    // If click is on a layer, open its popup
    layer.openPopup();
    
    // Prevent the click event from propagating to the map
    L.DomEvent.stopPropagation(e);
  });
}

// Setup all layer edit handlers
function setupAllLayerEditHandlers() {
  console.log("Setting up all layer edit handlers");
  
  if (!window.map) {
    console.error("Map not initialized yet");
    return;
  }
  
  // Add handlers to all existing layers with features
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

// Open the feature editor modal for a given layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);
  
  // Close all popups first
  closeAllPopups();
  
  // Set global active editing layer
  window.activeEditLayer = layer;
  editingLayer = layer;
  
  // Get properties from the layer
  const properties = layer.feature ? (layer.feature.properties || {}) : {};
  
  // Get the modal and form
  const modal = document.getElementById('featurePropertiesModal');
  const form = document.getElementById('featurePropertiesForm');
  
  if (!modal) {
    console.error("Modal not found in the DOM");
    return;
  }
  
  if (!form) {
    console.error("Form not found in the DOM");
    return;
  }
  
  // Show the modal
  modal.style.display = 'block';
  
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
  if (typeField) typeField.value = properties.type || 'Facility';
  
  const descriptionField = document.getElementById('description');
  if (descriptionField) descriptionField.value = properties.description || '';
  
  // Set up event handler for the has_explosive checkbox
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
  
  // Setup form submission handler
  form.onsubmit = function(e) {
    e.preventDefault();
    saveFeatureProperties();
  };
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
}

// Save the feature properties from the form
function saveFeatureProperties() {
  console.log("Saving feature properties");
  
  // Get the current editing layer
  const currentEditingLayer = window.activeEditLayer || editingLayer;
  
  if (!currentEditingLayer || !currentEditingLayer.feature) {
    console.error("No active editing layer");
    return;
  }
  
  // Get form values
  const nameField = document.getElementById('name');
  const isFacilityCheckbox = document.getElementById('is_facility');
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  const newField = document.getElementById('net_explosive_weight');
  const typeField = document.getElementById('type');
  const descriptionField = document.getElementById('description');
  
  // Update feature properties
  currentEditingLayer.feature.properties = currentEditingLayer.feature.properties || {};
  if (nameField) currentEditingLayer.feature.properties.name = nameField.value;
  if (isFacilityCheckbox) currentEditingLayer.feature.properties.is_facility = isFacilityCheckbox.checked;
  if (hasExplosiveCheckbox) currentEditingLayer.feature.properties.has_explosive = hasExplosiveCheckbox.checked;
  if (newField) currentEditingLayer.feature.properties.net_explosive_weight = hasExplosiveCheckbox.checked ? newField.value : '';
  if (typeField) currentEditingLayer.feature.properties.type = typeField.value;
  if (descriptionField) currentEditingLayer.feature.properties.description = descriptionField.value;
  
  // Update popup content
  if (typeof currentEditingLayer.getPopup === 'function') {
    currentEditingLayer.setPopupContent(createPopupContent(currentEditingLayer));
  } else {
    // If the layer doesn't have a popup yet, bind one
    currentEditingLayer.bindPopup(createPopupContent(currentEditingLayer));
  }
  
  // Close the modal
  closeFeaturePropertiesModal();
  
  // If saving to server is needed
  const featureId = currentEditingLayer.feature.id || currentEditingLayer._leaflet_id;
}

// Set up map click handler to close properties modal when clicking away
function setupMapClickHandler() {
  if (window.map) {
    window.map.on('click', function(e) {
      // Only close if not clicking on a polygon
      if (!e.originalEvent.target.closest('.leaflet-interactive')) {
        closeFeaturePropertiesModal();
      }
    });
  }
}

// Document ready function
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialized");
  
  // Wait for map to be available
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      
      setupAllLayerEditHandlers();
      setupMapClickHandler();
      
      // Set up close button handler
      const closeButton = document.getElementById('closeFeaturePropertiesBtn');
      if (closeButton) {
        closeButton.addEventListener('click', function() {
          closeFeaturePropertiesModal();
        });
      }
    }
  }, 100);
});

// Export functions for use in other scripts
window.addLayerClickHandlers = addLayerClickHandlers;
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.setupAllLayerEditHandlers = setupAllLayerEditHandlers;
window.saveFeatureProperties = saveFeatureProperties;
window.closeAllPopups = closeAllPopups;
