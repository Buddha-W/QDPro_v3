
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
// Global map variable
let map;

/**
 * Initialize the Leaflet map
 */
function initMap() {
  console.log("Initializing map...");
  
  // Create the map if it doesn't exist
  if (!window.map) {
    window.map = L.map('map').setView([40.7128, -74.0060], 5);
    
    // Add the base tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(window.map);
    
    console.log("Map initialized successfully");
  } else {
    console.log("Map already initialized");
  }
  
  // Store map in global variable
  map = window.map;
  
  // Return the map instance
  return map;
}

/**
 * Load saved project data onto the map
 */
function loadProject() {
  // Make sure map is initialized
  if (!window.map) {
    console.error("Map not initialized. Cannot load project.");
    return;
  }
  
  // Clear existing layers
  if (typeof window.clearLayers === 'function') {
    window.clearLayers();
  } else {
    // Fallback layer clearing if clearLayers is not available
    window.map.eachLayer(function(layer) {
      if (layer instanceof L.Polygon || 
          layer instanceof L.Polyline || 
          layer instanceof L.Marker) {
        window.map.removeLayer(layer);
      }
    });
  }

  // Load project data from localStorage
  const projectData = JSON.parse(localStorage.getItem("savedProject"));
  if (!projectData || !projectData.layers) {
    console.error("No valid project data found.");
    return;
  }

  // Add each layer to the map
  projectData.layers.forEach(layer => {
    if (!layer.coordinates || layer.coordinates.length === 0) {
      console.warn("Layer missing coordinates:", layer);
      return;
    }
    
    // Create the appropriate layer type
    let mapLayer;
    if (layer.type === "Marker") {
      mapLayer = L.marker(layer.coordinates[0]).addTo(window.map);
    } else if (layer.type === "Line") {
      mapLayer = L.polyline(layer.coordinates).addTo(window.map);
    } else {
      // Default to polygon
      mapLayer = L.polygon(layer.coordinates).addTo(window.map);
    }

    // Set feature properties
    mapLayer.feature = {
      type: "Feature",
      properties: {
        ...layer  // spread all properties
      }
    };

    // Add click handler to open feature editor
    mapLayer.on('click', function(e) {
      L.DomEvent.stopPropagation(e);
      
      // Stop event propagation to prevent map click
      if (e && e.originalEvent) {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
      }
      
      console.log("Layer clicked:", mapLayer.feature.properties.name);
      
      // Open feature editor - use window.openFeatureEditor to ensure global scope
      window.openFeatureEditor(mapLayer.feature.properties);
    });
  });

  console.log('Project loaded successfully with', projectData.layers.length, 'layers');
}

// Sample project data for testing
const sampleProjectData = {
  layers: [
    {
      name: "Polygon A",
      type: "Polygon",
      description: "Sample polygon A",
      coordinates: [
        [40.7128, -74.0060],
        [40.7228, -74.0160],
        [40.7328, -74.0060]
      ]
    },
    {
      name: "Polygon B",
      type: "Polygon",
      description: "Sample polygon B",
      coordinates: [
        [41.7128, -75.0060],
        [41.7228, -75.0160],
        [41.7328, -75.0060]
      ]
    }
  ]
};

// Make sure we have sample data for testing
function ensureSampleData() {
  if (!localStorage.getItem("savedProject")) {
    localStorage.setItem("savedProject", JSON.stringify(sampleProjectData));
    console.log("Sample project data created");
  }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Map initialization module loaded");
  
  // Initialize the map
  initMap();
  
  // Ensure we have sample data
  ensureSampleData();
  
  // Add edit button functionality if present
  const editButton = document.getElementById('editButton');
  if (editButton) {
    editButton.addEventListener('click', function() {
      if (typeof window.openFeatureEditor === 'function') {
        window.openFeatureEditor({
          name: "Test Feature",
          type: "Polygon", 
          description: "This is a test feature"
        });
      } else {
        console.error("openFeatureEditor function not found");
        alert("Cannot test editor: openFeatureEditor not loaded");
      }
    });
  }
  
  // Load project data after a short delay to ensure all scripts are loaded
  setTimeout(function() {
    loadProject();
  }, 300);
  
  // Make functions globally available
  window.initMap = initMap;
  window.loadProject = loadProject;
});
/**
 * Map Initialization Module
 * Handles map setup and layer management
 */

// Global map variable
let map;

/**
 * Initialize the map
 */
function initMap() {
  if (map) {
    console.log("Map already initialized");
    return;
  }
  
  // Create the map instance
  map = L.map('map', {
    center: [40.7128, -74.0060], // New York
    zoom: 5,
    zoomControl: true
  });
  
  // Add base tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  
  console.log("Map initialized successfully");
  return map;
}

/**
 * Clear all polygon layers but keep the base map
 */
function clearLayers() {
  if (!map) {
    console.error("Map is not initialized");
    return;
  }
  
  map.eachLayer(layer => {
    // Only remove polygons (leave the tile layer intact)
    if (layer instanceof L.Polygon) {
      map.removeLayer(layer);
    }
  });
  
  console.log("Layers cleared");
}

/**
 * Load project data from localStorage and add polygons with click handlers
 */
function loadProject() {
  if (!map) {
    console.error("Map is not initialized");
    return;
  }
  
  clearLayers();
  
  // Check if openFeatureEditor is defined
  if (typeof window.openFeatureEditor !== 'function') {
    console.error("openFeatureEditor function not found");
    alert("Error: Feature editor not loaded. Please refresh the page.");
    return;
  }
  
  try {
    const projectDataString = localStorage.getItem("savedProject");
    if (!projectDataString) {
      console.error("No project data found in localStorage");
      return;
    }
    
    const projectData = JSON.parse(projectDataString);
    if (!projectData || !projectData.layers || !Array.isArray(projectData.layers)) {
      console.error("Invalid project data format");
      return;
    }
    
    projectData.layers.forEach(layerData => {
      if (!layerData.coordinates || !Array.isArray(layerData.coordinates)) {
        console.error("Invalid coordinates for layer:", layerData.name);
        return;
      }
      
      const polygonLayer = L.polygon(layerData.coordinates).addTo(map);
      
      // Attach click handler using window.openFeatureEditor
      polygonLayer.on("click", function(e) {
        // Prevent map click from firing
        L.DomEvent.stopPropagation(e);
        
        // Call the global feature editor function
        window.openFeatureEditor(layerData);
      });
    });
    
    console.log("Project loaded successfully with", projectData.layers.length, "layers");
  } catch (error) {
    console.error("Error loading project:", error);
  }
}

// Sample project data for testing
const sampleProjectData = {
  layers: [
    {
      name: "Polygon A",
      type: "Facility",
      description: "A test polygon",
      coordinates: [
        [40.7128, -74.0060],
        [40.7228, -74.0160],
        [40.7328, -74.0060]
      ]
    },
    {
      name: "Polygon B",
      type: "Zone",
      description: "Another test polygon",
      coordinates: [
        [41.7128, -75.0060],
        [41.7228, -75.0160],
        [41.7328, -75.0060]
      ]
    }
  ]
};

function ensureSampleData() {
  if (!localStorage.getItem("savedProject")) {
    localStorage.setItem("savedProject", JSON.stringify(sampleProjectData));
    console.log("Sample project data created");
  }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log("Map initialization module loaded");
  
  // Initialize the map
  initMap();
  
  // Ensure we have sample data
  ensureSampleData();
  
  // Add edit button functionality if present
  const editButton = document.getElementById('editButton');
  if (editButton) {
    editButton.addEventListener('click', function() {
      if (typeof window.openFeatureEditor === 'function') {
        window.openFeatureEditor({
          name: "Test Feature",
          type: "Polygon", 
          description: "This is a test feature"
        });
      } else {
        console.error("openFeatureEditor function not found");
        alert("Cannot test editor: openFeatureEditor not loaded");
      }
    });
  }
  
  // Load project data after a short delay to ensure all scripts are loaded
  setTimeout(function() {
    loadProject();
  }, 300);
  
  // Make functions globally available
  window.initMap = initMap;
  window.loadProject = loadProject;
});
