import re
import sys

# Load original
with open("uploads/antriksh-portfolio-studio.html", "r", encoding="utf-8") as f:
    orig = f.read()

# Extract CRED_RAW
cred_raw_match = re.search(r'const CRED_RAW = (\[[\s\S]*?\]);', orig)
if not cred_raw_match:
    print("Error: CRED_RAW not found")
    sys.exit(1)

CRED_RAW = eval(cred_raw_match.group(1))
print(f"Loaded {len(CRED_RAW)} credentials.")
