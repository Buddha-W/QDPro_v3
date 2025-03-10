
// Layer Manager for QDPro
// This file handles layer operations, toggling, and management

// Ensure we have a namespace for our layer management functions
if (!window.QDProEditor) {
  window.QDProEditor = {};
}

// Layer Manager functions
(function() {
  // Layer storage and management
  const layerManager = {
    layers: {},
    layerColors: {},
    activeLayer: null,
    map: null,
    
    // Initialize layer manager with the map instance
    init: function(mapInstance) {
      this.map = mapInstance;
      console.log("Layer manager initialized");
    },
    
    // Create a new layer
    createLayer: function(name, options = {}) {
      if (this.layers[name]) {
        console.warn(`Layer "${name}" already exists.`);
        return this.layers[name];
      }
      
      const layer = L.featureGroup().addTo(this.map);
      this.layers[name] = layer;
      
      // Set layer properties if provided
      if (options.properties) {
        layer.properties = options.properties;
      }
      
      // Set layer color if provided
      if (options.color) {
        this.layerColors[name] = options.color;
      } else {
        // Default color
        this.layerColors[name] = "#3388ff";
      }
      
      this.updateLayerToggle();
      return layer;
    },
    
    // Set the active layer
    setActiveLayer: function(layerName) {
      if (!this.layers[layerName]) {
        console.error(`Layer "${layerName}" does not exist.`);
        return;
      }
      
      this.activeLayer = layerName;
      console.log(`Active layer set to "${layerName}"`);
      
      // Update UI to reflect the active layer
      this.updateLayerToggle();
    },
    
    // Get the active layer
    getActiveLayer: function() {
      return this.activeLayer ? this.layers[this.activeLayer] : null;
    },
    
    // Remove a layer
    removeLayer: function(layerName) {
      if (!this.layers[layerName]) {
        console.error(`Layer "${layerName}" does not exist.`);
        return;
      }
      
      // Remove layer from map
      this.map.removeLayer(this.layers[layerName]);
      
      // Remove from our storage
      delete this.layers[layerName];
      delete this.layerColors[layerName];
      
      // If this was the active layer, set active to null
      if (this.activeLayer === layerName) {
        this.activeLayer = null;
      }
      
      this.updateLayerToggle();
    },
    
    // Toggle layer visibility
    toggleLayerVisibility: function(layerName) {
      if (!this.layers[layerName]) {
        console.error(`Layer "${layerName}" does not exist.`);
        return;
      }
      
      const layer = this.layers[layerName];
      
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
      } else {
        layer.addTo(this.map);
      }
      
      this.updateLayerToggle();
    },
    
    // Update layer toggle UI
    updateLayerToggle: function() {
      // Get the layers list element
      const layersList = document.getElementById('layersList');
      if (!layersList) {
        console.warn("Layers list element not found.");
        return;
      }
      
      // Clear current list
      layersList.innerHTML = '';
      
      // Add each layer to the list
      for (const name in this.layers) {
        const layer = this.layers[name];
        const isVisible = this.map.hasLayer(layer);
        const isActive = (name === this.activeLayer);
        
        // Create layer list item
        const layerItem = document.createElement('div');
        layerItem.className = 'layer-item';
        if (isActive) {
          layerItem.classList.add('active');
        }
        
        // Create visibility toggle
        const visibilityToggle = document.createElement('span');
        visibilityToggle.className = `visibility-toggle ${isVisible ? 'visible' : 'hidden'}`;
        visibilityToggle.innerHTML = isVisible ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
        visibilityToggle.addEventListener('click', () => {
          this.toggleLayerVisibility(name);
        });
        
        // Create layer name element
        const layerName = document.createElement('span');
        layerName.className = 'layer-name';
        layerName.textContent = name;
        layerName.addEventListener('click', () => {
          this.setActiveLayer(name);
        });
        
        // Create layer actions container
        const layerActions = document.createElement('span');
        layerActions.className = 'layer-actions';
        
        // Create edit button
        const editButton = document.createElement('span');
        editButton.className = 'edit-button';
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.addEventListener('click', () => {
          if (typeof window.QDProEditor.showLayerEditModal === 'function') {
            window.QDProEditor.showLayerEditModal(name);
          } else {
            console.error("Layer edit modal function not found");
          }
        });
        
        // Assemble layer item
        layerItem.appendChild(visibilityToggle);
        layerItem.appendChild(layerName);
        layerActions.appendChild(editButton);
        layerItem.appendChild(layerActions);
        
        // Add the layer item to the list
        layersList.appendChild(layerItem);
      }
    },
    
    // Get layer name by layer object
    getLayerNameByObject: function(layerObj) {
      for (let name in this.layers) {
        if (this.layers[name] === layerObj) {
          return name;
        }
      }
      return null;
    },
    
    // Load layers from data (used when loading from server)
    loadLayers: function(layersData) {
      try {
        if (!layersData || typeof layersData !== 'object') {
          console.error("Invalid layers data format");
          return false;
        }
        
        // Clear existing layers first
        this.clearLayers();
        
        // Create layers from data
        for (const layerName in layersData) {
          const layerData = layersData[layerName];
          
          // Create the layer
          const layer = this.createLayer(layerName, {
            properties: layerData.properties
          });
          
          // Add features to the layer if available
          if (layerData.features && Array.isArray(layerData.features)) {
            layerData.features.forEach(feature => {
              if (feature.geometry) {
                const geoJSONLayer = L.geoJSON(feature, {
                  style: function(feature) {
                    // Set style based on properties or default
                    return {
                      color: feature.properties?.strokeColor || "#3388ff",
                      weight: feature.properties?.strokeWeight || 3,
                      opacity: feature.properties?.strokeOpacity || 0.8,
                      fillColor: feature.properties?.fillColor || "#3388ff",
                      fillOpacity: feature.properties?.fillOpacity || 0.35
                    };
                  },
                  onEachFeature: (feature, layer) => {
                    // Add popups if defined
                    if (feature.properties && feature.properties.popupContent) {
                      layer.bindPopup(feature.properties.popupContent);
                    }
                    
                    // Add click handlers
                    if (typeof window.addLayerClickHandlers === 'function') {
                      window.addLayerClickHandlers(layer);
                    } else {
                      console.warn("Layer click handlers function not found");
                    }
                  }
                });
                
                geoJSONLayer.eachLayer(l => {
                  layer.addLayer(l);
                });
              }
            });
          }
        }
        
        // Set default active layer
        const firstLayer = Object.keys(this.layers)[0];
        if (firstLayer) {
          this.setActiveLayer(firstLayer);
        }
        
        this.updateLayerToggle();
        return true;
      } catch (error) {
        console.error("Error loading layers:", error);
        return false;
      }
    },
    
    // Clear all layers
    clearLayers: function(clearBaseLayersToo = false) {
      // Remove all layers from the map
      if (this.layers) {
        Object.values(this.layers).forEach(layer => {
          if (layer && this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
          }
        });
      }
      
      // Reset layers object
      this.layers = {};
      this.layerColors = {};
      this.activeLayer = null;
      
      // Create a default layer
      const defaultLayer = this.createLayer('Default');
      this.setActiveLayer('Default');
      
      this.updateLayerToggle();
    }
  };
  
  // Expose to global QDProEditor namespace
  window.QDProEditor.layerManager = layerManager;
})();
