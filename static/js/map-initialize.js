
// QDPro Map Initialization 
// Handles core map functionality

// Initialize the map when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Map initializer loaded');
  initializeMap();
});

function initializeMap() {
  // Check if map container exists
  const mapContainer = document.getElementById('map');
  if (!mapContainer) {
    console.error('Map container not found');
    return;
  }

  // Create the map if it doesn't exist
  if (!window.map) {
    console.log('Creating new map instance');
    window.map = L.map('map', {
      center: [39.8283, -98.5795], // Default to center of US
      zoom: 5,
      layers: []
    });

    // Add base layers
    const streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    });
    
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
      maxZoom: 19
    });
    
    const baseLayers = {
      "Streets": streets,
      "Satellite": satellite
    };
    
    // Add the default layer
    streets.addTo(window.map);
    
    // Set up layer control
    window.layerControl = L.control.layers(baseLayers, {}, {
      position: 'topright',
      collapsed: false
    }).addTo(window.map);
    
    // Initialize the feature group to store editable layers
    window.drawnItems = new L.FeatureGroup();
    window.map.addLayer(window.drawnItems);
    
    // Initialize draw controls
    window.drawControl = new L.Control.Draw({
      edit: {
        featureGroup: window.drawnItems,
        poly: {
          allowIntersection: false
        }
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true
        },
        polyline: true,
        rectangle: true,
        circle: true,
        marker: true,
        circlemarker: false
      }
    });
    window.map.addControl(window.drawControl);
    
    // Set up event handlers for draw events
    window.map.on(L.Draw.Event.CREATED, function(event) {
      const layer = event.layer;
      window.drawnItems.addLayer(layer);
      
      // Assign a unique ID to the layer
      layer.id = Date.now().toString();
      
      // Add a popup for the layer
      layer.bindPopup(createPopupContent(layer));
      
      // Add click event to open the edit popup
      layer.on('click', function() {
        openEditPopup(layer);
      });
      
      console.log('Layer created:', layer);
    });
    
    // After a layer is edited
    window.map.on(L.Draw.Event.EDITED, function(event) {
      const layers = event.layers;
      layers.eachLayer(function(layer) {
        console.log('Layer edited:', layer);
      });
    });
    
    // After a layer is deleted
    window.map.on(L.Draw.Event.DELETED, function(event) {
      const layers = event.layers;
      layers.eachLayer(function(layer) {
        console.log('Layer deleted:', layer.id);
      });
    });
    
    console.log('Map initialized successfully');
  }
  
  // Try to load saved layers
  loadLayers();
}

// Function to create popup content
function createPopupContent(layer) {
  const properties = layer.properties || {};
  const type = layer instanceof L.Marker ? 'Marker' :
               layer instanceof L.Polygon ? 'Polygon' :
               layer instanceof L.Polyline ? 'Line' :
               layer instanceof L.Rectangle ? 'Rectangle' :
               layer instanceof L.Circle ? 'Circle' : 'Shape';
  
  return `<strong>${properties.name || type}</strong><br>
          <button onclick="openEditPopup('${layer.id}')">Edit</button>`;
}

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
  console.log('Opening edit popup for layer:', layer);
  
  // Get existing properties or initialize empty object
  const properties = layer.properties || {};
  
  // Get the modal
  const modal = document.getElementById('featurePropertiesModal');
  const content = document.getElementById('modalContent');
  
  // Create form content
  content.innerHTML = `
    <h2>Edit Feature Properties</h2>
    <form id="featurePropertiesForm">
      <div class="form-group">
        <label for="featureName">Name:</label>
        <input type="text" id="featureName" value="${properties.name || ''}" class="form-control">
      </div>
      <div class="form-group">
        <label for="featureDescription">Description:</label>
        <textarea id="featureDescription" class="form-control">${properties.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label for="featureType">Type:</label>
        <select id="featureType" class="form-control">
          <option value="PES" ${properties.type === 'PES' ? 'selected' : ''}>PES (Potential Explosion Site)</option>
          <option value="ES" ${properties.type === 'ES' ? 'selected' : ''}>ES (Exposed Site)</option>
          <option value="Other" ${properties.type === 'Other' ? 'selected' : ''}>Other</option>
        </select>
      </div>
      
      <div class="form-buttons">
        <button type="button" onclick="saveFeatureProperties('${layer.id}')">Save</button>
        <button type="button" onclick="closeModal()">Cancel</button>
      </div>
    </form>
  `;
  
  // Store the current layer being edited
  window.currentEditLayer = layer;
  
  // Show the modal
  modal.style.display = 'block';
}

// Function to save feature properties
function saveFeatureProperties(layerId) {
  const layer = window.currentEditLayer;
  if (!layer) {
    console.error('No layer found for editing');
    return;
  }
  
  // Get values from form
  const name = document.getElementById('featureName').value;
  const description = document.getElementById('featureDescription').value;
  const type = document.getElementById('featureType').value;
  
  // Store properties on the layer
  layer.properties = {
    name: name,
    description: description,
    type: type
  };
  
  // Update popup content
  if (layer.getPopup()) {
    layer.setPopupContent(createPopupContent(layer));
  } else {
    layer.bindPopup(createPopupContent(layer));
  }
  
  // Close the modal
  closeModal();
  
  console.log('Saved properties for layer:', layer);
}

// Function to close the modal
function closeModal() {
  const modal = document.getElementById('featurePropertiesModal');
  modal.style.display = 'none';
  window.currentEditLayer = null;
}

// Function to save layers to the server
function saveLayers() {
  console.log('Saving layers...');
  
  // Extract layer data
  const layers = [];
  window.drawnItems.eachLayer(function(layer) {
    // Get layer properties
    const properties = layer.properties || {};
    
    // Create a layer data object
    const layerData = {
      id: layer.id,
      type: layer instanceof L.Marker ? 'marker' :
            layer instanceof L.Polygon ? 'polygon' :
            layer instanceof L.Polyline ? 'polyline' :
            layer instanceof L.Rectangle ? 'rectangle' :
            layer instanceof L.Circle ? 'circle' : 'unknown',
      properties: properties
    };
    
    // Get coordinates based on layer type
    if (layer instanceof L.Marker) {
      layerData.latlng = layer.getLatLng();
    } else if (layer instanceof L.Circle) {
      layerData.latlng = layer.getLatLng();
      layerData.radius = layer.getRadius();
    } else {
      layerData.latlngs = layer.getLatLngs();
    }
    
    layers.push(layerData);
  });
  
  // Create data object to send to server
  const data = {
    layers: layers,
    mapCenter: window.map.getCenter(),
    mapZoom: window.map.getZoom()
  };
  
  // Send data to server
  fetch('/api/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => {
    console.log('Save successful:', data);
    // Show success notification
    alert('Map saved successfully!');
  })
  .catch(error => {
    console.error('Error saving map:', error);
    // Show error notification
    alert('Error saving map. Please try again.');
  });
}

// Function to load layers from the server
function loadLayers() {
  console.log('Loading layers...');
  
  fetch('/api/load')
  .then(response => response.json())
  .then(data => {
    console.log('Load successful:', data);
    
    // Clear existing layers
    window.drawnItems.clearLayers();
    
    // Add loaded layers
    if (data.layers && Array.isArray(data.layers)) {
      data.layers.forEach(layerData => {
        let layer;
        
        // Create layer based on type
        if (layerData.type === 'marker') {
          layer = L.marker(layerData.latlng);
        } else if (layerData.type === 'circle') {
          layer = L.circle(layerData.latlng, { radius: layerData.radius });
        } else if (layerData.type === 'polygon') {
          layer = L.polygon(layerData.latlngs);
        } else if (layerData.type === 'polyline') {
          layer = L.polyline(layerData.latlngs);
        } else if (layerData.type === 'rectangle') {
          layer = L.rectangle(layerData.latlngs);
        }
        
        if (layer) {
          // Restore properties and ID
          layer.id = layerData.id;
          layer.properties = layerData.properties;
          
          // Add popup
          layer.bindPopup(createPopupContent(layer));
          
          // Add click event
          layer.on('click', function() {
            openEditPopup(layer);
          });
          
          // Add to feature group
          window.drawnItems.addLayer(layer);
        }
      });
    }
    
    // Restore map view if provided
    if (data.mapCenter && data.mapZoom) {
      window.map.setView(data.mapCenter, data.mapZoom);
    }
  })
  .catch(error => {
    console.error('Error loading map:', error);
  });
}

// Initialize map error handling
function initializeMapErrorHandling() {
  if (L && L.Draw) {
    // Fix for draw handlers
    const checkForDrawErrors = function() {
      const mapInstance = window.map;
      if (!mapInstance) return;
      
      // Check if there are any phantom drawing modes active
      for (const type in L.Draw.Event) {
        const drawControl = mapInstance._toolbars && mapInstance._toolbars[type.toLowerCase()];
        if (drawControl && drawControl._active) {
          console.warn('Found active drawing mode that might be stuck:', type);
          
          // Try to deactivate it
          try {
            drawControl.disable();
          } catch (e) {
            console.error('Failed to disable draw control:', e);
          }
        }
      }
    };
    
    // Run this check periodically
    setInterval(checkForDrawErrors, 30000);
  }
}
