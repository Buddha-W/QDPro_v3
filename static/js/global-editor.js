// QDPro Global Editor Module
// This script centralizes editor functions to ensure they're globally accessible

// Create a global namespace for editor functions
window.QDProEditor = {
  activeEditingLayer: null,
  isEditorOpen: false,
  lastPopupLayer: null,

  openFeatureEditor: function(layer) {
    console.log("QDProEditor: Opening feature editor for layer:", layer);
    this.activeEditingLayer = layer;
    this.isEditorOpen = true;

    // Get feature properties
    const properties = layer.feature ? layer.feature.properties : {};

    // Populate the form fields
    document.getElementById('name').value = properties.name || '';
    document.getElementById('type').value = properties.type || 'Building';
    document.getElementById('description').value = properties.description || '';

    if (document.getElementById('is_facility')) {
      document.getElementById('is_facility').checked = properties.is_facility || false;
    }

    if (document.getElementById('has_explosive')) {
      document.getElementById('has_explosive').checked = properties.has_explosive || false;

      // Toggle explosive section visibility
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = properties.has_explosive ? 'block' : 'none';
      }

      if (document.getElementById('net_explosive_weight')) {
        document.getElementById('net_explosive_weight').value = properties.net_explosive_weight || '';
      }
    }

    // Show the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'block';
    }
  },

  closeFeatureEditor: function() {
    console.log("QDProEditor: Closing feature editor");
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'none';
    }

    // Reset flags to allow immediate editing of another feature
    this.isEditorOpen = false;
    
    // Reset active editing layer immediately
    this.activeEditingLayer = null;
    
    // Force close any active popups on the map
    if (window.map) {
      window.map.closePopup();
    }
    
    // Reset any layer-specific popup states
    // This is critical to allowing immediate re-editing of features
    document.querySelectorAll('.leaflet-popup').forEach(popup => {
      popup.remove();
    });
    
    // Reset all other state flags that might interfere with new popups
    window.lastClickedLayer = null;
    window.activeEditingLayer = null;
    
    console.log("QDProEditor: Editor fully closed, ready for new interactions");
    
    // Dispatch a custom event to notify the system the editor is fully closed
    document.dispatchEvent(new CustomEvent('editor-closed'));
  },

  saveFeatureProperties: function() {
    console.log("QDProEditor: Saving feature properties");
    const layer = this.activeEditingLayer;
    if (!layer) {
      console.error("No active layer to save properties to");
      return;
    }

    // Ensure feature and properties objects exist
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

    // Update popup content
    const popupContent = `
      <div>
        <h3>${name || 'Unnamed Feature'}</h3>
        <p>Type: ${type || 'Unknown'}</p>
        ${hasExplosive ? `<p>NEW: ${netExplosiveWeight} lbs</p>` : ''}
        ${description ? `<p>${description}</p>` : ''}
        <button class="edit-properties-btn">Edit Properties</button>
      </div>
    `;

    if (layer.getPopup()) {
      layer.setPopupContent(popupContent);
    }

    // Close the editor
    this.closeFeatureEditor();

    // Save project state if available
    if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
      QDPro.saveProject();
    }
  }
};

// Make functions globally available
window.openFeatureEditor = function(layer) {
  window.QDProEditor.openFeatureEditor(layer);
};

window.closeFeaturePropertiesModal = function() {
  window.QDProEditor.closeFeatureEditor();
};

window.saveFeatureProperties = function() {
  window.QDProEditor.saveFeatureProperties();
};

// Handle has_explosive checkbox to show/hide explosive section
function setupExplosiveSectionToggle() {
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

// Set up form event handlers
document.addEventListener('DOMContentLoaded', function() {
  console.log("QDProEditor: Setting up event handlers");

  // Setup explosive section toggle
  setupExplosiveSectionToggle();

  // Setup save button
  const saveBtn = document.getElementById('savePropertiesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      window.QDProEditor.saveFeatureProperties();
    });
  }

  // Setup close button
  const closeBtn = document.getElementById('closeFeaturePropertiesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }

  // Setup cancel button
  const cancelBtn = document.getElementById('cancelPropertiesBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }

  // Fix any missing edit buttons in existing popups
  setTimeout(function() {
    const editButtons = document.querySelectorAll('.edit-properties-btn');
    editButtons.forEach(function(btn) {
      if (!btn.onclick) {
        btn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();

          const popup = this.closest('.leaflet-popup');
          if (popup && popup._source) {
            openFeatureEditor(popup._source);
          }
        };
      }
    });
  }, 1000);

  console.log("QDProEditor: Event handlers setup complete");
});

// Define a global function for popup edit button click handling
window.handleEditButtonClick = function(button) {
  console.log("Edit button clicked via direct onclick handler");

  // Find the popup and associated layer
  const popup = button.closest('.leaflet-popup');
  if (popup && popup._source) {
    const layer = popup._source;

    // Close popup
    if (layer.closePopup) {
      layer.closePopup();
    }

    // Open feature editor immediately
    window.openFeatureEditor(layer);
  }

  return false;
};