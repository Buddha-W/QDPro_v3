// Feature Editor for QDPro
// Provides functionality for editing feature properties

// Global variables to track editing state
let editingLayer = null;

// Create a standardized popup content
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

  content += `<button class="popup-edit-btn" onclick="openFeaturePropertiesModal(this)">Edit Properties</button>`;
  content += `</div>`;

  return content;
}

// Function to open feature properties modal
function openFeaturePropertiesModal(button) {
  // Find the layer from the button's context (popup)
  let layer;

  // Handle different ways the function might be called
  if (button && button._source) {
    // Called directly with a layer
    layer = button;
  } else if (button && button.closest) {
    // Called from a button in a popup
    const popup = button.closest('.leaflet-popup');
    if (popup && popup._source) {
      layer = popup._source;
    }
  } else if (button && typeof button === 'object' && button.target) {
    // Called from layer click event
    layer = button.target;
  }

  if (!layer) {
    console.error("Could not find layer to edit");
    return;
  }

  // Store the current editing layer
  editingLayer = layer;

  // Get properties or initialize empty object
  const properties = layer.feature && layer.feature.properties ? {...layer.feature.properties} : {};

  // Get the modal element
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found in the DOM");
    return;
  }

  // Get the form element
  const form = document.getElementById('featurePropertiesForm');
  if (!form) {
    console.error("Feature properties form not found in the DOM");
    return;
  }

  // Reset form
  form.reset();

  // Populate form fields with current properties
  const nameInput = document.getElementById('featureName');
  if (nameInput) nameInput.value = properties.name || '';

  const typeInput = document.getElementById('featureType');
  if (typeInput) typeInput.value = properties.type || '';

  const descriptionInput = document.getElementById('featureDescription');
  if (descriptionInput) descriptionInput.value = properties.description || '';

  const hasMunitionInput = document.getElementById('featureHasMunition');
  if (hasMunitionInput) {
    hasMunitionInput.checked = properties.has_explosive || false;
    // Trigger change event to show/hide dependent fields
    const event = new Event('change');
    hasMunitionInput.dispatchEvent(event);
  }

  const newInput = document.getElementById('featureNEW');
  if (newInput) newInput.value = properties.net_explosive_weight || '';

  const unitInput = document.getElementById('featureUnit');
  if (unitInput) unitInput.value = properties.unit || 'lbs';

  const hazardDivisionInput = document.getElementById('featureHazardDivision');
  if (hazardDivisionInput) hazardDivisionInput.value = properties.hazard_division || '';

  // Show the modal
  modal.style.display = 'block';
}

// Function to save feature properties
function saveFeatureProperties() {
  if (!editingLayer) {
    console.error("No active editing layer");
    return;
  }

  // Get form values
  const name = document.getElementById('featureName').value;
  const type = document.getElementById('featureType').value;
  const description = document.getElementById('featureDescription').value;
  const hasMunition = document.getElementById('featureHasMunition').checked;

  // Initialize or get existing properties
  if (!editingLayer.feature) {
    editingLayer.feature = { type: 'Feature', properties: {} };
  }

  if (!editingLayer.feature.properties) {
    editingLayer.feature.properties = {};
  }

  // Update properties
  editingLayer.feature.properties.name = name;
  editingLayer.feature.properties.type = type;
  editingLayer.feature.properties.description = description;
  editingLayer.feature.properties.has_explosive = hasMunition;

  // Add munition details if applicable
  if (hasMunition) {
    editingLayer.feature.properties.net_explosive_weight = document.getElementById('featureNEW').value;
    editingLayer.feature.properties.unit = document.getElementById('featureUnit').value;
    editingLayer.feature.properties.hazard_division = document.getElementById('featureHazardDivision').value;
  } else {
    // Remove munition properties if not applicable
    delete editingLayer.feature.properties.net_explosive_weight;
    delete editingLayer.feature.properties.unit;
    delete editingLayer.feature.properties.hazard_division;
  }

  // Update the layer's popup content if it has a popup
  if (editingLayer.getPopup()) {
    editingLayer.setPopupContent(createBasicPopupContent(editingLayer.feature.properties));
  } else {
    // Create a new popup if none exists
    editingLayer.bindPopup(createBasicPopupContent(editingLayer.feature.properties));
  }

  // Close the modal
  closeFeaturePropertiesModal();

  // Save to server if needed (implement this function)
  if (typeof saveFeatureToServer === 'function') {
    saveFeatureToServer(editingLayer);
  }
}

// Function to close the feature properties modal
function closeFeaturePropertiesModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Clear editing state
  editingLayer = null;
}

// Function to open feature editor for a specific layer
// This is the main function to call when clicking on a polygon
function openFeatureEditor(layer) {
  // Close any existing popups to avoid confusion
  if (window.map) {
    window.map.closePopup();
  }

  // Open the properties modal directly
  openFeaturePropertiesModal(layer);
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
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
  
  //Added to initialize layer click handlers after a short delay
  setTimeout(initializeLayerClickHandlers, 500);
});


// Function to initialize click handlers for map layers
function initializeLayerClickHandlers() {
  if (!window.map) {
    console.error("Map not initialized");
    return;
  }

  window.map.eachLayer(function(layer) {
    // Only add click handlers to layers with features
    if (layer.feature && typeof layer.on === 'function') {
      // Remove existing handlers to prevent duplicates
      layer.off('click');

      // Add new click handler
      layer.on('click', function(e) {
        // Stop propagation to prevent map click
        L.DomEvent.stopPropagation(e);

        // Open feature editor directly
        openFeatureEditor(layer);
      });
    }
  });
}

// Export functions for global access
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.initializeLayerClickHandlers = initializeLayerClickHandlers;
window.createBasicPopupContent = createBasicPopupContent;


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