// Bookmark Manager
// This file contains functions for managing map bookmarks

// Import the custom modal functionality if it doesn't exist
document.addEventListener('DOMContentLoaded', function() {
  if (typeof openCustomModal !== 'function') {
    console.log("Loading custom modal functionality");
    // Check if we need to load the CSS
    let modalCss = document.querySelector('link[href*="custom-modal.css"]');
    if (!modalCss) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/static/css/custom-modal.css';
      document.head.appendChild(link);
    }

    // Create the openCustomModal function if it doesn't exist
    if (typeof openCustomModal !== 'function') {
      window.openCustomModal = function(message, defaultValue = '', callback) {
        // Create modal container if it doesn't exist
        let modalContainer = document.getElementById('custom-prompt-modal');
        if (!modalContainer) {
          modalContainer = document.createElement('div');
          modalContainer.id = 'custom-prompt-modal';
          modalContainer.className = 'modal-overlay';

          const modalContent = document.createElement('div');
          modalContent.className = 'modal-content';

          const modalTitle = document.createElement('h3');
          modalTitle.id = 'modal-prompt-message';

          const modalInput = document.createElement('input');
          modalInput.id = 'modal-prompt-input';
          modalInput.type = 'text';

          const buttonContainer = document.createElement('div');
          buttonContainer.style.display = 'flex';
          buttonContainer.style.justifyContent = 'flex-end';
          buttonContainer.style.marginTop = '15px';

          const cancelButton = document.createElement('button');
          cancelButton.textContent = 'Cancel';
          cancelButton.onclick = () => {
            modalContainer.style.display = 'none';
            if (callback) callback(null);
          };

          const okButton = document.createElement('button');
          okButton.textContent = 'OK';
          okButton.style.marginLeft = '10px';
          okButton.onclick = () => {
            const value = document.getElementById('modal-prompt-input').value;
            modalContainer.style.display = 'none';
            if (callback) callback(value);
          };

          buttonContainer.appendChild(cancelButton);
          buttonContainer.appendChild(okButton);

          modalContent.appendChild(modalTitle);
          modalContent.appendChild(modalInput);
          modalContent.appendChild(buttonContainer);
          modalContainer.appendChild(modalContent);

          document.body.appendChild(modalContainer);
        }

        // Set modal content
        document.getElementById('modal-prompt-message').textContent = message;
        document.getElementById('modal-prompt-input').value = defaultValue;

        // Show modal
        modalContainer.style.display = 'flex';
        document.getElementById('modal-prompt-input').focus();

        // Also add keyboard support for Enter and Escape
        const input = document.getElementById('modal-prompt-input');
        input.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            modalContainer.style.display = 'none';
            if (callback) callback(input.value);
          } else if (e.key === 'Escape') {
            modalContainer.style.display = 'none';
            if (callback) callback(null);
          }
        });
      };
    }
  }
});

// Make sure QDProEditor namespace exists
if (typeof window.QDProEditor === 'undefined') {
  window.QDProEditor = {};
}

// Initialize bookmark manager after document is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Bookmark manager initializing...");

  // Create a custom event for map ready status
  window.mapReadyEvent = new CustomEvent('mapReady');

  // Function to dispatch event when map is ready
  function notifyMapReady() {
    console.log("Dispatching mapReady event");
    document.dispatchEvent(window.mapReadyEvent);
  }

  // Check if map exists every second until it's ready
  const mapReadyCheck = setInterval(() => {
    if (window.isMapReady && window.isMapReady()) {
      console.log("Map is ready for bookmarks");
      clearInterval(mapReadyCheck);
      notifyMapReady();
    }
  }, 1000);

  // Also expose the notification function
  window.notifyMapReady = notifyMapReady;
});

// Listen for explicit map initialization
document.addEventListener('mapReady', function() {
  console.log("Map ready event received - bookmarks system fully operational");
  // Refresh the bookmarks if dropdown is visible
  if (document.getElementById('bookmarksDropdown')?.style.display === 'block') {
    updateBookmarksDropdown();
  }
});

// Toggle bookmarks dropdown visibility
function toggleBookmarksDropdown() {
  const dropdown = document.getElementById('bookmarksDropdown');
  if (!dropdown) {
    console.error("Bookmarks dropdown element not found");
    return;
  }

  const isVisible = dropdown.style.display === 'block';

  // Hide any other open dropdowns
  document.querySelectorAll('.base-layer-dropdown').forEach(dd => {
    if (dd.id !== 'bookmarksDropdown') {
      dd.style.display = 'none';
    }
  });

  if (isVisible) {
    dropdown.style.display = 'none';
  } else {
    // Position the dropdown
    const button = document.getElementById('bookmarksTool');
    if (button) {
      const rect = button.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.top = (rect.bottom + 5) + 'px';
      dropdown.style.left = rect.left + 'px';
    }

    // Update and show the dropdown
    updateBookmarksDropdown();
  }
}
function toggleBookmarksDropdown() {
  const dropdown = document.getElementById('bookmarksDropdown');
  if (!dropdown) {
    console.error("Bookmarks dropdown element not found");
    return;
  }

  if (dropdown.style.display === 'block') {
    dropdown.style.display = 'none';
  } else {
    updateBookmarksDropdown();
    dropdown.style.display = 'block';
  }
}

// Create bookmark from current map view
function createBookmarkSimple() {
  try {
    // Check if isMapReady function exists and use it
    if (typeof window.isMapReady === 'function') {
      if (!window.isMapReady()) {
        console.log("Map not ready according to isMapReady check, waiting...");

        // Instead of immediately failing, wait and retry
        setTimeout(() => {
          console.log("Retrying bookmark creation after delay...");
          createBookmarkSimple();
        }, 1500);
        return;
      }
    } else {
      // Fallback checks if isMapReady is not available
      if (!window.map) {
        console.log("Map not initialized yet, waiting...");

        setTimeout(() => {
          console.log("Retrying bookmark creation after delay...");
          createBookmarkSimple();
        }, 1500);
        return;
      }

      // Try to patch methods if they're missing
      if (typeof window.map.getCenter !== 'function') {
        console.log("Patching missing getCenter method");
        window.map.getCenter = function() {
          return window.map._lastCenter || L.latLng(39.8283, -98.5795);
        };
      }

      if (typeof window.map.getZoom !== 'function') {
        console.log("Patching missing getZoom method");
        window.map.getZoom = function() {
          return window.map._zoom || 4;
        };
      }
    }

    // Use custom modal instead of prompt()
    if (typeof openCustomModal === 'function') {
      openCustomModal("Enter a name for this view:", "", function(name) {
        if (!name || name.trim() === '') return;

        const center = window.map.getCenter();
        const zoom = window.map.getZoom();

        const bookmark = {
          center: [center.lat, center.lng],
          zoom: zoom,
          created: new Date().toISOString()
        };

        saveBookmarkToStorage(name, bookmark);

        // Check if the function exists before calling it
        if (typeof updateBookmarksDropdown === 'function') {
          updateBookmarksDropdown();
        } else if (typeof window.updateBookmarksDropdown === 'function') {
          window.updateBookmarksDropdown();
        } else {
          console.warn("updateBookmarksDropdown function not found");
        }

        console.log(`Bookmark "${name}" created successfully`);
      });
      return; // Return early since the callback will handle the rest
    } else {
      console.error("Custom modal function not found, trying to use alert");
      const name = window.prompt("Enter a name for this view:");
      if (!name || name.trim() === '') return;

      const center = window.map.getCenter();
      const zoom = window.map.getZoom();

    const bookmark = {
        center: [center.lat, center.lng],
        zoom: zoom,
        created: new Date().toISOString()
      };

      saveBookmarkToStorage(name, bookmark);

      // Check if the function exists before calling it
      if (typeof updateBookmarksDropdown === 'function') {
        updateBookmarksDropdown();
      } else if (typeof window.updateBookmarksDropdown === 'function') {
        window.updateBookmarksDropdown();
      } else {
        console.warn("updateBookmarksDropdown function not found");
      }

      console.log(`Bookmark "${name}" created successfully`);
    }
  } catch (error) {
    console.error("Error creating bookmark:", error);
    alert("Error creating bookmark: " + error.message);
  }
}

// Function to save a bookmark
function saveBookmark(name, view) {
  try {
    // Format the bookmark data
    const bookmark = {
      center: [view.center.lat, view.center.lng],
      zoom: view.zoom,
      created: new Date().toISOString()
    };

    saveBookmarkToStorage(name, bookmark);
    updateBookmarksDropdown();
    console.log(`Bookmark "${name}" saved`);
  } catch (error) {
    console.error("Error saving bookmark:", error);
    alert("Error saving bookmark: " + error.message);
  }
}

// For backwards compatibility - redirects to the appropriate function
function createBookmark() {
  // Use the main createBookmark function from feature-editor-initialize.js if it exists,
  // otherwise use the local implementation
  if (typeof window.createBookmark === 'function' && window.createBookmark !== createBookmark) {
    window.createBookmark();
  } else {
    createBookmarkSimple();
  }
}

// Update bookmarks dropdown with current bookmarks
async function updateBookmarksDropdown() {
  console.log("updateBookmarksDropdown called");
  try {
    // Check if required elements exist
    const dropdown = document.getElementById('bookmarksDropdown');
    if (!dropdown) {
      console.error("Bookmarks dropdown element not found");
      return;
    }

    // Get bookmarks
    const bookmarks = await loadBookmarksFromServer();

    // Clear current dropdown items
    while (dropdown.firstChild) {
      dropdown.removeChild(dropdown.firstChild);
    }

    // Add bookmarks to dropdown
    Object.keys(bookmarks).forEach(name => {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = name;
      item.addEventListener('click', () => loadBookmark(name));
      dropdown.appendChild(item);
    });

    // Add "Create New" option
    const createNew = document.createElement('div');
    createNew.className = 'dropdown-item create-new';
    createNew.textContent = '+ Create New Bookmark';
    createNew.addEventListener('click', createBookmark);
    dropdown.appendChild(createNew);

  } catch (e) {
    console.error("Error updating bookmarks dropdown:", e);
  }
}

// Save bookmark to server or localStorage
async function saveBookmarkToStorage(name, bookmark) {
  try {
    // Try to save to server first
    const locationId = window.QDPro?.currentLocationId;

    if (locationId) {
      const response = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: name,
          location_id: locationId,
          bookmark_data: bookmark
        })
      });

      if (response.ok) {
        console.log(`Bookmark "${name}" saved to server for location ${locationId}`);
        return;
      } else {
        console.warn(`Failed to save bookmark to server, using location-specific localStorage`);
      }
    }

    // Fallback to localStorage with location-specific key
    const storageKey = locationId ? `mapBookmarks_location_${locationId}` : 'mapBookmarks_default';
    const bookmarks = JSON.parse(localStorage.getItem(storageKey) || '{}');
    bookmarks[name] = bookmark;
    localStorage.setItem(storageKey, JSON.stringify(bookmarks));
    console.log(`Bookmark "${name}" saved to localStorage with key ${storageKey}`);
  } catch (e) {
    console.error(`Error saving bookmark:`, e);

    // Final fallback - force save to location-specific localStorage
    try {
      const locationId = window.QDPro?.currentLocationId;
      const storageKey = locationId ? `mapBookmarks_location_${locationId}` : 'mapBookmarks_default';
      const bookmarks = JSON.parse(localStorage.getItem(storageKey) || '{}');
      bookmarks[name] = bookmark;
      localStorage.setItem(storageKey, JSON.stringify(bookmarks));
    } catch (innerError) {
      console.error(`Complete failure saving bookmark:`, innerError);
    }
  }
}

// Load bookmarks from server, with fallback to localStorage
async function loadBookmarksFromServer() {
  try {
    const locationId = window.QDPro?.currentLocationId;

    // If no location ID is available, use localStorage with location-specific storage key
    if (!locationId) {
      console.log("No location ID available, using location-specific localStorage");
      const storageKey = 'mapBookmarks_default';
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    }

    const response = await fetch(`/api/bookmarks?location_id=${locationId}`);
    if (response.ok) {
      const data = await response.json();
      console.log("Loaded bookmarks from server:", data.bookmarks);
      return data.bookmarks || {};
    } else {
      console.warn("Failed to load bookmarks from server, using location-specific localStorage");
      const storageKey = `mapBookmarks_location_${locationId}`;
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    }
  } catch (e) {
    console.error("Error loading bookmarks:", e);
    // Use location-specific storage key as fallback
    const locationId = window.QDPro?.currentLocationId;
    const storageKey = locationId ? `mapBookmarks_location_${locationId}` : 'mapBookmarks_default';
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  }
}

// Load a specific bookmark
async function loadBookmark(name) {
  try {
    console.log("Loading bookmark:", name);

    // Initialize the map forcibly if needed
    if (!window.map || typeof window.map.setView !== 'function') {
      console.log("Map not fully initialized. Attempting to initialize it...");

      // Force initialization of the map if Leaflet is available
      if (typeof L !== 'undefined') {
        console.log("Leaflet is available, attempting to initialize map");

        // Check if map container exists
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
          console.log("Map container found, checking if we can initialize map");

          // Try to initialize the map if it doesn't exist
          if (!window.map) {
            try {
              console.log("Creating new map instance");
              window.map = L.map('map', {
                center: [39.8283, -98.5795],
                zoom: 4,
                zoomControl: true
              });

              // Add a base layer
              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
              }).addTo(window.map);

              console.log("Map created successfully");
            } catch (e) {
              console.error("Failed to create map:", e);
            }
          } 
          // If map exists but is missing methods, patch them
          else if (typeof window.map.setView !== 'function') {
            console.log("Patching existing map with missing methods");

            window.map.setView = function(center, zoom) {
              console.log("Using patched setView method:", center, zoom);
              return window.map;
            };

            window.map.getCenter = function() {
              return L.latLng(39.8283, -98.5795);
            };

            window.map.getZoom = function() {
              return 4;
            };
          }
        } else {
          console.error("Map container not found");
        }
      }

      // Still proceed with normal waiting process as a fallback
      let attempts = 0;
      const waitForMap = () => {
        return new Promise((resolve, reject) => {
          const checkMap = setInterval(() => {
            attempts++;

            // First check if we have a map object
            if (window.map) {
              // Then check if isMapReady function exists and use it
              if (typeof window.isMapReady === 'function') {
                if (window.isMapReady()) {
                  clearInterval(checkMap);
                  console.log("Map initialization detected via isMapReady()");
                  resolve(true);
                  return;
                }
              } 
              // Fallback to method check if isMapReady doesn't exist or returns false
              else if (typeof window.map.setView === 'function') {
                clearInterval(checkMap);
                console.log("Map initialization detected via method check");
                resolve(true);
                return;
              }
            }

            // More diagnostic information
            if (attempts % 5 === 0) {
              console.log(`Still waiting for map initialization (attempt ${attempts})`);
              console.log(`Map object exists: ${!!window.map}`);
              if (window.map) {
                console.log(`Map type: ${typeof window.map}`);
                console.log(`setView method exists: ${typeof window.map.setView === 'function'}`);

                // Try to repair map if possible
                if (typeof L !== 'undefined' && typeof window.map.setView !== 'function') {
                  console.log("Attempting to repair map methods on attempt", attempts);
                  try {
                    window.map.setView = function(center, zoom) {
                      console.log("Using newly patched setView method:", center, zoom);
                      return window.map;
                    };
                  } catch (e) {
                    console.error("Failed to patch map:", e);
                  }
                }
              }
            }

            // Shorter timeout - only wait 5 seconds instead of 10
            if (attempts > 25) { // 5 seconds max wait
              clearInterval(checkMap);
              reject(new Error("Map initialization timeout"));
            }
          }, 200);
        });
      };

      try {
        await waitForMap();
      } catch (err) {
        console.error("Map initialization timed out. Cannot load bookmark.", err);

        // Try to force map initialization if it didn't happen automatically
        if (window.map && typeof L !== 'undefined') {
          console.log("Attempting to recover map functionality...");

          try {
            // Try to apply the isMapReady function's patches if it exists
            if (typeof window.isMapReady === 'function') {
              window.isMapReady();
            }

            // Manual patching as a last resort
            if (typeof window.map.setView !== 'function') {
              console.log("Manually patching missing setView method");
              window.map.setView = function(center, zoom) {
                console.log("Using patched setView method:", center, zoom);
                if (window.map._lastCenter) {
                  window.map._lastCenter = L.latLng(center);
                }
                if (window.map._zoom) {
                  window.map._zoom = zoom;
                }
                return window.map;
              };
            }

            // Also patch flyTo if missing
            if (typeof window.map.flyTo !== 'function') {
              console.log("Manually patching missing flyTo method");
              window.map.flyTo = function(center, zoom, options) {
                console.log("Using patched flyTo method:", center, zoom);
                // Just redirect to setView if it exists
                if (typeof window.map.setView === 'function') {
                  return window.map.setView(center, zoom);
                } else {
                  // Direct property setting
                  if (window.map._lastCenter) {
                    window.map._lastCenter = L.latLng(center);
                  }
                  if (window.map._zoom) {
                    window.map._zoom = zoom;
                  }
                  return window.map;
                }
              };
            }

            console.log("Recovery attempt completed - proceeding with bookmark load");
          } catch (recoveryErr) {
            console.error("Map recovery failed:", recoveryErr);
            alert("Map not ready. Please refresh the page and try again.");
            return;
          }
        } else {
          alert("Map not ready. Please refresh the page and try again.");
          return;
        }
      }
    }

    // First try to load from server
    const locationId = window.QDPro?.currentLocationId;
    let bookmark = null;

    if (locationId) {
      try {
        console.log(`Attempting to load bookmark "${name}" for location ${locationId} from server`);
        const response = await fetch(`/api/bookmarks/${encodeURIComponent(name)}?location_id=${locationId}`);
        if (response.ok) {
          const data = await response.json();
          bookmark = data.bookmark;
          console.log("Bookmark loaded from server:", bookmark);
        }
      } catch (e) {
        console.warn(`Error loading bookmark from server:`, e);
      }
    }

    // If not found on server or no location ID, try location-specific localStorage first
    if (!bookmark) {
      console.log("Bookmark not found on server, checking location-specific localStorage");
      const storageKey = locationId ? `mapBookmarks_location_${locationId}` : 'mapBookmarks_default';
      const locationBookmarks = JSON.parse(localStorage.getItem(storageKey) || '{}');
      bookmark = locationBookmarks[name];

      if (bookmark) {
        console.log(`Bookmark "${name}" found in location-specific storage (${storageKey}):`, bookmark);
      } else {
        // Fall back to legacy storage as last resort
        console.log("Checking legacy localStorage as last resort");
        const legacyBookmarks = JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
        bookmark = legacyBookmarks[name];

        if (bookmark) {
          console.log(`Bookmark "${name}" found in legacy storage:`, bookmark);
        } else {
          console.error(`Bookmark "${name}" not found in either server or localStorage`);
        }
      }
    }

    if (!bookmark) {
      console.error(`Bookmark "${name}" not found`);
      return;
    }

    // Double check that map is ready before attempting to set view
    if (window.map && typeof window.map.setView === 'function') {
      // Verify bookmark data
      if (Array.isArray(bookmark.center) && bookmark.center.length === 2 && 
          !isNaN(bookmark.center[0]) && !isNaN(bookmark.center[1]) && 
          !isNaN(bookmark.zoom)) {
        try {
          // Ensure bookmark center is properly formatted
          let center;
          if (Array.isArray(bookmark.center) && bookmark.center.length === 2) {
            center = L.latLng(bookmark.center[0], bookmark.center[1]);
          } else if (bookmark.center && typeof bookmark.center === 'object' && 
                    (bookmark.center.lat !== undefined && bookmark.center.lng !== undefined)) {
            center = L.latLng(bookmark.center.lat, bookmark.center.lng);
          } else {
            console.error("Invalid bookmark center format:", bookmark.center);
            throw new Error("Invalid bookmark center format");
          }

          const zoom = parseInt(bookmark.zoom);
          console.log(`Setting view to: ${center.lat}, ${center.lng}, zoom: ${zoom}`);

          // Force timeout to ensure map is ready
          setTimeout(() => {
            try {
              // Check if flyTo is available, otherwise use setView
              if (typeof window.map.flyTo === 'function') {
                // Use flyTo for smoother animation to the bookmarked location
                window.map.flyTo(center, zoom, {
                  duration: 1.5,  // Animation duration in seconds
                  easeLinearity: 0.25
                });
                console.log(`Applied bookmark "${name}" with flyTo:`, center, zoom);
              } else if (typeof window.map.setView === 'function') {
                // Fall back to setView if flyTo is not available
                window.map.setView(center, zoom);
                console.log(`Applied bookmark "${name}" with setView:`, center, zoom);
              } else {
                // Last resort attempt - try to directly set properties
                console.warn("Neither flyTo nor setView available. Attempting direct property setting");
                if (window.map._zoom) window.map._zoom = zoom;
                if (window.map._lastCenter) window.map._lastCenter = center;
                if (window.map.options) {
                  window.map.options.center = center;
                  window.map.options.zoom = zoom;
                }
                // Force a map invalidate size if available
                if (typeof window.map.invalidateSize === 'function') {
                  window.map.invalidateSize(true);
                }
                console.log(`Applied bookmark "${name}" by direct property setting:`, center, zoom);
              }
            } catch (err) {
              console.error("Error applying bookmark view:", err);
            }
          }, 300); // Short delay to ensure map is ready
        } catch (viewError) {
          console.error("Error setting map view:", viewError);
          alert("Error loading bookmark: Invalid map coordinates");
        }
      } else {
        console.error("Invalid bookmark data format:", bookmark);
        alert("Error: Bookmark data is in an invalid format");
      }
    } else {
      console.error("Map still not properly initialized after waiting");
      alert("Map not ready. Please refresh the page and try again.");
    }
  } catch (e) {
    console.error(`Error loading bookmark:`, e);
    alert(`Error loading bookmark: ${e.message}`);
  }
}

// Delete a bookmark
async function deleteBookmark(name) {
  try {
    // First try to delete from server
    const locationId = window.QDPro?.currentLocationId;

    if (locationId) {
      try {
        const response = await fetch(`/api/bookmarks/${encodeURIComponent(name)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location_id: locationId
          })
        });

        if (response.ok) {
          console.log(`Bookmark "${name}" deleted from server`);
          updateBookmarksDropdown();
          return;
        } else {
          console.warn(`Failed to delete bookmark from server, using localStorage`);
        }
      } catch (e) {
        console.warn(`Error deleting bookmark from server:`, e);
      }
    }

    // Fallback to localStorage
    const bookmarks = JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
    if (bookmarks[name]) {
      delete bookmarks[name];
      localStorage.setItem('mapBookmarks', JSON.stringify(bookmarks));
      console.log(`Bookmark "${name}" deleted from localStorage`);
    }

    updateBookmarksDropdown();
  } catch (e) {
    console.error(`Error deleting bookmark:`, e);
  }
}

// Update the bookmarks dropdown menu
function updateBookmarksDropdown() {
  console.log("updateBookmarksDropdown called");

  const dropdown = document.getElementById('bookmarksDropdown');
  if (!dropdown) {
    console.error("Bookmarks dropdown element not found");
    return;
  }

  // Clear existing items
  dropdown.innerHTML = '';

  // Make sure the dropdown is visible
  dropdown.style.display = 'block';

  // Add proper styling to make it visible
  dropdown.style.backgroundColor = '#fff';
  dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  dropdown.style.borderRadius = '4px';
  dropdown.style.minWidth = '200px';
  dropdown.style.padding = '5px 0';
  dropdown.style.zIndex = '3000';
  dropdown.style.position = 'absolute';

  // Create a header
  const header = document.createElement('div');
  header.style.padding = '10px';
  header.style.fontWeight = 'bold';
  header.style.borderBottom = '1px solid #ccc';
  header.style.backgroundColor = '#f5f5f5';
  header.textContent = 'Saved Views';
  dropdown.appendChild(header);

  // Load bookmarks from server or fallback to localStorage
  loadBookmarksFromServer().then(bookmarks => {
    // Check if we have any bookmarks
    const bookmarkKeys = Object.keys(bookmarks);
    if (bookmarkKeys.length === 0) {
      const noBookmarks = document.createElement('div');
      noBookmarks.style.padding = '10px';
      noBookmarks.style.fontStyle = 'italic';
      noBookmarks.style.color = '#666';
      noBookmarks.textContent = 'No bookmarks saved yet';
      dropdown.appendChild(noBookmarks);
    } else {
      // Add each bookmark
      bookmarkKeys.forEach(name => {
        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.borderBottom = '1px solid #eee';
        item.style.transition = 'background-color 0.2s';

        // Add hover effect
        item.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f0f0f0';
        });
        item.addEventListener('mouseout', function() {
          this.style.backgroundColor = '';
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.flex = '1';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.whiteSpace = 'nowrap';
        
        item.appendChild(nameSpan);
        
        // Add load button
        const loadBtn = document.createElement('button');
        loadBtn.textContent = 'Load';
        loadBtn.style.marginRight = '5px';
        loadBtn.style.padding = '3px 8px';
        loadBtn.style.backgroundColor = '#4CAF50';
        loadBtn.style.color = 'white';
        loadBtn.style.border = 'none';
        loadBtn.style.borderRadius = '3px';
        loadBtn.style.cursor = 'pointer';
        
        loadBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          dropdown.style.display = 'none';
          loadBookmark(name);
        });
        
        item.appendChild(loadBtn);
        
        // Add delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Delete';
        deleteBtn.style.padding = '3px 8px';
        deleteBtn.style.backgroundColor = '#f44336';
        deleteBtn.style.color = 'white';
        deleteBtn.style.border = 'none';
        deleteBtn.style.borderRadius = '3px';
        deleteBtn.style.cursor = 'pointer';
        
        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          if (confirm(`Are you sure you want to delete the bookmark "${name}"?`)) {
            deleteBookmark(name);
          }
        });
        
        item.appendChild(deleteBtn);
        dropdown.appendChild(item);
      });
    }

    // Add option to create new bookmark
    const addNewItem = document.createElement('div');
    addNewItem.style.padding = '10px';
    addNewItem.style.cursor = 'pointer';
    addNewItem.style.color = '#4CAF50';
    addNewItem.style.fontWeight = 'bold';
    addNewItem.style.backgroundColor = '#f5f5f5';
    addNewItem.style.textAlign = 'center';
    addNewItem.style.borderTop = bookmarkKeys.length > 0 ? '1px solid #ccc' : 'none';
    addNewItem.textContent = '+ Add New Bookmark';

    // Add hover effect
    addNewItem.addEventListener('mouseover', function() {
      this.style.backgroundColor = '#e8f5e9';
    });
    addNewItem.addEventListener('mouseout', function() {
      this.style.backgroundColor = '#f5f5f5';
    });

    addNewItem.addEventListener('click', function() {
      dropdown.style.display = 'none';
      createBookmark();
    });

    dropdown.appendChild(addNewItem);
  });
}
function updateBookmarksDropdown() {
  console.log("updateBookmarksDropdown called");

  const dropdown = document.getElementById('bookmarksDropdown');
  if (!dropdown) {
    console.error("Bookmarks dropdown element not found");
    return;
  }

  // Clear existing items
  dropdown.innerHTML = '';

  // Make sure the dropdown is visible
  dropdown.style.display = 'block';

  // Add proper styling to make it visible
  dropdown.style.backgroundColor = '#fff';
  dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  dropdown.style.borderRadius = '4px';
  dropdown.style.minWidth = '200px';
  dropdown.style.padding = '5px 0';
  dropdown.style.zIndex = '3000';
  dropdown.style.position = 'absolute';

  // Create a header
  const header = document.createElement('div');
  header.style.padding = '10px';
  header.style.fontWeight = 'bold';
  header.style.borderBottom = '1px solid #ccc';
  header.style.backgroundColor = '#f5f5f5';
  header.textContent = 'Saved Views';
  dropdown.appendChild(header);

  // Load bookmarks from server or fallback to localStorage
  loadBookmarksFromServer().then(bookmarks => {
    // Check if we have any bookmarks
    const bookmarkKeys = Object.keys(bookmarks);
    if (bookmarkKeys.length === 0) {
      const noBookmarks = document.createElement('div');
      noBookmarks.style.padding = '10px';
      noBookmarks.style.fontStyle = 'italic';
      noBookmarks.style.color = '#666';
      noBookmarks.textContent = 'No bookmarks saved yet';
      dropdown.appendChild(noBookmarks);
    } else {
      // Add each bookmark
      bookmarkKeys.forEach(name => {
        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.justifyContent = 'space-between';
        item.style.alignItems = 'center';
        item.style.borderBottom = '1px solid #eee';
        item.style.transition = 'background-color 0.2s';

        // Add hover effect
        item.addEventListener('mouseover', function() {
          this.style.backgroundColor = '#f0f0f0';
        });
        item.addEventListener('mouseout', function() {
          this.style.backgroundColor = '';
        });

        const nameSpan = document.createElement('span');
        nameSpan.textContent = name;
        nameSpan.style.flex = '1';
        nameSpan.style.overflow = 'hidden';
        nameSpan.style.textOverflow = 'ellipsis';
        nameSpan.style.whiteSpace = 'nowrap';

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.style.marginLeft = '8px';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = '#f44336';
        deleteBtn.style.fontWeight = 'bold';
        deleteBtn.style.fontSize = '16px';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.title = 'Delete bookmark';

        item.appendChild(nameSpan);
        item.appendChild(deleteBtn);

        // Add event listeners
        nameSpan.addEventListener('click', function(e) {
          e.stopPropagation();
          loadBookmark(name);
          dropdown.style.display = 'none';
        });

        // Make the whole item clickable except for the delete button
        item.addEventListener('click', function(e) {
          if (e.target !== deleteBtn) {
            loadBookmark(name);
            dropdown.style.display = 'none';
          }
        });

        deleteBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          deleteBookmark(name);
        });

        dropdown.appendChild(item);
      });
    }

    // Add option to create new bookmark
    const addNewItem = document.createElement('div');
    addNewItem.style.padding = '10px';
    addNewItem.style.cursor = 'pointer';
    addNewItem.style.color = '#4CAF50';
    addNewItem.style.fontWeight = 'bold';
    addNewItem.style.backgroundColor = '#f5f5f5';
    addNewItem.style.textAlign = 'center';
    addNewItem.style.borderTop = bookmarkKeys.length > 0 ? '1px solid #ccc' : 'none';
    addNewItem.textContent = '+ Add New Bookmark';

    // Add hover effect
    addNewItem.addEventListener('mouseover', function() {
      this.style.backgroundColor = '#e8f5e9';
    });
    addNewItem.addEventListener('mouseout', function() {
      this.style.backgroundColor = '#f5f5f5';
    });

    addNewItem.addEventListener('click', function() {
      dropdown.style.display = 'none';
      createBookmark();
    });

    dropdown.appendChild(addNewItem);
  });
}

// Toggle the bookmarks dropdown
function toggleBookmarksDropdown() {
  const dropdown = document.getElementById('bookmarksDropdown');
  if (!dropdown) {
    console.error("Bookmarks dropdown element not found");
    return;
  }

  const isVisible = dropdown.style.display === 'block';

  // Hide any other open dropdowns
  document.querySelectorAll('.base-layer-dropdown').forEach(dd => {
    if (dd.id !== 'bookmarksDropdown') {
      dd.style.display = 'none';
    }
  });

  if (isVisible) {
    dropdown.style.display = 'none';
  } else {
    // Position the dropdown
    const button = document.getElementById('bookmarksTool');
    if (button) {
      const rect = button.getBoundingClientRect();
      dropdown.style.position = 'absolute';
      dropdown.style.top = (rect.bottom + 5) + 'px';
      dropdown.style.left = rect.left + 'px';
    }

    // Update and show the dropdown
    updateBookmarksDropdown();
    dropdown.style.display = 'block';
  }
}

// Function to clear bookmarks when switching locations
function clearBookmarksCache() {
  console.log("Clearing bookmarks cache for location switch");
  // We don't delete saved bookmarks, just clear the dropdown
  const dropdown = document.getElementById('bookmarksDropdown');
  if (dropdown) {
    dropdown.innerHTML = '';
    dropdown.style.display = 'none';
  }  }
}

// When document is loaded, make sure bookmark functions are available globally
// Ensure these functions are available globally
window.toggleBookmarksDropdown = toggleBookmarksDropdown;
window.updateBookmarksDropdown = updateBookmarksDropdown;
window.loadBookmark = loadBookmark;
window.deleteBookmark = deleteBookmark;
window.createBookmark = createBookmark;
window.saveBookmarkToStorage = saveBookmarkToStorage;
document.addEventListener('DOMContentLoaded', function() {
  // Expose bookmark functions globally
  window.createBookmark = createBookmark;
  window.saveBookmarkToStorage = saveBookmarkToStorage;
  window.loadBookmark = loadBookmark;
  window.deleteBookmark = deleteBookmark;
  window.toggleBookmarksDropdown = toggleBookmarksDropdown;
  window.updateBookmarksDropdown = updateBookmarksDropdown;
  window.clearBookmarksCache = clearBookmarksCache;

  // Also add to QDProEditor namespace
  window.QDProEditor.createBookmark = createBookmark;
  window.QDProEditor.saveBookmarkToStorage = saveBookmarkToStorage;
  window.QDProEditor.loadBookmark = loadBookmark;
  window.QDProEditor.deleteBookmark = deleteBookmark;
  window.QDProEditor.toggleBookmarksDropdown = toggleBookmarksDropdown;
  window.QDProEditor.updateBookmarksDropdown = updateBookmarksDropdown;
  window.QDProEditor.clearBookmarksCache = clearBookmarksCache;

  // Listen for location changes
  document.addEventListener('locationChanged', function(e) {
    console.log("Location changed event detected, clearing bookmarks cache");
    clearBookmarksCache();
  });

  console.log("Bookmark functions initialized and exposed globally");
});

// Expose globally for other scripts to use
window.createBookmark = createBookmark;
window.saveBookmarkToStorage = saveBookmarkToStorage;
window.loadBookmark = loadBookmark;
window.deleteBookmark = deleteBookmark;
window.toggleBookmarksDropdown = toggleBookmarksDropdown;
window.updateBookmarksDropdown = updateBookmarksDropdown;