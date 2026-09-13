# SandForge — submission kit

## Devpost project description (paste into "What you built")

**SandForge** is an autonomous PR agent that turns a plain-English task on a GitHub repo into a green, reviewed pull request — and recovers from its own mistakes using checkpoint branching.

Most coding agents pile edits onto a broken state or re-clone from scratch when a patch fails. SandForge doesn't have to: it runs every step inside **Nebius Token Factory Sandboxes**, where each execution produces a checkpoint image. When an attempt leaves tests red, the agent **backtracks to the clean checkpoint in a single API call** and retries with an escalated strategy (minimal-patch → alternative-implementation → refactor-around → rethink). Failed attempts cost seconds, not rebuilds.

**The loop:** clone repo into a sandbox → plan (Nemotron 3 Nano) → patch (Nemotron 3 Super) → run the repo's own test suite inside the sandbox → red? branch/backtrack and retry (up to 4 strategies) → green? open a real GitHub PR with a model-written description. A Next.js dashboard shows a live event timeline, a branch tree of every attempt, per-run stats (tokens, latency, test runs), and the final diff.

**Models (NVIDIA open source, on Nebius Token Factory):**
- `nvidia/nemotron-3-super-120b-a12b` — patch generation and diagnosis (120B MoE, 12B active)
- `nvidia/Nemotron-3-Nano-Omni` — planning and PR summaries (fast everyday calls)

**Nebius services:** Token Factory serverless inference (OpenAI-compatible API) + Token Factory Sandboxes (ConTree) for all code execution — VM-isolated, resource-metered, checkpoint-branchable.

**Why it's fully runnable by anyone:** every external dependency sits behind a provider interface with two implementations — Nebius (real) and local/mock (git-backed checkpoints + deterministic model). With `NEBIUS_API_KEY` set the engine uses Nemotron + Sandboxes; without it, the complete loop still runs (clone → plan → patch → test → backtrack → PR) using git SHAs as checkpoints. The repo includes a deliberately broken demo target (`sandforge-demo`) whose first agent attempt fails on purpose — so judges can watch the backtrack-and-recover behavior in the first 60 seconds.

**Track:** Coding and Agentic Engineering — an agent that writes, runs, and tests code in Token Factory Sandboxes.

## 3-minute demo video script

> Record: dashboard on localhost:3022, terminal, and the PR on github.com. Keep it under 3:00.

**[0:00–0:20] Hook**
"Every coding agent can write a patch. Almost none can recover when the patch is wrong. This is SandForge — an agent that plans, patches, tests, and when tests stay red, it backtracks to a clean checkpoint and tries a different strategy. It's powered by NVIDIA Nemotron models on Nebius Token Factory, and it ends with a real pull request."

**[0:20–0:45] Architecture (dashboard header)**
"Two Nebius services do the heavy lifting. Inference runs on Token Factory's OpenAI-compatible API — Nemotron 3 Nano handles the fast calls, planning and summaries, and Nemotron 3 Super, a 120-billion-parameter mixture-of-experts model with 12 billion active, does the real reasoning when it writes patches. All code execution happens in Token Factory Sandboxes — every run is a VM-isolated container that produces a checkpoint image, like a git commit for the whole machine."

**[0:45–2:00] The live run (the money clip)**
Type task "Fix the fibonacci function so all tests pass" + demo repo URL → hit **Forge PR**. Narrate the timeline as it streams:
- "It cloned the repo into a sandbox — that state is the clean checkpoint."
- "Nano drafted the plan: reproduce, patch, re-test."
- "Attempt one: Super wrote a minimal patch — base case returns 1 for n < 2. Tests run in the sandbox... and they're red: fib of 0 should be 0."
- "Now the key moment — no piling edits, no re-clone. It backtracks to the clean checkpoint and escalates the strategy."
- "Attempt two: base case returns n itself. Tests green. Diff captured."
- "PR opened — open it on GitHub: title, model-written description, one-line fix, exactly what the tests demanded."

**[2:00–2:40] The branch tree + why it matters**
(point at branch tree) "Each dot is an attempt with its own checkpoint. Failed branches are cheap — one API call to abandon. This is Token Factory Sandboxes' checkpoint branching doing what re-cloning does in other agents, in milliseconds. The same loop is what I'd use to explore multiple fix strategies in parallel — score results, keep the best branch."

**[2:40–3:00] Wrap**
"SandForge: autonomous PRs with test-driven self-correction, Nemotron 3 for brains, Token Factory Sandboxes for safe, checkpointed execution. Repo and MIT-licensed code in the description — try it with one npm install and no cloud keys."

## Submission checklist

- [x] Working project — full loop verified end-to-end (PRs opened on demo repo)
- [x] Category — Coding and Agentic Engineering Track
- [x] Project description — above
- [x] Public repo — https://github.com/AntrikshH90/sandforge (MIT license visible on repo page)
- [x] Open-source license — MIT at repo root
- [x] README with setup + Nebius/Nemotron highlights
- [x] Feedback — FEEDBACK.md
- [ ] Working demo URL — needs deploy (Vercel + Render/Railway, or Nebius AI Cloud VM) — or the localhost test build for judges
- [ ] 3-min YouTube video — script above, record + upload (public)
- [ ] `NEBIUS_API_KEY` + `NEBIUS_PROJECT_ID` in `.env` → flip from mock/local to real Nemotron + Sandboxes before recording
- [ ] Devpost form: submit before Oct 30, 2026 10:00am PDT
