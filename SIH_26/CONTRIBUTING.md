# Contributing to Emergency Mitra

Thanks for helping out! A few ground rules keep this repo healthy.

## Ground rules

- **Keep the 33 regression tests green.** Run before every commit:
  ```
  node test/test-credibility-engine.js
  node test/test-facilities.js
  node test/test-tutorial.js
  ```
- **No build step, no dependencies.** Vanilla JS + Tailwind CDN is a deliberate
  choice for rural low-end phones. Don't add a bundler unless the team agrees.
- **Scoring rules are spec-locked.** Any change to `js/trust/credibility-engine.js`
  must update the test vectors and get lead sign-off — judges ask for justifications.
- **Language strings** go through `js/translations.js` — never hard-code UI text.

## Workflow

1. Branch from `main`: `feat/<short-name>` or `fix/<short-name>`
2. Small, focused commits (conventional style: `feat:`, `fix:`, `test:`, `docs:`)
3. Open a PR describing what changed and how you tested it
4. Lead reviews; merge only when tests pass

## Code style

- 4 spaces, same formatting as existing files
- Comments explain *why*, not *what*
- No secrets in code — config lives in env vars / `.env` (gitignored)
