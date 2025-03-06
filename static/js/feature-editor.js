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
  // Skip if layer doesn't have feature data
  if (!layer.feature) return;

  console.log("Adding click handlers to layer:", layer);

  // Make sure the layer is clickable
  layer.options = layer.options || {};
  layer.options.interactive = true;

  // Remove any existing click handlers to prevent duplicates
  layer.off('click');

  // Add click handler to show feature properties
  layer.on('click', function(e) {
    console.log("Layer clicked:", layer.feature.properties.name || "unnamed layer");

    // Close any existing popups
    if (window.map) {
      window.map.closePopup();
    }

    // Create popup content
    let content = '<div class="feature-popup">';
    const properties = layer.feature.properties || {};

    if (properties.name) {
      content += `<h4>${properties.name}</h4>`;
    } else {
      content += '<h4>Unnamed Feature</h4>';
    }

    if (properties.type) {
      content += `<p><strong>Type:</strong> ${properties.type}</p>`;
    }

    if (properties.description) {
      content += `<p>${properties.description}</p>`;
    }

    // Direct open feature editor button - no need for intermediate step
    content += `<button class="edit-properties-btn" onclick="openFeatureEditor(window.activeClickedLayer)">Edit Properties</button>`;
    content += '</div>';

    // Store reference to clicked layer globally
    window.activeClickedLayer = layer;

    // Create popup with custom class for styling
    const popup = L.popup({
      className: 'feature-popup-container',
      closeButton: true,
      closeOnClick: false
    })
    .setLatLng(e.latlng)
    .setContent(content)
    .openOn(window.map);

    // Add event listener to close button to reset state properly
    popup.on('remove', function() {
      // Re-enable all layer handlers
      window.map.eachLayer(function(mapLayer) {
        if (mapLayer.feature && typeof mapLayer.on === 'function') {
          mapLayer.options = mapLayer.options || {};
          mapLayer.options.interactive = true;
        }
      });
    });

    // Prevent event from propagating to map
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
  
  // Check if modal exists before proceeding
  if (!modal) {
    console.error("Modal not found in the DOM");
    // Create a temporary alert to let the user know something went wrong
    alert("Unable to open editor - modal element not found. Please refresh the page and try again.");
    return;
  }

  const form = document.getElementById('featurePropertiesForm');
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

  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');

  // Hide the modal
  if (modal) {
    modal.style.display = 'none';
  } else {
    console.warn("Modal element not found when trying to close");
  }

  // Reset active editing layer
  window.activeEditLayer = null;
  editingLayer = null;

  // Make sure all layers are interactive after closing the modal
  if (window.map) {
    window.map.eachLayer(function(layer) {
      if (layer.feature && typeof layer.on === 'function') {
        // Make sure the layer is clickable
        layer.options = layer.options || {};
        layer.options.interactive = true;
      }
    });
  }

  // Make sure all popups are closed
  if (window.map) {
    window.map.closePopup();
  }

  // Re-enable all click handlers
  setupAllLayerEditHandlers();
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