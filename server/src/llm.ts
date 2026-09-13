// ── LLM providers: Nebius Token Factory (OpenAI-compatible) or deterministic mock ──

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmUsage {
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  model: string;
}

export interface LlmResult {
  text: string;
  usage: LlmUsage;
}

export interface LlmProvider {
  readonly name: string;
  readonly models: Record<string, string>;
  chat(
    messages: ChatMessage[],
    opts?: { model?: string; maxTokens?: number; temperature?: number },
  ): Promise<LlmResult>;
}

export class NebiusLlm implements LlmProvider {
  readonly name = "nebius";
  constructor(
    private apiKey: string,
    private baseUrl: string,
    readonly models: Record<string, string>,
  ) {}

  async chat(
    messages: ChatMessage[],
    opts: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<LlmResult> {
    const model = opts.model || this.models.coder;
    const t0 = Date.now();
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.2,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Nebius LLM ${model} ${res.status}: ${body.slice(0, 400)}`);
    }
    const data: any = await res.json();
    let choice = data.choices?.[0]?.message?.content ?? "";
    if (typeof choice !== "string") choice = JSON.stringify(choice);
    // strip reasoning traces if the model emits them inline
    choice = choice.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
    return {
      text: choice,
      usage: {
        tokensIn: data.usage?.prompt_tokens ?? 0,
        tokensOut: data.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - t0,
        model,
      },
    };
  }
}

/**
 * Deterministic mock for offline dev/tests. Pairs with the bundled demo repo
 * (github.com/AntrikshH90/sandforge-demo): first patch attempt is WRONG
 * (showcasing branch/backtrack), second attempt is the real fix.
 */
export class MockLlm implements LlmProvider {
  readonly name = "mock";
  readonly models = { coder: "mock-coder-7b", planner: "mock-planner-3b" };
  private n = 0;

  async chat(
    messages: ChatMessage[],
    opts: { model?: string } = {},
  ): Promise<LlmResult> {
    this.n++;
    const all = messages.map((m) => m.content).join("\n");
    const model = opts.model || this.models.coder;
    let text = "";

    if (all.includes("TASK: PLAN")) {
      text = JSON.stringify(
        [
          {
            n: 1,
            title: "Reproduce the failure",
            detail: "Run the test suite on a clean sandbox checkpoint to capture exact failing assertions.",
          },
          {
            n: 2,
            title: "Patch the module under test",
            detail: "Apply a minimal edit to the file the failing test imports.",
          },
          {
            n: 3,
            title: "Re-run tests from a fresh branch",
            detail: "If red, backtrack to the clean checkpoint and retry with an escalated strategy.",
          },
        ],
        null,
        0,
      );
    } else if (all.includes("TASK: PATCH")) {
      const isFib = all.includes("fib");
      // wrongness is keyed to the STRATEGY (minimal-patch = first attempt),
      // not to a call counter — so the backtrack demo is reproducible on
      // every run, even on a long-lived server process.
      const isFirstStrategy = all.includes("Make the smallest change that fixes the failing assertion");
      const wrongFix = {
        rationale:
          "Attempt 1: guard the base case at n < 2 and return 1 to stop the recursion.",
        edits: [
          {
            path: "src/fib.js",
            action: "search_replace",
            search: "if (n < 1) return 0;",
            replace: "if (n < 2) return 1;",
          },
        ],
      };
      const rightFix = {
        rationale:
          "Attempt 2 (from clean checkpoint): the base case must return n itself — fib(0)=0, fib(1)=1 — then recurse.",
        edits: [
          {
            path: "src/fib.js",
            action: "search_replace",
            search: "if (n < 1) return 0;",
            replace: "if (n <= 1) return n;",
          },
        ],
      };
      const patch = isFib
        ? isFirstStrategy
          ? wrongFix
          : rightFix
        : {
            rationale: "Mock fallback patch (no-op comment).",
            edits: [
              {
                path: "README.md",
                action: "search_replace",
                search: "# sandforge-demo",
                replace: "# sandforge-demo\n\nPatched by SandForge mock run.",
              },
            ],
          };
      text = "```json\n" + JSON.stringify(patch, null, 2) + "\n```";
    } else if (all.includes("TASK: SUMMARIZE")) {
      text =
        "Fixed the fibonacci base case: fib(0) and fib(1) now return their own value instead of a hardcoded constant. " +
        "First attempt (return 1 for n<2) failed the fib(0)===0 assertion; the agent backtracked to the clean checkpoint and applied the correct minimal guard. All tests green.";
    } else {
      text = `Mock LLM response #${this.n}.`;
    }

    return {
      text,
      usage: {
        tokensIn: Math.ceil(all.length / 4) + 140,
        tokensOut: Math.ceil(text.length / 4),
        latencyMs: 40 + (this.n % 5) * 10,
        model,
      },
    };
  }
}
