
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
