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

  // Global event delegation for popup edit buttons
  // This catches all clicks on the entire document and handles edit buttons
  document.addEventListener('click', function(e) {
    // Check if the clicked element is an edit button in a popup
    if (e.target && (e.target.classList.contains('edit-properties-btn') || 
                    (e.target.parentElement && e.target.parentElement.classList.contains('edit-properties-btn')))) {
      console.log("Edit button clicked via global handler");
      e.preventDefault();
      e.stopPropagation();

      // Find the associated layer
      const popup = e.target.closest('.leaflet-popup');
      if (popup && popup._source) {
        const layer = popup._source;
        console.log("Found layer for edit button:", layer);

        // Store layer references in multiple places for redundant access
        window.activeEditingLayer = layer;
        window.lastClickedLayer = layer;
        
        // Mark edit button as clicked to prevent double-click issues
        e.target.setAttribute('data-clicked', 'true');
        
        // Force close all popups immediately
        if (window.map) {
          window.map.closePopup();
        }
        
        // Remove any lingering popup DOM elements
        document.querySelectorAll('.leaflet-popup').forEach(p => {
          p.remove();
        });

        // Handle the case where a modal is already open
        const existingModal = document.getElementById('featurePropertiesModal');
        if (existingModal && existingModal.style.display === 'block') {
          // If already open, close it first
          existingModal.style.display = 'none';
          
          // Clear all editing state
          if (window.QDProEditor) {
            window.QDProEditor.activeEditingLayer = null;
            window.QDProEditor.isEditorOpen = false;
          }
          
          // Use a minimal delay to ensure clean state
          setTimeout(() => {
            openEditorWithLayer(layer);
          }, 10);
        } else {
          // Immediately open if no modal is showing
          openEditorWithLayer(layer);
        }

        function openEditorWithLayer(layerObj) {
          console.log("Opening editor for layer:", layerObj);
          
          // Mark the layer as being edited to prevent needing double-clicks
          if (layerObj) {
            layerObj._editingActive = true;
          }
          
          // Ensure all popups are closed
          if (layerObj.closePopup) {
            layerObj.closePopup();
          }
          
          if (window.map) {
            window.map.closePopup();
          }
          
          // Remove all popup DOM elements
          document.querySelectorAll('.leaflet-popup').forEach(p => {
            p.remove();
          });
          
          // Store reference globally in multiple places
          window.activeEditingLayer = layerObj;
          window.lastClickedLayer = layerObj;
          
          // Reset any editor state that might prevent reopening
          if (window.QDProEditor) {
            window.QDProEditor.isEditorOpen = false;
          }
          
          // Use the first available editor function
          let editorOpened = false;
          
          // First try the QDProEditor
          if (window.QDProEditor && typeof window.QDProEditor.openFeatureEditor === 'function') {
            try {
              window.QDProEditor.openFeatureEditor(layerObj);
              editorOpened = true;
              console.log("Editor opened via QDProEditor");
            } catch (e) {
              console.error("Error opening via QDProEditor:", e);
            }
          }
          
          // If that failed, try the global function
          if (!editorOpened && typeof window.openFeatureEditor === 'function') {
            try {
              window.openFeatureEditor(layerObj);
              editorOpened = true;
              console.log("Editor opened via global openFeatureEditor");
            } catch (e) {
              console.error("Error opening via global function:", e);
            }
          }
          
          // Final fallback
          if (!editorOpened) {
            console.error("All editor functions failed - critical error");
            console.log("Available window functions:", Object.keys(window).filter(k => typeof window[k] === 'function'));
            alert("Critical error: Editor function not found. Please refresh the page and try again.");
          }
        }
      }
      return false;
    }
  });
});

// Make initMap available globally
window.initMap = initMap;

// Make a global function to force open the editor from any context
window.forceOpenEditor = function(element) {
  console.log("Global force open editor called");
  
  // Get the current active layer from globals
  const layer = window.lastClickedLayer;
  
  if (!layer) {
    console.error("No layer available to edit!");
    return;
  }
  
  // Close any open popups
  if (window.map) {
    window.map.closePopup();
  }
  
  // Reset QDProEditor state if it exists
  if (window.QDProEditor) {
    window.QDProEditor.isEditorOpen = false;
  }
  
  // Use a short delay to ensure clean state
  setTimeout(function() {
    console.log("Force opening editor for layer:", layer._leaflet_id);
    
    // Try QDProEditor first
    if (window.QDProEditor && typeof window.QDProEditor.openFeatureEditor === 'function') {
      window.QDProEditor.openFeatureEditor(layer);
    } 
    // Fall back to global function
    else if (typeof window.openFeatureEditor === 'function') {
      window.openFeatureEditor(layer);
    }
  }, 50);
};

// Make sure openFeatureEditor is available globally
if (typeof window.openFeatureEditor !== 'function') {
  window.openFeatureEditor = function(layer) {
    console.log("Opening feature editor from map-initialize.js");
    if (typeof window.activeEditingLayer !== 'undefined') {
      window.activeEditingLayer = layer;
    }

    // Get the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (!modal) {
      console.error("Feature properties modal not found");
      return;
    }

    // Get properties from the layer
    const properties = layer.feature ? layer.feature.properties : {};

    // Fill in the form fields
    document.getElementById('name').value = properties.name || '';
    document.getElementById('type').value = properties.type || 'Building';
    document.getElementById('description').value = properties.description || '';

    if (document.getElementById('is_facility')) {
      document.getElementById('is_facility').checked = properties.is_facility || false;
    }

    if (document.getElementById('has_explosive')) {
      document.getElementById('has_explosive').checked = properties.has_explosive || false;
    }

    // Show/hide explosive section based on checkbox
    const explosiveSection = document.getElementById('explosiveSection');
    if (explosiveSection) {
      explosiveSection.style.display = properties.has_explosive ? 'block' : 'none';

      if (document.getElementById('net_explosive_weight')) {
        document.getElementById('net_explosive_weight').value = properties.net_explosive_weight || '';
      }
    }

    // Display the modal
    modal.style.display = 'block';
  };
}