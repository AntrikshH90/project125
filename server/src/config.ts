import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// .env lives at repo root (sandforge/.env)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const config = {
  port: Number(process.env.PORT || 4021),
  nebiusApiKey: process.env.NEBIUS_API_KEY || "",
  nebiusProjectId: process.env.NEBIUS_PROJECT_ID || "",
  githubToken: process.env.GITHUB_TOKEN || "",
  tavilyApiKey: process.env.TAVILY_API_KEY || "",

  // inference (OpenAI-compatible endpoint)
  nebiusLlmBase:
    process.env.NEBIUS_LLM_BASE || "https://api.tokenfactory.nebius.com/v1",
  // Nemotron lineup on Token Factory; first available wins per role.
  models: {
    // heavy reasoning: patch generation, diagnosis
    coder: process.env.MODEL_CODER || "nvidia/nemotron-3-super-120b-a12b",
    // fast everyday: planning, summarization, PR descriptions
    planner: process.env.MODEL_PLANNER || "nvidia/Nemotron-3-Nano-Omni",
  },

  // sandboxes (Contree)
  contreeBase:
    process.env.CONTREE_BASE || "https://api.tokenfactory.nebius.com/sandboxes/v1",
  sandboxBaseImage: process.env.SANDBOX_IMAGE || "node:20-slim",

  // provider selection: "auto" uses Nebius when key present, else mock/local
  llmProvider: process.env.LLM_PROVIDER || "auto",
  sandboxProvider: process.env.SANDBOX_PROVIDER || "auto",

  dataDir: path.resolve(__dirname, "../data"),
};

export type LlmProviderName = "mock" | "nebius";
export type SandboxProviderName = "local" | "contree";

export function resolveLlmProvider(): LlmProviderName {
  if (config.llmProvider === "mock") return "mock";
  if (config.llmProvider === "nebius") return "nebius";
  return config.nebiusApiKey ? "nebius" : "mock";
}

export function resolveSandboxProvider(): SandboxProviderName {
  if (config.sandboxProvider === "local") return "local";
  if (config.sandboxProvider === "contree") return "contree";
  return config.nebiusApiKey && config.nebiusProjectId ? "contree" : "local";
}
