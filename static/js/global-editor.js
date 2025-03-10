// QDPro Global Editor Module
// This script centralizes editor functions to ensure they're globally accessible

// Initialize QDProEditor as a globally accessible object with integrated QD engine
window.QDProEditor = {
  // QD engine parameters
  qdEngine: {
    kFactors: {
      "IBD": 40,
      "ILD": 18, 
      "IMD": 9,
      "PTRD": 24
    },
    standards: {
      "IBD": "DESR 6055.09, Vol 3, Section 5.4.1.2",
      "ILD": "DESR 6055.09, Vol 3, Section 5.4.2.1",
      "IMD": "DESR 6055.09, Vol 3, Section 5.4.3.1",
      "PTRD": "DESR 6055.09, Vol 3, Section 5.4.4.1"
    },
    // Convert units to pounds
    unitConversions: {
      "g": 0.00220462,
      "kg": 2.20462,
      "lbs": 1.0
    }
  },
  activeEditingLayer: null,
  isEditorOpen: false,
  lastPopupLayer: null,

  openFeatureEditor: function(layer) {
    console.log("QDProEditor: Opening feature editor for layer:", layer);
    this.activeEditingLayer = layer;
    this.isEditorOpen = true;

    // Get feature properties
    const properties = layer.feature ? layer.feature.properties : {};

    // Populate the form fields
    document.getElementById('name').value = properties.name || '';
    document.getElementById('type').value = properties.type || 'Building';
    document.getElementById('description').value = properties.description || '';

    if (document.getElementById('is_facility')) {
      document.getElementById('is_facility').checked = properties.is_facility || false;
    }

    if (document.getElementById('has_explosive')) {
      document.getElementById('has_explosive').checked = properties.has_explosive || false;

      // Toggle explosive section visibility
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = properties.has_explosive ? 'block' : 'none';
      }

      if (document.getElementById('net_explosive_weight')) {
        document.getElementById('net_explosive_weight').value = properties.net_explosive_weight || '';
      }
    }

    // Show the modal
    const modal = document.getElementById('featurePropertiesModal');
    if (modal) {
      modal.style.display = 'block';
    }
  },

  closeFeatureEditor: function() {
    console.log("QDProEditor: Closing feature editor");
    if (this.activeEditingLayer) {
      // Remove any editing flags to allow immediate re-editing
      if (this.activeEditingLayer._editingActive) {
        delete this.activeEditingLayer._editingActive;
      }

      // Reset state
      this.activeEditingLayer = null;
      this.isEditorOpen = false;

      // Close any open popups
      try {
        if (window.map && typeof window.map.closePopup === 'function') {
          window.map.closePopup();
        }
      } catch (e) {
        console.warn('Error closing popups:', e);
      }
    }

    // Reset any layer-specific popup states
    // This is critical to allowing immediate re-editing of features
    document.querySelectorAll('.leaflet-popup').forEach(popup => {
      popup.remove();
    });

    window.lastClickedLayer = null;
    window.activeEditingLayer = null;

    // Force reset all click states on all layers
    if (window.map) {
      if (typeof window.map.eachLayer === 'function') {
        window.map.eachLayer(function(layer) {
          if (layer.feature) {
            // Remove any state that might prevent clicking
            if (layer._editingActive) delete layer._editingActive;
            if (layer._wasClicked) delete layer._wasClicked;
            if (layer._popupOpen) delete layer._popupOpen;
            if (layer._popupClosed) delete layer._popupClosed;
            if (layer._editPending) delete layer._editPending;
          }
        });
      }
    }

    console.log("QDProEditor: Editor fully closed, ready for new interactions");

    // Dispatch a custom event to notify the system the editor is fully closed
    document.dispatchEvent(new CustomEvent('editor-closed'));

    // Force a brief delay to ensure the DOM is updated before allowing new clicks
    setTimeout(function() {
      console.log("Reset complete, ready for new interactions");
    }, 10);
  },

  // Force open the editor for a layer
  forceOpenEditor: function(btn) {
    console.log("Force open editor called");

    // Get the active layer
    const layer = window.lastClickedLayer;
    if (!layer) {
      console.error("No layer to edit!");
      return;
    }

    // Close any open popups
    if (window.map) {
      if (typeof window.map.closePopup === 'function') {
        window.map.closePopup();
      } else if (typeof window.map.eachLayer === 'function') {
        // Alternative approach - close popups on each layer
        window.map.eachLayer(function(layer) {
          if (layer.closePopup) {
            layer.closePopup();
          }
        });
      } else if (window.map._layers) {
        // Direct access to layers if eachLayer isn't available
        Object.values(window.map._layers).forEach(function(layer) {
          if (layer && typeof layer.closePopup === 'function') {
            layer.closePopup();
          }
        });
      }
    }

    // Reset editor state
    this.isEditorOpen = false;

    // Open the editor after a short delay
    setTimeout(() => {
      console.log("Opening editor for layer:", layer._leaflet_id);
      this.openFeatureEditor(layer);
    }, 50);
  },

  saveFeatureProperties: function() {
    console.log("QDProEditor: Saving feature properties");

    // Get the layer we're editing - try multiple possible references
    const layer = window.activeEditingLayer || window.lastClickedLayer;
    if (!layer) {
      console.log("No active layer to save properties to");
      // Close the modal anyway to prevent getting stuck
      this.closeFeatureEditor();
      return;
    }

    console.log("Saving properties to layer:", layer._leaflet_id || "unknown ID");

    // Ensure feature and properties objects exist
    if (!layer.feature) {
      layer.feature = { type: 'Feature', properties: {} };
    }
    if (!layer.feature.properties) {
      layer.feature.properties = {};
    }

    // Get values from form
    const name = document.getElementById('name').value;
    const type = document.getElementById('type').value;
    const description = document.getElementById('description').value;
    const isFacility = document.getElementById('is_facility').checked;
    const hasExplosive = document.getElementById('has_explosive').checked;
    let netExplosiveWeight = null;

    if (hasExplosive) {
      netExplosiveWeight = parseFloat(document.getElementById('net_explosive_weight').value) || 0;
    }

    // Update properties
    layer.feature.properties.name = name;
    layer.feature.properties.type = type;
    layer.feature.properties.description = description;
    layer.feature.properties.is_facility = isFacility;
    layer.feature.properties.has_explosive = hasExplosive;
    layer.feature.properties.net_explosive_weight = netExplosiveWeight;

    // Update popup content
    const popupContent = `
      <div>
        <h3>${name || 'Unnamed Feature'}</h3>
        <p>Type: ${type || 'Unknown'}</p>
        ${hasExplosive ? `<p>NEW: ${netExplosiveWeight} lbs</p>` : ''}
        ${description ? `<p>${description}</p>` : ''}
        <button class="edit-properties-btn">Edit Properties</button>
      </div>
    `;

    if (layer.getPopup()) {
      layer.setPopupContent(popupContent);
    }

    // Close the editor
    this.closeFeatureEditor();

    // Save project state if available
    if (typeof QDPro !== 'undefined' && QDPro.saveProject) {
      QDPro.saveProject();
    }
  },
  runQDAnalysis: function() {
    console.log("QDProEditor: Running QD Analysis");
    if (typeof QDPro !== 'undefined' && typeof QDPro.analyzeLocation === 'function') {
      try {
        // Show loading indicator
        alert("Starting QD Analysis... This might take a moment.");

        // Add detailed debugging
        console.log("Current location ID:", QDPro.currentLocationId);
        console.log("Available layers:", Object.keys(QDPro.layers));

        // Count features with explosives
        let explosiveFeatures = 0;
        Object.keys(QDPro.layers).forEach(layerName => {
          QDPro.layers[layerName].eachLayer(layer => {
            if (layer.feature && 
                layer.feature.properties && 
                layer.feature.properties.net_explosive_weight) {
              explosiveFeatures++;
              console.log("Found explosive feature:", {
                id: layer._leaflet_id,
                name: layer.feature.properties.name,
                NEW: layer.feature.properties.net_explosive_weight
              });
            }
          });
        });
        console.log(`Found ${explosiveFeatures} features with explosives`);

        // Run analysis with promise handling
        QDPro.analyzeLocation().then(result => {
          console.log("QD Analysis completed successfully:", result);
        }).catch(error => {
          console.error("Error running QD analysis:", error);
          alert("Error running QD analysis: " + (error.message || "Unknown error"));
        });

        console.log("QD Analysis started via QDPro.analyzeLocation");
      } catch (error) {
        console.error("Error initializing QD analysis:", error);
        alert("Error initializing QD analysis: " + error.message);
      }
    } else {
      console.error("QDPro.analyzeLocation is not available");
      alert("QD Analysis functionality not available. Please check the console for details.");
    }
  },

  displayDetailedReport: function() {
    console.log("Displaying detailed QD analysis report");

    // Check if analysis results exist
    if (!QDPro.currentAnalysisResults) {
      alert("No analysis results available. Please run the analysis first.");
      return;
    }

    // Create a comprehensive report modal
    const reportModal = document.createElement('div');
    reportModal.className = 'modal';
    reportModal.id = 'detailedAnalysisReport';
    reportModal.style = 'display: block; position: fixed; z-index: 2000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4);';

    // Get analysis data
    const analysis = QDPro.currentAnalysisResults;
    const totalFacilities = analysis.total_facilities || 0;
    const totalViolations = analysis.total_violations || 0;
    const facilitiesAnalyzed = analysis.facilities_analyzed || [];

    // Build detailed HTML content for the report
    let reportContent = `
      <div style="background-color: #fff; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 90%; max-width: 900px; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #333;">Quantity Distance Analysis Report</h2>
          <div>
            <button id="printReportBtn" style="background-color: #4CAF50; color: white; padding: 8px 12px; margin-right: 10px; border: none; cursor: pointer; border-radius: 4px;">
              <i class="fas fa-print"></i> Print Report
            </button>
            <button id="exportPDFBtn" style="background-color: #4CAF50; color: white; padding: 8px 12px; margin-right: 10px; border: none; cursor: pointer; border-radius: 4px;">
              <i class="fas fa-file-pdf"></i> Export PDF
            </button>
            <button id="closeReportBtn" style="background-color: #f44336; color: white; padding: 8px 12px; border: none; cursor: pointer; border-radius: 4px;">
              <i class="fas fa-times"></i> Close
            </button>
          </div>
        </div>

        <div style="padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #4CAF50;">Analysis Summary</h3>
          <div style="display: flex; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 250px; margin-right: 15px;">
              <p><strong>Location:</strong> ${QDPro.currentLocationName || 'Unknown Location'}</p>
              <p><strong>Analysis Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <div style="flex: 1; min-width: 250px;">
              <p><strong>Total Facilities Analyzed:</strong> ${totalFacilities}</p>
              <p><strong>Total Violations Found:</strong> ${totalViolations}</p>
            </div>
          </div>
        </div>
    `;

    if (facilitiesAnalyzed.length === 0) {
      reportContent += `
        <div style="padding: 15px; background-color: #fff0f0; border-radius: 4px; margin-bottom: 20px; border-left: 4px solid #f44336;">
          <h3 style="margin-top: 0; color: #f44336;">No Analysis Data Available</h3>
          <p>There are no facilities with explosive materials to analyze. Please ensure that you have:</p>
          <ol>
            <li>Added at least one facility with explosive content</li>
            <li>Set the "Contains Explosives" property to true</li>
            <li>Provided a valid Net Explosive Weight (NEW) value</li>
          </ol>
          <p>You can edit any polygon on the map by clicking on it and selecting "Edit Properties" from the popup.</p>
        </div>
      `;
    } else {
      // Add details for each facility analyzed
      reportContent += `<h3 style="color: #333;">Analyzed Facilities</h3>`;

      facilitiesAnalyzed.forEach((facility, index) => {
        const hasViolations = facility.violations && facility.violations.length > 0;
        const safeDistance = facility.safe_distance || 0;
        const new_value = facility.net_explosive_weight || 0;

        reportContent += `
          <div style="padding: 15px; background-color: ${hasViolations ? '#fff8f8' : '#f8fff8'}; 
            border-radius: 4px; margin-bottom: 15px; border-left: 4px solid ${hasViolations ? '#f44336' : '#4CAF50'};">
            <h4 style="margin-top: 0; color: ${hasViolations ? '#f44336' : '#4CAF50'};">
              ${facility.facility_name || `Facility ${index + 1}`}
              ${hasViolations ? ' (VIOLATIONS FOUND)' : ' (COMPLIANT)'}
            </h4>

            <div style="display: flex; flex-wrap: wrap;">
              <div style="flex: 1; min-width: 250px; margin-right: 15px;">
                <p><strong>Net Explosive Weight:</strong> ${new_value} ${facility.unit || 'lbs'}</p>
                <p><strong>Location:</strong> ${facility.facility_latitude ? 
                  `Lat: ${facility.facility_latitude.toFixed(6)}, Lng: ${facility.facility_longitude.toFixed(6)}` : 
                  'Unknown'}</p>
              </div>
              <div style="flex: 1; min-width: 250px;">
                <p><strong>Safe Distance Required:</strong> ${safeDistance.toFixed(2)} ft</p>
                <p><strong>Standards Reference:</strong> ${facility.standards_reference || 'DoD 6055.09-M'}</p>
              </div>
            </div>

            <div style="margin-top: 15px; padding: 10px; background-color: #f9f9f9; border-radius: 4px;">
              <h5 style="margin-top: 0;">K-Factor Calculation</h5>
              <p><code>Safe Distance = K × ∛NEW</code></p>
              <p><code>Safe Distance = ${facility.k_factor_value || 40} × ∛${new_value} = ${safeDistance.toFixed(2)} ft</code></p>
            </div>
        `;

        // Show violations if any
        if (hasViolations) {
          reportContent += `
            <div style="margin-top: 15px;">
              <h5 style="color: #f44336;">Safety Violations (${facility.violations.length})</h5>
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f2f2f2;">
                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Feature</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Actual Distance (ft)</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Required Distance (ft)</th>
                    <th style="padding: 8px; text-align: left; border: 1px solid #ddd;">Shortfall (ft)</th>
                  </tr>
                </thead>
                <tbody>
          `;

          facility.violations.forEach(violation => {
            reportContent += `
              <tr>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${violation.feature_name || 'Unknown Feature'}</td>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${violation.distance.toFixed(2)}</td>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd;">${violation.required.toFixed(2)}</td>
                <td style="padding: 8px; text-align: left; border: 1px solid #ddd; color: #f44336;">${violation.deficiency.toFixed(2)}</td>
              </tr>
            `;
          });

          reportContent += `
                </tbody>
              </table>
            </div>
          `;
        } else {
          reportContent += `
            <div style="margin-top: 15px; padding: 10px; background-color: #f0fff0; border-radius: 4px;">
              <p style="color: #4CAF50; margin: 0;"><strong>✓ No safety violations detected for this facility</strong></p>
            </div>
          `;
        }

        reportContent += `</div>`;
      });
    }

    // Add recommendations section
    reportContent += `
      <div style="padding: 15px; background-color: #f9f9f9; border-radius: 4px; margin-top: 20px;">
        <h3 style="margin-top: 0; color: #333;">Recommendations</h3>
        <ul>
    `;

    if (totalViolations > 0) {
      reportContent += `
        <li>Review all highlighted violations and assess the risk level for each.</li>
        <li>Consider relocating explosive materials to maintain proper safety distances.</li>
        <li>Implement administrative controls for areas that cannot be physically modified.</li>
        <li>Consult safety officer for waiver requirements where violations cannot be resolved.</li>
      `;
    } else {
      reportContent += `
        <li>All analyzed facilities meet safety distance requirements.</li>
        <li>Continue to monitor any new construction or changes to facility usage.</li>
        <li>Maintain current safety protocols and documentation.</li>
      `;
    }

    reportContent += `
        </ul>
      </div>

      <div style="margin-top: 30px; font-size: 0.8em; text-align: center; color: #777; border-top: 1px solid #eee; padding-top: 15px;">
        <p>Generated by QDPro Analysis Engine • ${new Date().toLocaleDateString()}</p>
      </div>
    </div>
    `;

    reportModal.innerHTML = reportContent;
    document.body.appendChild(reportModal);

    // Add event handlers for buttons
    document.getElementById('closeReportBtn').addEventListener('click', function() {
      document.body.removeChild(reportModal);
    });

    document.getElementById('printReportBtn').addEventListener('click', function() {
      window.print();
    });

    document.getElementById('exportPDFBtn').addEventListener('click', () => {
      this.exportAnalysisReport();
      document.body.removeChild(reportModal);
    });
  },
  showMeasurementTool: function() {
    console.log("QDProEditor: Showing Measurement Tool");
    if (window.map && window.map.measureControl) {
        window.map.measureControl.start();
    } else {
        console.error("Map or measureControl not available.");
    }
  },
  exportAnalysisReport: function() {
    // Placeholder for PDF export logic.  Implementation required.
    console.log("Exporting analysis report to PDF...");
    // Add your PDF generation code here using a library like jsPDF or similar.
    alert("PDF export functionality not yet implemented.");
  }
};

// Make functions globally available
window.openFeatureEditor = function(layer) {
  window.QDProEditor.openFeatureEditor(layer);
};

window.closeFeaturePropertiesModal = function() {
  window.QDProEditor.closeFeatureEditor();
};

window.saveFeatureProperties = function() {
  window.QDProEditor.saveFeatureProperties();
};

window.forceOpenEditor = function(btn) {
  window.QDProEditor.forceOpenEditor(btn);
};

window.runQDAnalysis = function() {
  window.QDProEditor.runQDAnalysis();
};

window.showMeasurementTool = function() {
  window.QDProEditor.showMeasurementTool();
};


// Handle has_explosive checkbox to show/hide explosive section
function setupExplosiveSectionToggle() {
  const hasExplosiveCheckbox = document.getElementById('has_explosive');
  if (hasExplosiveCheckbox) {
    hasExplosiveCheckbox.addEventListener('change', function() {
      const explosiveSection = document.getElementById('explosiveSection');
      if (explosiveSection) {
        explosiveSection.style.display = this.checked ? 'block' : 'none';
      }
    });
  }
}

// Set up form event handlers
document.addEventListener('DOMContentLoaded', function() {
  console.log("QDProEditor: Setting up event handlers");

  // Setup explosive section toggle
  setupExplosiveSectionToggle();

  // Setup save button
  const saveBtn = document.getElementById('savePropertiesBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function() {
      window.QDProEditor.saveFeatureProperties();
    });
  }

  // Setup close button
  const closeBtn = document.getElementById('closeFeaturePropertiesBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }

  // Setup cancel button
  const cancelBtn = document.getElementById('cancelPropertiesBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function() {
      window.QDProEditor.closeFeatureEditor();
    });
  }

  // Fix any missing edit buttons in existing popups
  setTimeout(function() {
    const editButtons = document.querySelectorAll('.edit-properties-btn');
    editButtons.forEach(function(btn) {
      if (!btn.onclick) {
        btn.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();

          const popup = this.closest('.leaflet-popup');
          if (popup && popup._source) {
            openFeatureEditor(popup._source);
          }
        };
      }
    });
  }, 1000);

  console.log("QDProEditor: Event handlers setup complete");
});

// Define a global function for popup edit button click handling
window.handleEditButtonClick = function(button) {
  console.log("Edit button clicked via direct onclick handler");

  // Find the popup and associated layer
  const popup = button.closest('.leaflet-popup');
  if (popup && popup._source) {
    const layer = popup._source;

    // Close popup
    if (layer.closePopup) {
      layer.closePopup();
    }

    // Open feature editor immediately
    window.openFeatureEditor(layer);
  }

  return false;
};