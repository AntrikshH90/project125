# SandForge

**An autonomous PR agent that plans, patches, tests, and — when a fix doesn't work — branches, backtracks, and retries.** Built for the [Nebius × NVIDIA Global AI Hackathon](https://nebiusglobalaihackathon.devpost.com/) · **Coding & Agentic Engineering track**.

Give SandForge a GitHub repo and a plain-English task. It clones the repo into a **Nebius Token Factory Sandbox**, plans with **Nemotron 3 Nano**, patches with **Nemotron 3 Super**, runs the repo's test suite, and if the tests stay red it **backtracks to a clean checkpoint and retries with an escalated strategy** — up to 4 attempts. When tests go green, it opens a real pull request on GitHub.

```
task ──▶ clone into Sandbox ──▶ plan (Nano) ──▶ patch (Super) ──▶ run tests
   ▲                                                              │
   └────────── backtrack to clean checkpoint ◀── tests red ◀──────┘
                                  │ tests green
                                  ▼
                          diff ──▶ open GitHub PR
```

## Why this exists

Every coding agent can write a patch. Very few can *recover from a bad patch* without either (a) piling edits on top of a broken state until the diff is a mess, or (b) re-cloning and re-installing everything from scratch. SandBoxes' git-like **checkpoint branching** fixes exactly this: every sandbox run produces a checkpoint image, so a failed attempt costs one API call to undo — not a rebuild. SandForge is that loop, productized: a dashboard to launch runs, a live event timeline, a branch tree of every attempt, and a PR at the end.

## The agent loop

1. **Bootstrap** — clone the target repo into a fresh sandbox (base image `node:20-slim`); the cloned state becomes the **clean checkpoint**.
2. **Plan** — `nvidia/Nemotron-3-Nano-Omni` drafts a 2–4 step plan from the task + failing test output. Cheap model, fast call.
3. **Attempt** (up to 4, escalating strategies) — `nvidia/nemotron-3-super-120b-a12b` reads the failing source, returns a structured JSON patch (`{edits: [{path, action, search, replace}]}`).
4. **Apply + test** — edits are applied inside the sandbox (each edit → new checkpoint), then the repo's own test command runs. On **Nebius**, this happens in a Token Factory Sandbox: VM-isolated, untrusted-code-safe, resource-metered.
5. **Branch / backtrack** — tests red? The next attempt spawns from the **clean checkpoint** — the bad edits vanish instantly, no rebuild. The dashboard's branch tree shows every attempt, green/red, and the checkpoint it forked from.
6. **Ship** — tests green → unified diff → real GitHub PR with a model-written description.

Strategies escalate: `minimal-patch` → `alternative-implementation` → `refactor-around` → `from-scratch-rethink`.

## Stack

| Layer | Tech |
|---|---|
| Inference | Nebius Token Factory — OpenAI-compatible API (`api.tokenfactory.nebius.com/v1`) |
| Models | **NVIDIA Nemotron 3 Super 120B-A12B** (patching, reasoning) · **Nemotron 3 Nano Omni** (planning, summaries) |
| Code execution | **Token Factory Sandboxes (Contree)** — checkpointed sandbox runs, `result_image_uuid` = branch point |
| Agent engine | TypeScript / Node — provider-swappable: `NebiusLlm | MockLlm`, `ContreeSandbox | LocalSandbox` |
| API | Express + SSE (live run-event streaming) |
| Dashboard | Next.js 15 (React 19), Tailwind — run list, live timeline, branch tree, diff view |
| GitHub | REST API — branch, apply patch, open PR |

## Provider architecture (why it runs anywhere)

Every external capability is an interface with two implementations:

- `LlmProvider` → `NebiusLlm` (Token Factory) | `MockLlm` (deterministic, offline)
- `SandboxProvider` → `ContreeSandbox` (Token Factory Sandboxes) | `LocalSandbox` (real git commits as checkpoints, host OS)

With `NEBIUS_API_KEY` set, the engine picks Nebius automatically. Without it, **local/mock mode still exercises the complete loop** — clone, plan, patch, test, backtrack, PR — using git SHAs as checkpoints and a deterministic mock model. This is how the project was developed and tested end-to-end before cloud keys were attached, and it's what makes the repo instantly runnable for anyone.

## Quick start

```bash
# 1) install
cd server && npm install
cd ../dashboard && npm install

# 2) configure (repo root)
cp .env.example .env
#    NEBIUS_API_KEY   — from console.nebius.com → Token Factory → API keys
#    NEBIUS_PROJECT_ID — from the console URL / project settings
#    GITHUB_TOKEN     — PAT with repo scope (for PRs; optional)

# 3) run (two terminals, or START-SANDFORGE.bat on Windows)
cd server && npx tsx src/index.ts        # API on :4021
cd dashboard && npx next dev -p 3022      # UI on :3022
```

Open **http://localhost:3022**, paste a repo + task, hit **Forge PR**.

Try it immediately against the bundled demo (a deliberately broken fibonacci):

- repo: `https://github.com/AntrikshH90/sandforge-demo`
- task: `Fix the fibonacci function so all tests pass`

Watch the timeline: attempt 1's patch fails the `fib(0) === 0` assertion → **backtrack** → attempt 2 fixes the base case → tests green → a real PR appears.

### API-only usage

```bash
curl -X POST http://localhost:4021/api/runs \
  -H 'Content-Type: application/json' \
  -d '{"task":"Fix the fibonacci function so all tests pass",
       "repoUrl":"https://github.com/AntrikshH90/sandforge-demo"}'
# → {"id":"run_...","status":"success","prUrl":"https://github.com/.../pull/N", ...}

curl -N http://localhost:4021/api/runs/<id>/events    # live SSE event stream
```

## What runs on Nebius

| Function | Nebius service | Detail |
|---|---|---|
| Planning + patch generation + PR summaries | Token Factory serverless inference | Nemotron 3 Super (120B-A12B) for patches, Nemotron 3 Nano Omni for planning — per the "Nano for fast calls, Super for reasoning" pattern |
| Repo clone, edit application, test runs | **Token Factory Sandboxes (Contree)** | Every run is a VM-isolated sandbox operation; `disposable:false` produces a checkpoint image; branching = spawning from a checkpoint; backtracking = re-spawning from the clean checkpoint |

Sandbox auth: `Authorization: Bearer <NEBIUS_API_KEY>` + `Project: <NEBIUS_PROJECT_ID>` headers against `https://api.tokenfactory.nebius.com/sandboxes/v1`.

## Project layout

```
sandforge/
├── server/            # agent engine + API
│   └── src/
│       ├── engine.ts  # the loop: plan → patch → test → branch/backtrack → PR
│       ├── llm.ts     # NebiusLlm (Token Factory) | MockLlm
│       ├── sandbox.ts # ContreeSandbox (Sandboxes) | LocalSandbox (git)
│       ├── github.ts  # PR creation via REST
│       ├── api.ts     # Express + SSE
│       └── types.ts
├── dashboard/         # Next.js UI
│   └── app/
│       ├── page.tsx            # run launcher + run list
│       └── runs/[id]/          # live timeline, stats, branch tree, diff
├── .env.example
└── START-SANDFORGE.bat
```

## Configuration reference

| Var | Required | Default | Purpose |
|---|---|---|---|
| `NEBIUS_API_KEY` | for Nebius mode | — | Token Factory inference + Sandboxes auth |
| `NEBIUS_PROJECT_ID` | for Sandboxes | — | `Project` header for sandbox operations |
| `GITHUB_TOKEN` | for PRs | — | PAT with repo scope |
| `MODEL_CODER` | no | `nvidia/nemotron-3-super-120b-a12b` | heavy reasoning model |
| `MODEL_PLANNER` | no | `nvidia/Nemotron-3-Nano-Omni` | fast everyday model |
| `SANDBOX_IMAGE` | no | `node:20-slim` | sandbox base image |
| `LLM_PROVIDER` / `SANDBOX_PROVIDER` | no | `auto` | force `mock`/`nebius`, `local`/`contree` |

## Hackathon notes

- Built during the Nebius × NVIDIA Global AI Hackathon submission period.
- Models used (both NVIDIA open source, both served on Nebius Token Factory):
  - `nvidia/nemotron-3-super-120b-a12b` — patch generation & diagnosis
  - `nvidia/Nemotron-3-Nano-Omni` — planning & summaries
- Nebius services used: **Token Factory serverless inference**, **Token Factory Sandboxes (ConTree)**.
- Feedback on the platform is captured in `FEEDBACK.md`.

## License

MIT — see [LICENSE](LICENSE).
