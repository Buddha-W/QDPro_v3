/**
 * Feature Editor for QDPro application
 * Handles editing of GeoJSON features on the map
 */

// Global variables for tracking editing state
let editingLayer = null;
let popupIsOpen = false;

// Function to close all popups
function closeAllPopups() {
  if (window.map) {
    window.map.closePopup();
  }
}

// Function to open the feature properties editor
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);

  // If we're already editing this exact layer, don't do anything
  if (editingLayer === layer) {
    console.log("Already editing this layer");
    return;
  }

  // If we're switching to a different layer, close any open popups first
  closeAllPopups();

  // Set the new editing layer
  editingLayer = layer;
  window.activeEditLayer = layer;

  // Get existing properties or initialize empty object
  const feature = layer.feature || {};
  const props = feature.properties || {};

  // Extract known properties with defaults
  const name = props.name || '';
  const type = props.type || '';
  const description = props.description || '';
  const hasExplosive = props.hasExplosive || false;
  const netExplosiveWeight = props.netExplosiveWeight || '';
  const unit = props.unit || 'kg';

  // Get the modal element
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found in DOM");
    return;
  }

  // Populate the form fields
  document.getElementById('featureName').value = name;
  document.getElementById('featureType').value = type;
  document.getElementById('featureDescription').value = description;

  // Handle explosive properties checkbox and related fields
  const explosiveCheckbox = document.getElementById('hasExplosive');
  if (explosiveCheckbox) {
    explosiveCheckbox.checked = hasExplosive;
    // Show/hide the explosive weight fields based on checkbox
    const explosiveFields = document.getElementById('explosiveFields');
    if (explosiveFields) {
      explosiveFields.style.display = hasExplosive ? 'block' : 'none';
    }
  }

  // Set explosive weight and unit
  document.getElementById('netExplosiveWeight').value = netExplosiveWeight;
  const unitSelect = document.getElementById('weightUnit');
  if (unitSelect) {
    for (let i = 0; i < unitSelect.options.length; i++) {
      if (unitSelect.options[i].value === unit) {
        unitSelect.selectedIndex = i;
        break;
      }
    }
  }

  // Display the modal
  modal.style.display = 'block';
  popupIsOpen = true;

  // Focus the first input field
  document.getElementById('featureName').focus();
}

// Function to save feature properties
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

  // Create a new popup with the updated information
  const popupContent = `
    <div>
      <h3>${name || 'Unnamed Feature'}</h3>
      <p><strong>Type:</strong> ${type}</p>
      ${hasExplosive ? `<p><strong>NET:</strong> ${netExplosiveWeight} ${unit}</p>` : ''}
      ${description ? `<p>${description}</p>` : ''}
    </div>
  `;

  editingLayer.setPopupContent(popupContent);

  // Save to server if available
  try {
    const featureData = {
      id: editingLayer.feature.id || editingLayer._leaflet_id,
      properties: editingLayer.feature.properties,
      geometry: editingLayer.toGeoJSON().geometry
    };

    if (typeof saveGeometryToServer === 'function') {
      saveGeometryToServer(featureData);
    }
  } catch (error) {
    console.error("Error saving feature data:", error);
  }

  // Close the modal
  closeAllPopups();

  // Clear the editing layer reference
  editingLayer = null;
  window.activeEditLayer = null;
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

  // Make sure all layers are interactive
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.feature && typeof layer.on === 'function') {
        layer.options = layer.options || {};
        layer.options.interactive = true;
      }
    });
  }
}


// Function to add click handlers to layers
function addLayerClickHandlers(layer) {
  if (!layer) return;

  // Remove any existing click handlers to prevent duplicates
  layer.off('click');

  // Add a direct click handler to the layer
  layer.on('click', function(e) {
    console.log("Layer clicked:", layer);

    // Stop propagation to prevent map click
    L.DomEvent.stopPropagation(e);

    // Always open the feature editor for this layer
    openFeatureEditor(layer);

    return false;
  });
}

// Function to ensure all features in all layers have edit capabilities
function setupAllLayerEditHandlers() {
  if (!window.map) {
    console.warn("Map not available, cannot set up layer edit handlers");
    return;
  }

  // Process all layer groups in the map
  window.map.eachLayer(function(layer) {
    // Check if it's a feature group or has features
    if (layer.eachLayer) {
      layer.eachLayer(function(sublayer) {
        if (sublayer.feature) {
          addLayerClickHandlers(sublayer);
        }
      });
    } else if (layer.feature) {
      addLayerClickHandlers(layer);
    }
  });

  console.log("Edit handlers set up for all layers");
}

// Function to refresh edit handlers for all layers
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
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
      if (event.target === modals[i]) {
        closeAllPopups();
      }
    }
  });

  // Wait for map to be ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);
      setupAllLayerEditHandlers();
      console.log("Feature editor initialized");
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
window.closeAllPopups = closeAllPopups; // Added for completeness