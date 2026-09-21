import re
import json

with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

print("Original size:", len(orig))

# Let's inspect CRED_RAW data
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', orig)
if not cred_raw_match:
    print("Error: CRED_RAW not found")
    exit(1)

# Evaluate credentials
cred_raw = eval(cred_raw_match.group(1))
print("Total creds in raw:", len(cred_raw))

