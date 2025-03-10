/**
 * Feature Editor Initialization Module
 * This script handles initialization of the feature properties editor
 * and ensures all feature editing functions are properly exposed globally
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
  window.activeEditingLayer = null;
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

  // Get properties for popup content
  const properties = layer.feature ? layer.feature.properties : {};
  const popupContent = `
    <div>
      <h3>${properties.name || 'Unnamed Feature'}</h3>
      <p>Type: ${properties.type || 'Unknown'}</p>
      ${properties.net_explosive_weight ? `<p>NEW: ${properties.net_explosive_weight} lbs</p>` : ''}
      ${properties.description ? `<p>${properties.description}</p>` : ''}
      <button class="edit-properties-btn">Edit Properties</button>
    </div>
  `;

  // Bind the popup to the layer
  layer.bindPopup(popupContent);

  // Add popup open event handler
  layer.on('popupopen', function() {
    console.log("Popup opened, setting up edit button handler");

    // Find and set up the edit button with appropriate handler
    setTimeout(function() {
      const popupContainer = document.querySelector('.leaflet-popup-content');
      if (popupContainer) {
        const editButton = popupContainer.querySelector('.edit-properties-btn');
        if (editButton) {
          // Clean previous handlers by cloning and replacing
          const newEditButton = editButton.cloneNode(true);
          editButton.parentNode.replaceChild(newEditButton, editButton);

          // Add the event handler
          newEditButton.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("Edit button clicked, calling openFeatureEditor");
            // This will use the globally defined function
            window.openFeatureEditor(layer);
            return false;
          });
        } else {
          console.warn("Edit button not found in popup");
        }
      }
    }, 10);
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

// Fallback to ensure functions are properly exposed
window.addEventListener('load', function() {
  console.log("Ensuring global feature editor functions are available");

  // Force define on window object to make absolutely certain
  window.openFeatureEditor = openFeatureEditor;
  window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
  window.saveFeatureProperties = saveFeatureProperties;
  window.addLayerClickHandlers = addLayerClickHandlers;
  window.setupMapClickHandler = setupMapClickHandler;

  // Add a direct reference for popups to use
  document.openFeatureEditor = openFeatureEditor;
});

// Additional safety measure - directly assign to document
document.openFeatureEditor = openFeatureEditor;