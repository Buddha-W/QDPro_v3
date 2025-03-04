// Ensures the map is properly initialized before other scripts try to access it
window.mapInitialized = false;

function checkMapInitialization() {
    if (!window.map) {
        console.warn("Map not initialized yet!");
        return false;
    }

    // Make sure map has all necessary methods for our application
    if (typeof window.map.addLayer !== 'function') {
        console.warn("Map initialized but missing addLayer method!");
        return false;
    }

    if (typeof window.map.on !== 'function') {
        console.warn("Map initialized but missing event handling (on method)!");
        return false;
    }

    // If we reach here, map is properly initialized
    window.mapInitialized = true;
    console.log("Map initialization verified successfully");

    // Initialize drawn items layer if not already done
    if (!window.drawnItems) {
        try {
            window.drawnItems = new L.FeatureGroup();
            window.map.addLayer(window.drawnItems);
            console.log("Added drawn items layer during initialization check");
        } catch (e) {
            console.error("Error creating drawn items layer:", e);
        }
    }

    return true;
}

// Make sure window.map is defined globally
window.map = null;

// Execute this after map is loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded, checking for map...");

    // Try to find the map if it's initialized in site_plan.html
    if (typeof L !== 'undefined' && document.getElementById('map')) {
        // Check if map was already created in site_plan.html
        if (!window.map && typeof L.map === 'function') {
            console.log("Creating map fallback instance");
            window.map = L.map('map').setView([39.8283, -98.5795], 4);

            // Add a default base layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '© OpenStreetMap contributors'
            }).addTo(window.map);
        }
    }

    // Try to verify map initialization
    const initCheck = setInterval(function() {
        console.log("Checking map initialization...");
        if (window.map) {
            if (checkMapInitialization()) {
                clearInterval(initCheck);
                // Initialize UI controls after map is fully loaded
                if (window.initializeUIControls && typeof window.initializeUIControls === 'function') {
                    console.log("Found UI controls initialization function, calling it now");
                    try {
                        window.initializeUIControls();
                        console.log("UI controls initialized via callback");
                    } catch (e) {
                        console.error("Error initializing UI controls:", e);
                    }
                } else {
                    console.warn("UI controls initialization function not found");
                    // Define a simple fallback if needed
                    window.initializeUIControls = function() {
                        console.log("Fallback UI initialization from map-init.js");
                        
                        // Remove default zoom control first
                        if (window.map && window.map.zoomControl) {
                            window.map.removeControl(window.map.zoomControl);
                        }
                        
                        setTimeout(function() {
                            if (typeof setupToolButtons === 'function') {
                                try {
                                    setupToolButtons();
                                    
                                    // Add zoom controls to toolbar
                                    const toolbarContainer = document.getElementById('toolbar-container');
                                    if (toolbarContainer) {
                                        const zoomControls = document.createElement('div');
                                        zoomControls.className = 'toolbar-group';
                                        
                                        const zoomInBtn = document.createElement('button');
                                        zoomInBtn.className = 'toolbar-button';
                                        zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
                                        zoomInBtn.title = 'Zoom In';
                                        zoomInBtn.onclick = function() {
                                            if (window.map) window.map.zoomIn();
                                        };
                                        
                                        const zoomOutBtn = document.createElement('button');
                                        zoomOutBtn.className = 'toolbar-button';
                                        zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
                                        zoomOutBtn.title = 'Zoom Out';
                                        zoomOutBtn.onclick = function() {
                                            if (window.map) window.map.zoomOut();
                                        };
                                        
                                        zoomControls.appendChild(zoomInBtn);
                                        zoomControls.appendChild(zoomOutBtn);
                                        toolbarContainer.appendChild(zoomControls);
                                    }
                                } catch (e) {
                                    console.error("Error setting up tool buttons:", e);
                                }
                            } {
                                try {
                                    setupToolButtons();
                                    console.log("Tool buttons set up successfully");
                                    
                                    // Add zoom control to toolbar
                                    const toolbarContainer = document.getElementById('toolbar-container');
                                    if (toolbarContainer) {
                                        const zoomInButton = document.createElement('button');
                                        zoomInButton.className = 'toolbar-button';
                                        zoomInButton.title = 'Zoom In';
                                        zoomInButton.innerHTML = '<i class="fas fa-search-plus"></i> Zoom In';
                                        zoomInButton.onclick = function() {
                                            if (window.map) window.map.zoomIn();
                                        };

                                        const zoomOutButton = document.createElement('button');
                                        zoomOutButton.className = 'toolbar-button';
                                        zoomOutButton.title = 'Zoom Out';
                                        zoomOutButton.innerHTML = '<i class="fas fa-search-minus"></i> Zoom Out';
                                        zoomOutButton.onclick = function() {
                                            if (window.map) window.map.zoomOut();
                                        };

                                        const resetViewButton = document.createElement('button');
                                        resetViewButton.className = 'toolbar-button';
                                        resetViewButton.title = 'Reset View';
                                        resetViewButton.innerHTML = '<i class="fas fa-globe"></i> Reset View';
                                        resetViewButton.onclick = function() {
                                            if (window.map) window.map.setView([39.8283, -98.5795], 4);
                                        };

                                        toolbarContainer.appendChild(zoomInButton);
                                        toolbarContainer.appendChild(zoomOutButton);
                                        toolbarContainer.appendChild(resetViewButton);
                                    }
                                    
                                    // Enable menu items explicitlyy
                                    const menuItems = document.querySelectorAll('.menu-item, .dropdown-item');
                                    menuItems.forEach(item => {
                                        item.classList.remove('disabled');
                                    });
                                    
                                    // Make sure the file menu works
                                    const fileMenu = document.getElementById('file-menu');
                                    if (fileMenu) {
                                        fileMenu.onclick = function(e) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const dropdown = this.querySelector('.dropdown-content');
                                            if (dropdown) {
                                                // Close any other open dropdowns first
                                                document.querySelectorAll('.dropdown-content').forEach(d => {
                                                    if (d !== dropdown && d.style.display === 'block') {
                                                        d.style.display = 'none';
                                                    }
                                                });
                                                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
                                            }
                                        };
                                    }
                                    
                                    // Setup all dropdown menu items
                                    const dropdownItems = document.querySelectorAll('.dropdown-item');
                                    dropdownItems.forEach(item => {
                                        item.addEventListener('click', function(e) {
                                            e.stopPropagation();
                                            // Get the parent dropdown to close it after action
                                            const dropdown = this.closest('.dropdown-content');
                                            if (dropdown) {
                                                setTimeout(() => {
                                                    dropdown.style.display = 'none';
                                                }, 100);
                                            }
                                        });
                                    });
                                } catch (e) {
                                    console.error("Error setting up tool buttons:", e);
                                }
                            } else {
                                console.error("setupToolButtons not found");
                            }
                        }, 500); // Increased timeout for better reliability
                    };
                    window.initializeUIControls();
                }
            }
        }
    }, 500);

    // Timeout after 10 seconds if map doesn't initialize
    setTimeout(function() {
        if (!window.mapInitialized) {
            console.error("Map failed to initialize within timeout period");
            clearInterval(initCheck);
        }
    }, 10000);
});

// Make the map globally accessible
window.getMap = function() {
    return window.map;
}

// Initialize UI controls when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing UI...");
    
    // Setup close buttons for all dialogs
    const closeButtons = document.querySelectorAll('.close-dialog');
    closeButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            const dialog = this.closest('.dialog');
            if (dialog) {
                dialog.style.display = 'none';
            }
        });
    });
    
    // File menu dropdown toggle
    const fileMenu = document.getElementById('file-menu');
    if (fileMenu) {
        fileMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('file-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        });
    }
    
    // Close all dropdowns when clicking outside
    document.addEventListener('click', function() {
        const dropdowns = document.querySelectorAll('.dropdown-content');
        dropdowns.forEach(function(dropdown) {
            dropdown.classList.remove('show');
        });
    });
});;