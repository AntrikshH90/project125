# Nebius / NVIDIA feedback notes (hackathon)

Written during the build of SandForge (Token Factory inference + Sandboxes agent).

## Token Factory

- OpenAI-compatible API at `api.tokenfactory.nebius.com/v1` made wiring the
  Nemotron models a 10-minute job — no SDK lock-in, standard fetch calls.
- The Nano/Super/Ultra size split maps perfectly onto agent workloads:
  planning/summarize calls on Nano keep the loop fast and cheap, and we only
  spend Super tokens on patch generation where reasoning quality matters.
- Rate-limit headers (`x-ratelimit-remaining-*`) are a nice touch for
  agent-driven workloads — we plan to use them for adaptive backoff.

## Sandboxes (ConTree)

- Checkpoint branching (`disposable: false` → `result_image_uuid`) is the
  single most valuable primitive for coding agents: a failed attempt costs
  one spawn call to undo, not a rebuild. This should be the default mental
  model for SWE agents.
- Async operations with polling + SSE event streams are well designed for
  agents; the event log makes execution fully replayable.
- Docs: the REST reference is complete (api.yaml is a full OpenAPI 3 spec),
  and the Python SDK examples made the HTTP shapes easy to mirror in TS.
  A first-class TS/JS SDK would remove the need to hand-roll the client.
- Beta limits (50 concurrent operations, 180-day checkpoint retention) were
  never a problem for single-agent development.

## NVIDIA Nemotron

- Nemotron 3 Super's structured-JSON patch outputs (with a strict prompt)
  were reliable enough to apply mechanically via search/replace — rare for
  open models in our experience.
- Both models are Apache-friendly open weights — perfect hackathon citizens.

## Minor friction

- Two different base URLs (`/v1` inference vs `/sandboxes/v1`) — a unified
  console view of "everything my key can do" would help discovery.
- Discovering that Sandboxes auth needs the `Project` header (not just the
  bearer token) required reading the OpenAPI securitySchemes — the docs
  page could surface it more prominently.
