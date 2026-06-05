import sys
import urllib.request
import pypdf
import json
import re

def parse_notice_pdf(pdf_url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    req = urllib.request.Request(pdf_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            pdf_data = response.read()
    except Exception as e:
        return {"error": f"Failed to download PDF: {str(e)}"}
        
    temp_path = '/tmp/temp_connector.pdf'
    with open(temp_path, 'wb') as f:
        f.write(pdf_data)
        
    try:
        reader = pypdf.PdfReader(temp_path)
        raw_text = ""
        for page in reader.pages:
            raw_text += page.extract_text() or ""
    except Exception as e:
        return {"error": f"Failed to parse PDF: {str(e)}"}
        
    # Clean newlines and double spaces to make regex reliable
    text = raw_text.replace('\r', ' ').replace('\n', ' ')
    text = re.sub(r'\s+', ' ', text)
    
    result = {
        "raw_text": raw_text,
        "street": None,
        "city": None,
        "state": None,
        "zip": None,
        "owners": None,
        "trustee": None,
        "loan_amount": 0,
        "case_number": None,
        "sale_date": None,
        "instrument_number": None,
        "parcel_number": None
    }
    
    # 1. Address Parsing
    addr_match = re.search(r'(?:commonly\s+known\s+as|property\s+address):\s*([^,]+,\s*[A-Z]{2}\s+[0-9\-]+)', text, re.IGNORECASE)
    if addr_match:
        full_addr = addr_match.group(1).strip()
        parts = full_addr.split(',')
        if len(parts) >= 2:
            left_part = parts[0].strip()
            right_part = parts[1].strip()
            
            sz_match = re.search(r'([A-Z]{2})\s+([0-9\-]+)', right_part)
            if sz_match:
                result["state"] = sz_match.group(1)
                result["zip"] = sz_match.group(2)
            else:
                result["state"] = "TN"
                
            words = left_part.split()
            if len(words) > 1:
                result["city"] = words[-1].strip()
                result["street"] = " ".join(words[:-1]).strip()
            else:
                result["street"] = left_part
                result["city"] = "Nashville"
        else:
            result["street"] = full_addr
            result["city"] = "Nashville"
            result["state"] = "TN"
    else:
        addr_match2 = re.search(r'(?:commonly\s+known\s+as|property\s+address):\s*([a-zA-Z0-9\s\.\#\-]+,\s*[a-zA-Z\s\.\-]+,\s*[A-Z]{2}\s+[0-9\-]+)', text, re.IGNORECASE)
        if addr_match2:
            full_addr = addr_match2.group(1).strip()
            parts = full_addr.split(',')
            result["street"] = parts[0].strip()
            result["city"] = parts[1].strip()
            sz_match = re.search(r'([A-Z]{2})\s+([0-9\-]+)', parts[2])
            if sz_match:
                result["state"] = sz_match.group(1)
                result["zip"] = sz_match.group(2)
            else:
                result["state"] = "TN"

    if not result["street"]:
        fallback_match = re.search(r'([0-9]+\s+[a-zA-Z0-9\s\.\#\-]+),\s*([a-zA-Z\s\.\-]+),\s*([A-Z]{2})\s*([0-9\-]+)', text)
        if fallback_match:
            result["street"] = fallback_match.group(1).strip()
            result["city"] = fallback_match.group(2).strip()
            result["state"] = fallback_match.group(3).strip()
            result["zip"] = fallback_match.group(4).strip()
            
    # 2. Owner Names Parsing
    owner_match = re.search(r'executed\s+by\s+(.+?)\s+to\s+', text, re.IGNORECASE)
    if owner_match:
        owners_str = owner_match.group(1).strip()
        owners_str = re.sub(r',\s*(?:husband\s+and\s+wife|wife\s+and\s+husband|a\s+married|an\s+unmarried|single|married|tenants).*$', '', owners_str, flags=re.IGNORECASE)
        owners_str = re.sub(r'\s+(?:husband\s+and\s+wife|wife\s+and\s+husband|a\s+married|an\s+unmarried|single|married|tenants).*$', '', owners_str, flags=re.IGNORECASE)
        owners_str = owners_str.rstrip(',')
        result["owners"] = owners_str.strip()
        
    # 3. Trustee Name Parsing
    trustee_match = re.search(r'(?:appointed|appointing)\s+(.+?)\s+as\s+Substitute\s+Trustee', text, re.IGNORECASE)
    if trustee_match:
        result["trustee"] = trustee_match.group(1).strip().rstrip(',')
    else:
        trustee_match2 = re.search(r'(.+?)\s+as\s+Substitute\s+Trustee', text, re.IGNORECASE)
        if trustee_match2:
            val = trustee_match2.group(1).strip()
            if len(val) > 150:
                val = val[-150:]
                if "appointed " in val:
                    val = val.split("appointed ")[-1]
            result["trustee"] = val.strip().rstrip(',')
            
    # 4. Instrument Number
    inst_match = re.search(r'Instrument\s+Number:\s*([0-9\-]+)', text, re.IGNORECASE)
    if inst_match:
        result["instrument_number"] = inst_match.group(1).strip()
        
    # 5. Case Number
    case_match = re.search(r'(?:file|case)\s+number\s+([a-zA-Z0-9\-]+)', text, re.IGNORECASE)
    if case_match:
        result["case_number"] = case_match.group(1).strip()
        
    # 6. Sale Date
    sale_match = re.search(r'(?:will\s*,\s*on|sale\s+on)\s+([a-zA-Z]+\s+[0-9]+,\s+[0-9]{4})', text, re.IGNORECASE)
    if sale_match:
        result["sale_date"] = sale_match.group(1).strip()
        
    # 7. Postponed Sale Date (if any)
    dates = re.findall(r'Postponed\s+Sale\s+Date:\s*([0-9\-]+)', text, re.IGNORECASE)
    if dates:
        result["sale_date"] = dates[-1].strip()
        
    # Clamping string values to prevent DB varchar length errors
    if result["street"] and len(result["street"]) > 250:
        result["street"] = result["street"][:250].strip()
    if result["city"] and len(result["city"]) > 95:
        result["city"] = result["city"][:95].strip()
    if result["state"] and len(result["state"]) > 2:
        result["state"] = result["state"][:2].upper()
    if result["zip"] and len(result["zip"]) > 10:
        result["zip"] = result["zip"][:10].strip()
    if result["owners"] and len(result["owners"]) > 250:
        result["owners"] = result["owners"][:250].strip()
    if result["trustee"] and len(result["trustee"]) > 250:
        result["trustee"] = result["trustee"][:250].strip()
    if result["case_number"] and len(result["case_number"]) > 95:
        result["case_number"] = result["case_number"][:95].strip()
    if result["parcel_number"] and len(result["parcel_number"]) > 95:
        result["parcel_number"] = result["parcel_number"][:95].strip()
            
    return result

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing URL argument"}))
        sys.exit(1)
        
    url = sys.argv[1]
    res = parse_notice_pdf(url)
    print(json.dumps(res, indent=2))
