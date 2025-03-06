
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
