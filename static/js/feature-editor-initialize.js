/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize feature editor when map is ready
  const checkMapInterval = setInterval(function() {
    if (window.map) {
      clearInterval(checkMapInterval);

      // Setup all layer edit handlers
      if (typeof setupAllLayerEditHandlers === 'function') {
        setupAllLayerEditHandlers();
      }

      // Setup click event handler for the map
      window.map.on('draw:created', function(e) {
        const layer = e.layer;

        // Initialize feature properties
        layer.feature = {
          type: 'Feature',
          properties: {
            name: 'New Feature',
            type: 'Polygon',
            description: ''
          },
          geometry: layer.toGeoJSON().geometry
        };

        // Add layer click handlers
        if (typeof addLayerClickHandlers === 'function') {
          addLayerClickHandlers(layer);
        }

        // Automatically open feature editor for the new feature
        if (typeof openFeatureEditor === 'function') {
          openFeatureEditor(layer);
        }
      });

      // Monitor for newly added layers
      window.map.on('layeradd', function(e) {
        const layer = e.layer;

        // If this is a feature layer, add click handlers
        if (layer.feature) {
          if (typeof addLayerClickHandlers === 'function') {
            addLayerClickHandlers(layer);
          }
        }

        // If this is a layer group, process its sub-layers
        if (layer.eachLayer) {
          layer.eachLayer(function(sublayer) {
            if (sublayer.feature) {
              if (typeof addLayerClickHandlers === 'function') {
                addLayerClickHandlers(sublayer);
              }
            }
          });
        }
      });

      console.log("Feature editor initialization complete");
    }
  }, 500);
});
/**
 * Feature Editor Initialization
 * This script ensures that the feature editor is properly set up when the map loads
 */

document.addEventListener('DOMContentLoaded', function() {
  console.log("Feature editor initialization script loaded");

  // Check if the modal exists in the DOM
  const modal = document.getElementById('featurePropertiesModal');
  if (!modal) {
    console.error("Feature properties modal not found in the DOM, creating it");
    // Create the modal if it doesn't exist
    const modalHTML = `
      <div id="featurePropertiesModal" class="modal">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Feature Properties</h2>
            <span id="closeFeaturePropertiesBtn" class="close" onclick="closeFeaturePropertiesModal()">&times;</span>
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
                <button type="button" id="savePropertiesBtn" class="btn btn-primary" onclick="saveFeatureProperties()">Save</button>
                <button type="button" class="btn btn-secondary" onclick="closeFeaturePropertiesModal()">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Append the modal to the body
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Setup event handlers for the new modal
    const closeButton = document.getElementById('closeFeaturePropertiesBtn');
    if (closeButton) {
      closeButton.addEventListener('click', function() {
        closeFeaturePropertiesModal();
      });
    }

    // Setup has_explosive checkbox handler
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

  // Wait for map to be ready
  const waitForMap = setInterval(function() {
    if (window.map) {
      clearInterval(waitForMap);
      console.log("Map is ready, setting up feature editor handlers");

      // Ensure global window functions are defined
      if (typeof window.closeFeaturePropertiesModal !== 'function') {
        window.closeFeaturePropertiesModal = function() {
          console.log("Closing feature properties modal from global function");
          const modal = document.getElementById('featurePropertiesModal');
          if (modal) {
            modal.style.display = 'none';
          } else {
            console.warn("Modal element not found when trying to close");
          }
          window.activeEditingLayer = null;
        };
      }

      // Setup map click handlers if not already done
      if (window.map && !window.map._featureEditorInitialized) {
        window.map._featureEditorInitialized = true;
        if (typeof setupMapClickHandler === 'function') {
          setupMapClickHandler();
        } else {
          console.warn("setupMapClickHandler is not defined");
          // Define a basic version if missing
          window.setupMapClickHandler = function() {
            console.log("Setting up map click handler (fallback)");
            window.map.on('click', function(e) {
              if (!e.originalEvent.target.closest('.leaflet-interactive')) {
                window.closeFeaturePropertiesModal();
              }
            });
          };
          window.setupMapClickHandler();
        }

        if (typeof setupAllLayerEditHandlers === 'function') {
          setupAllLayerEditHandlers();
        } else {
          console.warn("setupAllLayerEditHandlers is not defined");
        }
      }
    }
  }, 100);
});

// Function to open feature editor 
function openFeatureEditor(layer) {
  console.log("Opening feature editor for:", layer);
  window.activeEditingLayer = layer;

  // Get feature properties
  const properties = layer.feature ? layer.feature.properties : {};

  // Populate the form
  document.getElementById('name').value = properties.name || '';
  document.getElementById('type').value = properties.type || 'Building';
  document.getElementById('description').value = properties.description || '';
  document.getElementById('is_facility').checked = properties.is_facility || false;
  document.getElementById('has_explosive').checked = properties.has_explosive || false;

  // Show/hide explosive weight section based on checkbox
  const explosiveSection = document.getElementById('explosiveSection');
  if (explosiveSection) {
    explosiveSection.style.display = properties.has_explosive ? 'block' : 'none';
    document.getElementById('net_explosive_weight').value = properties.net_explosive_weight || '';
  }

  // Add event listener to save button
  const saveBtn = document.getElementById('savePropertiesBtn');
  if (saveBtn) {
    // Remove any existing event listeners
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    // Add new event listener
    newSaveBtn.addEventListener('click', saveFeatureProperties);
  }

  // Show the modal
  const modal = document.getElementById('featurePropertiesModal');
  if (modal) {
    modal.style.display = 'block';
  }
}

// Function to save feature properties
function saveFeatureProperties() {
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

// Make functions available globally
window.openFeatureEditor = openFeatureEditor;
window.saveFeatureProperties = saveFeatureProperties;
window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;


// Add Layer Click Handlers (This function needs to be defined elsewhere and likely calls openFeatureEditor)
function addLayerClickHandlers(layer) {
  layer.on('popupopen', function(e) {
    setTimeout(() => {
      const popup = e.popup;
      if (popup && popup._contentNode) {
        const editBtn = popup._contentNode.querySelector('.edit-properties-btn');
        if (editBtn) {
          editBtn.addEventListener('click', function() {
            openFeatureEditor(layer);
          });
        }
      }
    }, 100);
  });
}