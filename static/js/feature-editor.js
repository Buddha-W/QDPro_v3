
// Feature Editor for QDPro
// Handles the editing of feature properties and interactions

// Global variables to track editing state
let editingLayer = null;
let popupIsOpen = false;

// Function to open the feature properties editor for a given layer
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);
  
  // If we already have the editor open for this same layer, just return
  if (editingLayer === layer && popupIsOpen) {
    console.log("Editor already open for this layer");
    return;
  }
  
  // Close any existing feature properties modal for different layers
  if (editingLayer && editingLayer !== layer) {
    // We're switching layers, so update the editing layer reference
    console.log("Switching from previous layer to new layer");
  }
  
  // Set global active editing layer
  window.activeEditLayer = layer;
  editingLayer = layer;
  
  // Get existing properties or initialize empty object
  const properties = (layer.feature && layer.feature.properties) || {};
  
  // Get the feature properties modal
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found");
    return;
  }

  // Set values in the form
  document.getElementById('featureName').value = properties.name || '';
  document.getElementById('featureType').value = properties.type || 'PES';
  document.getElementById('featureDescription').value = properties.description || '';
  
  const hasExplosive = properties.hasExplosive || false;
  document.getElementById('hasExplosive').checked = hasExplosive;
  
  // Show/hide explosive fields based on checkbox
  const explosiveFields = document.getElementById('explosiveFields');
  if (explosiveFields) {
    explosiveFields.style.display = hasExplosive ? 'block' : 'none';
  }
  
  // Set explosive weight and unit if available
  if (hasExplosive) {
    document.getElementById('netExplosiveWeight').value = properties.netExplosiveWeight || '';
    document.getElementById('weightUnit').value = properties.unit || 'kg';
  }

  // Show the modal
  modal.style.display = 'block';
  popupIsOpen = true;
}

// Function to save properties from the form to the feature
function saveFeatureProperties() {
  if (!editingLayer) {
    console.error("No active editing layer");
    return;
  }

  // Initialize feature and properties if they don't exist
  if (!editingLayer.feature) {
    editingLayer.feature = {};
  }
  if (!editingLayer.feature.properties) {
    editingLayer.feature.properties = {};
  }

  // Get values from form inputs
  const name = document.getElementById('featureName').value;
  const type = document.getElementById('featureType').value;
  const description = document.getElementById('featureDescription').value;
  const hasExplosive = document.getElementById('hasExplosive').checked;

  // Get explosive weight and unit if applicable
  let netExplosiveWeight = '';
  let unit = 'kg';
  if (hasExplosive) {
    netExplosiveWeight = document.getElementById('netExplosiveWeight').value;
    unit = document.getElementById('weightUnit').value;
  }

  // Update feature properties
  editingLayer.feature.properties.name = name;
  editingLayer.feature.properties.type = type;
  editingLayer.feature.properties.description = description;
  editingLayer.feature.properties.hasExplosive = hasExplosive;
  editingLayer.feature.properties.netExplosiveWeight = netExplosiveWeight;
  editingLayer.feature.properties.unit = unit;

  // Update layer style based on type
  if (typeof updateLayerStyle === 'function') {
    updateLayerStyle(editingLayer, type);
  }

  // Close the modal
  closeFeaturePropertiesModal();

  // Update popup content if there's a popup
  if (editingLayer.getPopup) {
    const popup = editingLayer.getPopup();
    if (popup) {
      const currentEditingLayer = editingLayer;
      
      // Create updated popup content
      let content = '';
      if (typeof window.createPopupContent === 'function') {
        content = window.createPopupContent(currentEditingLayer.feature.properties);
      } else {
        content = createBasicPopupContent(currentEditingLayer.feature.properties);
      }
      
      // Set the new content and refresh the popup
      popup.setContent(content);
      popup.update();
    }
  }

  // If saving to server is needed
  const featureId = editingLayer.feature.id || editingLayer._leaflet_id;
  
  console.log("Feature properties saved for:", featureId);
}

// Basic popup content creator as fallback
function createBasicPopupContent(properties) {
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
  content += `<button class="edit-properties-btn" onclick="openFeatureEditor(window.activeEditLayer)">Edit Properties</button>`;
  content += '</div>';
  return content;
}

// Function to close the feature properties modal
function closeFeaturePropertiesModal() {
  // Hide the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Reset popup state
  popupIsOpen = false;
  
  // Reset active editing layer
  window.activeEditLayer = null;
  editingLayer = null;
}

// Close all popups in the map
function closeAllPopups() {
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.closePopup) {
        layer.closePopup();
      }
    });
  }
}

// Function to add click handlers to layers
function addLayerClickHandlers(layer) {
  if (!layer || !layer.on) return;

  // Remove any existing click handlers to prevent duplicates
  layer.off('click');

  // Add a direct click handler to the layer
  layer.on('click', function(e) {
    console.log("Layer clicked:", layer);
    
    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);
    
    // If another layer's editor is open, close it first
    if (popupIsOpen && editingLayer && editingLayer !== layer) {
      closeFeaturePropertiesModal();
    }
    
    // Always open the feature editor for this layer
    openFeatureEditor(layer);
    
    return false;
  });
}

// Function to ensure all features in all layers have edit capabilities
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.warn("Map not available, cannot setup layer handlers");
    return;
  }

  console.log("Setting up all layer edit handlers");
  window.map.eachLayer(function(layer) {
    // Handle GeoJSON layers
    if (layer.feature) {
      addLayerClickHandlers(layer);
    }
    
    // Handle layer groups (like GeoJSON layer groups)
    if (layer.eachLayer) {
      layer.eachLayer(function(subLayer) {
        if (subLayer.feature) {
          addLayerClickHandlers(subLayer);
        }
      });
    }
  });
}

function refreshAllLayerEditHandlers() {
  setupAllLayerEditHandlers();
}

// Setup event listeners
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, setting up feature editor");

  // Set up the feature properties modal close button
  const closeBtn = document.getElementById('closeFeaturePropertiesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFeaturePropertiesModal);
  }

  // Set up the save button
  const saveBtn = document.getElementById('saveFeaturePropertiesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveFeatureProperties);
  }

  // Set up the has explosive checkbox to show/hide explosive fields
  const explosiveCheckbox = document.getElementById('hasExplosive');
  if (explosiveCheckbox) {
    explosiveCheckbox.addEventListener('change', function() {
      const explosiveFields = document.getElementById('explosiveFields');
      if (explosiveFields) {
        explosiveFields.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // Close modal when clicking outside the modal content
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('featurePropertiesModal');
    if (event.target === modal) {
      closeFeaturePropertiesModal();
    }
  });

  // Handle clicks on map to close popups when clicking away from features
  if (window.map) {
    window.map.on('click', function() {
      closeFeaturePropertiesModal();
    });
  }

  // Wait for map to be ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      setupAllLayerEditHandlers();
      console.log("Feature editor initialized");
      
      // Set up draw:created event handler
      window.map.on('draw:created', function(e) {
        const layer = e.layer;
        
        // Initialize new feature
        if (!layer.feature) {
          layer.feature = {
            type: 'Feature',
            properties: {
              name: 'New Feature',
              type: 'PES'
            }
          };
        }
        
        // Add the layer to the feature group
        if (window.drawnItems) {
          window.drawnItems.addLayer(layer);
        }
        
        // Add click handler
        addLayerClickHandlers(layer);
        
        // Open the editor for the new feature
        openFeatureEditor(layer);
      });
    }
  }, 500);
});

// When new features are created or loaded, ensure they have click handlers
document.addEventListener('layersLoaded', function() {
  console.log("Layers loaded, refreshing edit handlers");
  setupAllLayerEditHandlers();
});

// Expose functions to global scope
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.refreshAllLayerEditHandlers = refreshAllLayerEditHandlers;
window.closeAllPopups = closeAllPopups;
