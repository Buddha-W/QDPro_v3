function setupToolButtons() {
    console.log("Setting up tool buttons...");
    const toolButtons = document.querySelectorAll('.toolbar-button[data-tool]');
    console.log(`Found ${toolButtons.length} tool buttons`);

    toolButtons.forEach(button => {
        button.addEventListener('click', function() {
            const toolName = this.getAttribute('data-tool');
            if (typeof window.activateTool === 'function') {
                window.activateTool(toolName);
            } else {
                console.warn(`Tool activation function not available for: ${toolName}`);
            }

            // Deactivate all buttons first
            toolButtons.forEach(btn => btn.classList.remove('active'));

            // Then activate the clicked one
            this.classList.add('active');
        });
    });
}

function initializeUIControls() {
    console.log("initializeUIControls called");

    if (!ensureMapInitialized()) {
        console.error("Map initialization failed, aborting UI controls setup");
        return;
    }

    console.log("Setting up UI with map:", window.map);
    setupToolButtons();


    // ... (rest of initializeUIControls function, if any) ...

    const layerControlButtons = document.querySelectorAll('.layer-control-button');
    layerControlButtons.forEach(button => {
        const layerId = button.getAttribute('data-layer');
        let layer = window.getLayer(layerId); //Assumed function exists

        // Check if map exists and the layer is already added to map
        if (window.map && typeof window.map.hasLayer === 'function' && window.map.hasLayer(layer)) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => {
            if (window.map) {
                if (window.map.hasLayer(layer)) {
                    window.map.removeLayer(layer);
                    button.classList.remove('active');
                } else {
                    window.map.addLayer(layer);
                    button.classList.add('active');
                }
            } else {
                console.error("Map not initialized. Cannot add/remove layer.");
            }
        });
    });
}


// Placeholder for ensureMapInitialized -  replace with actual implementation
function ensureMapInitialized() {
    // Add your map initialization logic here.  This should ensure window.map is properly set.
    // Example:  Check if map is already initialized, or initialize it if not
    if (window.map) return true; //map already exists

    //Attempt to initialize the map
    try{
        //Your map initialization code here
        window.map = L.map('map').setView([51.505, -0.09], 13); //Example
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(window.map);

        return true;

    } catch(e){
        console.error("Map initialization failed:",e);
        return false;
    }
}
// UI Controls Script for QDPro
console.log("Document loaded, setting up UI controls...");

window.addEventListener('load', function() {
  console.log("Window loaded, initializing UI controls");
  initializeUIControls();
});

// Main UI initialization function
function initializeUIControls() {
  console.log("initializeUIControls called");
  
  // Only proceed if map is available
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

// Setup tool buttons (polygon, rectangle, etc.)
function setupToolButtons() {
  console.log("Setting up tool buttons...");
  
  const toolButtons = document.querySelectorAll('.draw-tool');
  console.log(`Found ${toolButtons.length} tool buttons`);
  
  toolButtons.forEach(button => {
    button.addEventListener('click', function() {
      const toolType = this.getAttribute('data-tool');
      activateDrawTool(toolType);
    });
  });
}

// Setup direct button handlers (save, load, etc.)
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

// Setup dropdown menu items
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

// Setup side panel toggle
function setupSidePanelToggle() {
  console.log("Setting up side panel toggle...");
  
  const toggleBtn = document.getElementById('toggle-panel');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function() {
      document.getElementById('side-panel').classList.toggle('collapsed');
      document.getElementById('map-container').classList.toggle('expanded');
      // Trigger map resize to handle the container size change
      if (window.map) {
        window.map.invalidateSize();
      }
    });
  }
}

// Handle menu actions
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

// Show modal for creating a new location
function showNewLocationModal() {
  const modal = document.getElementById('new-location-modal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    alert('New Location feature is not yet implemented');
  }
}

// Show modal for opening an existing location
function showOpenLocationModal() {
  const modal = document.getElementById('open-location-modal');
  if (modal) {
    fetchLocations()
      .then(locations => {
        populateLocationsList(locations);
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

// Fetch available locations from the server
async function fetchLocations() {
  try {
    const response = await fetch('/api/locations');
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching locations:', error);
    throw error;
  }
}

// Populate the locations list in the open modal
function populateLocationsList(locations) {
  const locationList = document.getElementById('location-list');
  if (!locationList) return;

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
      document.getElementById('open-location-modal').style.display = 'none';
    });
  });
}

// Load a location by ID
async function loadLocation(locationId) {
  try {
    const response = await fetch(`/api/load_location/${locationId}`);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    
    const data = await response.json();
    
    // Clear existing layers
    if (window.drawnItems) {
      window.drawnItems.clearLayers();
    }
    
    // Add new layers from loaded data
    if (data.geojson) {
      const geoJsonLayer = L.geoJSON(data.geojson, {
        onEachFeature: function(feature, layer) {
          if (feature.properties) {
            layer.bindPopup(createPopupContent(feature.properties));
            
            // Attach properties to layer for later use
            layer.feature = feature;
            
            if (window.drawnItems) {
              window.drawnItems.addLayer(layer);
            }
          }
        }
      });
    }
    
    alert(`Location "${data.name}" loaded successfully!`);
    
  } catch (error) {
    console.error('Error loading location:', error);
    alert('Failed to load location. Please try again.');
  }
}

// Show modal for saving the current location
function showSaveLocationModal() {
  const modal = document.getElementById('save-location-modal');
  if (modal) {
    modal.style.display = 'block';
  } else {
    alert('Save Location feature is not yet implemented');
  }
}

// Create popup content from feature properties
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

// Activate a drawing tool
function activateDrawTool(toolType) {
  if (!window.map) {
    console.error("Map not initialized, cannot activate drawing tool");
    return;
  }
  
  // Deactivate all other drawing tools first
  deactivateAllDrawTools();
  
  // Activate the selected tool
  switch(toolType) {
    case 'polygon':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.draw) {
        window.drawControl._toolbars.draw._modes.polygon.handler.enable();
      }
      break;
    case 'rectangle':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.draw) {
        window.drawControl._toolbars.draw._modes.rectangle.handler.enable();
      }
      break;
    case 'circle':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.draw) {
        window.drawControl._toolbars.draw._modes.circle.handler.enable();
      }
      break;
    case 'marker':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.draw) {
        window.drawControl._toolbars.draw._modes.marker.handler.enable();
      }
      break;
    case 'edit':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.edit) {
        window.drawControl._toolbars.edit._modes.edit.handler.enable();
      }
      break;
    case 'delete':
      if (window.drawControl && window.drawControl._toolbars && window.drawControl._toolbars.edit) {
        window.drawControl._toolbars.edit._modes.remove.handler.enable();
      }
      break;
    default:
      console.warn(`Draw tool type '${toolType}' not recognized`);
  }
}

// Deactivate all drawing tools
function deactivateAllDrawTools() {
  if (!window.drawControl || !window.drawControl._toolbars) {
    return;
  }
  
  // Disable draw tools
  if (window.drawControl._toolbars.draw) {
    Object.keys(window.drawControl._toolbars.draw._modes).forEach(mode => {
      if (window.drawControl._toolbars.draw._modes[mode].handler) {
        window.drawControl._toolbars.draw._modes[mode].handler.disable();
      }
    });
  }
  
  // Disable edit tools
  if (window.drawControl._toolbars.edit) {
    Object.keys(window.drawControl._toolbars.edit._modes).forEach(mode => {
      if (window.drawControl._toolbars.edit._modes[mode].handler) {
        window.drawControl._toolbars.edit._modes[mode].handler.disable();
      }
    });
  }
}

// Initialize file operations
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
});

// Handle file upload
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

// Load GeoJSON data into the map
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
  
  // Fit the map to the loaded features
  if (window.drawnItems.getLayers().length > 0) {
    window.map.fitBounds(window.drawnItems.getBounds());
  }
}

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
  // Create form content for the popup
  const properties = layer.feature && layer.feature.properties ? layer.feature.properties : {};
  
  let formContent = `
    <div class="edit-popup">
      <h3>Edit Feature Properties</h3>
      <form id="feature-edit-form">
        <div class="form-group">
          <label for="feature-name">Name:</label>
          <input type="text" id="feature-name" value="${properties.name || ''}">
        </div>
        <div class="form-group">
          <label for="feature-type">Type:</label>
          <select id="feature-type">
            <option value="PES" ${properties.type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
            <option value="ES" ${properties.type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
            <option value="Other" ${properties.type === 'Other' ? 'selected' : ''}>Other</option>
          </select>
        </div>
        <div class="form-group">
          <label for="feature-description">Description:</label>
          <textarea id="feature-description">${properties.description || ''}</textarea>
        </div>
        <div class="form-buttons">
          <button type="button" id="save-feature">Save</button>
          <button type="button" id="cancel-edit">Cancel</button>
        </div>
      </form>
    </div>
  `;
  
  // Create and open a popup
  const popup = L.popup()
    .setLatLng(layer.getCenter ? layer.getCenter() : layer.getLatLng())
    .setContent(formContent)
    .openOn(window.map);
  
  // Add event listeners to the form buttons
  setTimeout(() => {
    document.getElementById('save-feature').addEventListener('click', function() {
      const name = document.getElementById('feature-name').value;
      const type = document.getElementById('feature-type').value;
      const description = document.getElementById('feature-description').value;
      
      // Update the layer's feature properties
      if (!layer.feature) {
        layer.feature = { properties: {} };
      }
      
      layer.feature.properties = {
        ...layer.feature.properties,
        name,
        type,
        description
      };
      
      // Update the popup content
      layer.bindPopup(createPopupContent(layer.feature.properties));
      
      // Close the edit popup
      window.map.closePopup();
    });
    
    document.getElementById('cancel-edit').addEventListener('click', function() {
      window.map.closePopup();
    });
  }, 100);
}
