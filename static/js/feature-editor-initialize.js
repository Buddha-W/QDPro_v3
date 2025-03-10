/**
 * Feature Editor Initialization Module
 * This script handles initialization of the feature properties editor
 * and ensures all feature editing functions are properly exposed globally

// Global handler for edit button clicks to ensure first-click response
function handleEditButtonClick(button) {
  console.log("Edit button clicked via direct onclick handler");
  
  try {
    // Find the popup and associated layer
    const popup = button.closest('.leaflet-popup');
    if (!popup) {
      console.warn("No popup found for edit button");
      return false;
    }
    
    if (!popup._source) {
      console.warn("No source layer found for popup");
      return false;
    }
    
    const layer = popup._source;
    console.log("Found layer for edit button:", layer._leaflet_id || "unknown id");

    // Store layer globally for immediate access with safeguards
    window.activeEditingLayer = layer;
    window.lastClickedLayer = layer;
    
    // Add a timestamp to track when this layer was selected for editing
    layer._editTimestamp = Date.now();

    // Check if editor is currently open and force close it first
    if (window.QDProEditor && window.QDProEditor.isEditorOpen) {
      try {
        window.QDProEditor.closeFeatureEditor();
      } catch (closeError) {
        console.warn("Error closing feature editor:", closeError);
      }

      // Use a short delay to ensure clean state before opening new editor
      setTimeout(function() {
        openEditorForLayer(layer);
      }, 100); // Slightly longer delay for more reliability
    } else {
      openEditorForLayer(layer);
    }
  } catch (err) {
    console.error("Error in handleEditButtonClick:", err);
  }

  return false;
}

// Helper function to open editor for a layer with additional error handling
function openEditorForLayer(layer) {
  if (!layer) {
    console.error("Cannot open editor: layer is undefined");
    return;
  }
  
  try {
    // Close popup if it exists
    if (layer.closePopup) {
      layer.closePopup();
    }

    // Force close any popups on the map
    if (window.map) {
      window.map.closePopup();
      
      // Remove any lingering popup DOM elements
      document.querySelectorAll('.leaflet-popup').forEach(popup => {
        popup.remove();
      });
    }

    console.log("Opening editor for layer:", layer._leaflet_id || "unknown");
    
    // Select the right editor function with more detailed logging
    if (window.QDProEditor && typeof window.QDProEditor.openFeatureEditor === 'function') {
      console.log("Using QDProEditor.openFeatureEditor");
      window.QDProEditor.openFeatureEditor(layer);
    } else if (typeof window.openFeatureEditor === 'function') {
      console.log("Using window.openFeatureEditor");
      window.openFeatureEditor(layer);
    } else if (typeof openFeatureEditor === 'function') {
      console.log("Using local openFeatureEditor");
      openFeatureEditor(layer);
    } else {
      console.error("Feature editor function not found! Available global functions:", 
                   Object.keys(window).filter(k => typeof window[k] === 'function').join(', '));
      
      // Last resort - try to use the modal directly
      const modal = document.getElementById('featurePropertiesModal');
      if (modal) {
        console.log("Attempting to open modal directly as fallback");
        modal.style.display = 'block';
      } else {
        alert("Error: Could not open editor. Please refresh the page.");
      }
    }
  } catch (err) {
    console.error("Error in openEditorForLayer:", err);
  }
}

// Create a global document-level handler for edit buttons with improved reliability
document.addEventListener('click', function(e) {
  // Check for both the button itself and any child elements (like icons)
  if (e.target && (e.target.classList.contains('edit-properties-btn') || 
                  (e.target.parentElement && e.target.parentElement.classList.contains('edit-properties-btn')))) {
    console.log("Edit button clicked via global document handler");
    
    // Get the actual button element
    const button = e.target.classList.contains('edit-properties-btn') ? 
                  e.target : e.target.parentElement;
    
    // Prevent multiple rapid clicks
    if (button.getAttribute('data-processing') === 'true') {
      console.log("Ignoring duplicate click on edit button");
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    
    // Mark button as being processed
    button.setAttribute('data-processing', 'true');
    
    // Process the click
    handleEditButtonClick(button);
    
    // Reset processing state after a delay
    setTimeout(() => {
      button.removeAttribute('data-processing');
    }, 500);
    
    e.preventDefault();
    e.stopPropagation();
    return false;
  }
});


 */

// Initialize the module when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialization script loaded");
  setupFeatureEditorModal();

  // Wait for the map to be available
  waitForMap();
});

// Function to wait for map to be available
function waitForMap() {
  const checkInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkInterval);
      console.log("Map is ready, initializing feature editor");
      initializeWithMap(window.map);
    }
  }, 100);
}

// Setup the feature editor modal if needed
function setupFeatureEditorModal() {
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.log("Creating feature properties modal");
    createFeaturePropertiesModal();
  }

  // Make sure the has_explosive checkbox toggles the explosives section
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
}

// Create the feature properties modal if it doesn't exist
function createFeaturePropertiesModal() {
  const modalHTML = `
    <div id="featurePropertiesModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Feature Properties</h2>
          <span id="closeFeaturePropertiesBtn" class="close">&times;</span>
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
              <input type="checkbox" id="has_explosive" name="has_explosive" />
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
              <button type="button" id="savePropertiesBtn" class="btn btn-primary">Save</button>
              <button type="button" class="btn btn-secondary" id="cancelPropertiesBtn">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  // Add the modal to the body
  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Add event listeners
  document.getElementById('closeFeaturePropertiesBtn').addEventListener('click', closeFeaturePropertiesModal);
  document.getElementById('cancelPropertiesBtn').addEventListener('click', closeFeaturePropertiesModal);
  document.getElementById('savePropertiesBtn').addEventListener('click', saveFeatureProperties);
}

// Initialize feature editor when map is available
function initializeWithMap(map) {
  console.log("Initializing feature editor with map");

  // Set up map event handlers
  setupMapClickHandler();

  // Set up the draw:created event handler
  map.on('draw:created', function(event) {
    const layer = event.layer;

    // Initialize layer with properties
    if (!layer.feature) {
      layer.feature = {
        type: 'Feature',
        properties: {
          name: 'New Feature',
          type: 'Polygon',
          description: '',
          is_facility: false,
          has_explosive: false
        }
      };
    }

    // Add click handlers for this layer
    addLayerClickHandlers(layer);

    // Open the editor for the new feature
    openFeatureEditor(layer);
  });

  // Monitor layers added to the map
  map.on('layeradd', function(e) {
    const layer = e.layer;

    // If this is a feature layer, add click handlers
    if (layer.feature) {
      addLayerClickHandlers(layer);
    }

    // If this is a layerGroup, process its sub-layers
    if (layer.eachLayer) {
      layer.eachLayer(function(subLayer) {
        if (subLayer.feature) {
          addLayerClickHandlers(subLayer);
        }
      });
    }
  });
}

// Function to open feature editor modal
function openFeatureEditor(layer) {
  console.log("Opening feature editor for layer:", layer);
  window.activeEditingLayer = layer;

  // Get feature properties
  const properties = layer.feature ? layer.feature.properties : {};

  // Populate the form
  const nameField = document.getElementById('name');
  if (nameField) nameField.value = properties.name || '';

  const typeField = document.getElementById('type');
  if (typeField) typeField.value = properties.type || 'Building';

  const descriptionField = document.getElementById('description');
  if (descriptionField) descriptionField.value = properties.description || '';

  const isFacilityField = document.getElementById('is_facility');
  if (isFacilityField) isFacilityField.checked = properties.is_facility || false;

  const hasExplosiveField = document.getElementById('has_explosive');
  if (hasExplosiveField) hasExplosiveField.checked = properties.has_explosive || false;

  // Show/hide explosive weight section
  const explosiveSection = document.getElementById('explosiveSection');
  if (explosiveSection) {
    explosiveSection.style.display = properties.has_explosive ? 'block' : 'none';

    const newField = document.getElementById('net_explosive_weight');
    if (newField) newField.value = properties.net_explosive_weight || '';
  }

  // Show the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    console.error("Feature properties modal not found");
  }
}

// Function to close the feature properties modal
function closeFeaturePropertiesModal() {
  console.log("Closing feature properties modal");
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'none';
  }

  // Reset active editing layer
  window.activeEditingLayer = null;
  window.lastClickedLayer = null;

  // Reset popup state to allow immediate editing of another feature
  if (window.map) {
    // Close any open popups
    window.map.closePopup();

    // Remove any lingering popup DOM elements
    document.querySelectorAll('.leaflet-popup').forEach(popup => {
      popup.remove();
    });

    // Force complete state reset
    document.querySelectorAll('.edit-properties-btn').forEach(btn => {
      // Remove and recreate edit buttons to clear event listeners
      const newBtn = btn.cloneNode(true);
      if (btn.parentNode) {
        btn.parentNode.replaceChild(newBtn, btn);
      }
    });

    // Clear any internal flag in map layers that might prevent re-clicking
    window.map.eachLayer(function(layer) {
      if (layer.feature) {
        // Clear any state flags that might prevent re-clicking
        if (layer._wasClicked) delete layer._wasClicked;
        if (layer._popupClosed) delete layer._popupClosed;
        if (layer._editPending) delete layer._editPending;
      }
    });

    console.log("Modal closed, popup state fully reset");
  }

  // Dispatch custom event for other components to respond to
  document.dispatchEvent(new CustomEvent('editor-closed'));

  // Force map to refresh its state
  setTimeout(function() {
    if (window.map) {
      window.map.invalidateSize();
    }
  }, 10);
}

// Function to save feature properties
function saveFeatureProperties() {
  console.log("Saving feature properties");
  const layer = window.activeEditingLayer;
  if (!layer) {
    console.error("No active layer to save properties");
    return;
  }

  // Ensure the feature and properties objects exist
  if (!layer.feature) {
    layer.feature = { type: 'Feature', properties: {} };
  }
  if (!layer.feature.properties) {
    layer.feature.properties = {};
  }

  // Ensure the feature has an ID for QD analysis
  if (!layer.feature.id) {
    layer.feature.id = `feature_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  // Get values from form
  const name = document.getElementById('name').value;
  const type = document.getElementById('type').value;
  const description = document.getElementById('description').value;
  const isFacility = document.getElementById('is_facility').checked;
  const hasExplosive = document.getElementById('has_explosive').checked;
  let netExplosiveWeight = null;

  if (hasExplosive) {
    netExplosiveWeight = parseFloat(document.getElementById('net_explosive_weight').value) || 0;
  }

  // Update properties
  layer.feature.properties.name = name;
  layer.feature.properties.type = type;
  layer.feature.properties.description = description;
  layer.feature.properties.is_facility = isFacility;
  layer.feature.properties.has_explosive = hasExplosive;
  layer.feature.properties.net_explosive_weight = netExplosiveWeight;

  // Update popup content if one exists
  if (layer.getPopup()) {
    const popupContent = `
      <div>
        <h3>${name || 'Unnamed Feature'}</h3>
        <p>Type: ${type || 'Unknown'}</p>
        ${hasExplosive ? `<p>NEW: ${netExplosiveWeight} lbs</p>` : ''}
        ${description ? `<p>${description}</p>` : ''}
        <button class="edit-properties-btn">Edit Properties</button>
      </div>
    `;
    layer.setPopupContent(popupContent);
  }

  // Close the modal
  closeFeaturePropertiesModal();

  // Save the project to persist changes
  if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
    QDPro.saveProject();
  }

  console.log("Feature properties saved:", layer.feature.properties);
}

// Add click handlers to a layer
function addLayerClickHandlers(layer) {
  console.log("Adding click handlers to layer");

  // Add a popup with properties
  const properties = layer.feature ? layer.feature.properties : {};
  const popupContent = `
    <div>
      <h3>${properties.name || 'Unnamed Feature'}</h3>
      <p>Type: ${properties.type || 'Unknown'}</p>
      ${properties.net_explosive_weight ? `<p>NEW: ${properties.net_explosive_weight} lbs</p>` : ''}
      <button class="edit-properties-btn" onclick="window.forceOpenEditor(this)">Edit Properties</button>
    </div>
  `;

  layer.bindPopup(popupContent);

  // Add click handler with debugging
  layer.on('popupopen', function() {
    console.log('Popup opened for layer:', layer._leaflet_id);
    layer._popupOpen = true;

    // Store layer as last clicked layer
    window.lastClickedLayer = layer;

    setTimeout(() => {
      const editBtn = document.querySelector('.edit-properties-btn');
      if (editBtn) {
        // Remove previous handlers to prevent duplication
        const newBtn = editBtn.cloneNode(true);
        if (editBtn.parentNode) {
          editBtn.parentNode.replaceChild(newBtn, editBtn);
        }

        // Add direct onclick attribute for maximum reliability
        newBtn.setAttribute('onclick', 'window.forceOpenEditor(this)');
        console.log('Edit button handler setup completed');
      }
    }, 50);
  });

  // Add additional click handler directly on the layer
  layer.on('click', function(e) {
    console.log('Layer clicked directly:', layer._leaflet_id);
    // Store the layer for reference
    window.lastClickedLayer = layer;
  });
}

// Setup map click handler
function setupMapClickHandler() {
  console.log("Setting up map click handler");

  if (!window.map) {
    console.error("Map not available for click handler setup");
    return;
  }

  // Close open popups when clicking outside features
  window.map.on('click', function(e) {
    // Check if click was not on a feature
    if (e.originalEvent && !e.originalEvent.target.closest('.leaflet-interactive')) {
      closeFeaturePropertiesModal();
    }
  });
}

// CRITICAL: Export all functions to the global scope
// This ensures they are available everywhere
window.openFeatureEditor = openFeatureEditor;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
window.saveFeatureProperties = saveFeatureProperties;
window.addLayerClickHandlers = addLayerClickHandlers;
window.setupMapClickHandler = setupMapClickHandler;
window.forceOpenEditor = handleEditButtonClick; // Added for direct editor opening

// Also expose directly on the window object for IE compatibility
try {
  window["openFeatureEditor"] = openFeatureEditor;
  // Create a global variable reference directly
  openFeatureEditor = openFeatureEditor;
} catch (e) {
  console.warn("Could not create global reference to openFeatureEditor");
}

// Fallback to ensure functions are properly exposed
window.addEventListener('load', function() {
  console.log("Ensuring global feature editor functions are available");

  // Force define on window object to make absolutely certain
  window.openFeatureEditor = openFeatureEditor;
  window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
  window.saveFeatureProperties = saveFeatureProperties;
  window.addLayerClickHandlers = addLayerClickHandlers;
  window.setupMapClickHandler = setupMapClickHandler;
  window.forceOpenEditor = handleEditButtonClick; // Added for direct editor opening

  // Add a direct reference for popups to use
  document.openFeatureEditor = openFeatureEditor;
});

// Additional safety measure - directly assign to document
document.openFeatureEditor = openFeatureEditor;