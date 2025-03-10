
/**
 * QDPro Editor Module
 * Global module that centralizes feature editing functionality
 */

// Create a namespace for the QD Editor to prevent global scope pollution
window.QDProEditor = {
  activeEditingLayer: null,
  
  /**
   * Open the feature editor for a layer
   * @param {L.Layer} layer - The layer to edit
   */
  openFeatureEditor: function(layer) {
    console.log("QDProEditor.openFeatureEditor called with layer:", layer);
    
    // Store reference to the editing layer
    this.activeEditingLayer = layer;
    
    // Get the modal element
    const modal = document.getElementById('featurePropertiesModal');
    if (!modal) {
      console.error("Feature properties modal not found");
      return;
    }
    
    // Get feature properties or initialize empty object
    const properties = layer.feature ? layer.feature.properties : {};
    
    // Populate form fields
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
    modal.style.display = 'block';
  },
  
  /**
   * Close the feature properties modal
   */
  closeFeatureEditor: function() {
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'none';
    }
    this.activeEditingLayer = null;
  },
  
  /**
   * Save the feature properties
   */
  saveFeatureProperties: function() {
    const layer = this.activeEditingLayer;
    if (!layer) {
      console.error("No active editing layer to save properties for");
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
    this.closeFeatureEditor();
    
    // Save the project to persist changes
    if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
      QDPro.saveProject();
    }
    
    console.log("Feature properties saved:", layer.feature.properties);
  }
};

// Create direct global references to maintain backward compatibility
window.openFeatureEditor = function(layer) {
  window.QDProEditor.openFeatureEditor(layer);
};

window.closeFeaturePropertiesModal = function() {
  window.QDProEditor.closeFeatureEditor();
};

window.saveFeatureProperties = function() {
  window.QDProEditor.saveFeatureProperties();
};

// Add event handlers when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Global editor module loaded");
  
  // Set up form event handlers
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
  
  // Set up modal buttons
  const saveBtn = document.getElementById('savePropertiesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      window.QDProEditor.saveFeatureProperties();
    });
  }
  
  const closeBtn = document.getElementById('closeFeaturePropertiesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }
  
  const cancelBtn = document.getElementById('cancelPropertiesBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }
  
  // Ensure the editor is properly initialized
  console.log("Feature editor event handlers set up");
});
