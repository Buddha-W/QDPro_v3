
/**
 * Map initialization script for QDPro
 * Handles map setup and ensures proper loading
 */

// Initialize map when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Initializing map...');
  initializeMap();
});

function initializeMap() {
  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found!');
    return;
  }
  
  // Check if map is already initialized
  if (window.map) {
    console.log('Map already initialized');
    return;
  }
  
  try {
    // Initialize the map with a default view
    window.map = L.map('map', {
      center: [39.8283, -98.5795], // Center of US
      zoom: 5,
      zoomControl: true
    });
    
    // Add base layers
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      crossOrigin: "anonymous"
    });
    
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      crossOrigin: "anonymous"
    });
    
    // Add layers to map
    osmLayer.addTo(window.map);
    
    // Setup base layers control
    const baseLayers = {
      "Street Map": osmLayer,
      "Satellite": satelliteLayer
    };
    
    // Create overlay layers object for features
    window.overlayLayers = {
      "Features": new L.FeatureGroup()
    };
    
    // Add overlay layers to map
    window.overlayLayers.Features.addTo(window.map);
    
    // Setup layer control
    L.control.layers(baseLayers, window.overlayLayers).addTo(window.map);
    
    // Initialize draw controls if available
    if (L.Control.Draw) {
      initializeDrawControls();
    }
    
    console.log('Map initialized successfully');
    
    // Dispatch event that map is ready
    document.dispatchEvent(new Event('map-initialized'));
  } catch (error) {
    console.error('Error initializing map:', error);
  }
}

function initializeDrawControls() {
  // Setup draw options
  const drawOptions = {
    position: 'topleft',
    draw: {
      polyline: {
        shapeOptions: {
          color: '#f357a1',
          weight: 3
        }
      },
      polygon: {
        allowIntersection: false,
        drawError: {
          color: '#e1e100',
          timeout: 1000
        },
        shapeOptions: {
          color: '#bada55'
        }
      },
      circle: {
        shapeOptions: {
          color: '#662d91'
        }
      },
      marker: true
    },
    edit: {
      featureGroup: window.overlayLayers.Features
    }
  };
  
  // Add draw control to map
  window.drawControl = new L.Control.Draw(drawOptions);
  window.map.addControl(window.drawControl);
  
  // Setup draw events
  window.map.on(L.Draw.Event.CREATED, function(event) {
    const layer = event.layer;
    
    // Add default properties
    layer.feature = {
      type: 'Feature',
      properties: {
        id: Date.now().toString(),
        name: 'New Feature',
        type: event.layerType,
        description: ''
      }
    };
    
    // Add layer to feature group
    window.overlayLayers.Features.addLayer(layer);
    
    // Open edit popup for new feature
    if (typeof openEditPopup === 'function') {
      openEditPopup(layer);
    }
  });
}
