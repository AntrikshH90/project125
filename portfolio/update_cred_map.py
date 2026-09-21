with open("complete_script.js") as f:
    js = f.read()

old_cred = """const CREDENTIALS = CRED_RAW.map(([name, issuer, when, cid, group, url, expires]) => {
  const [mon, yr] = when.split(" ");
  return {
    name, issuer, when, cid, group,
    url: url || "",
    expires: expires || "",
    key: Number(yr) * 100 + (MONTH_ORDER[mon] || 0)
  };
});"""

new_cred = """const CREDENTIALS = CRED_RAW.map(([name, issuer, when, cid, group, url, expires], rawIndex) => {
  const [mon, yr] = when.split(" ");
  return {
    rawIndex,
    name, issuer, when, cid, group,
    url: url || "",
    expires: expires || "",
    key: Number(yr) * 100 + (MONTH_ORDER[mon] || 0)
  };
});
const CREDENTIALS_BY_RAW_INDEX = new Map(CREDENTIALS.map(c => [c.rawIndex, c]));"""

assert old_cred in js, "old_cred not found"
js = js.replace(old_cred, new_cred)

old_click = """    const certCard = e.target.closest(".cert-card-row");
    if (certCard) {
      const idx = Number(certCard.dataset.credIndex);
      if (!isNaN(idx) && CREDENTIALS[idx]) {
        openCredDossier(CREDENTIALS[idx]);
        return;
      }
    }"""

new_click = """    const certCard = e.target.closest(".cert-card-row");
    if (certCard) {
      const idx = Number(certCard.dataset.credIndex);
      const cert = CREDENTIALS_BY_RAW_INDEX.get(idx);
      if (cert) {
        openCredDossier(cert);
        return;
      }
    }"""

assert old_click in js, "old_click not found"
js = js.replace(old_click, new_click)

with open("complete_script.js", "w") as f:
    f.write(js)

print("Updated CREDENTIALS mapping in complete_script.js")
