with open("assemble_complete_js.py") as f:
    code = f.read()

# Replace extraction of PROJECTS
old_extract = 'm_proj = re.search(r\'const PROJECTS = (\[[\s\S]*?\]);\s*const CRED_RAW\', ant)\nprojects_raw = m_proj.group(1)'
new_extract = '''p_start = ant.find('const PROJECTS = [')
p_end = ant.find('const GROUP_NAMES =')
projects_only = ant[p_start:p_end]
pos_semi = projects_only.rfind('];')
projects_raw = projects_only[len('const PROJECTS = '):pos_semi+1].strip()'''

code = code.replace(old_extract, new_extract)

with open("assemble_complete_js.py", "w") as f:
    f.write(code)

print("Updated extraction logic.")
