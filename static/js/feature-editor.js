// Feature Editor for QDPro
// Provides functionality for editing feature properties

// Global variables
let currentLayer = null;

// Function to handle layer clicks
function handleLayerClick(layer) {
  console.log("Layer clicked:", layer);

  // Set as current layer
  currentLayer = layer;

  // Display properties in the modal
  displayFeatureProperties(layer);

  // Show the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'block';
  }
}

// Function to display feature properties in the modal
function displayFeatureProperties(layer) {
  console.log("Displaying properties for layer:", layer);

  // Get feature properties
  const properties = layer.feature ? layer.feature.properties : {};

  // Set form values
  const form = document.getElementById('featurePropertiesForm');
  if (form) {
    // Populate form fields based on properties
    for (const key in properties) {
      const input = form.querySelector(`[name="${key}"]`);
      if (input) {
        if (input.type === 'checkbox') {
          input.checked = properties[key];
        } else {
          input.value = properties[key];
        }
      }
    }

    // Show/hide explosive weight section based on has_explosive property
    const hasExplosive = form.querySelector('[name="has_explosive"]');
    const explosiveSection = document.getElementById('explosiveSection');
    if (hasExplosive && explosiveSection) {
      explosiveSection.style.display = hasExplosive.checked ? 'block' : 'none';
    }
  }
}

// Function to save feature properties
function saveFeatureProperties() {
  console.log("Saving properties for layer:", currentLayer);

  if (!currentLayer) {
    console.error("No layer selected for saving");
    return;
  }

  // Get form values
  const form = document.getElementById('featurePropertiesForm');
  if (form) {
    // Create or ensure layer has feature and properties
    if (!currentLayer.feature) {
      currentLayer.feature = {};
    }
    if (!currentLayer.feature.properties) {
      currentLayer.feature.properties = {};
    }

    // Get all form inputs
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      const name = input.name;
      let value;

      if (input.type === 'checkbox') {
        value = input.checked;
      } else {
        value = input.value;
      }

      // Set property
      if (name) {
        currentLayer.feature.properties[name] = value;
      }
    });

    // Update popup content if it exists
    if (currentLayer.getPopup()) {
      const content = createBasicPopupContent(currentLayer.feature.properties);
      currentLayer.setPopupContent(content);
    }

    // Close modal
    closeFeaturePropertiesModal();

    // Fire event to notify of changes
    if (typeof window.onFeaturePropertiesChanged === 'function') {
      window.onFeaturePropertiesChanged(currentLayer);
    }
  }
}

// Function to close the feature properties modal
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Reset the current layer
  currentLayer = null;
}

// Function to create basic popup content
function createBasicPopupContent(properties) {
  properties = properties || {};
  let content = `<div class="feature-popup">`;

  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }

  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }

  if (properties.has_explosive && properties.net_explosive_weight) {
    content += `<p><strong>NEW:</strong> ${properties.net_explosive_weight} ${properties.unit || 'lbs'}</p>`;
    if (properties.hazard_division) {
      content += `<p><strong>HD:</strong> ${properties.hazard_division}</p>`;
    }
  }

  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }

  content += `<button class="popup-edit-btn" onclick="handleEditButtonClick(this)">Edit Properties</button>`;
  content += `</div>`;

  return content;
}

// Function to handle edit button click in popup
function handleEditButtonClick(button) {
  // Close any open popups
  if (window.map) {
    window.map.closePopup();
  }

  // Find the layer associated with this popup
  const popup = button.closest('.leaflet-popup');
  if (!popup || !popup._source) {
    console.error("Cannot find layer for editing");
    return;
  }

  // Handle the layer click
  handleLayerClick(popup._source);
}

// Function to add click handlers to layers
function addLayerClickHandlers(layer) {
  if (!layer) return;

  // Add popup with basic info
  const properties = layer.feature ? layer.feature.properties : {};
  const popupContent = createBasicPopupContent(properties);
  layer.bindPopup(popupContent);

  // Add direct click handler
  layer.on('click', function(e) {
    // Stop propagation to prevent map click handler
    L.DomEvent.stopPropagation(e);

    // If another layer's properties are being edited, save those first
    if (currentLayer && currentLayer !== layer) {
      const saveBtn = document.getElementById('savePropertiesBtn');
      if (saveBtn) {
        saveBtn.click();
      } else {
        closeFeaturePropertiesModal();
      }
    }

    // Open this layer's properties
    handleLayerClick(layer);
  });
}

// Initialize all layer click handlers
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialized");

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

  // Set up event listener for canceling by clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('featurePropertiesModal');
    if (event.target === modal) {
      closeFeaturePropertiesModal();
    }
  });

  // Initialize layer handlers after map is loaded
  if (window.map) {
    initializeLayerClickHandlers();
  } else {
    // Wait for map to be initialized
    const checkMap = setInterval(function() {
      if (window.map) {
        initializeLayerClickHandlers();
        clearInterval(checkMap);
      }
    }, 500);
  }
});

// Export functions for global access
window.handleLayerClick = handleLayerClick;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.createBasicPopupContent = createBasicPopupContent;
window.handleEditButtonClick = handleEditButtonClick;
window.addLayerClickHandlers = addLayerClickHandlers;
window.initializeLayerClickHandlers = initializeLayerClickHandlers;