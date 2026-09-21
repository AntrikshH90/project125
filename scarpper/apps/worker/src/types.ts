import type { RawExtractedRecord } from "@dataharvest/core";

export interface SchemaFieldLike {
  name: string;
  type: string;
  description?: string;
  required?: boolean;
}

export interface PageRecords {
  records: RawExtractedRecord[];
}

export interface SourceOutcome {
  pages: PageRecords[];
  errors: string[];
}
