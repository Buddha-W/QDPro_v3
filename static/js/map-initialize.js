
/**
 * Map Initialization Module
 * Handles map creation and base layer management
 */

// Global map reference
let map;

/**
 * Initialize the Leaflet map
 */
function initMap() {
  console.log('Initializing map...');
  
  // Create map if it doesn't exist
  if (!map) {
    map = L.map('map').setView([40.7128, -74.0060], 13);
    
    // Add base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);
    
    // Make map globally available
    window.map = map;
    
    console.log('Map initialized successfully');
  }
}

/**
 * Load a saved project from localStorage
 */
function loadProject() {
  if (typeof window.clearLayers !== 'function') {
    console.error('clearLayers function not available');
    return;
  }
  
  window.clearLayers();

  const projectData = JSON.parse(localStorage.getItem('savedProject'));
  if (!projectData || !projectData.layers) {
    console.error('No valid project data found');
    return;
  }

  projectData.layers.forEach(layer => {
    // Create polygon from coordinates
    const polygonLayer = L.polygon(layer.coordinates).addTo(map);
    
    // Set feature properties
    polygonLayer.feature = {
      type: 'Feature',
      properties: {
        name: layer.name,
        ...layer // spread any other properties
      }
    };
    
    // Add click handler to open the feature editor
    polygonClickHandler(polygonLayer, layer);
  });

  console.log('Project loaded successfully');
}

/**
 * Setup polygon click handler
 * @param {L.Polygon} polygonLayer - The polygon layer
 * @param {Object} layerData - The layer data
 */
function polygonClickHandler(polygonLayer, layerData) {
  if (typeof window.openFeatureEditor !== 'function') {
    console.error('openFeatureEditor function not available');
    return;
  }
  
  polygonLayer.on('click', function(e) {
    // Stop propagation to prevent map click from firing
    L.DomEvent.stopPropagation(e);
    
    // Open feature editor
    window.openFeatureEditor(layerData);
  });
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initialization script loaded');
  initMap();
  
  // Check if saved project exists and load it
  if (localStorage.getItem('savedProject')) {
    // Wait for feature editor to be ready
    const checkFeatureEditor = setInterval(function() {
      if (window.openFeatureEditor) {
        clearInterval(checkFeatureEditor);
        loadProject();
      }
    }, 100);
  }
});

// Make functions globally available
window.initMap = initMap;
window.polygonClickHandler = polygonClickHandler;
