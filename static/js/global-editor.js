// QDPro Global Editor Module
// This script centralizes editor functions to ensure they're globally accessible

// Initialize QDProEditor as a globally accessible object with integrated QD engine
window.QDProEditor = {
  // QD engine parameters
  qdEngine: {
    kFactors: {
      "IBD": 40,
      "ILD": 18, 
      "IMD": 9,
      "PTRD": 24
    },
    standards: {
      "IBD": "DESR 6055.09, Vol 3, Section 5.4.1.2",
      "ILD": "DESR 6055.09, Vol 3, Section 5.4.2.1",
      "IMD": "DESR 6055.09, Vol 3, Section 5.4.3.1",
      "PTRD": "DESR 6055.09, Vol 3, Section 5.4.4.1"
    },
    // Convert units to pounds
    unitConversions: {
      "g": 0.00220462,
      "kg": 2.20462,
      "lbs": 1.0
    }
  },
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

    // Hide the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'none';
    }

    // Close any popups
    if (window.map) {
      if (typeof window.map.closePopup === 'function') {
        window.map.closePopup();
      } else {
        // Alternative approach if closePopup is not available
        console.log("map.closePopup is not a function, trying alternatives");
      }

      // Try to close all popups via layers
      if (typeof window.map.eachLayer === 'function') {
        window.map.eachLayer(function(layer) {
          if (layer.closePopup) {
            layer.closePopup();
          }
        });
      } else if (window.map._layers) {
        // Direct access to layers if eachLayer isn't available
        console.log("Using fallback layer access method");
        Object.values(window.map._layers || {}).forEach(function(layer) {
          if (layer && typeof layer.closePopup === 'function') {
            layer.closePopup();
          }
        });
      }
    }

    // Reset flags to allow immediate editing of another feature
    this.isEditorOpen = false;

    // Store the previously active layer before clearing it
    const previousLayer = this.activeEditingLayer;

    // Reset active editing layer immediately
    this.activeEditingLayer = null;


    // Reset any layer-specific popup states
    // This is critical to allowing immediate re-editing of features
    document.querySelectorAll('.leaflet-popup').forEach(popup => {
      popup.remove();
    });

    window.lastClickedLayer = null;
    window.activeEditingLayer = null;

    // Force reset all click states on all layers
    if (window.map) {
      if (typeof window.map.eachLayer === 'function') {
        window.map.eachLayer(function(layer) {
          if (layer.feature) {
            // Remove any state that might prevent clicking
            if (layer._editingActive) delete layer._editingActive;
            if (layer._wasClicked) delete layer._wasClicked;
            if (layer._popupOpen) delete layer._popupOpen;
            if (layer._popupClosed) delete layer._popupClosed;
            if (layer._editPending) delete layer._editPending;
          }
        });
      }
    }

    console.log("QDProEditor: Editor fully closed, ready for new interactions");

    // Dispatch a custom event to notify the system the editor is fully closed
    document.dispatchEvent(new CustomEvent('editor-closed'));

    // Force a brief delay to ensure the DOM is updated before allowing new clicks
    setTimeout(function() {
      console.log("Reset complete, ready for new interactions");
    }, 10);
  },

  // Force open the editor for a layer
  forceOpenEditor: function(btn) {
    console.log("Force open editor called");

    // Get the active layer
    const layer = window.lastClickedLayer;
    if (!layer) {
      console.error("No layer to edit!");
      return;
    }

    // Close any open popups
    if (window.map) {
      if (typeof window.map.closePopup === 'function') {
        window.map.closePopup();
      } else if (typeof window.map.eachLayer === 'function') {
        // Alternative approach - close popups on each layer
        window.map.eachLayer(function(layer) {
          if (layer.closePopup) {
            layer.closePopup();
          }
        });
      } else if (window.map._layers) {
        // Direct access to layers if eachLayer isn't available
        Object.values(window.map._layers).forEach(function(layer) {
          if (layer && typeof layer.closePopup === 'function') {
            layer.closePopup();
          }
        });
      }
    }

    // Reset editor state
    this.isEditorOpen = false;

    // Open the editor after a short delay
    setTimeout(() => {
      console.log("Opening editor for layer:", layer._leaflet_id);
      this.openFeatureEditor(layer);
    }, 50);
  },

  saveFeatureProperties: function() {
    console.log("QDProEditor: Saving feature properties");

    // Get the layer we're editing - try multiple possible references
    const layer = window.activeEditingLayer || window.lastClickedLayer;
    if (!layer) {
      console.log("No active layer to save properties to");
      // Close the modal anyway to prevent getting stuck
      this.closeFeatureEditor();
      return;
    }

    console.log("Saving properties to layer:", layer._leaflet_id || "unknown ID");

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

window.forceOpenEditor = function(btn) {
  window.QDProEditor.forceOpenEditor(btn);
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