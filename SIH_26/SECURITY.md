# 🚨 Security Policy

## Supported versions

| Version | Supported |
|---|---|
| `main` branch | ✅ |

## Reporting a vulnerability

**Please do NOT open a public issue for security bugs.**

Email the team lead directly or DM via the SIH team channel with:

1. What you found (and how to reproduce it)
2. Which file/endpoint is affected
3. Your assessment of severity (P0–P3)

We acknowledge reports within **48 hours** and fix P0 issues within **72 hours**.

## Scope

In scope:
- The citizen PWA (`index.html`, `js/**`, `css/**`)
- The trust/credibility layer (`js/trust/**`) — spoofing or score-manipulation vectors
- Test suites (flaws that mask real bugs)

Out of scope (prototype stage — APIs not yet deployed):
- Backend endpoints, sandbox accounts, staging URLs (coming with W1–W3 builds)

## Our security commitments

- Secrets in environment variables only — **never** committed (`.gitignore` enforces)
- Evidence integrity via SHA-256 hashing (chain-of-custody design)
- Append-only audit logs for all ops actions
- OTP rate limiting; JWT rotation on the backend (roadmap)
- Dependency & secret scanning (gitleaks, `npm audit`, `pip-audit`) in CI (roadmap)
- **DPDP Act 2023** compliance: explicit consent, purpose limitation, evidence purge
  after 90 days, deletion requests honored
