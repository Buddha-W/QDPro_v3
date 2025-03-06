
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
        window.closeFeaturePropertiesModal = closeFeaturePropertiesModal;
      }
      
      // Setup map click handlers if not already done
      if (window.map && !window.map._featureEditorInitialized) {
        window.map._featureEditorInitialized = true;
        setupMapClickHandler();
        setupAllLayerEditHandlers();
      }
    }
  }, 100);
});
