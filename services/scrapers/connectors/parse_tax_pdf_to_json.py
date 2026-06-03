import sys
import urllib.request
import pypdf
import json
import re
import os

def parse_tax_pdf(pdf_url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(pdf_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            pdf_data = response.read()
    except Exception as e:
        return {"error": f"Failed to download PDF: {str(e)}"}
        
    temp_path = '/tmp/temp_tax.pdf'
    with open(temp_path, 'wb') as f:
        f.write(pdf_data)
        
    records = []
    
    noise_keywords = [
        "PROPERTY TAX SALE",
        "PURSUANT TO",
        "TERMS OF THE SALE",
        "METROPOLITAN",
        "JURY ASSEMBLY RM",
        "METROPOLITAN DAVIDSON",
        "WEDNESDAY",
        "POTENTIAL PURCHASER",
        "Property Owner",
        "Map/Parcel",
        "Book & Page",
        "Instrument Number",
        "SAMUEL D. KEEN",
        "For further information",
        "Jeff Stafford",
        "--- PAGE",
        "{N0735270.1}",
        "Number",
        "Acres Amount",
        "MARIA M. SALAS",
        "Julie Conn",
        "Interest, Court costs",
        "Interest, Court Costs"
    ]
    
    try:
        reader = pypdf.PdfReader(temp_path)
        
        for page_idx, page in enumerate(reader.pages):
            raw_text = page.extract_text() or ""
            lines = raw_text.split('\n')
            current_name_parts = []
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                
                # Check for noise
                is_noise = False
                for kw in noise_keywords:
                    if kw.lower() in line.lower():
                        is_noise = True
                        break
                if is_noise:
                    current_name_parts = []
                    continue
                
                # Regex match
                match = re.search(r'\s+([a-zA-Z0-9]{9,15})\s+(\d{5,8})\s+(\d{5,8})\s+(.+?)\s+(\.?\d+(?:\s+\d+)?(?:\.\d+)?)\s+(\$[0-9,]+\.[0-9]{2})\s*$', line)
                if match:
                    parcel = match.group(1)
                    book = match.group(2)
                    page_num = match.group(3)
                    address = match.group(4).strip()
                    acres = match.group(5).strip()
                    amount = match.group(6).strip()
                    
                    left_part = line[:match.start()].strip()
                    if left_part:
                        current_name_parts.append(left_part)
                        
                    owner = " ".join(current_name_parts).strip()
                    current_name_parts = []
                    
                    owner = re.sub(r'\s+', ' ', owner)
                    owner = owner.rstrip(', ')
                    
                    records.append({
                        "owner": owner,
                        "parcel": parcel,
                        "book": book,
                        "page": page_num,
                        "address": address,
                        "acres": acres,
                        "amount": amount,
                        "page_index": page_idx + 1,  # 1-based page number
                        "raw_page_text": raw_text
                    })
                else:
                    if len(line) > 1 and not line.startswith('Interest') and not line.startswith('Court costs'):
                        current_name_parts.append(line)
                        
    except Exception as e:
        return {"error": f"Failed to parse PDF: {str(e)}"}
        
    return {"records": records}

if __name__ == '__main__':
    url = "https://chanceryclerkandmaster.nashville.gov/wp-content/uploads/June17th_Tax-Sale2023_4-1.pdf"
    if len(sys.argv) > 1:
        url = sys.argv[1]
    res = parse_tax_pdf(url)
    print(json.dumps(res, indent=2))
