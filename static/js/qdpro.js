// QDPro Main Application JavaScript
// Global state management
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

  // Initialize the application
  init: function() {
    console.log("Initializing QDPro application...");
    this.initMap();
    this.initDrawingTools();
    this.initUIComponents();
    this.initEventHandlers();
    this.loadFromDatabase();
  },

  // Initialize map references
  initMap: function() {
    // Use existing map instance
    this.map = window.map;
    
    // Create a default layer group for drawings
    this.activeLayer = L.featureGroup().addTo(this.map);
    this.layers["Default"] = this.activeLayer;

    // Force map resize after DOM is fully loaded
    setTimeout(() => this.map.invalidateSize(), 100);
  },

  // Initialize drawing tools
  initDrawingTools: function() {
    this.drawingTools = {
      polygon: new L.Draw.Polygon(this.map, {
        allowIntersection: false,
        showArea: true,
        drawError: { color: "#e1e100", timeout: 1000 },
        shapeOptions: { color: "#3388ff" }
      }),
      polyline: new L.Draw.Polyline(this.map, { 
        shapeOptions: { color: "#3388ff", weight: 2 } 
      }),
      rectangle: new L.Draw.Rectangle(this.map, { 
        shapeOptions: { color: "#3388ff" } 
      }),
      circle: new L.Draw.Circle(this.map, { 
        shapeOptions: { color: "#3388ff" } 
      }),
      marker: new L.Draw.Marker(this.map)
    };
  },

  // Initialize UI components
  initUIComponents: function() {
    this.initToolbar();
    this.initLayersPanel();
    this.initBaseLayerDropdown();
  },

  // Initialize toolbar buttons
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
    document.getElementById("toggleLayersPanel").addEventListener("click", e => {
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

  // Initialize layers panel and controls
  initLayersPanel: function() {
    const drawToLayerSelect = document.getElementById("drawToLayer");

    drawToLayerSelect.addEventListener("change", e => {
      const selectedLayer = e.target.value;
      if (this.layers[selectedLayer]) {
        this.activeLayer = this.layers[selectedLayer];
        console.log("Active layer changed to:", selectedLayer);
      }
    });

    // Update layer select with initial layers
    this.updateDrawToLayerSelect();
  },

  // Initialize base layer dropdown
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

  // Initialize event handlers
  initEventHandlers: function() {
    // Draw created event - handles new geometries
    this.map.on("draw:created", e => {
      console.log("Draw created event fired:", e);
      const layer = e.layer;

      if (!this.activeLayer) {
        alert("Please select a layer to draw on");
        return;
      }

      // For polygons, ensure they're closed
      if (e.layerType === "polygon" && layer.getLatLngs) {
        const coords = layer.getLatLngs()[0];
        if (coords.length > 0 && !coords[0].equals(coords[coords.length - 1])) {
          coords.push(coords[0]);
          layer.setLatLngs(coords);
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
      .addEventListener("click", () => this.showNewLocationModal());

    document.querySelector("#fileMenu .menu-dropdown-item:nth-child(2)")
      .addEventListener("click", () => this.showSwitchLocationModal());

    document.querySelector("#fileMenu .menu-dropdown-item:nth-child(3)")
      .addEventListener("click", () => this.saveToDatabase());
  },

  // Activate a specific drawing tool
  activateDrawingTool: function(toolName) {
    this.deactivateAllDrawingTools();

    if (this.drawingTools[toolName] && typeof this.drawingTools[toolName].enable === "function") {
      this.drawingTools[toolName].enable();
      document.getElementById(`draw${toolName.charAt(0).toUpperCase() + toolName.slice(1)}`)
        .classList.add("active");
      this.isDrawing = true;
    }
  },

  // Deactivate all drawing tools
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

  // Enable select mode for features
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

  // Open edit popup for a feature
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

  // Update the Draw To Layer select dropdown
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

  // Update the layer control panel
  updateLayerControl: function() {
    const layerControl = document.getElementById("layerControl");
    if (!layerControl) return;

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

      // Add checkbox change handler
      const checkbox = item.querySelector(`#layer-${name}`);
      checkbox.addEventListener("change", e => {
        if (e.target.checked) {
          this.map.addLayer(layer);
        } else {
          this.map.removeLayer(layer);
        }
      });

      // Add edit button handler
      const editBtn = item.querySelector(".edit-layer-btn");
      editBtn.addEventListener("click", () => {
        this.editLayer(name);
      });

      layerControl.appendChild(item);
    });
  },

  // Edit a layer's properties
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

  // Show dialog to create a new layer
  showAddLayerModal: function() {
    document.getElementById("addLayerModal").style.display = "block";
  },

  // Close the add layer modal
  closeAddLayerModal: function() {
    document.getElementById("addLayerModal").style.display = "none";
    document.getElementById("newLayerName").value = "";
  },

  // Create a new layer from the modal
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

  // Show modal to switch locations
  showSwitchLocationModal: async function() {
    document.getElementById("switchLocationModal").style.display = "block";

    try {
      const response = await fetch("/api/locations");
      const data = await response.json();

      const locationList = document.getElementById("locationList");
      locationList.innerHTML = "";

      if (data.locations && data.locations.length > 0) {
        data.locations.forEach(location => {
          const div = document.createElement("div");
          div.style.padding = "10px";
          div.style.borderBottom = "1px solid #eee";
          div.style.cursor = "pointer";

          div.innerHTML = `${location.name} (Created: ${location.created_at})`;

          div.addEventListener("click", () => {
            this.switchToLocation(location.id);
          });

          locationList.appendChild(div);
        });
      } else {
        locationList.innerHTML = "<p>No locations found</p>";
      }
    } catch (error) {
      console.error("Error loading locations:", error);
      document.getElementById("locationList").innerHTML = 
        "<p>Failed to load locations. Please try again.</p>";
    }
  },

  // Close the switch location modal
  closeSwitchLocationModal: function() {
    document.getElementById("switchLocationModal").style.display = "none";
  },

  // Switch to a different location
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
              const featureLayer = L.geoJSON(feature);
              featureLayer.feature = feature;

              // Set facility type styling for loaded features
              if (feature.properties && feature.properties.typeCode) {
                const typeCode = feature.properties.typeCode;
                if (typeCode.toUpperCase().includes("PES")) {
                  featureLayer.setStyle({ color: "#ff0000", fillColor: "#ff6666", weight: 2, fillOpacity: 0.5 });
                } else if (typeCode.toUpperCase().includes("ES")) {
                  featureLayer.setStyle({ color: "#00cc00", fillColor: "#66ff66", weight: 2, fillOpacity: 0.5 });
                }
              }

              // Add tooltip if name exists
              if (feature.properties && feature.properties.name) {
                featureLayer.bindTooltip(
                  feature.properties.name + 
                  (feature.properties.typeCode ? `<br>${feature.properties.typeCode}` : ""),
                  { permanent: false }
                );
              }

              layer.addLayer(featureLayer);
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

  // Load layers from database
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

  // Save layers to database
  saveToDatabase: async function() {
    try {
      const layerData = { layers: {} };

      Object.entries(this.layers).forEach(([name, layer]) => {
        const features = [];

        layer.eachLayer(sublayer => {
          if (sublayer.toGeoJSON) {
            const feature = sublayer.toGeoJSON();
            if (sublayer.feature && sublayer.feature.properties) {
              feature.properties = sublayer.feature.properties;
            }
            features.push(feature);
          }
        });

        layerData.layers[name] = {
          properties: layer.properties || {},
          features: features
        };
      });

      const response = await fetch("/api/save-layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(layerData)
      });

      if (!response.ok) throw new Error("Save failed");

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

  // Make functions available globally for HTML event handlers
  window.toggleMenu = function(element, menuId) {
    const dropdown = document.getElementById(menuId);
    if (!dropdown) return;

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

    // Position dropdown
    if (!isVisible) {
      const rect = element.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.left = `${rect.left}px`;
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