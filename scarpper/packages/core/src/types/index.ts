export type JobType =
  | "run:execute"
  | "export:generate"
  | "run:control";

export interface RunJobPayload {
  runId: string;
  workspaceId: string;
  collectionId: string;
  sourceIds: string[];
  pageBudget: number;
  preview: boolean;
  autoExportFormat?: "csv" | "json" | "jsonl" | "parquet" | "bibtex" | null;
}

export interface ControlJobPayload {
  runId: string;
  action: "pause" | "resume" | "cancel";
}

export interface ExportJobPayload {
  artifactId: string;
  workspaceId: string;
  collectionId: string;
  format: "csv" | "json" | "jsonl" | "parquet" | "bibtex";
  runId?: string;
  limit?: number;
  requestedBy?: string;
}

export interface ExtractionField {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description?: string;
  required?: boolean;
}

export interface RawExtractedRecord {
  payload: Record<string, unknown>;
  sourceUrl: string;
  confidenceScore?: number;
  provenance?: Record<string, unknown>;
}

export interface RunEventLog {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

export interface ExtractionResult {
  records: RawExtractedRecord[];
  pagesProcessed: number;
  errors: string[];
}
