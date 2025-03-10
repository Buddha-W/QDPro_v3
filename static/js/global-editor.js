
/**
 * Global Feature Editor Module
 * This ensures the editor functions are available globally across all scripts
 */

// Create global namespace to store editor functions
window.QDProEditor = window.QDProEditor || {};

// Immediately set up event listener to ensure the functions are exposed early
document.addEventListener('DOMContentLoaded', function() {
  console.log("Global Editor Module: Setting up global functions");
  
  // Function to open feature editor
  QDProEditor.openFeatureEditor = function(layer) {
    console.log("QDProEditor: Opening feature editor for layer", layer);
    
    // Set active editing layer
    window.activeEditingLayer = layer;
    
    // Get feature properties
    const properties = layer.feature ? layer.feature.properties : {};
    
    // Populate the form fields
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
    
    // Set net explosive weight if applicable
    const newField = document.getElementById('net_explosive_weight');
    if (newField) newField.value = properties.net_explosive_weight || '';
    
    // Show the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'block';
    } else {
      console.error("Feature properties modal not found");
    }
  };
  
  // Function to close the feature properties modal
  QDProEditor.closeFeaturePropertiesModal = function() {
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'none';
    }
    window.activeEditingLayer = null;
  };
  
  // Function to save feature properties
  QDProEditor.saveFeatureProperties = function() {
    const layer = window.activeEditingLayer;
    if (!layer) {
      console.error("No active layer to save properties");
      return;
    }
    
    // Ensure layer has feature and properties objects
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
    
    // Update popup content if exists
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
    QDProEditor.closeFeaturePropertiesModal();
    
    // Save the project
    if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
      QDPro.saveProject();
    }
  };
  
  // Create global direct references to the functions
  window.openFeatureEditor = QDProEditor.openFeatureEditor;
  window.closeFeaturePropertiesModal = QDProEditor.closeFeaturePropertiesModal;
  window.saveFeatureProperties = QDProEditor.saveFeatureProperties;
});
