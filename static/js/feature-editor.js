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
  if (!layer || !layer.feature) return;

  const properties = layer.feature.properties || {};

  // Find form elements
  const nameField = document.getElementById('featureName');
  const typeField = document.getElementById('featureType');
  const descField = document.getElementById('featureDescription');
  const hasMunitionField = document.getElementById('featureHasMunition');
  const newField = document.getElementById('featureNEW');
  const unitField = document.getElementById('featureUnit');
  const hdField = document.getElementById('featureHazardDivision');

  // Set values if elements exist
  if (nameField) nameField.value = properties.name || '';
  if (typeField) typeField.value = properties.type || '';
  if (descField) descField.value = properties.description || '';
  if (hasMunitionField) hasMunitionField.checked = properties.has_explosive || false;

  // Handle munition section visibility
  const munitionSection = document.getElementById('munitionSection');
  if (munitionSection) {
    munitionSection.style.display = hasMunitionField && hasMunitionField.checked ? 'block' : 'none';
  }

  // Set munition values if applicable
  if (properties.has_explosive) {
    if (newField) newField.value = properties.net_explosive_weight || '';
    if (unitField) unitField.value = properties.unit || 'lbs';
    if (hdField) hdField.value = properties.hazard_division || '';
  }
}

// Function to save feature properties
function saveFeatureProperties() {
  if (!currentLayer) {
    console.error("No active layer to save properties for");
    return;
  }

  // Initialize feature if needed
  if (!currentLayer.feature) {
    currentLayer.feature = { type: 'Feature', properties: {} };
  }

  if (!currentLayer.feature.properties) {
    currentLayer.feature.properties = {};
  }

  // Get form values
  const name = document.getElementById('featureName')?.value || '';
  const type = document.getElementById('featureType')?.value || '';
  const desc = document.getElementById('featureDescription')?.value || '';
  const hasMunition = document.getElementById('featureHasMunition')?.checked || false;

  // Update properties
  currentLayer.feature.properties.name = name;
  currentLayer.feature.properties.type = type;
  currentLayer.feature.properties.description = desc;
  currentLayer.feature.properties.has_explosive = hasMunition;

  // Add munition details if applicable
  if (hasMunition) {
    currentLayer.feature.properties.net_explosive_weight = document.getElementById('featureNEW')?.value || '';
    currentLayer.feature.properties.unit = document.getElementById('featureUnit')?.value || 'lbs';
    currentLayer.feature.properties.hazard_division = document.getElementById('featureHazardDivision')?.value || '';
  } else {
    // Remove munition properties if not applicable
    delete currentLayer.feature.properties.net_explosive_weight;
    delete currentLayer.feature.properties.unit;
    delete currentLayer.feature.properties.hazard_division;
  }

  // Update any attached popup
  if (currentLayer._popup) {
    const popupContent = createBasicPopupContent(currentLayer.feature.properties);
    currentLayer._popup.setContent(popupContent);
  }

  // If we have updateFeatureStyle global function, use it
  if (typeof window.updateFeatureStyle === 'function') {
    window.updateFeatureStyle(currentLayer);
  }

  // Close modal after saving
  closeFeaturePropertiesModal();

  console.log("Saved properties for layer:", currentLayer);
}

// Function to close the feature properties modal
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Do not clear currentLayer here so it can be referenced later if needed
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
function initializeLayerClickHandlers() {
  if (!window.map) {
    console.error("Map not initialized");
    return;
  }

  console.log("Initializing layer click handlers");

  window.map.eachLayer(function(layer) {
    // Only add handlers to feature layers
    if (layer.feature && typeof layer.on === 'function') {
      // Remove existing handlers to prevent duplicates
      layer.off('click');

      // Add direct click handler
      layer.on('click', function(e) {
        // Stop propagation to prevent map click
        L.DomEvent.stopPropagation(e);

        // Handle the layer
        handleLayerClick(layer);
      });
    }
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor DOM ready");

  // Set up event listener for munition checkbox
  const hasMunitionCheckbox = document.getElementById('featureHasMunition');
  if (hasMunitionCheckbox) {
    hasMunitionCheckbox.addEventListener('change', function() {
      const munitionSection = document.getElementById('munitionSection');
      if (munitionSection) {
        munitionSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }

  // Set up event listener for save button
  const saveButton = document.getElementById('saveFeaturePropertiesBtn');
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
    if (event.target === modal) {
      closeFeaturePropertiesModal();
    }
  });

  // Initialize layer handlers after a short delay
  setTimeout(initializeLayerClickHandlers, 500);
});

// Export functions for global access
window.handleLayerClick = handleLayerClick;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.createBasicPopupContent = createBasicPopupContent;
window.handleEditButtonClick = handleEditButtonClick;
window.initializeLayerClickHandlers = initializeLayerClickHandlers;


// Add CSS for modal styling
function addModalStyles() {
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .feature-properties-modal {
      position: absolute;
      z-index: 1000;
      background: white;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      width: 300px;
      display: none;
    }
    
    .modal-header {
      padding: 10px;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-body {
      padding: 10px;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
    }
    
    .form-group {
      margin-bottom: 10px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 5px;
    }
    
    .form-group input[type="text"],
    .form-group input[type="number"],
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 5px;
      border: 1px solid #ddd;
      border-radius: 3px;
    }
    
    .form-group textarea {
      height: 60px;
    }
    
    .button-group {
      display: flex;
      justify-content: flex-end;
      margin-top: 10px;
    }
    
    .save-btn {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
    }
    
    .save-btn:hover {
      background: #45a049;
    }
    
    #munitionSection {
      display: none;
    }
  `;
  document.head.appendChild(styleElement);
}

// Initialize everything when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialized");
  
  // Add modal styles
  addModalStyles();
});