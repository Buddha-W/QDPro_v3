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

            // Add the drawn items layer
            window.drawnItems = new L.FeatureGroup();
            window.map.addLayer(window.drawnItems);
            console.log("Added drawn items layer during initialization check");
        }

        // Verify the map is properly initialized
        if (window.map) {
            console.log("Map initialization verified successfully");
            window.mapInitialized = true;

            // Check if UI Controls initialization function exists and call it
            console.log("Checking UI controls initialization...");
            if (typeof initializeUIControls === 'function') {
                console.log("Found UI controls initialization function, calling it now");
                initializeUIControls();
            } else {
                // Define a simple fallback if needed
                window.initializeUIControls = function() {
                    console.log("Fallback UI initialization from map-init.js");

                    // Remove default zoom control first
                    if (window.map) {
                        window.map.removeControl(window.map.zoomControl);
                    }

                    setTimeout(function() {
                        if (typeof setupToolButtons === 'function') {
                            try {
                                setupToolButtons();
                                console.log("Tool buttons set up successfully");

                                // Add zoom control to toolbar
                                const toolbarContainer = document.getElementById('toolbar-container');
                                if (toolbarContainer) {
                                    const zoomInButton = document.createElement('button');
                                    zoomInButton.className = 'toolbar-button';
                                    zoomInButton.title = 'Zoom In';
                                    zoomInButton.innerHTML = '<i class="fas fa-search-plus"></i>';
                                    zoomInButton.onclick = function() {
                                        if (window.map) window.map.zoomIn();
                                    };

                                    const zoomOutButton = document.createElement('button');
                                    zoomOutButton.className = 'toolbar-button';
                                    zoomOutButton.title = 'Zoom Out';
                                    zoomOutButton.innerHTML = '<i class="fas fa-search-minus"></i>';
                                    zoomOutButton.onclick = function() {
                                        if (window.map) window.map.zoomOut();
                                    };

                                    toolbarContainer.appendChild(zoomInButton);
                                    toolbarContainer.appendChild(zoomOutButton);
                                }
                            } catch (e) {
                                console.error("Error setting up tool buttons:", e);
                            }
                        } else {
                            console.error("setupToolButtons not found");
                        }
                    }, 300); // Increased timeout for better reliability
                };
                window.initializeUIControls();
            }
        } else {
            console.error("Leaflet not loaded or map element not found");
        }
    }


    // Try to verify map initialization
    const initCheck = setInterval(function() {
        console.log("Checking map initialization...");
        if (window.map) {
            if (checkMapInitialization()) {
                clearInterval(initCheck);
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
};

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
});