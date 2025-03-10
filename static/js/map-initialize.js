
/**
 * Map Initialization Module
 * Handles map creation and initial setup
 */

// Global map variable
let map;

/**
 * Initialize the Leaflet map
 */
function initMap() {
  console.log('Initializing map...');
  
  // Create the map only if it doesn't exist and the container exists
  if (!map && document.getElementById('map')) {
    // Default view centered on US
    map = L.map('map').setView([39.8283, -98.5795], 4);
    
    // Add the OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(map);
    
    // Make map available globally
    window.map = map;
    
    console.log('Map initialized successfully');
    
    // Initialize the feature editor with the map
    if (typeof initFeatureEditor === 'function') {
      initFeatureEditor(map);
    }
    
    // Load saved project if available
    loadSavedProject();
  } else if (map) {
    console.log('Map already initialized');
  } else {
    console.error('Map container not found in DOM');
  }
}

/**
 * Load saved project from localStorage
 */
function loadSavedProject() {
  try {
    const savedProject = localStorage.getItem('savedProject');
    if (savedProject) {
      const projectData = JSON.parse(savedProject);
      console.log('Found saved project in localStorage');
      
      // Use the loadProject function from feature-editor.js
      if (typeof window.loadProject === 'function') {
        window.loadProject(projectData);
      } else {
        console.error('loadProject function not available');
      }
    } else {
      console.log('No saved project found in localStorage');
    }
  } catch (e) {
    console.error('Error loading saved project:', e);
  }
}

// Initialize map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initialization script loaded');
  
  // Initialize the map
  initMap();
  
  // Add resize handler to ensure map displays correctly
  window.addEventListener('resize', function() {
    if (map) {
      map.invalidateSize();
    }
  });
});

// Make initMap available globally
window.initMap = initMap;
