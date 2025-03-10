
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
  
  // Check if map exists every second until it's ready
  const mapReadyCheck = setInterval(() => {
    if (window.isMapReady && window.isMapReady()) {
      console.log("Map is ready for bookmarks");
      clearInterval(mapReadyCheck);
    }
  }, 1000);
});

// Toggle bookmarks dropdown visibility
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
        console.log(`Bookmark "${name}" saved to server`);
        return;
      } else {
        console.warn(`Failed to save bookmark to server, using localStorage`);
      }
    }
    
    // Fallback to localStorage
    const bookmarks = JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
    bookmarks[name] = bookmark;
    localStorage.setItem('mapBookmarks', JSON.stringify(bookmarks));
    console.log(`Bookmark "${name}" saved to localStorage`);
  } catch (e) {
    console.error(`Error saving bookmark:`, e);
    
    // Final fallback - force save to localStorage
    try {
      const bookmarks = JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
      bookmarks[name] = bookmark;
      localStorage.setItem('mapBookmarks', JSON.stringify(bookmarks));
    } catch (innerError) {
      console.error(`Complete failure saving bookmark:`, innerError);
    }
  }
}

// Load bookmarks from server, with fallback to localStorage
async function loadBookmarksFromServer() {
  try {
    const locationId = window.QDPro?.currentLocationId;
    
    // If no location ID is available, use localStorage
    if (!locationId) {
      console.log("No location ID available, using localStorage");
      return JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
    }
    
    const response = await fetch(`/api/bookmarks?location_id=${locationId}`);
    if (response.ok) {
      const data = await response.json();
      console.log("Loaded bookmarks from server:", data.bookmarks);
      return data.bookmarks || {};
    } else {
      console.warn("Failed to load bookmarks from server, using localStorage");
      return JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
    }
  } catch (e) {
    console.error("Error loading bookmarks:", e);
    return JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
  }
}

// Load a specific bookmark
async function loadBookmark(name) {
  try {
    // Wait for map to be ready before proceeding
    if (!window.map || typeof window.map.setView !== 'function') {
      console.log("Map not fully initialized. Waiting for map to be ready...");
      
      // Try to wait for map initialization with a more robust approach
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
            if (attempts % 10 === 0) {
              console.log(`Still waiting for map initialization (attempt ${attempts})`);
              console.log(`Map object exists: ${!!window.map}`);
              if (window.map) {
                console.log(`Map type: ${typeof window.map}`);
                console.log(`setView method exists: ${typeof window.map.setView === 'function'}`);
              }
            }
            
            if (attempts > 50) { // 10 seconds max wait (increased from 3s)
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
        const response = await fetch(`/api/bookmarks/${encodeURIComponent(name)}?location_id=${locationId}`);
        if (response.ok) {
          const data = await response.json();
          bookmark = data.bookmark;
        }
      } catch (e) {
        console.warn(`Error loading bookmark from server:`, e);
      }
    }
    
    // If not found on server or no location ID, fall back to localStorage
    if (!bookmark) {
      const bookmarks = JSON.parse(localStorage.getItem('mapBookmarks') || '{}');
      bookmark = bookmarks[name];
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
          window.map.setView(bookmark.center, bookmark.zoom);
          console.log(`Loaded bookmark "${name}" successfully`);
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

// When document is loaded, make sure bookmark functions are available globally
document.addEventListener('DOMContentLoaded', function() {
  // Expose bookmark functions globally
  window.createBookmark = createBookmark;
  window.saveBookmarkToStorage = saveBookmarkToStorage;
  window.loadBookmark = loadBookmark;
  window.deleteBookmark = deleteBookmark;
  window.toggleBookmarksDropdown = toggleBookmarksDropdown;
  window.updateBookmarksDropdown = updateBookmarksDropdown;
  
  // Also add to QDProEditor namespace
  window.QDProEditor.createBookmark = createBookmark;
  window.QDProEditor.saveBookmarkToStorage = saveBookmarkToStorage;
  window.QDProEditor.loadBookmark = loadBookmark;
  window.QDProEditor.deleteBookmark = deleteBookmark;
  window.QDProEditor.toggleBookmarksDropdown = toggleBookmarksDropdown;
  window.QDProEditor.updateBookmarksDropdown = updateBookmarksDropdown;
  
  console.log("Bookmark functions initialized and exposed globally");
});

// Expose globally for other scripts to use
window.createBookmark = createBookmark;
window.saveBookmarkToStorage = saveBookmarkToStorage;
window.loadBookmark = loadBookmark;
window.deleteBookmark = deleteBookmark;
window.toggleBookmarksDropdown = toggleBookmarksDropdown;
window.updateBookmarksDropdown = updateBookmarksDropdown;
