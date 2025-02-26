// QDPro Main Application JavaScript
const QDPro = {
  map: null,
  layers: {},
  activeLayer: null,
  drawingTools: {},
  currentLocation: null,
  baseLayers: {
    "OpenStreetMap": L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { 
      attribution: "© OpenStreetMap contributors" 
    }),
    "Google Satellite": L.tileLayer("https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"),
    "Google Streets": L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"),
    "Google Hybrid": L.tileLayer("https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"),
    "None": L.tileLayer("")
  },

  init: function() {
    console.log("Initializing QDPro application...");
    this.initMap();
    this.initDrawingTools();
    this.initUIComponents();
    this.initEventHandlers();
    this.loadFromDatabase();
  },

  initMap: function() {
    try {
      console.log("Starting map initialization...");

      // Initialize map with OSM base layer
      this.map = L.map('map', {
        center: [39.8283, -98.5795],
        zoom: 4,
        layers: [this.baseLayers["OpenStreetMap"]]
      });

      // Initialize layers object
      this.layers = {};

      // Create default layer group
      this.layers["Default"] = new L.featureGroup();
      this.map.addLayer(this.layers["Default"]);
      this.activeLayer = this.layers["Default"];

      // Force map resize
      setTimeout(() => {
        console.log("Forcing map resize...");
        this.map.invalidateSize(true);
      }, 100);

      console.log("Map initialized successfully");
    } catch (error) {
      console.error("Error initializing map:", error);
      throw error;
    }
  },

  initDrawingTools: function() {
    try {
      console.log("Initializing drawing tools...");
      this.drawingTools = {
        polygon: new L.Draw.Polygon(this.map, {
          showArea: true,
          shapeOptions: { color: '#3388ff' }
        }),
        marker: new L.Draw.Marker(this.map),
        polyline: new L.Draw.Polyline(this.map),
        rectangle: new L.Draw.Rectangle(this.map),
        circle: new L.Draw.Circle(this.map)
      };
      console.log("Drawing tools initialized");
    } catch (error) {
      console.error("Error initializing drawing tools:", error);
    }
  },

  initUIComponents: function() {
    this.initToolbar();
    this.initLayersPanel();
    this.initBaseLayerDropdown();
  },

  initToolbar: function() {
    // Drawing tools buttons
    document.getElementById("drawPolygon").addEventListener("click", e => {
      e.preventDefault();
      this.activateDrawingTool("polygon");
    });

    document.getElementById("drawPolyline").addEventListener("click", e => {
      e.preventDefault();
      this.activateDrawingTool("polyline");
    });

    document.getElementById("drawRectangle").addEventListener("click", e => {
      e.preventDefault();
      this.activateDrawingTool("rectangle");
    });

    document.getElementById("drawCircle").addEventListener("click", e => {
      e.preventDefault();
      this.activateDrawingTool("circle");
    });

    document.getElementById("drawMarker").addEventListener("click", e => {
      e.preventDefault();
      this.activateDrawingTool("marker");
    });

    // Navigation tools
    document.getElementById("panTool").addEventListener("click", e => {
      e.preventDefault();
      this.deactivateAllDrawingTools();
      document.getElementById("panTool").classList.add("active");
    });

    document.getElementById("selectTool").addEventListener("click", e => {
      e.preventDefault();
      this.deactivateAllDrawingTools();
      document.getElementById("selectTool").classList.add("active");
      this.enableSelectMode();
    });

    // Toggle layers panel
    document.getElementById("toggleLayersPanel").addEventListener("click", () => {
      const leftPanel = document.getElementById("leftPanel");
      const mapElement = document.getElementById("map");

      leftPanel.classList.toggle("visible");

      // Adjust map width when panel is visible
      if (leftPanel.classList.contains("visible")) {
        mapElement.style.left = "300px";
        mapElement.style.width = "calc(100% - 300px)";
      } else {
        mapElement.style.left = "0";
        mapElement.style.width = "100%";
      }

      this.map.invalidateSize();
    });
  },

  initLayersPanel: function() {
    const drawToLayerSelect = document.getElementById("drawToLayer");
    drawToLayerSelect.addEventListener("change", e => {
      const selectedLayer = e.target.value;
      if (this.layers[selectedLayer]) {
        this.activeLayer = this.layers[selectedLayer];
        console.log("Active layer changed to:", selectedLayer);
        // Force map update to show active layer
        this.map.eachLayer(layer => {
          if (layer instanceof L.FeatureGroup) {
            layer.bringToFront();
          }
        });
      }
    });
    this.updateDrawToLayerSelect();
  },

  initBaseLayerDropdown: function() {
    const baseLayerTool = document.getElementById("baseLayerTool");
    const baseLayerDropdown = document.getElementById("baseLayerDropdown");

    // Toggle dropdown when clicking the base layer button
    baseLayerTool.addEventListener("click", e => {
      const rect = baseLayerTool.getBoundingClientRect();
      baseLayerDropdown.style.top = (rect.bottom + 5) + "px";
      baseLayerDropdown.style.left = rect.left + "px";
      baseLayerDropdown.style.display = 
        (baseLayerDropdown.style.display === "none" || 
         baseLayerDropdown.style.display === "") ? "block" : "none";
    });

    // Create base layer options
    baseLayerDropdown.innerHTML = "";
    Object.entries(this.baseLayers).forEach(([name, layer]) => {
      const option = document.createElement("div");
      option.className = "base-layer-option";
      option.style.padding = "8px";
      option.style.cursor = "pointer";
      option.style.borderBottom = "1px solid #eee";

      const isActive = this.map.hasLayer(layer);
      option.innerHTML = `
        <input type="radio" name="baseLayer" id="base-${name}" ${isActive ? "checked" : ""}>
        <label for="base-${name}" style="margin-left: 5px;">${name}</label>
      `;

      option.addEventListener("click", () => {
        // Remove all base layers
        Object.values(this.baseLayers).forEach(l => {
          if (this.map.hasLayer(l)) this.map.removeLayer(l);
        });

        // Add selected base layer (unless it's "None")
        if (name !== "None") {
          this.map.addLayer(layer);
        }

        baseLayerDropdown.style.display = "none";
      });

      baseLayerDropdown.appendChild(option);
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
      if (!e.target.closest("#baseLayerTool") && 
          !e.target.closest("#baseLayerDropdown")) {
        baseLayerDropdown.style.display = "none";
      }
    });
  },

  initEventHandlers: function() {
    // Map drawing events
    this.map.on('draw:created', (e) => {
      console.log('Draw created event fired:', e);
      try {
        if (!this.activeLayer) {
          console.error('No active layer');
          alert('Please select a layer to draw on');
          return;
        }

        const layer = e.layer;

        // Ensure polygon is closed
        if (e.layerType === 'polygon' && layer.getLatLngs) {
          const coords = layer.getLatLngs()[0];
          if (coords.length > 0 && !coords[0].equals(coords[coords.length - 1])) {
            coords.push(coords[0]);
            layer.setLatLngs(coords);
          }
        }

        // Add to active layer
        this.activeLayer.addLayer(layer);

        // Create feature properties
        layer.feature = {
          type: 'Feature',
          properties: {},
          geometry: layer.toGeoJSON().geometry
        };

        this.openEditPopup(layer);
        this.saveToDatabase();
        console.log('Feature added to layer:', this.activeLayer);
      } catch (error) {
        console.error('Error handling draw:created:', error);
      }
    });

    // Handle layer selection changes
    const drawToLayerSelect = document.getElementById('drawToLayer');
    if (drawToLayerSelect) {
      drawToLayerSelect.addEventListener('change', (e) => {
        const selectedLayer = e.target.value;
        if (this.layers[selectedLayer]) {
          this.activeLayer = this.layers[selectedLayer];
          console.log('Active layer changed to:', selectedLayer);
        }
      });
    }

    // Draw created event - handles new geometries
    this.map.on("draw:created", e => {
      console.log("Draw created event fired:", e);
      console.log("Active layer:", this.activeLayer ? this.activeLayer.getLayers().length : "no active layer");

      const layer = e.layer;

      if (!this.activeLayer) {
        alert("Please select a layer to draw on");
        return;
      }

      // Ensure the layer is properly tracked
      layer._qdproLayerName = document.getElementById("drawToLayer").value;

      // For polygons, ensure they're closed
      if (e.layerType === "polygon" && layer.getLatLngs) {
        const coords = layer.getLatLngs()[0];
        if (coords.length > 0 && !coords[0].equals(coords[coords.length - 1])) {
          coords.push(coords[0]);
          layer.setLatLngs(coords);
          console.log("Auto-closed polygon coordinates");
        }
        // Validate minimum vertices for a polygon
        if (coords.length < 4) { // 3 unique points + closure point
          alert("A polygon must have at least 3 points");
          return;
        }
      }

      // Add the new drawing to the active layer
      this.activeLayer.addLayer(layer);

      // Create a default GeoJSON feature structure
      layer.feature = {
        type: "Feature",
        properties: {},
        geometry: layer.toGeoJSON().geometry
      };

      // Open edit popup for the new geometry
      this.openEditPopup(layer);

      // Deactivate drawing tools
      this.deactivateAllDrawingTools();

      // Save to database
      this.saveToDatabase();
    });

    // Click on map (when not drawing)
    this.map.on("click", e => {
      // Only handle clicks when not in drawing mode
      if (!this.isDrawing) {
        console.log("Map clicked at:", e.latlng);
      }
    });

    // Menu toggle events
    const menuItems = document.querySelectorAll(".menu-item");
    menuItems.forEach(item => {
      item.addEventListener("click", e => {
        e.stopPropagation();
      });
    });

    // Close menus when clicking outside
    document.addEventListener("click", e => {
      if (!e.target.closest(".menu-item")) {
        document.querySelectorAll(".menu-dropdown").forEach(dd => {
          dd.style.display = "none";
        });
      }
    });

    // File menu actions
    document.querySelector("#fileMenu .menu-dropdown-item:nth-child(1)")
      .addEventListener("click", () => this.createNewLocation());

    document.querySelector("#fileMenu .menu-dropdown-item:nth-child(2)")
      .addEventListener("click", () => this.showSwitchLocationModal());

    document.querySelector("#fileMenu .menu-dropdown-item:nth-child(3)")
      .addEventListener("click", () => this.saveToDatabase());
  },

  createNewLocation: async function() {
    // Create modal HTML
    const modalHtml = `
      <div id="newLocationModal" style="position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
        <div style="background-color: #fefefe; padding: 20px; border: 1px solid #888; width: 80%; max-width: 500px;">
          <h2>Create New Location</h2>
          <input type="text" id="newLocationName" style="width: 100%; padding: 5px; margin: 10px 0;" placeholder="Enter location name">
          <div style="text-align: right; margin-top: 20px;">
            <button onclick="document.getElementById('newLocationModal').remove()" style="margin-right: 10px; padding: 5px 10px;">Cancel</button>
            <button id="createLocationBtn" style="padding: 5px 10px;">Create</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Set up create button handler
    document.getElementById('createLocationBtn').onclick = async () => {
      const locationName = document.getElementById('newLocationName').value.trim();
      if (!locationName) return;

      try {
        const response = await fetch("/api/create_location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ location_name: locationName })
        });

      if (!response.ok) throw new Error("Failed to create location");

      const data = await response.json();
      this.currentLocation = data.id;
      document.getElementById("dbStatus").textContent = `Location: ${locationName}`;

      // Clear existing layers
      Object.values(this.layers).forEach(layer => {
        if (this.map.hasLayer(layer)) {
          this.map.removeLayer(layer);
        }
      });
      this.layers = {};
      this.layers["Default"] = L.featureGroup().addTo(this.map);
      this.activeLayer = this.layers["Default"];

      this.updateDrawToLayerSelect();
      this.updateLayerControl();
      document.getElementById('newLocationModal').remove();
    } catch (error) {
      console.error("Error creating location:", error);
      alert("Failed to create location");
      document.getElementById('newLocationModal').remove();
    }
  };
  },

  activateDrawingTool: function(toolName) {
    this.deactivateAllDrawingTools();

    if (this.drawingTools[toolName] && typeof this.drawingTools[toolName].enable === "function") {
      this.drawingTools[toolName].enable();
      document.getElementById(`draw${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`)
        .classList.add("active");
      this.isDrawing = true;
    }
  },

  deactivateAllDrawingTools: function() {
    Object.values(this.drawingTools).forEach(tool => {
      if (tool && typeof tool.disable === "function") {
        tool.disable();
      }
    });

    document.querySelectorAll(".tool-button").forEach(button => {
      button.classList.remove("active");
    });

    document.getElementById("panTool").classList.add("active");
    this.isDrawing = false;

    // Turn off any special mouse handlers
    this.map.off("mousemove");
    this.map.getContainer().style.cursor = "";
  },

  enableSelectMode: function() {
    this.map.getContainer().style.cursor = "pointer";

    // Make all layers selectable
    Object.values(this.layers).forEach(layer => {
      layer.eachLayer(l => {
        l.on("click", e => {
          L.DomEvent.stopPropagation(e);
          this.openEditPopup(l);
        });
      });
    });
  },

  openEditPopup: function(layer) {
    // Default properties if none exist
    const props = layer.feature?.properties || {};

    const formHtml = `
      <div style="min-width: 200px;">
        <div class="form-group" style="margin-bottom: 10px;">
          <label for="facilityName">Facility Name:</label>
          <input id="facilityName" type="text" value="${props.name || ''}" 
                 style="width: 100%; padding: 5px;" />
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label for="facilityTypeCode">Type Code (PES/ES):</label>
          <input id="facilityTypeCode" type="text" value="${props.typeCode || ''}" 
                 style="width: 100%; padding: 5px;" placeholder="Enter PES or ES designator" />
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label for="facilityDescription">Description:</label>
          <textarea id="facilityDescription" style="width: 100%; height: 60px; padding: 5px;">${props.description || ''}</textarea>
        </div>
        <button id="facilitySaveButton" style="width: 100%; padding: 5px; margin-top: 5px; cursor: pointer;">Save</button>
      </div>
    `;

    // Bind and open popup
    layer.bindPopup(formHtml).openPopup();

    // Add event handler to save button after popup is open
    setTimeout(() => {
      const saveBtn = document.getElementById("facilitySaveButton");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          const newName = document.getElementById("facilityName").value;
          const newTypeCode = document.getElementById("facilityTypeCode").value;
          const newDescription = document.getElementById("facilityDescription").value;

          // Update feature properties
          layer.feature = layer.feature || {};
          layer.feature.properties = { 
            name: newName, 
            typeCode: newTypeCode, 
            description: newDescription 
          };

          // Set facility type styling
          if (newTypeCode) {
            if (newTypeCode.toUpperCase().includes("PES")) {
              layer.setStyle({ color: "#ff0000", fillColor: "#ff6666", weight: 2, fillOpacity: 0.5 });
            } else if (newTypeCode.toUpperCase().includes("ES")) {
              layer.setStyle({ color: "#00cc00", fillColor: "#66ff66", weight: 2, fillOpacity: 0.5 });
            }
          }

          // Add tooltip with name and type
          if (newName || newTypeCode) {
            layer.bindTooltip(
              (newName ? newName : "") + 
              (newTypeCode ? "<br>" + newTypeCode : ""), 
              { permanent: false }
            );
          }

          this.saveToDatabase();
          layer.closePopup();
        });
      }
    }, 100);
  },

  updateDrawToLayerSelect: function() {
    const select = document.getElementById("drawToLayer");
    if (!select) return;

    // Clear existing options
    select.innerHTML = "";

    // Add each layer as an option
    Object.keys(this.layers).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      select.appendChild(option);
    });

    // Set active layer to first option if none selected
    if (select.options.length > 0 && !this.activeLayer) {
      select.selectedIndex = 0;
      this.activeLayer = this.layers[select.options[0].value];
    }
  },

  updateLayerControl: function() {
    const layerControl = document.getElementById("layerControl");
    if (!layerControl) {
      console.log("Layer control element not found");
      return;
    }

    layerControl.innerHTML = "";

    Object.entries(this.layers).forEach(([name, layer]) => {
      const item = document.createElement("div");
      item.style.padding = "8px 0";
      item.style.borderBottom = "1px solid #eee";

      item.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <input type="checkbox" id="layer-${name}" ${this.map.hasLayer(layer) ? "checked" : ""}>
            <label for="layer-${name}" style="margin-left: 5px;">${name}</label>
          </div>
          <div>
            <button class="edit-layer-btn" data-layer="${name}" style="background: none; border: none; cursor: pointer;">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      `;

      // Add the item to layer control before adding event listeners
      layerControl.appendChild(item);

      // Add checkbox change handler after the item is in the DOM
      const checkbox = item.querySelector(`#layer-${name}`);
      if (checkbox) {
        checkbox.addEventListener("change", e => {
          if (e.target.checked) {
            this.map.addLayer(layer);
          } else {
            this.map.removeLayer(layer);
          }
        });
      }

      // Add edit button handler after the item is in the DOM
      const editBtn = item.querySelector(".edit-layer-btn");
      if (editBtn) {
        editBtn.addEventListener("click", () => {
          this.editLayer(name);
        });
      }
    });
  },

  editLayer: function(layerName) {
    const layer = this.layers[layerName];
    if (!layer) return;

    // Get layer properties or set defaults
    const props = layer.properties || {};

    const formHtml = `
      <div style="min-width: 200px;">
        <div class="form-group" style="margin-bottom: 10px;">
          <label>Layer Name: ${layerName}</label>
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label>
            <input type="checkbox" id="layerVisible" ${this.map.hasLayer(layer) ? "checked" : ""}>
            Visible
          </label>
        </div>
        <div class="form-group" style="margin-bottom: 10px;">
          <label>
            <input type="checkbox" id="layerQDAnalyzed" ${props.isQDAnalyzed ? "checked" : ""}>
            QD Analyzed
          </label>
        </div>
        <button id="layerSaveButton" style="width: 100%; padding: 5px; margin-top: 5px;">Save Changes</button>
      </div>
    `;

    // Create and open popup for layer editing
    const popup = L.popup()
      .setLatLng(this.map.getCenter())
      .setContent(formHtml)
      .openOn(this.map);

    // Add event handler for save button
    setTimeout(() => {
      const saveBtn = document.getElementById("layerSaveButton");
      if (saveBtn) {
        saveBtn.addEventListener("click", () => {
          // Update layer properties
          layer.properties = { 
            ...props,
            isQDAnalyzed: document.getElementById("layerQDAnalyzed").checked
          };

          // Update visibility
          const isVisible = document.getElementById("layerVisible").checked;
          if (isVisible && !this.map.hasLayer(layer)) {
            this.map.addLayer(layer);
          } else if (!isVisible && this.map.hasLayer(layer)) {
            this.map.removeLayer(layer);
          }

          this.updateLayerControl();
          this.saveToDatabase();
          this.map.closePopup(popup);
        });
      }
    }, 100);
  },

  showAddLayerModal: function() {
    document.getElementById("addLayerModal").style.display = "block";
  },

  closeAddLayerModal: function() {
    document.getElementById("addLayerModal").style.display = "none";
    document.getElementById("newLayerName").value = "";
  },

  createNewLayer: function() {
    const layerName = document.getElementById("newLayerName").value;
    const layerType = document.getElementById("newLayerType").value;

    if (!layerName) {
      alert("Please enter a layer name");
      return;
    }

    // Check if layer already exists
    if (this.layers[layerName]) {
      alert(`Layer "${layerName}" already exists`);
      return;
    }

    // Create new layer
    const newLayer = L.featureGroup().addTo(this.map);
    newLayer.layerType = layerType;
    newLayer.properties = { type: layerType };

    // Add to layers collection
    this.layers[layerName] = newLayer;
    this.activeLayer = newLayer;

    // Update UI
    this.updateDrawToLayerSelect();
    this.updateLayerControl();

    // Save to database
    this.saveToDatabase();

    // Close modal
    this.closeAddLayerModal();
  },

  showSwitchLocationModal: async function() {
    // Show the modal with flex display for better centering
    document.getElementById('switchLocationModal').style.display = 'flex';

    try {
      // Fetch the list of locations from backend
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error("Failed to load locations");
      
      const data = await response.json();
      const locationList = document.getElementById('locationList');
      locationList.innerHTML = ''; // Clear existing content

      if (data.locations && data.locations.length > 0) {
        data.locations.forEach(loc => {
          const div = document.createElement('div');
          div.style.padding = '10px';
          div.style.borderBottom = '1px solid #eee';
          div.style.cursor = 'pointer';
          div.style.backgroundColor = '#fff';
          div.style.transition = 'background-color 0.2s';
          
          // Format the date nicely
          const createdDate = new Date(loc.created_at).toLocaleDateString();
          div.textContent = `${loc.name} (Created: ${createdDate})`;

          // Hover effect
          div.addEventListener('mouseover', () => {
            div.style.backgroundColor = '#f0f0f0';
          });
          div.addEventListener('mouseout', () => {
            div.style.backgroundColor = '#fff';
          });

          // Click handler to switch location
          div.addEventListener('click', () => {
            this.switchToLocation(loc.id);
          });

          locationList.appendChild(div);
        });
      } else {
        locationList.innerHTML = '<p style="text-align: center; padding: 20px;">No locations found</p>';
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      document.getElementById('locationList').innerHTML = 
        '<p style="color: red; text-align: center; padding: 20px;">Failed to load locations. Please try again.</p>';
    }
  },

  closeSwitchLocationModal: function() {
    document.getElementById('switchLocationModal').style.display = 'none';
  },

  switchToLocation: async function(locationId) {
    try {
      const response = await fetch(`/api/load-layers?location=${locationId}`);
      if (!response.ok) throw new Error("Failed to load location");

      const data = await response.json();

      // Clear existing layers
      Object.values(this.layers).forEach(layer => {
        if (this.map.hasLayer(layer)) {
          this.map.removeLayer(layer);
        }
      });

      this.layers = {};

      // Load new layers
      if (data.layers) {
        Object.entries(data.layers).forEach(([name, layerData]) => {
          const layer = L.featureGroup().addTo(this.map);
          layer.properties = layerData.properties || {};

          // Add features to layer
          if (layerData.features && layerData.features.length > 0) {
            layerData.features.forEach(feature => {
              try {
                const featureLayer = L.geoJSON(feature);
                featureLayer.feature = feature;

                // Restore feature properties
                if (feature.properties) {
                  // Set facility type styling
                  if (feature.properties.typeCode) {
                    const typeCode = feature.properties.typeCode.toUpperCase();
                    if (typeCode.includes("PES")) {
                      featureLayer.setStyle({ 
                        color: "#ff0000", 
                        fillColor: "#ff6666", 
                        weight: 2, 
                        fillOpacity: 0.5 
                      });
                    } else if (typeCode.includes("ES")) {
                      featureLayer.setStyle({ 
                        color: "#00cc00", 
                        fillColor: "#66ff66", 
                        weight: 2, 
                        fillOpacity: 0.5 
                      });
                    }
                  }

                  // Restore custom style if saved
                  if (feature.properties.style) {
                    featureLayer.setStyle(feature.properties.style);
                  }

                  // Add tooltip
                  if (feature.properties.name) {
                    const tooltipContent = feature.properties.name + 
                      (feature.properties.typeCode ? `<br>${feature.properties.typeCode}` : "") +
                      (feature.properties.description ? `<br>${feature.properties.description}` : "");
                    featureLayer.bindTooltip(tooltipContent, { permanent: false });
                  }

                  // Make features clickable for editing
                  featureLayer.on("click", e => {
                    L.DomEvent.stopPropagation(e);
                    this.openEditPopup(featureLayer);
                  });
                }

                layer.addLayer(featureLayer);
              } catch (err) {
                console.error("Error adding feature to layer:", err);
              }
            });
          }

          this.layers[name] = layer;
        });
      }

      // Default layer if none loaded
      if (Object.keys(this.layers).length === 0) {
        this.layers["Default"] = L.featureGroup().addTo(this.map);
      }

      // Set the first layer as active
      this.activeLayer = Object.values(this.layers)[0];

      // Find bounds of all features and zoom to them
      const bounds = L.featureGroup(Object.values(this.layers)).getBounds();
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }

      // Update UI
      this.updateDrawToLayerSelect();
      this.updateLayerControl();

      // Update current location
      this.currentLocation = locationId;
      document.getElementById("dbStatus").textContent = `Location ID: ${locationId}`;

      // Close modal
      this.closeSwitchLocationModal();
    } catch (error) {
      console.error("Error switching location:", error);
      alert("Failed to switch location. Please try again.");
    }
  },

  loadFromDatabase: async function() {
    try {
      const response = await fetch("/api/load-layers");
      if (!response.ok) throw new Error("Failed to load layers");

      const data = await response.json();

      // Clear existing layers
      Object.values(this.layers).forEach(layer => {
        if (this.map.hasLayer(layer)) {
          this.map.removeLayer(layer);
        }
      });

      // Reset layers
      this.layers = {};

      if (data.layers && Object.keys(data.layers).length > 0) {
        Object.entries(data.layers).forEach(([name, layerData]) => {
          const layer = L.featureGroup().addTo(this.map);
          layer.properties = layerData.properties || {};

          // Add features to layer
          if (layerData.features && layerData.features.length > 0) {
            layerData.features.forEach(feature => {
              try {
                const featureLayer = L.geoJSON(feature);
                featureLayer.feature = feature;

                // Add tooltip if name exists
                if (feature.properties && feature.properties.name) {
                  featureLayer.bindTooltip(
                    feature.properties.name + 
                    (feature.properties.typeCode ? `<br>${feature.properties.typeCode}` : ""),
                    { permanent: false }
                  );
                }

                layer.addLayer(featureLayer);
              } catch (err) {
                console.error("Error adding feature to layer:", err);
              }
            });
          }

          this.layers[name] = layer;
        });
      } else {
        // Create default layer if none loaded
        this.layers["Default"] = L.featureGroup().addTo(this.map);
      }

      // Set the first layer as active
      this.activeLayer = Object.values(this.layers)[0];

      // Update UI
      this.updateDrawToLayerSelect();
      this.updateLayerControl();

      console.log("Layers loaded successfully");
    } catch (error) {
      console.error("Error loading layers:", error);

      // Create default layer on error
      this.layers = {
        "Default": L.featureGroup().addTo(this.map)
      };
      this.activeLayer = this.layers["Default"];

      // Update UI
      this.updateDrawToLayerSelect();
      this.updateLayerControl();
    }
  },

  saveToDatabase: async function() {
    try {
      console.log("Starting save to database...");
      const layerData = { layers: {} };

      Object.entries(this.layers).forEach(([name, layer]) => {
        if (!layer) {
          console.log(`Skipping invalid layer: ${name}`);
          return;
        }
        console.log(`Processing layer ${name} with ${layer.getLayers().length} features`);
        const features = [];
        layer.eachLayer(sublayer => {
          if (sublayer.toGeoJSON) {
            const feature = sublayer.toGeoJSON();

            // Preserve existing properties
            if (sublayer.feature && sublayer.feature.properties) {
              feature.properties ={...sublayer.feature.properties};
            }

            // Add style properties
            const style = {};
            if (sublayer.options) {
              style.color = sublayer.options.color;
              style.fillColor = sublayer.options.fillColor;
              style.weight = sublayer.options.weight;
              style.fillOpacity = sublayer.options.fillOpacity;
            }

            // Add additional properties
            feature.properties = {
              ...feature.properties,
              style,
              layerName: name,
              type: layer.layerType || 'default'
            };

            features.push(feature);
          }
        });

        // Save layer configuration
        layerData.layers[name] = {
          properties: {
            type: layer.layerType || 'default',
            isActive: this.map.hasLayer(layer),
            visible: this.map.hasLayer(layer),
            ...layer.properties
          },
          features: features
        };
      });

      console.log("Saving layer data:", layerData);

      const response = await fetch("/api/save-layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layerData)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Save failed: ${error}`);
      }

      console.log("Layers saved successfully");
      document.getElementById("dbStatus").textContent = 
        this.currentLocation ? `Location ID: ${this.currentLocation} (Saved)` : "Saved";

      // Fade out the "Saved" message after a moment
      setTimeout(() => {
        if (this.currentLocation) {
          document.getElementById("dbStatus").textContent = `Location ID: ${this.currentLocation}`;
        } else {
          document.getElementById("dbStatus").textContent = "No location selected";
        }
      }, 2000);
    } catch (error) {
      console.error("Error saving layers:", error);
      alert("Failed to save layers: " + error.message);
    }
  }
};

// Initialize QDPro when the DOM is ready
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM Content Loaded");
  QDPro.init();

  // Expose modal functions globally
  window.showSwitchLocationModal = () => QDPro.showSwitchLocationModal();
  window.closeSwitchLocationModal = () => QDPro.closeSwitchLocationModal();
  window.switchToLocation = (locationId) => QDPro.switchToLocation(locationId);

  // Left Panel Toggle
  const toggleLayersPanel = document.getElementById("toggleLayersPanel");
  const leftPanel= document.getElementById("leftPanel");
  const mapElement = document.getElementById("map");

  toggleLayersPanel.addEventListener("click", () => {
    // Toggle the 'visible' class on the left panel
    leftPanel.classList.toggle("visible");

    // Adjust the map's container style based on whether the panel is visible
    if (leftPanel.classList.contains("visible")) {
      mapElement.style.left = "300px";
      mapElement.style.width = "calc(100% - 300px)";
    } else {
      mapElement.style.left = "0";
      mapElement.style.width = "100%";
    }

    // Invalidate map size to force Leaflet to recalc dimensions
    QDPro.map.invalidateSize();
    console.log("Left panel toggled. Visible:", leftPanel.classList.contains("visible"));
  });

  // Make functions available globally for HTML event handlers
  // Expose toggleMenu function globally
  window.toggleMenu = function(element, menuId) {
    const dropdown = document.getElementById(menuId);
    if (!dropdown) {
      console.error(`Menu dropdown with id ${menuId} not found`);
      return;
    }

    // Close other menus
    document.querySelectorAll(".menu-dropdown").forEach(dd => {
      if (dd.id !== menuId) {
        dd.style.display = "none";
        dd.parentElement.classList.remove("active");
      }
    });

    // Toggle current menu
    const isVisible = dropdown.style.display === "block";
    dropdown.style.display = isVisible ? "none" : "block";
    element.classList.toggle("active", !isVisible);

    // Position dropdown correctly below menu item
    if (!isVisible) {
      const rect = element.getBoundingClientRect();
      dropdown.style.position = "fixed";
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.zIndex = "2000";
    }
  };


  window.showAddLayerModal = function() {
    QDPro.showAddLayerModal();
  };

  window.closeAddLayerModal = function() {
    QDPro.closeAddLayerModal();
  };

  window.createNewLayer = function() {
    QDPro.createNewLayer();
  };

  window.showSwitchLocationModal = function() {
    QDPro.showSwitchLocationModal();
  };

  window.closeSwitchLocationModal = function() {
    QDPro.closeSwitchLocationModal();
  };

  window.switchToLocation = function(locationId) {
    QDPro.switchToLocation(locationId);
  };

  window.saveToDatabase = function() {
    QDPro.saveToDatabase();
  };

  window.editLayer = function(layerName) {
    QDPro.editLayer(layerName);
  };
});