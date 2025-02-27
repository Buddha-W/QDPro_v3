
/**
 * Site Plan functionality for QDPro
 * Handles map initialization, base layers, and project interactions
 */

// Global variables
let map; // The Leaflet map
let baseLayers = {}; // Base tile layers
let currentProject = null; // Currently loaded project

// Initialize the map when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
});

// Initialize the Leaflet map
function initializeMap() {
    // Create the map with default view
    map = L.map('map', {
        center: [39.8283, -98.5795], // Center of the US
        zoom: 4,
        zoomControl: false, // We'll add this manually in a different position
    });
    
    // Add zoom control to top right
    L.control.zoom({
        position: 'topright'
    }).addTo(map);
    
    // Add base layers
    baseLayers = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }),
        
        'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        }),
        
        'Terrain': L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/terrain/{z}/{x}/{y}{r}.png', {
            attribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
    };
    
    // Add the default base layer
    baseLayers['OpenStreetMap'].addTo(map);
    
    // Create custom layer control
    createCustomLayerControl();
    
    // Create a feature group for drawn items
    window.drawnItems = new L.FeatureGroup();
    map.addLayer(window.drawnItems);
    
    // Set map in global scope for access from other scripts
    window.map = map;
    
    // Add scale control
    L.control.scale({
        imperial: true,
        metric: true,
        position: 'bottomright'
    }).addTo(map);
    
    // Initialize map events
    initMapEvents();
    
    console.log('Map initialized successfully');
}

// Create custom layer control instead of using Leaflet's default
function createCustomLayerControl() {
    const layerControlContainer = document.createElement('div');
    layerControlContainer.className = 'custom-layers-control';
    layerControlContainer.innerHTML = '<div class="panel-header">Base Maps</div>';
    
    const layersList = document.createElement('div');
    layersList.className = 'layers-options';
    
    // Add radio buttons for each base layer
    Object.keys(baseLayers).forEach(layerName => {
        const layerOption = document.createElement('div');
        layerOption.className = 'layer-toggle';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'base-layer';
        radio.id = `layer-${layerName}`;
        radio.className = 'layer-radio';
        radio.checked = layerName === 'OpenStreetMap'; // Set default
        
        const label = document.createElement('label');
        label.htmlFor = `layer-${layerName}`;
        label.textContent = layerName;
        
        layerOption.appendChild(radio);
        layerOption.appendChild(label);
        layersList.appendChild(layerOption);
        
        // Add event listener
        radio.addEventListener('change', function() {
            if (this.checked) {
                // Remove all base layers
                Object.values(baseLayers).forEach(layer => {
                    if (map.hasLayer(layer)) {
                        map.removeLayer(layer);
                    }
                });
                
                // Add selected layer
                map.addLayer(baseLayers[layerName]);
            }
        });
    });
    
    layerControlContainer.appendChild(layersList);
    
    // Add to the map
    const mapContainer = document.getElementById('map');
    mapContainer.appendChild(layerControlContainer);
}

// Initialize map event handlers
function initMapEvents() {
    // Update coordinates display on mouse move
    map.on('mousemove', function(e) {
        updateCoordinatesDisplay(e.latlng);
    });
    
    // Update scale display on zoom
    map.on('zoomend', function() {
        updateScaleDisplay();
    });
    
    // Handle drawing events
    map.on(L.Draw.Event.CREATED, function(e) {
        const layer = e.layer;
        window.drawnItems.addLayer(layer);
        
        // Initialize feature properties
        layer.feature = {
            type: 'Feature',
            properties: {}
        };
        
        // Open properties editor
        window.openEditPopup(layer);
    });
}

// Update coordinates display
function updateCoordinatesDisplay(latlng) {
    const coordinatesDisplay = document.getElementById('coordinates-display');
    if (coordinatesDisplay) {
        coordinatesDisplay.textContent = `Coordinates: ${latlng.lat.toFixed(6)}, ${latlng.lng.toFixed(6)}`;
    }
}

// Update scale display
function updateScaleDisplay() {
    const scaleDisplay = document.getElementById('scale-display');
    if (scaleDisplay) {
        const zoom = map.getZoom();
        const scale = Math.round(559082264.028 / Math.pow(2, zoom));
        scaleDisplay.textContent = `Scale ~1:${scale.toLocaleString()}`;
    }
}

// Setup event listeners for UI elements
function setupEventListeners() {
    // Toggle left panel
    const toggleLayersBtn = document.getElementById('toggle-layers-btn');
    if (toggleLayersBtn) {
        toggleLayersBtn.addEventListener('click', function() {
            const leftPanel = document.getElementById('left-panel');
            if (leftPanel) {
                leftPanel.classList.toggle('collapsed');
            }
        });
    }
    
    // New project form submission
    const createNewProjectBtn = document.getElementById('create-new-project');
    if (createNewProjectBtn) {
        createNewProjectBtn.addEventListener('click', function() {
            createNewProject();
        });
    }
    
    // Load project
    const loadProjectBtn = document.getElementById('load-project');
    if (loadProjectBtn) {
        loadProjectBtn.addEventListener('click', function() {
            loadSelectedProject();
        });
    }
    
    // Close buttons for modals
    document.querySelectorAll('.modal-close').forEach(button => {
        button.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Zoom buttons in View menu
    const zoomInBtn = document.getElementById('zoom-in-btn');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            map.zoomIn();
        });
    }
    
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            map.zoomOut();
        });
    }
}

// Create new project
function createNewProject() {
    const projectName = document.getElementById('project-name').value;
    const projectDescription = document.getElementById('project-description').value;
    const coordinateSystem = document.getElementById('coordinate-system').value;
    
    if (!projectName) {
        alert('Please enter a project name');
        return;
    }
    
    // Clear existing features
    window.drawnItems.clearLayers();
    
    // Create new project object
    currentProject = {
        name: projectName,
        description: projectDescription,
        coordinateSystem: coordinateSystem,
        created: new Date().toISOString()
    };
    
    // Update UI
    document.getElementById('current-location-display').textContent = `Project: ${projectName}`;
    
    // Close modal
    document.getElementById('new-project-modal').style.display = 'none';
    
    // Save to server
    saveProject(currentProject);
}

// Load selected project from dropdown
function loadSelectedProject() {
    const projectSelect = document.getElementById('project-select');
    if (!projectSelect) return;
    
    const projectId = projectSelect.value;
    if (!projectId) {
        alert('Please select a project');
        return;
    }
    
    // Close modal
    document.getElementById('open-project-modal').style.display = 'none';
    
    // Request project data from server
    fetch(`/api/project/${projectId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                loadProjectData(data.project);
            } else {
                alert('Error loading project: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error loading project:', error);
            alert('Error loading project');
        });
}

// Load project data into the map
function loadProjectData(project) {
    // Clear existing features
    window.drawnItems.clearLayers();
    
    currentProject = project;
    
    // Update UI
    document.getElementById('current-location-display').textContent = `Project: ${project.name}`;
    
    // Load features
    if (project.layers && project.layers.length > 0) {
        project.layers.forEach(layerData => {
            const layer = L.geoJSON(layerData, {
                onEachFeature: function(feature, layer) {
                    window.drawnItems.addLayer(layer);
                }
            });
        });
    }
    
    // Update layers list
    if (window.updateLayersList) {
        window.updateLayersList();
    }
    
    // Fit map to project extent if there are features
    if (window.drawnItems.getLayers().length > 0) {
        map.fitBounds(window.drawnItems.getBounds());
    }
}

// Save project to server
function saveProject(project) {
    // Gather layer data
    const layers = [];
    window.drawnItems.eachLayer(function(layer) {
        if (layer.toGeoJSON) {
            layers.push(layer.toGeoJSON());
        }
    });
    
    // Add layers to project object
    project.layers = layers;
    
    // Send to server
    fetch('/api/save-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(project)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Project saved successfully!');
                if (data.projectId) {
                    currentProject.id = data.projectId;
                }
            } else {
                alert('Error saving project: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error saving project:', error);
            alert('Error saving project');
        });
}

// Export functions to global scope
window.initializeMap = initializeMap;
window.createNewProject = createNewProject;
window.loadProjectData = loadProjectData;
window.saveProject = saveProject;
