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
  initializeUIControls();
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

  setupToolButtons();
  setupDirectButtonHandlers();
  setupMenuItems();
  setupSidePanelToggle();

  console.log("UI setup complete");
}

// ================ DRAW TOOL BUTTONS ================
function setupToolButtons() {
  console.log("Setting up tool buttons...");

  // .draw-tool are your polygon/rectangle/etc. buttons
  const toolButtons = document.querySelectorAll('.draw-tool');
  console.log(`Found ${toolButtons.length} tool buttons`);

  toolButtons.forEach(button => {
    button.addEventListener('click', function() {
      const toolType = this.getAttribute('data-tool');
      activateDrawTool(toolType);
    });
  });
}

// Activates the chosen Leaflet.Draw tool
function activateDrawTool(toolType) {
  if (!window.map) {
    console.error("Map not initialized, cannot activate drawing tool");
    return;
  }

  // Deactivate all other drawing tools first
  deactivateAllDrawTools();

  // If drawControl is set up, use its handlers
  if (!window.drawControl || !window.drawControl._toolbars) {
    console.warn("No drawControl found, cannot activate draw tool");
    return;
  }

  const drawToolbars = window.drawControl._toolbars;

  switch(toolType) {
    case 'polygon':
      if (drawToolbars.draw && drawToolbars.draw._modes && drawToolbars.draw._modes.polygon && drawToolbars.draw._modes.polygon.handler) {
        drawToolbars.draw._modes.polygon.handler.enable();
      }
      break;
    case 'rectangle':
      if (drawToolbars.draw && drawToolbars.draw._modes && drawToolbars.draw._modes.rectangle && drawToolbars.draw._modes.rectangle.handler) {
        drawToolbars.draw._modes.rectangle.handler.enable();
      }
      break;
    case 'circle':
      if (drawToolbars.draw && drawToolbars.draw._modes && drawToolbars.draw._modes.circle && drawToolbars.draw._modes.circle.handler) {
        drawToolbars.draw._modes.circle.handler.enable();
      }
      break;
    case 'marker':
      if (drawToolbars.draw && drawToolbars.draw._modes && drawToolbars.draw._modes.marker && drawToolbars.draw._modes.marker.handler) {
        drawToolbars.draw._modes.marker.handler.enable();
      }
      break;
    case 'edit':
      if (drawToolbars.edit && drawToolbars.edit._modes && drawToolbars.edit._modes.edit && drawToolbars.edit._modes.edit.handler) {
        drawToolbars.edit._modes.edit.handler.enable();
      }
      break;
    case 'delete':
      if (drawToolbars.edit && drawToolbars.edit._modes && drawToolbars.edit._modes.remove && drawToolbars.edit._modes.remove.handler) {
        drawToolbars.edit._modes.remove.handler.enable();
      }
      break;
    default:
      console.warn(`Draw tool type '${toolType}' not recognized`);
  }
}

// Deactivate all Leaflet draw/edit/remove tools
function deactivateAllDrawTools() {
  if (!window.drawControl || !window.drawControl._toolbars) {
    return;
  }
  const drawToolbars = window.drawControl._toolbars;
  // Disable draw tools
  if (drawToolbars.draw) {
    Object.keys(drawToolbars.draw._modes || {}).forEach(mode => {
      if (drawToolbars.draw._modes[mode] && drawToolbars.draw._modes[mode].handler) {
        drawToolbars.draw._modes[mode].handler.disable();
      }
    });
  }
  // Disable edit tools
  if (drawToolbars.edit) {
    Object.keys(drawToolbars.edit._modes || {}).forEach(mode => {
      if (drawToolbars.edit._modes[mode] && drawToolbars.edit._modes[mode].handler) {
        drawToolbars.edit._modes[mode].handler.disable();
      }
    });
  }
}

// ================ DIRECT BUTTON HANDLERS ================
function setupDirectButtonHandlers() {
  console.log("Setting up direct button handlers...");

  // File Menu - Open Location button
  const openLocationBtn = document.getElementById('open-location-btn');
  if (openLocationBtn) {
    openLocationBtn.addEventListener('click', function() {
      showOpenLocationModal();
    });
  }

  // File Menu - Save Location button
  const saveLocationBtn = document.getElementById('save-location-btn');
  if (saveLocationBtn) {
    saveLocationBtn.addEventListener('click', function() {
      showSaveLocationModal();
    });
  }

  // File Menu - New Location button
  const newLocationBtn = document.getElementById('new-location-btn');
  if (newLocationBtn) {
    newLocationBtn.addEventListener('click', function() {
      showNewLocationModal();
    });
  }
}

// ================ MENU ITEMS ================
function setupMenuItems() {
  console.log("Setting up menu items...");

  const dropdownItems = document.querySelectorAll('.dropdown-item');
  console.log(`Found ${dropdownItems.length} dropdown items`);

  dropdownItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const action = this.getAttribute('data-action');
      handleMenuAction(action);
    });
  });
}

// Decide what to do for each menu action
function handleMenuAction(action) {
  switch(action) {
    case 'new-location':
      showNewLocationModal();
      break;
    case 'open-location':
      showOpenLocationModal();
      break;
    case 'save-location':
      showSaveLocationModal();
      break;
    case 'export-report':
      showExportModal();
      break;
    default:
      console.log(`Menu action '${action}' not implemented`);
  }
}

// ================ SIDE PANEL TOGGLE ================
function setupSidePanelToggle() {
  console.log("Setting up side panel toggle...");

  const toggleBtn = document.getElementById('toggle-panel');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      const sidePanel = document.getElementById('side-panel');
      const mapContainer = document.getElementById('map-container');

      if (sidePanel) {
        sidePanel.classList.toggle('collapsed');
      }

      if (mapContainer) {
        mapContainer.classList.toggle('expanded');
      }

      // Force map to resize
      if (window.map) {
        window.map.invalidateSize();
      }
    });
  }
}

// ================ MODALS: New/Open/Save/Export ================
function showNewLocationModal() {
  const modal = document.getElementById('new-location-modal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    alert('New Location feature is not yet implemented');
  }
}

function showOpenLocationModal() {
  const modal = document.getElementById('open-location-modal');
  if (modal) {
    // Fetch the list of available locations from /api/locations
    fetchLocations()
      .then(locationsArray => {
        populateLocationsList(locationsArray);
        modal.style.display = 'block';
      })
      .catch(error => {
        console.error('Error fetching locations:', error);
        alert('Failed to load locations. Please try again.');
      });
  } else {
    alert('Open Location feature is not yet implemented');
  }
}

function showSaveLocationModal() {
  const modal = document.getElementById('save-location-modal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    alert('Save Location feature is not yet implemented');
  }
}

function showExportModal() {
  alert("Export feature not yet implemented.");
}

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