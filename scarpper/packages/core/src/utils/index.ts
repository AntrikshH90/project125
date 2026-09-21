import { createHash } from "node:crypto";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || `ws-${sha256(input).slice(0, 8)}`;
}

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function truncate(input: string, max: number): string {
  return input.length <= max ? input : `${input.slice(0, max - 1)}…`;
}

export function artifactKey(workspaceId: string, collectionId: string, artifactId: string, format: string): string {
  return `artifacts/${workspaceId}/${collectionId}/${artifactId}.${format}`;
}
