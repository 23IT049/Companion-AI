# Data Preparation Guide

This guide covers how to collect, prepare, and manage device manuals and troubleshooting documentation for the AI chatbot.

## Overview

The chatbot's effectiveness depends on the quality and quantity of device documentation. This guide will help you:

1. Identify and collect relevant documentation
2. Prepare documents for optimal RAG performance
3. Organize and manage your document library
4. Handle legal and copyright considerations

## Document Sources

### 1. Official Manufacturer Manuals

**Best Source**: Direct from manufacturer websites

**Device Categories to Support:**

#### Kitchen Appliances
- Refrigerators
- Dishwashers
- Microwaves
- Ovens/Ranges
- Coffee Makers

#### Laundry Appliances
- Washing Machines
- Dryers
- Washer-Dryer Combos

#### Climate Control
- Air Conditioners
- Heaters
- Dehumidifiers
- Thermostats

#### Electronics
- TVs
- Routers
- Smart Home Devices
- Gaming Consoles

#### Home Maintenance
- Water Heaters
- Garage Door Openers
- Sump Pumps

**Top Manufacturers to Target:**

- **Appliances**: Samsung, LG, Whirlpool, GE, Bosch, Frigidaire, Maytag
- **Electronics**: Samsung, LG, Sony, TCL, Vizio
- **HVAC**: Carrier, Trane, Lennox, Rheem, Goodman
- **Smart Home**: Nest, Ring, Ecobee, Philips Hue

### 2. Support Documentation

- Installation guides
- Quick start guides
- Troubleshooting guides
- FAQ sections
- Service bulletins
- Recall notices

### 3. Community Resources (Use Carefully)

- Reddit r/appliancerepair
- YouTube repair channel transcripts
- Expert forum discussions
- Review site common issues

**⚠️ Note**: Community content may require additional verification and should be clearly attributed.

## Document Collection Strategy

### Manual Collection Workflow

1. **Identify Target Devices**
   - Start with most common household devices
   - Focus on recent models (last 5-10 years)
   - Prioritize popular brands

2. **Locate Official Manuals**
   ```
   Manufacturer Website → Support Section → Product Manuals
   ```

3. **Download PDFs**
   - Save with descriptive names: `{Brand}_{Model}_{Type}.pdf`
   - Example: `Samsung_RF28R7351SR_UserManual.pdf`

4. **Organize by Category**
   ```
   data/raw/
   ├── refrigerators/
   │   ├── samsung/
   │   ├── lg/
   │   └── whirlpool/
   ├── washing_machines/
   ├── air_conditioners/
   └── tvs/
   ```

### Web Scraping (Advanced)

For automated collection, you can create scraping scripts:

```python
# Example: Scrape Samsung support site
import requests
from bs4 import BeautifulSoup

def scrape_samsung_manuals(product_category):
    base_url = "https://www.samsung.com/us/support/"
    # Implementation here
    pass
```

**Important**:
- Respect `robots.txt`
- Implement rate limiting
- Only scrape publicly available content
- Store source URLs for attribution

## Document Preprocessing

### 1. PDF Quality Check

Before uploading, verify:

- ✅ Text is selectable (not scanned image)
- ✅ File size is reasonable (< 50MB)
- ✅ No password protection
- ✅ Proper encoding (UTF-8)

### 2. OCR for Scanned Documents

If manual is a scanned image:

```bash
# Using Tesseract OCR
tesseract input.pdf output.pdf pdf
```

### 3. Text Extraction Test

```python
import PyPDF2

def test_extraction(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = reader.pages[0].extract_text()
        
        if len(text) < 100:
            print(f"⚠️ Poor extraction: {pdf_path}")
        else:
            print(f"✅ Good extraction: {pdf_path}")
```

### 4. Metadata Extraction

Extract and verify:

- Device type
- Brand
- Model number(s)
- Document type (user manual, troubleshooting, installation)
- Publication date
- Language

## Document Organization

### Folder Structure

```
data/
├── raw/                          # Original PDFs
│   ├── refrigerators/
│   │   ├── samsung/
│   │   │   ├── RF28R7351SR_UserManual.pdf
│   │   │   └── RF28R7351SR_Troubleshooting.pdf
│   │   ├── lg/
│   │   └── whirlpool/
│   ├── washing_machines/
│   ├── air_conditioners/
│   └── tvs/
├── processed/                    # After chunking
│   ├── chunks/
│   └── embeddings/
└── metadata/                     # Catalog and tracking
    ├── device_catalog.json
    └── processing_log.json
```

### Metadata Catalog

Create `device_catalog.json`:

```json
{
  "refrigerators": {
    "samsung": {
      "models": [
        {
          "model": "RF28R7351SR",
          "documents": [
            {
              "type": "user_manual",
              "file": "RF28R7351SR_UserManual.pdf",
              "pages": 68,
              "language": "en",
              "date": "2023-01-15"
            },
            {
              "type": "troubleshooting",
              "file": "RF28R7351SR_Troubleshooting.pdf",
              "pages": 24,
              "language": "en",
              "date": "2023-01-15"
            }
          ]
        }
      ]
    }
  }
}
```

## Upload Process

### Via Web Interface

1. Navigate to http://localhost:3000
2. Click "Upload Manual"
3. Select PDF file
4. Fill in metadata:
   - Device Type
   - Brand
   - Model (optional)
5. Click "Upload"
6. Monitor processing status

### Via API

```bash
curl -X POST http://localhost:8000/api/v1/upload-manual \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@Samsung_RF28R7351SR_Manual.pdf" \
  -F "device_type=Refrigerator" \
  -F "brand=Samsung" \
  -F "model=RF28R7351SR"
```

### Bulk Upload Script

```python
import os
from pathlib import Path
from api_client import upload_manual

def bulk_upload(directory, device_type, brand):
    for pdf_file in Path(directory).glob("*.pdf"):
        print(f"Uploading {pdf_file.name}...")
        
        # Extract model from filename
        model = pdf_file.stem.split("_")[0]
        
        upload_manual(
            file_path=str(pdf_file),
            device_type=device_type,
            brand=brand,
            model=model
        )

# Usage
bulk_upload("data/raw/refrigerators/samsung", "Refrigerator", "Samsung")
```

## Quality Assurance

### Document Validation Checklist

- [ ] Correct device type assigned
- [ ] Brand name standardized
- [ ] Model number accurate
- [ ] Text extraction quality > 90%
- [ ] No duplicate content
- [ ] Proper language detected
- [ ] Source URL recorded

### Testing RAG Performance

After uploading documents, test with sample queries:

```python
test_queries = [
    "Refrigerator not cooling",
    "Ice maker not working",
    "Strange noise from compressor",
    "Water leaking from bottom",
]

for query in test_queries:
    response = chat_api.send_message(
        query=query,
        device_type="Refrigerator",
        brand="Samsung"
    )
    
    print(f"Query: {query}")
    print(f"Sources found: {len(response['sources'])}")
    print(f"Relevance: {response['sources'][0]['relevance_score']}")
    print("---")
```

## Maintenance and Updates

### Regular Updates

- **Monthly**: Check for new manual versions
- **Quarterly**: Review and remove outdated documents
- **Annually**: Audit entire document library

### Version Control

When manufacturers release updated manuals:

1. Download new version
2. Compare with existing version
3. If significantly different, upload new version
4. Mark old version as deprecated (don't delete immediately)

### Performance Monitoring

Track metrics:

- Documents per device category
- Average chunks per document
- Query success rate (sources found)
- User feedback on answers

## Legal and Copyright Considerations

### ✅ Allowed

- Publicly available manufacturer manuals
- Official support documentation
- Content with explicit permission
- Fair use for troubleshooting assistance

### ⚠️ Requires Caution

- Third-party repair guides
- Community-created content
- Translated versions
- Modified or annotated manuals

### ❌ Not Allowed

- Copyrighted content without permission
- Proprietary service manuals
- Content behind paywalls
- Competitor's internal documentation

### Best Practices

1. **Always attribute sources** in responses
2. **Store source URLs** for each document
3. **Implement opt-out mechanism** for manufacturers
4. **Respect robots.txt** when scraping
5. **Include disclaimer** about unofficial troubleshooting

### Sample Disclaimer

```
This troubleshooting assistance is based on publicly available 
manufacturer documentation. For official support, please contact 
the manufacturer directly. Always follow safety guidelines in 
the official manual.
```

## Data Privacy

### User Data

- Don't store personally identifiable information in documents
- Redact any customer data from support documents
- Comply with GDPR/CCPA if applicable

### Document Security

- Encrypt documents at rest
- Implement access controls
- Regular security audits
- Backup strategy

## Recommended Starting Dataset

### Minimum Viable Dataset

To launch with basic functionality:

- **5 device categories**
- **3-5 brands per category**
- **2-3 models per brand**
- **Total: ~50-75 manuals**

### Expansion Priority

1. **Phase 1**: Most common household appliances
   - Refrigerators, Washing Machines, Dishwashers

2. **Phase 2**: Climate control
   - Air Conditioners, Thermostats

3. **Phase 3**: Electronics
   - TVs, Routers

4. **Phase 4**: Specialty devices
   - Water Heaters, Garage Doors, etc.

## Tools and Resources

### PDF Processing
- **pdfplumber**: Advanced PDF text extraction
- **PyPDF2**: Basic PDF operations
- **Tesseract**: OCR for scanned documents

### Web Scraping
- **BeautifulSoup**: HTML parsing
- **Scrapy**: Full-featured scraping framework
- **Selenium**: JavaScript-heavy sites

### Data Management
- **MongoDB Compass**: GUI for MongoDB
- **DBeaver**: Database management
- **Postman**: API testing

## Troubleshooting

### Poor Text Extraction

**Problem**: Extracted text is garbled or incomplete

**Solutions**:
- Try different PDF library (pdfplumber vs PyPDF2)
- Use OCR for scanned documents
- Check PDF version and encoding
- Manually verify first few pages

### Low Relevance Scores

**Problem**: RAG returns irrelevant chunks

**Solutions**:
- Improve chunk size/overlap settings
- Add more context to metadata
- Filter out non-content pages (covers, TOC)
- Enhance query preprocessing

### Duplicate Content

**Problem**: Same information indexed multiple times

**Solutions**:
- Implement deduplication logic
- Check for duplicate file uploads
- Normalize document names
- Use content hashing

## Next Steps

1. Start with 10-15 manuals for testing
2. Upload via web interface
3. Test with real queries
4. Iterate on chunking strategy
5. Gradually expand document library
6. Monitor and optimize performance
