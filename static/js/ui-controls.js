/**
 * UI Controls Script for QDPro
 *
 * This version expects:
 *  - A backend route /api/locations that returns JSON like:
 *        { "locations": [ { "id":1, "name":"Facility A", ...}, ... ] }
 *  - HTML elements with IDs for menus, modals, and map container
 *  - Leaflet map in window.map
 *  - FeatureGroup in window.drawnItems (optional)
 */

// MAIN entry point once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Document loaded, setting up UI controls...");

  // Wait for map to be initialized before setting up UI
  if (window.map) {
    initializeUIControls();
  } else {
    // Listen for map-initialized event
    document.addEventListener('map-initialized', function() {
      console.log("Map initialized event detected, initializing UI");
      initializeUIControls();
    });

    // Fallback: Check periodically if map exists
    const checkInterval = setInterval(function() {
      if (window.map) {
        console.log("Map detected through interval check");
        clearInterval(checkInterval);
        initializeUIControls();
      }
    }, 500);

    // Stop checking after 10 seconds to prevent infinite checks
    setTimeout(function() {
      clearInterval(checkInterval);
    }, 10000);
  }
});

// ================ MAIN INITIALIZATION ================
function initializeUIControls() {
  console.log("initializeUIControls called");

  // Make sure the map is available
  if (!window.map) {
    console.warn("Map not available yet, UI controls initialization deferred");
    return;
  }

  console.log("Setting up UI with map:", window.map);

  try {
    setupToolButtons();
    setupDirectButtonHandlers();
    setupMenuItems();
    setupSidePanelToggle();

    // Initialize layer selection dropdown
    if (typeof updateDrawToLayerSelect === 'function') {
      updateDrawToLayerSelect();
    } else {
      console.warn("updateDrawToLayerSelect function not found");
    }

    console.log("UI setup complete");
  } catch (err) {
    console.error("Error during UI setup:", err);
  }
}

// ================ DRAW TOOL BUTTONS ================
function setupToolButtons() {
  try {
    console.log("Setting up tool buttons");

    const toolButtons = {
      drawMarker: { drawType: 'marker', icon: 'fa-map-marker-alt' },
      drawPolygon: { drawType: 'polygon', icon: 'fa-draw-polygon' },
      drawRectangle: { drawType: 'rectangle', icon: 'fa-square' },
      drawCircle: { drawType: 'circle', icon: 'fa-circle' },
      drawPolyline: { drawType: 'polyline', icon: 'fa-minus' }
    };

    // Handle draw tool button clicks
    Object.keys(toolButtons).forEach(buttonId => {
      const button = document.getElementById(buttonId);
      if (button) {
        button.addEventListener('click', function() {
          activateDrawTool(toolButtons[buttonId].drawType);
        });
      } else {
        console.warn(`Button ${buttonId} not found in DOM`);
      }
    });
  } catch (err) {
    console.error("Error setting up tool buttons:", err);
  }
}

// Activate a specific draw tool
function activateDrawTool(drawType) {
  try {
    console.log(`Activating draw tool: ${drawType}`);

    // Deactivate any active draw handlers
    if (window.map && window.activeDrawHandler) {
      window.map.removeLayer(window.activeDrawHandler);
      window.activeDrawHandler = null;
    }

    // If we have the Leaflet.Draw plugin
    if (window.L && window.L.Draw) {
      // Get the currently selected layer
      const layerSelect = document.getElementById('drawToLayer');
      const selectedLayerId = layerSelect ? layerSelect.value : null;
      let targetLayer = window.overlayLayers?.Features;

      // Create appropriate draw handler
      let drawHandler;
      const drawOptions = {
        shapeOptions: {
          color: '#3388ff',
          weight: 3
        }
      };

      switch(drawType) {
        case 'marker':
          drawHandler = new L.Draw.Marker(window.map);
          break;
        case 'polygon':
          drawHandler = new L.Draw.Polygon(window.map, drawOptions);
          break;
        case 'rectangle':
          drawHandler = new L.Draw.Rectangle(window.map, drawOptions);
          break;
        case 'circle':
          drawHandler = new L.Draw.Circle(window.map, drawOptions);
          break;
        case 'polyline':
          drawHandler = new L.Draw.Polyline(window.map, drawOptions);
          break;
      }

      if (drawHandler) {
        drawHandler.enable();
        window.activeDrawHandler = drawHandler;
      }
    } else {
      console.error("Leaflet.Draw plugin not available");
    }
  } catch (err) {
    console.error("Error activating draw tool:", err);
  }
}

// ================ DIRECT BUTTON HANDLERS ================
function setupDirectButtonHandlers() {
  try {
    console.log("Setting up direct button handlers");

    // Add layer button
    const addLayerButton = document.querySelector('button[onclick="showAddLayerModal()"]');
    if (addLayerButton) {
      // Remove inline onclick handler and add proper event listener
      addLayerButton.removeAttribute('onclick');
      addLayerButton.addEventListener('click', function() {
        showAddLayerModal();
      });
    }

    // Setup add layer modal functionality
    if (typeof showAddLayerModal !== 'function') {
      window.showAddLayerModal = function() {
        console.log("Showing add layer modal");
        const modal = document.getElementById('addLayerModal');
        if (modal) {
          modal.style.display = 'block';
        } else {
          console.warn("Add layer modal not found");
        }
      };
    }

    // Setup layer selection
    const layerSelect = document.getElementById('drawToLayer');
    if (layerSelect) {
      layerSelect.addEventListener('change', function() {
        console.log("Layer selection changed to:", this.value);
      });
    }

    // Define updateDrawToLayerSelect if it doesn't exist
    if (typeof updateDrawToLayerSelect !== 'function') {
      window.updateDrawToLayerSelect = function() {
        const select = document.getElementById('drawToLayer');
        if (!select) return;

        // Clear existing options
        select.innerHTML = '';

        // Add default feature layer
        const defaultOption = document.createElement('option');
        defaultOption.value = 'features';
        defaultOption.textContent = 'Features';
        select.appendChild(defaultOption);

        // Add any custom layers
        if (window.customLayers) {
          Object.keys(window.customLayers).forEach(layerId => {
            const option = document.createElement('option');
            option.value = layerId;
            option.textContent = layerId;
            select.appendChild(option);
          });
        }
      };

      // Initialize it
      updateDrawToLayerSelect();
    }
  } catch (err) {
    console.error("Error setting up direct button handlers:", err);
  }
}

// ================ MENU ITEMS ================
function setupMenuItems() {
  try {
    console.log("Setting up menu items");

    // File menu items
    const fileMenuItems = {
      'fileNew': showNewLocationModal,
      'fileOpen': showOpenLocationModal,
      'fileSave': saveCurrentLocation,
      'fileExport': showExportModal,
      'fileImport': showImportModal
    };

    Object.keys(fileMenuItems).forEach(itemId => {
      const menuItem = document.getElementById(itemId);
      if (menuItem) {
        menuItem.addEventListener('click', fileMenuItems[itemId]);
      }
    });

    // Define functions for menu items if they don't exist
    if (typeof showNewLocationModal !== 'function') {
      window.showNewLocationModal = function() {
        console.log("Showing new location modal");
        const modal = document.getElementById('newLocationModal');
        if (modal) modal.style.display = 'block';
      };
    }

    if (typeof showOpenLocationModal !== 'function') {
      window.showOpenLocationModal = function() {
        console.log("Showing open location modal");
        const modal = document.getElementById('openLocationModal');
        if (modal) modal.style.display = 'block';
      };
    }

    if (typeof saveCurrentLocation !== 'function') {
      window.saveCurrentLocation = function() {
        console.log("Saving current location");
        // Implement save functionality
      };
    }

    if (typeof showExportModal !== 'function') {
      window.showExportModal = function() {
        console.log("Showing export modal");
        const modal = document.getElementById('exportModal');
        if (modal) modal.style.display = 'block';
      };
    }

    if (typeof showImportModal !== 'function') {
      window.showImportModal = function() {
        console.log("Showing import modal");
        const modal = document.getElementById('importModal');
        if (modal) modal.style.display = 'block';
      };
    }
  } catch (err) {
    console.error("Error setting up menu items:", err);
  }
}

// ================ SIDE PANEL TOGGLE ================
function setupSidePanelToggle() {
  try {
    console.log("Setting up side panel toggle");

    const toggleButton = document.getElementById('toggleLeftPanel');
    if (toggleButton) {
      toggleButton.addEventListener('click', function() {
        const leftPanel = document.getElementById('leftPanel');
        if (leftPanel) {
          const isVisible = leftPanel.style.display !== 'none';
          leftPanel.style.display = isVisible ? 'none' : 'block';
          this.textContent = isVisible ? '☰' : '✕';
        }
      });
    }
  } catch (err) {
    console.error("Error setting up side panel toggle:", err);
  }
}

// Close modals when clicking outside or on close button
document.addEventListener('click', function(event) {
  if (event.target.classList.contains('modal-overlay')) {
    event.target.style.display = 'none';
  }
});

// Close buttons for modals
document.querySelectorAll('.close-modal').forEach(button => {
  button.addEventListener('click', function() {
    const modal = this.closest('.modal-overlay');
    if (modal) modal.style.display = 'none';
  });
});

// ================ FETCHING LOCATIONS ================
async function fetchLocations() {
  try {
    const response = await fetch('/api/locations');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    // The route returns { "locations": [...] }
    const data = await response.json();
    // Make sure it's an array
    if (!data || !Array.isArray(data.locations)) {
      console.warn("locations is not an array or missing from response:", data);
      return [];
    }
    return data.locations;
  } catch (error) {
    console.error('Error fetching locations:', error);
    return [];
  }
}

// ================ POPULATE LOCATIONS LIST ================
function populateLocationsList(locations) {
  const locationList = document.getElementById('location-list');
  if (!locationList) {
    console.warn("No element with id='location-list' to populate");
    return;
  }

  locationList.innerHTML = '';

  if (locations.length === 0) {
    locationList.innerHTML = '<p>No saved locations found.</p>';
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Name</th>
      <th>Created</th>
      <th>Actions</th>
    </tr>
  `;

  const tbody = document.createElement('tbody');

  locations.forEach(location => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${location.name}</td>
      <td>${new Date(location.created_at).toLocaleString()}</td>
      <td>
        <button class="load-location-btn" data-id="${location.id}">Load</button>
      </td>
    `;
    tbody.appendChild(row);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  locationList.appendChild(table);

  // Add event listeners to load buttons
  document.querySelectorAll('.load-location-btn').forEach(button => {
    button.addEventListener('click', function() {
      const locationId = this.getAttribute('data-id');
      loadLocation(locationId);
      const openLocationModal = document.getElementById('open-location-modal');
      if (openLocationModal) {
        openLocationModal.style.display = 'none';
      }
    });
  });
}

// ================ LOAD A LOCATION BY ID ================
async function loadLocation(locationId) {
  try {
    const response = await fetch(`/api/load_location/${locationId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log("Loaded location data:", data);

    // If there's a geojson property, we can parse and add it
    if (window.drawnItems) {
      window.drawnItems.clearLayers();
    }

    // If your backend returns a 'geojson' field:
    if (data.geojson) {
      const geoJSONLayer = L.geoJSON(data.geojson, {
        onEachFeature: function(feature, layer) {
          // Attach popup or other info
          if (feature.properties) {
            layer.bindPopup(createPopupContent(feature.properties));
          }
          // Add to drawnItems if it exists
          if (window.drawnItems) {
            window.drawnItems.addLayer(layer);
          }
        }
      });

      if (window.map) {
        geoJSONLayer.addTo(window.map);
      }
    }

    alert(`Location "${data.location_name || data.name || locationId}" loaded successfully!`);
  } catch (error) {
    console.error('Error loading location:', error);
    alert('Failed to load location. Please try again.');
  }
}

// ================ CREATE POPUP CONTENT ================
function createPopupContent(properties) {
  let content = '<div class="feature-popup">';

  if (properties.name) {
    content += `<h4>${properties.name}</h4>`;
  }
  if (properties.type) {
    content += `<p><strong>Type:</strong> ${properties.type}</p>`;
  }
  if (properties.description) {
    content += `<p>${properties.description}</p>`;
  }

  content += `<button class="popup-edit-btn">Edit</button>`;
  content += '</div>';

  return content;
}

// ================ OPTIONAL EDIT POPUP ================
function openEditPopup(layer) {
  // Implementation for editing a shape's properties
  console.warn("openEditPopup not fully implemented in this snippet");
}

// ================ FILE UPLOAD (OPTIONAL) ================
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
});

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      loadGeoJSONData(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      alert('Invalid file format. Please upload a valid GeoJSON file.');
    }
  };
  reader.readAsText(file);
}

function loadGeoJSONData(data) {
  if (!window.map || !window.drawnItems) {
    console.error("Map or drawnItems not initialized");
    return;
  }

  // Clear existing layers
  window.drawnItems.clearLayers();

  // Add layers from GeoJSON
  L.geoJSON(data, {
    onEachFeature: function(feature, layer) {
      window.drawnItems.addLayer(layer);
    }
  });

  // Fit map to features
  if (window.drawnItems.getLayers().length > 0) {
    window.map.fitBounds(window.drawnItems.getBounds());
  }
}

// Event handler for window load
window.addEventListener('load', function() {
  console.log("Window loaded, initializing UI controls");
  initializeUIControls();
});


// Export this module's functions
window.UI = {
  initializeUIControls,
  setupToolButtons,
  activateDrawTool,
  showNewLocationModal: window.showNewLocationModal,
  showOpenLocationModal: window.showOpenLocationModal,
  saveCurrentLocation: window.saveCurrentLocation,
  showExportModal: window.showExportModal,
  showImportModal: window.showImportModal,
  fetchLocations,
  populateLocationsList,
  loadLocation,
  createPopupContent,
  handleFileUpload,
  loadGeoJSONData
};