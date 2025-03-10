
/**
 * Global Feature Editor Module
 * This ensures all editor functions are available globally across all scripts
 */

// Create global namespace to store all editor functions
window.QDProEditor = {
  // Main feature editor function that opens the properties modal
  openFeatureEditor: function(layer) {
    console.log("QDProEditor: Opening feature editor for layer:", layer);
    
    // Store reference to the layer being edited
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
    if (hasExplosiveField) {
      hasExplosiveField.checked = properties.has_explosive || false;
      
      // Toggle explosive section visibility
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = hasExplosiveField.checked ? 'block' : 'none';
      }
    }
    
    // Set explosive weight if applicable
    const newField = document.getElementById('net_explosive_weight');
    if (newField) newField.value = properties.net_explosive_weight || '';
    
    // Show the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'block';
    } else {
      console.error("Feature properties modal not found");
      alert("Error: Feature properties modal not found. Please refresh the page.");
    }
  },
  
  // Close the feature properties modal
  closeFeaturePropertiesModal: function() {
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'none';
    }
    window.activeEditingLayer = null;
  },
  
  // Save feature properties from the form
  saveFeatureProperties: function() {
    const layer = window.activeEditingLayer;
    if (!layer) {
      console.error("No active layer to save properties");
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
    this.closeFeaturePropertiesModal();
    
    // Save the project to persist changes
    if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
      QDPro.saveProject();
    }
    
    console.log("Feature properties saved:", layer.feature.properties);
  }
};

// Make functions directly available in global scope for backward compatibility
window.openFeatureEditor = window.QDProEditor.openFeatureEditor;
window.closeFeaturePropertiesModal = window.QDProEditor.closeFeaturePropertiesModal;
window.saveFeatureProperties = window.QDProEditor.saveFeatureProperties;

// Ensure these are available after DOM content is loaded too
document.addEventListener('DOMContentLoaded', function() {
  console.log("Global editor functions ensured to be available");
  window.openFeatureEditor = window.QDProEditor.openFeatureEditor;
  window.closeFeaturePropertiesModal = window.QDProEditor.closeFeaturePropertiesModal;
  window.saveFeatureProperties = window.QDProEditor.saveFeatureProperties;
  
  // Create direct references on document for IE compatibility
  document.openFeatureEditor = window.QDProEditor.openFeatureEditor;
  document.closeFeaturePropertiesModal = window.QDProEditor.closeFeaturePropertiesModal;
  document.saveFeatureProperties = window.QDProEditor.saveFeatureProperties;
});

// Set up has_explosive checkbox event listener if it exists
document.addEventListener('DOMContentLoaded', function() {
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
});

console.log("Global editor module loaded and initialized");
