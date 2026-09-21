# Instant Scraper — Team Guide

## For the team (users)

Open the app, type what you want in the one box, press Enter. You get files.

Examples that work right now:
- `20 papers on vision transformers with pdfs` → real PDFs + papers.csv + papers.bib
- `100000 rows of movie reviews` → dataset parquet (open with `pd.read_parquet`)
- `github repos for web scraping, 15` → repos.csv + READMEs
- `30 images of neural network art` → image files + licenses
- `scrape https://any-site.com` → clean markdown
- Hinglish/fuzzy works too: `mera thesis transformer efficiency ke liye material chahiye`

History strip under the input shows every job anyone ran — click to reopen and re-download.

Download buttons: individual files, or "Download all (zip)".

## For the host (Antriksh)

**Serve the team:** double-click `SERVE-TEAM.bat`. It:
1. starts a production server on port 3021 (bound to all interfaces),
2. starts a free Cloudflare tunnel (no account),
3. prints the public `https://...trycloudflare.com` URL (also saved to `TUNNEL-URL.txt`).

Share whichever URL fits:
| Who | URL |
|---|---|
| On the same WiFi | `http://10.54.235.152:3021` (needs the "Instant Scraper" firewall rule — click Yes on the UAC prompt once) |
| Anywhere on the internet | the `https://...trycloudflare.com` URL from SERVE-TEAM.bat |

Notes:
- The quick tunnel URL changes each time you restart SERVE-TEAM.bat. For a permanent
  URL, create a free named tunnel at dash.cloudflare.com (Zero Trust → Tunnels) and
  point it at localhost:3021 — ask Hermes to set it up.
- Stop serving: close both minimized windows (or run STOP-SCRAPER.bat + close the tunnel window).
- Everything runs from this machine; if it sleeps, the team loses the app.
- The `.env` in this folder holds API keys — don't zip/share this folder as-is (zips already exclude it).

## Data locations
All files land in `downloads\<job-id>\` inside this folder, plus browser downloads.
