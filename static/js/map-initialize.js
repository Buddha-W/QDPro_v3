// Global map variable (accessible through window.map)
let map;

/**
 * Initialize the Leaflet map
 */
function initMap() {
  console.log("Initializing map...");

  // Create the map and set initial view
  map = L.map('map').setView([40.7128, -74.0060], 5);

  // Add the base tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Make the map globally accessible
  window.map = map;

  console.log("Map initialized successfully");

  // After map is initialized, try to load any saved project
  loadSavedProject();
}

/**
 * Load a saved project from localStorage
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