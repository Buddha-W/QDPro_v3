
/**
 * UI Controls for QDPro application
 * Handles user interface interactions, toolbar functionality,
 * and layer management
 */

// Initialize UI controls when DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
    if (!window.map) {
        console.error("Map is not initialized.");
        return;
    }

    const toolButtons = {
        polygon: document.getElementById("draw-polygon-btn"),
        rectangle: document.getElementById("draw-rectangle-btn"),
        marker: document.getElementById("draw-marker-btn"),
        edit: document.getElementById("edit-layer-btn"),
        delete: document.getElementById("delete-layer-btn"),
        measure: document.getElementById("measure-tool-btn"),
        clearMeasure: document.getElementById("clear-measure-btn")
    };

    let activeDrawHandler = null;
    let activeTool = null;

    // Create a drawn items group if not already present
    window.drawnItems = window.drawnItems || new L.FeatureGroup();
    if (!window.map.hasLayer(window.drawnItems)) {
        window.map.addLayer(window.drawnItems);
    }

    function disableAllTools() {
        Object.values(toolButtons).forEach((btn) => {
            if (btn) btn.classList.remove("active");
        });

        if (activeDrawHandler) {
            activeDrawHandler.disable();
            activeDrawHandler = null;
        }

        activeTool = null;

        // Remove any lingering UI
        setTimeout(() => {
            document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
        }, 10);
    }

    function toggleDrawing(toolType) {
        if (activeTool === toolType) {
            disableAllTools();
            return;
        }

        disableAllTools();
        
        if (toolButtons[toolType]) {
            toolButtons[toolType].classList.add("active");
        }
        
        activeTool = toolType;
        
        switch(toolType) {
            case 'polygon':
                activeDrawHandler = new L.Draw.Polygon(window.map, {
                    shapeOptions: {
                        color: '#4a69bd',
                        fillOpacity: 0.3
                    }
                });
                activeDrawHandler.enable();
                break;
                
            case 'rectangle':
                activeDrawHandler = new L.Draw.Rectangle(window.map, {
                    shapeOptions: {
                        color: '#4a69bd',
                        fillOpacity: 0.3
                    }
                });
                activeDrawHandler.enable();
                break;
                
            case 'marker':
                activeDrawHandler = new L.Draw.Marker(window.map);
                activeDrawHandler.enable();
                break;
                
            case 'edit':
                activeDrawHandler = new L.EditToolbar.Edit(window.map, {
                    featureGroup: window.drawnItems
                });
                activeDrawHandler.enable();
                break;
                
            case 'delete':
                activeDrawHandler = new L.EditToolbar.Delete(window.map, {
                    featureGroup: window.drawnItems
                });
                activeDrawHandler.enable();
                break;
                
            case 'measure':
                // Implementation for measurement tool would go here
                console.log("Measure tool activated");
                break;
                
            case 'clearMeasure':
                // Implementation to clear measurements would go here
                console.log("Measurements cleared");
                break;
        }
    }

    // Attach click handlers to toolbar buttons
    if (toolButtons.polygon) {
        toolButtons.polygon.addEventListener("click", () => toggleDrawing("polygon"));
    }
    
    if (toolButtons.rectangle) {
        toolButtons.rectangle.addEventListener("click", () => toggleDrawing("rectangle"));
    }
    
    if (toolButtons.marker) {
        toolButtons.marker.addEventListener("click", () => toggleDrawing("marker"));
    }
    
    if (toolButtons.edit) {
        toolButtons.edit.addEventListener("click", () => toggleDrawing("edit"));
    }
    
    if (toolButtons.delete) {
        toolButtons.delete.addEventListener("click", () => toggleDrawing("delete"));
    }
    
    if (toolButtons.measure) {
        toolButtons.measure.addEventListener("click", () => toggleDrawing("measure"));
    }
    
    if (toolButtons.clearMeasure) {
        toolButtons.clearMeasure.addEventListener("click", () => toggleDrawing("clearMeasure"));
    }

    // Setup event handlers for map drawing events
    window.map.on(L.Draw.Event.CREATED, function (e) {
        const layer = e.layer;
        window.drawnItems.addLayer(layer);
        
        // Open properties modal for the newly created feature
        openEditPopup(layer);
        
        // Update the layers list
        updateLayersList();
        
        // Deactivate the drawing tool
        disableAllTools();
    });

    window.map.on(L.Draw.Event.EDITED, function () {
        updateLayersList();
    });

    window.map.on(L.Draw.Event.DELETED, function () {
        updateLayersList();
    });

    // Setup UI for menu items
    setupMenuItems();
    
    // Track mouse position on map for coordinate display
    window.map.on("mousemove", function (e) {
        const coords = e.latlng;
        const coordDisplay = document.getElementById("coordinates-display");
        if (coordDisplay) {
            coordDisplay.textContent = `Coordinates: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
        }
    });

    // Deactivate drawing when clicking elsewhere on the map
    window.map.on("click", function () {
        disableAllTools();
    });

    // 🔥 Remove sub-buttons permanently
    setTimeout(() => {
        document.querySelectorAll(".leaflet-draw-toolbar, .leaflet-draw-actions, .leaflet-draw-tooltip").forEach(el => el.remove());
    }, 500);
    
    // Initial update of the layers list
    updateLayersList();
});

// Function to open a popup for editing a shape's properties
function openEditPopup(layer) {
    console.log("Opening edit popup for layer:", layer);
    
    // Get the modal elements
    const modal = document.getElementById("feature-properties-modal");
    const nameInput = document.getElementById("feature-name");
    const descInput = document.getElementById("feature-description");
    const featureType = document.getElementById("feature-type");
    const additionalProps = document.getElementById("additional-properties");
    
    // Clear any existing additional fields
    additionalProps.innerHTML = "";
    
    // Pre-fill values if the layer has properties
    if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        nameInput.value = props.name || "";
        descInput.value = props.description || "";
        featureType.value = props.type || "facility";
        
        // Add additional fields based on feature type
        addAdditionalFields(props.type || "facility", props);
    } else {
        // Default values for new features
        nameInput.value = "";
        descInput.value = "";
        featureType.value = "facility";
        
        // Add default additional fields
        addAdditionalFields("facility");
    }
    
    // Event handler for type selection changes
    featureType.addEventListener("change", function() {
        addAdditionalFields(this.value);
    });
    
    // Show the modal
    modal.style.display = "block";
    
    // Handle close button
    const closeBtn = modal.querySelector(".modal-close");
    closeBtn.onclick = function() {
        modal.style.display = "none";
    };
    
    // Handle save button
    const saveBtn = document.getElementById("save-properties");
    saveBtn.onclick = function() {
        saveProperties(layer, modal);
    };
    
    // Handle cancel button
    const cancelBtn = document.getElementById("cancel-properties");
    cancelBtn.onclick = function() {
        modal.style.display = "none";
    };
    
    // Close modal when clicking outside
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
}

// Function to add additional fields based on feature type
function addAdditionalFields(type, existingProps = {}) {
    const container = document.getElementById("additional-properties");
    container.innerHTML = "";
    
    switch(type) {
        case "facility":
            // Add facility-specific fields
            addField(container, "facility_number", "Facility Number", existingProps.facility_number || "");
            addField(container, "category_code", "Category Code", existingProps.category_code || "");
            break;
            
        case "explosive_site":
            // Add explosive site-specific fields
            addField(container, "net_explosive_weight", "Net Explosive Weight (lbs)", existingProps.net_explosive_weight || "");
            addField(container, "k_factor", "K Factor", existingProps.k_factor || "50");
            
            // Hazard type dropdown
            const hazardTypes = ["1.1", "1.2", "1.3", "1.4", "1.5", "1.6"];
            addSelectField(container, "hazard_type", "Hazard Type", hazardTypes, existingProps.hazard_type || "1.1");
            
            // Organization type
            const orgTypes = ["DOD", "DOE"];
            addSelectField(container, "organization_type", "Organization Type", orgTypes, existingProps.organization_type || "DOD");
            break;
            
        case "building":
            // Add building-specific fields
            addField(container, "building_number", "Building Number", existingProps.building_number || "");
            addField(container, "building_type", "Building Type", existingProps.building_type || "");
            addField(container, "occupancy", "Occupancy", existingProps.occupancy || "");
            break;
            
        case "other":
            // Generic fields for other types
            addField(container, "custom_type", "Type", existingProps.custom_type || "");
            addField(container, "notes", "Notes", existingProps.notes || "");
            break;
    }
}

// Helper function to add a text input field
function addField(container, id, label, value) {
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";
    
    const fieldLabel = document.createElement("label");
    fieldLabel.className = "form-label";
    fieldLabel.htmlFor = id;
    fieldLabel.textContent = label;
    
    const input = document.createElement("input");
    input.type = "text";
    input.className = "form-control";
    input.id = id;
    input.value = value;
    
    formGroup.appendChild(fieldLabel);
    formGroup.appendChild(input);
    container.appendChild(formGroup);
}

// Helper function to add a select dropdown field
function addSelectField(container, id, label, options, selectedValue) {
    const formGroup = document.createElement("div");
    formGroup.className = "form-group";
    
    const fieldLabel = document.createElement("label");
    fieldLabel.className = "form-label";
    fieldLabel.htmlFor = id;
    fieldLabel.textContent = label;
    
    const select = document.createElement("select");
    select.className = "form-control";
    select.id = id;
    
    options.forEach(option => {
        const optionElem = document.createElement("option");
        optionElem.value = option;
        optionElem.textContent = option;
        if (option === selectedValue) {
            optionElem.selected = true;
        }
        select.appendChild(optionElem);
    });
    
    formGroup.appendChild(fieldLabel);
    formGroup.appendChild(select);
    container.appendChild(formGroup);
}

// Function to save properties from modal to layer
function saveProperties(layer, modal) {
    const nameInput = document.getElementById("feature-name");
    const descInput = document.getElementById("feature-description");
    const featureType = document.getElementById("feature-type");
    
    // Create or update the feature property
    if (!layer.feature) {
        layer.feature = { type: "Feature", properties: {} };
    }
    
    // Set basic properties
    layer.feature.properties = {
        name: nameInput.value,
        description: descInput.value,
        type: featureType.value
    };
    
    // Get additional properties based on feature type
    switch(featureType.value) {
        case "facility":
            layer.feature.properties.facility_number = document.getElementById("facility_number").value;
            layer.feature.properties.category_code = document.getElementById("category_code").value;
            break;
            
        case "explosive_site":
            layer.feature.properties.net_explosive_weight = document.getElementById("net_explosive_weight").value;
            layer.feature.properties.k_factor = document.getElementById("k_factor").value;
            layer.feature.properties.hazard_type = document.getElementById("hazard_type").value;
            layer.feature.properties.organization_type = document.getElementById("organization_type").value;
            break;
            
        case "building":
            layer.feature.properties.building_number = document.getElementById("building_number").value;
            layer.feature.properties.building_type = document.getElementById("building_type").value;
            layer.feature.properties.occupancy = document.getElementById("occupancy").value;
            break;
            
        case "other":
            layer.feature.properties.custom_type = document.getElementById("custom_type").value;
            layer.feature.properties.notes = document.getElementById("notes").value;
            break;
    }
    
    // Update the popup if it's a marker
    if (layer instanceof L.Marker) {
        layer.bindPopup(nameInput.value);
    }
    
    // Close the modal
    modal.style.display = "none";
    
    // Update the layers list
    updateLayersList();
}

// Setup menu items
function setupMenuItems() {
    // New project
    const newProjectBtn = document.getElementById("new-project-btn");
    const newProjectModal = document.getElementById("new-project-modal");
    
    if (newProjectBtn) {
        newProjectBtn.addEventListener("click", function() {
            if (newProjectModal) {
                newProjectModal.style.display = "block";
            }
        });
    }
    
    // Open project
    const openProjectBtn = document.getElementById("open-project-btn");
    const openProjectModal = document.getElementById("open-project-modal");
    
    if (openProjectBtn) {
        openProjectBtn.addEventListener("click", function() {
            if (openProjectModal) {
                // Load projects from server before showing modal
                loadProjects();
                openProjectModal.style.display = "block";
            }
        });
    }
    
    // Save project
    const saveProjectBtn = document.getElementById("save-project-btn");
    
    if (saveProjectBtn) {
        saveProjectBtn.addEventListener("click", function() {
            saveProject();
        });
    }
    
    // QD Analysis
    const runQdAnalysisBtn = document.getElementById("run-qd-analysis-btn");
    const qdAnalysisModal = document.getElementById("qd-analysis-modal");
    
    if (runQdAnalysisBtn) {
        runQdAnalysisBtn.addEventListener("click", function() {
            if (qdAnalysisModal) {
                runQDAnalysis();
                qdAnalysisModal.style.display = "block";
            }
        });
    }
    
    // Close buttons for all modals
    document.querySelectorAll(".modal-close").forEach(closeBtn => {
        closeBtn.addEventListener("click", function() {
            this.closest(".modal").style.display = "none";
        });
    });
    
    // Close modals when clicking outside
    window.addEventListener("click", function(event) {
        if (event.target.classList.contains("modal")) {
            event.target.style.display = "none";
        }
    });
}

// Function to update the layers list
function updateLayersList() {
    const layersList = document.getElementById("layers-list");
    if (!layersList || !window.drawnItems) return;
    
    // Clear existing layers
    layersList.innerHTML = "";
    
    // Add each layer to the list
    window.drawnItems.eachLayer(function(layer) {
        const layerItem = document.createElement("li");
        layerItem.className = "layer-item";
        
        // Get layer name from properties or use a default
        const layerName = layer.feature && layer.feature.properties && layer.feature.properties.name 
            ? layer.feature.properties.name 
            : "Unnamed Layer";
        
        const layerType = layer.feature && layer.feature.properties && layer.feature.properties.type
            ? layer.feature.properties.type
            : getLayerTypeFromShape(layer);
        
        layerItem.innerHTML = `
            <span class="layer-name">${layerName} (${layerType})</span>
            <div class="layer-controls">
                <button class="layer-control-btn layer-edit"><i class="fas fa-edit"></i></button>
                <button class="layer-control-btn layer-center"><i class="fas fa-crosshairs"></i></button>
                <button class="layer-control-btn layer-delete"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        // Add event listeners for layer controls
        layerItem.querySelector(".layer-edit").addEventListener("click", function() {
            openEditPopup(layer);
        });
        
        layerItem.querySelector(".layer-center").addEventListener("click", function() {
            centerOnLayer(layer);
        });
        
        layerItem.querySelector(".layer-delete").addEventListener("click", function() {
            window.drawnItems.removeLayer(layer);
            updateLayersList();
        });
        
        // Add event listener for selecting the layer
        layerItem.addEventListener("click", function(e) {
            if (!e.target.closest(".layer-controls")) {
                // Select this layer
                selectLayer(layer);
                
                // Update UI to show selection
                document.querySelectorAll('.layer-item').forEach(item => {
                    item.classList.remove('selected');
                });
                layerItem.classList.add('selected');
            }
        });

        layersList.appendChild(layerItem);
    });
}

// Helper function to get layer type based on its shape
function getLayerTypeFromShape(layer) {
    if (layer instanceof L.Marker) {
        return "Point";
    } else if (layer instanceof L.Polygon) {
        if (isRectangle(layer)) {
            return "Rectangle";
        }
        return "Polygon";
    } else if (layer instanceof L.Polyline) {
        return "Line";
    } else if (layer instanceof L.Circle) {
        return "Circle";
    }
    return "Other";
}

// Helper function to check if a polygon is a rectangle
function isRectangle(layer) {
    if (!(layer instanceof L.Polygon)) {
        return false;
    }
    
    const latlngs = layer.getLatLngs()[0];
    if (latlngs.length !== 4) {
        return false;
    }
    
    // Check if opposite sides are parallel
    // Note: This is a simplified check and may not be 100% accurate
    return true;
}

// Function to center map on a layer
function centerOnLayer(layer) {
    if (layer instanceof L.Marker) {
        window.map.setView(layer.getLatLng(), 16);
    } else {
        window.map.fitBounds(layer.getBounds());
    }
}

// Function to select a layer and display its properties
function selectLayer(layer) {
    const propertiesContent = document.getElementById("properties-content");
    if (!propertiesContent) return;
    
    if (layer.feature && layer.feature.properties) {
        const props = layer.feature.properties;
        let html = `
            <div class="property-item">
                <div class="property-label">Name:</div>
                <div class="property-value">${props.name || "Unnamed"}</div>
            </div>
            <div class="property-item">
                <div class="property-label">Type:</div>
                <div class="property-value">${props.type || "Unknown"}</div>
            </div>
            <div class="property-item">
                <div class="property-label">Description:</div>
                <div class="property-value">${props.description || "No description"}</div>
            </div>
        `;
        
        // Add type-specific properties
        switch(props.type) {
            case "facility":
                html += `
                    <div class="property-item">
                        <div class="property-label">Facility Number:</div>
                        <div class="property-value">${props.facility_number || "Not specified"}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">Category Code:</div>
                        <div class="property-value">${props.category_code || "Not specified"}</div>
                    </div>
                `;
                break;
                
            case "explosive_site":
                html += `
                    <div class="property-item">
                        <div class="property-label">NEW (lbs):</div>
                        <div class="property-value">${props.net_explosive_weight || "Not specified"}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">K Factor:</div>
                        <div class="property-value">${props.k_factor || "50"}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">Hazard Type:</div>
                        <div class="property-value">${props.hazard_type || "Not specified"}</div>
                    </div>
                    <div class="property-item">
                        <div class="property-label">Organization:</div>
                        <div class="property-value">${props.organization_type || "Not specified"}</div>
                    </div>
                `;
                break;
        }
        
        html += `
            <div class="property-actions">
                <button id="edit-selected-feature" class="btn btn-primary">Edit Properties</button>
            </div>
        `;
        
        propertiesContent.innerHTML = html;
        
        // Add event listener for edit button
        const editBtn = document.getElementById("edit-selected-feature");
        if (editBtn) {
            editBtn.addEventListener("click", function() {
                openEditPopup(layer);
            });
        }
    } else {
        propertiesContent.innerHTML = `<p class="no-selection-message">No properties available for this feature</p>`;
    }
}

// Function to load projects from server
function loadProjects() {
    const projectSelect = document.getElementById("project-select");
    if (!projectSelect) return;
    
    // Clear existing options
    projectSelect.innerHTML = "";
    
    // Make API call to get projects
    fetch("/api/projects")
        .then(response => response.json())
        .then(data => {
            if (data.projects && data.projects.length > 0) {
                data.projects.forEach(project => {
                    const option = document.createElement("option");
                    option.value = project.id;
                    option.textContent = project.name;
                    projectSelect.appendChild(option);
                });
            } else {
                const option = document.createElement("option");
                option.textContent = "No projects found";
                option.disabled = true;
                projectSelect.appendChild(option);
            }
        })
        .catch(error => {
            console.error("Error loading projects:", error);
            const option = document.createElement("option");
            option.textContent = "Error loading projects";
            option.disabled = true;
            projectSelect.appendChild(option);
        });
}

// Function to save current project
function saveProject() {
    // Gather project data
    const layersData = [];
    
    window.drawnItems.eachLayer(function(layer) {
        const geoJson = layer.toGeoJSON();
        layersData.push(geoJson);
    });
    
    const projectData = {
        name: "Current Project", // You might want to get this from elsewhere
        layers: layersData
    };
    
    // Send to server
    fetch("/api/save-project", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(projectData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Project saved successfully!");
            } else {
                alert("Error saving project: " + data.message);
            }
        })
        .catch(error => {
            console.error("Error saving project:", error);
            alert("Error saving project");
        });
}

// Function to run QD analysis
function runQDAnalysis() {
    const resultsContainer = document.getElementById("analysis-results");
    if (!resultsContainer) return;
    
    // Collect explosive sites data
    const explosiveSites = [];
    window.drawnItems.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties && layer.feature.properties.type === "explosive_site") {
            explosiveSites.push({
                id: layer._leaflet_id,
                name: layer.feature.properties.name || "Unnamed",
                new_lbs: layer.feature.properties.net_explosive_weight || 0,
                k_factor: layer.feature.properties.k_factor || 50,
                hazard_type: layer.feature.properties.hazard_type || "1.1",
                coordinates: layer instanceof L.Marker ? 
                    [layer.getLatLng().lat, layer.getLatLng().lng] : 
                    layer.getCenter ? [layer.getCenter().lat, layer.getCenter().lng] : null
            });
        }
    });
    
    // Collect potential explosion sites (buildings, facilities, etc.)
    const exposedSites = [];
    window.drawnItems.eachLayer(function(layer) {
        if (layer.feature && layer.feature.properties && 
            (layer.feature.properties.type === "facility" || layer.feature.properties.type === "building")) {
            exposedSites.push({
                id: layer._leaflet_id,
                name: layer.feature.properties.name || "Unnamed",
                type: layer.feature.properties.type,
                coordinates: layer instanceof L.Marker ? 
                    [layer.getLatLng().lat, layer.getLatLng().lng] : 
                    layer.getCenter ? [layer.getCenter().lat, layer.getCenter().lng] : null
            });
        }
    });
    
    // If no explosive sites, show message
    if (explosiveSites.length === 0) {
        resultsContainer.innerHTML = "<p>No explosive sites found for analysis. Add explosive sites to the map first.</p>";
        return;
    }
    
    // If no exposed sites, show message
    if (exposedSites.length === 0) {
        resultsContainer.innerHTML = "<p>No facilities or buildings found for analysis. Add facilities or buildings to the map first.</p>";
        return;
    }
    
    // Simulate analysis (in a real app, you'd call your backend)
    // Just showing a sample UI here
    let html = `
        <h4>QD Analysis Results</h4>
        <p>Analysis performed on ${explosiveSites.length} explosive sites and ${exposedSites.length} exposed sites.</p>
        
        <table class="analysis-table">
            <thead>
                <tr>
                    <th>Explosive Site</th>
                    <th>Exposed Site</th>
                    <th>Distance (ft)</th>
                    <th>Required Distance (ft)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // For demo purposes, generating some results
    explosiveSites.forEach(expSite => {
        exposedSites.forEach(site => {
            // Calculate distance (simplified)
            const distance = calculateDistance(expSite.coordinates, site.coordinates);
            
            // Calculate required distance based on NEW and K-factor
            const requiredDistance = Math.round(expSite.k_factor * Math.pow(parseFloat(expSite.new_lbs), 1/3));
            
            // Determine status
            const status = distance >= requiredDistance ? "Pass" : "Fail";
            const statusClass = status === "Pass" ? "status-pass" : "status-fail";
            
            html += `
                <tr>
                    <td>${expSite.name} (${expSite.new_lbs} lbs)</td>
                    <td>${site.name} (${site.type})</td>
                    <td>${Math.round(distance)}</td>
                    <td>${requiredDistance}</td>
                    <td class="${statusClass}">${status}</td>
                </tr>
            `;
        });
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    resultsContainer.innerHTML = html;
}

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    // Convert lat/lng to meters using Haversine formula
    const R = 6371e3; // Earth radius in meters
    const φ1 = point1[0] * Math.PI/180;
    const φ2 = point2[0] * Math.PI/180;
    const Δφ = (point2[0] - point1[0]) * Math.PI/180;
    const Δλ = (point2[1] - point1[1]) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    
    // Convert to feet
    return d * 3.28084;
}

// Function to update location display
function updateLocationDisplay(locationName) {
    const displayElement = document.getElementById('current-location-display');
    if (displayElement) {
        displayElement.textContent = `Location: ${locationName || 'None'}`;
    }
}

// Expose functions to global scope
window.updateLayersList = updateLayersList;
window.updateLocationDisplay = updateLocationDisplay;
window.openEditPopup = openEditPopup;
