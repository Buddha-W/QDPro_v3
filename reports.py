
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime
import pdfkit
import json
import logging
from fastapi import HTTPException
import os
from jinja2 import Template

class Report(BaseModel):
    title: str
    generated_at: datetime
    data: dict

async def generate_pdf_report(report: Report, output_filename: str, 
                            map_snapshot: Optional[str] = None) -> Dict[str, Any]:
    """Generate enhanced PDF report with map snapshots and styling."""
    try:
        # Configure wkhtmltopdf options
        options = {
            'page-size': 'Letter',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': "UTF-8",
            'custom-header': [('Accept-Encoding', 'gzip')],
            'enable-local-file-access': True,
            'javascript-delay': 2000,
            'no-stop-slow-scripts': True,
            'debug-javascript': True,
            'quiet': ''
        }

        if map_snapshot:
            options.update({
                'enable-javascript': True,
                'window-status': 'MapReady'
            })

        # Custom CSS for report styling
        css = """
            body { 
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #662d91;
                padding-bottom: 10px;
            }
            .map-container {
                height: 500px;
                margin: 20px 0;
                border: 1px solid #ccc;
            }
            .analysis-results {
                background: #f9f9f9;
                padding: 15px;
                border-radius: 4px;
                margin: 20px 0;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            th, td {
                padding: 8px;
                border: 1px solid #ddd;
                text-align: left;
            }
            th {
                background-color: #662d91;
                color: white;
            }
        """

        # Create HTML template
        template_str = """
            <!DOCTYPE html>
            <html>
            <head>
                <style>{{ css }}</style>
            </head>
            <body>
                <div class="header">
                    <h1>{{ report.title }}</h1>
                    <p>Generated: {{ report.generated_at.strftime('%Y-%m-%d %H:%M:%S') }}</p>
                </div>

                {% if map_snapshot %}
                <div class="map-container">
                    <img src="{{ map_snapshot }}" style="width: 100%; height: auto;"/>
                </div>
                {% endif %}

                <div class="analysis-results">
                    <h2>Analysis Results</h2>
                    {% for key, value in report.data.items() %}
                    <div class="result-item">
                        <h3>{{ key|title }}</h3>
                        {% if value is mapping %}
                            <table>
                            {% for k, v in value.items() %}
                                <tr>
                                    <th>{{ k|title }}</th>
                                    <td>{{ v }}</td>
                                </tr>
                            {% endfor %}
                            </table>
                        {% else %}
                            <p>{{ value }}</p>
                        {% endif %}
                    </div>
                    {% endfor %}
                </div>
            </body>
            </html>
        """

        # Render template
        template = Template(template_str)
        html_content = template.render(
            report=report,
            css=css,
            map_snapshot=map_snapshot
        )

        # Generate PDF
        pdf = pdfkit.from_string(html_content, output_filename, options=options)
        
        # Verify PDF generation
        if not os.path.exists(output_filename):
            raise Exception("PDF generation failed")

        return {
            "status": "success",
            "filename": output_filename,
            "size": os.path.getsize(output_filename),
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        logging.error(f"PDF generation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate PDF: {str(e)}"
        )
"""
Reports module for generating PDF reports from QD analysis data
"""
import os
import json
import logging
import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional

import pdfkit

logger = logging.getLogger(__name__)

class Report:
    """Report object for QD analysis"""
    
    def __init__(self, title: str, generated_at: datetime, data: Dict[str, Any]):
        self.title = title
        self.generated_at = generated_at
        self.data = data
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert report to dictionary"""
        return {
            "title": self.title,
            "generated_at": self.generated_at.isoformat(),
            "data": self.data
        }

async def generate_pdf_report(report: Report, output_filename: str, map_snapshot: Optional[str] = None) -> str:
    """
    Generate a PDF report from a Report object
    
    Args:
        report: Report object
        output_filename: Output filename for the PDF
        map_snapshot: Base64-encoded image of map snapshot
        
    Returns:
        Path to the generated PDF file
    """
    try:
        # Create HTML template for the report
        html_content = create_report_html(report, map_snapshot)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_filename), exist_ok=True)
        
        # Create temporary HTML file
        temp_html_path = output_filename.replace('.pdf', '_temp.html')
        with open(temp_html_path, 'w') as f:
            f.write(html_content)
        
        # Generate PDF
        options = {
            'page-size': 'Letter',
            'margin-top': '0.75in',
            'margin-right': '0.75in',
            'margin-bottom': '0.75in',
            'margin-left': '0.75in',
            'encoding': 'UTF-8',
            'no-outline': None,
            'enable-local-file-access': None
        }
        
        # Use pdfkit to convert HTML to PDF
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, 
            lambda: pdfkit.from_file(temp_html_path, output_filename, options=options)
        )
        
        # Clean up temporary file
        if os.path.exists(temp_html_path):
            os.remove(temp_html_path)
            
        logger.info(f"PDF report generated successfully: {output_filename}")
        return output_filename
    except Exception as e:
        logger.error(f"Error generating PDF report: {str(e)}")
        raise
        
def create_report_html(report: Report, map_snapshot: Optional[str] = None) -> str:
    """
    Create HTML content for a report
    
    Args:
        report: Report object
        map_snapshot: Base64-encoded image of map snapshot
        
    Returns:
        HTML content as a string
    """
    # Get report data
    analysis_summary = report.data.get("analysis_summary", {})
    compliance_summary = report.data.get("compliance_summary", {})
    detailed_results = report.data.get("detailed_results", [])
    
    # Format date
    formatted_date = report.generated_at.strftime("%Y-%m-%d %H:%M:%S")
    
    # Create HTML template
    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>{report.title}</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
            }}
            .report-header {{
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
            }}
            .logo-section {{
                display: flex;
                align-items: center;
            }}
            .report-title {{
                font-size: 24px;
                font-weight: bold;
            }}
            .report-date {{
                font-size: 14px;
                color: #666;
            }}
            .section {{
                margin-bottom: 20px;
            }}
            .section-title {{
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 10px;
                color: #2c3e50;
            }}
            .summary-box {{
                background-color: #f8f9fa;
                border: 1px solid #ddd;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }}
            .summary-item {{
                margin-bottom: 5px;
            }}
            .summary-label {{
                font-weight: bold;
                margin-right: 10px;
            }}
            .map-container {{
                width: 100%;
                height: 400px;
                border: 1px solid #ddd;
                margin-bottom: 20px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th, td {{
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }}
            th {{
                background-color: #f2f2f2;
                font-weight: bold;
            }}
            .status-compliant {{
                color: green;
                font-weight: bold;
            }}
            .status-non-compliant {{
                color: red;
                font-weight: bold;
            }}
            .signatures {{
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
            }}
            .signature {{
                width: 45%;
            }}
            .signature-line {{
                border-top: 1px solid #000;
                margin-top: 40px;
                padding-top: 5px;
            }}
        </style>
    </head>
    <body>
        <div class="report-header">
            <div class="logo-section">
                <div>
                    <div class="report-title">{report.title}</div>
                    <div class="report-date">Generated: {formatted_date}</div>
                </div>
            </div>
            <div>
                <strong>QDPro</strong><br>
                Explosive Safety Siting Software
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Analysis Summary</div>
            <div class="summary-box">
                <div class="summary-item">
                    <span class="summary-label">Feature ID:</span>
                    <span>{analysis_summary.get("feature_id", "N/A")}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Net Explosive Weight:</span>
                    <span>{analysis_summary.get("quantity", 0)} lbs</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Safe Distance:</span>
                    <span>{analysis_summary.get("safe_distance", 0)} feet</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">K-Factor:</span>
                    <span>K{analysis_summary.get("k_factor", 40)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Standard:</span>
                    <span>{analysis_summary.get("site_type", "DOD")}</span>
                </div>
            </div>
        </div>
    '''
    
    # Add map image if provided
    if map_snapshot:
        html += f'''
        <div class="section">
            <div class="section-title">Site Map</div>
            <div class="map-container">
                <img src="data:image/png;base64,{map_snapshot}" alt="Site Map" style="width:100%;height:100%;">
            </div>
        </div>
        '''
    
    # Add compliance summary
    html += f'''
        <div class="section">
            <div class="section-title">Compliance Summary</div>
            <div class="summary-box">
                <div class="summary-item">
                    <span class="summary-label">Total Features:</span>
                    <span>{compliance_summary.get("total_features", 0)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Compliant Features:</span>
                    <span>{compliance_summary.get("compliant", 0)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Non-Compliant Features:</span>
                    <span>{compliance_summary.get("non_compliant", 0)}</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label">Compliance Rate:</span>
                    <span>{calculate_compliance_rate(compliance_summary)}%</span>
                </div>
            </div>
        </div>
    '''
    
    # Add detailed results table
    html += '''
        <div class="section">
            <div class="section-title">Detailed Results</div>
            <table>
                <thead>
                    <tr>
                        <th>Feature Name</th>
                        <th>Distance (ft)</th>
                        <th>Required Distance (ft)</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    '''
    
    # Add rows for detailed results
    for result in detailed_results:
        status_class = "status-compliant" if result.get("is_safe") else "status-non-compliant"
        html += f'''
                <tr>
                    <td>{result.get("name", "Unknown")}</td>
                    <td>{result.get("distance", 0)}</td>
                    <td>{result.get("required_distance", 0)}</td>
                    <td class="{status_class}">{result.get("status", "Unknown")}</td>
                </tr>
        '''
    
    # Close table and add signatures
    html += '''
                </tbody>
            </table>
        </div>
        
        <div class="signatures">
            <div class="signature">
                <div class="signature-line">Prepared By</div>
            </div>
            <div class="signature">
                <div class="signature-line">Approved By</div>
            </div>
        </div>
    </body>
    </html>
    '''
    
    return html

def calculate_compliance_rate(compliance_summary: Dict[str, int]) -> str:
    """Calculate the compliance rate as a percentage"""
    total = compliance_summary.get("total_features", 0)
    compliant = compliance_summary.get("compliant", 0)
    
    if total == 0:
        return "0.0"
    
    rate = (compliant / total) * 100
    return f"{rate:.1f}"
