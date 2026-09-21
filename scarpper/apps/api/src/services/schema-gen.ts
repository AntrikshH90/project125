import { z } from "zod";

interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description?: string;
  required?: boolean;
}

const FIELD_TYPES = ["string", "number", "boolean", "array"] as const;

const llmFieldSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  type: z.enum(FIELD_TYPES),
  description: z.string().optional(),
  required: z.boolean().optional()
});

const llmResponseSchema = z.object({
  fields: z.array(llmFieldSchema).min(1).max(40)
});

const SYSTEM_PROMPT = `You are a data schema architect for a web scraping platform.
Given a natural-language description of what a user wants to extract from a web page, document, or API,
design a flat extraction schema.

Rules:
- Output ONLY JSON: {"fields": [{"name","type","description","required"}]}
- Field names: snake_case identifiers (letters, digits, underscore; cannot start with a digit).
- Types: string, number, boolean, array (array = list of strings; e.g. authors, tags).
- Prefer 5-15 focused fields. Include the most useful metadata fields (title, url, date, etc. when relevant).
- "description" should briefly tell an LLM extractor what to capture for that field.
- No nested objects. No duplicate names.`;

export async function generateSchemaFromPrompt(
  prompt: string,
  url?: string
): Promise<{ fields: SchemaField[]; source: "llm" | "heuristic" }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const generated = await callLlm(apiKey, prompt, url);
      if (generated) return { fields: generated, source: "llm" };
    } catch (err) {
      console.warn("[schema-gen] LLM call failed, falling back to heuristics:", err);
    }
  }
  return { fields: heuristicSchema(prompt), source: "heuristic" };
}

async function callLlm(apiKey: string, prompt: string, url?: string): Promise<SchemaField[] | null> {
  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const userContent = [
    `Extraction goal: ${prompt}`,
    url ? `Target source: ${url}` : null,
    "Design the extraction schema."
  ]
    .filter(Boolean)
    .join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent }
        ],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = llmResponseSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return null;
    return parsed.data.fields.map((f) => ({
      name: f.name,
      type: f.type,
      description: f.description,
      required: f.required ?? false
    }));
  } finally {
    clearTimeout(timeout);
  }
}

const KEYWORD_FIELDS: Array<{ match: RegExp; fields: SchemaField[] }> = [
  {
    match: /paper|research|arxiv|publication|journal|citation/i,
    fields: [
      { name: "title", type: "string", description: "Paper or article title", required: true },
      { name: "authors", type: "array", description: "List of author names" },
      { name: "published", type: "string", description: "Publication date" },
      { name: "abstract", type: "string", description: "Abstract or summary text" },
      { name: "url", type: "string", description: "Link to the paper" }
    ]
  },
  {
    match: /product|price|ecommerce|shop|listing/i,
    fields: [
      { name: "product_name", type: "string", description: "Product title", required: true },
      { name: "price", type: "number", description: "Numeric price value" },
      { name: "currency", type: "string", description: "Currency code" },
      { name: "availability", type: "string", description: "In stock / out of stock" },
      { name: "url", type: "string", description: "Product page URL" }
    ]
  },
  {
    match: /medical|dosage|clinical|trial|drug|patient/i,
    fields: [
      { name: "study_title", type: "string", description: "Study or trial title", required: true },
      { name: "intervention", type: "string", description: "Drug or intervention name" },
      { name: "dosage", type: "string", description: "Dosage information (e.g. 250mg)" },
      { name: "phase", type: "string", description: "Trial phase" },
      { name: "outcome", type: "string", description: "Primary outcome or findings" }
    ]
  },
  {
    match: /repo|github|commit|star|repository/i,
    fields: [
      { name: "repo_name", type: "string", description: "Repository full name (owner/name)", required: true },
      { name: "description", type: "string", description: "Repository description" },
      { name: "stars", type: "number", description: "Star count" },
      { name: "language", type: "string", description: "Primary language" },
      { name: "url", type: "string", description: "Repository URL" }
    ]
  },
  {
    match: /job|hiring|career|position/i,
    fields: [
      { name: "job_title", type: "string", description: "Job title", required: true },
      { name: "company", type: "string", description: "Company name" },
      { name: "location", type: "string", description: "Job location" },
      { name: "salary", type: "string", description: "Salary range if listed" },
      { name: "url", type: "string", description: "Job posting URL" }
    ]
  }
];

function heuristicSchema(prompt: string): SchemaField[] {
  for (const entry of KEYWORD_FIELDS) {
    if (entry.match.test(prompt)) return entry.fields;
  }
  return [
    { name: "title", type: "string", description: "Primary title or heading of the item", required: true },
    { name: "description", type: "string", description: "Short summary or main content" },
    { name: "date", type: "string", description: "Relevant date if present" },
    { name: "url", type: "string", description: "Source link for the item" },
    { name: "tags", type: "array", description: "Categories or labels" }
  ];
}
