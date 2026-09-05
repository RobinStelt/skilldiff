import type { RunResult } from "@marktplatz/schema";
import type { RunResultRepo } from "../../src/ingestion/runResultRepo.js";
import type { ContentRepo } from "../../src/ingestion/contentRepo.js";

export interface FakeStoredRow {
  runResult: RunResult;
  weight: number;
  anomalyFlags: string[];
}

export function createFakeRunResultRepo(): RunResultRepo & { rows: Map<string, FakeStoredRow> } {
  const rows = new Map<string, FakeStoredRow>();
  return {
    rows,
    async exists(runId) {
      return rows.has(runId);
    },
    async insert(runResult, weight, anomalyFlags) {
      rows.set(runResult.run_id, { runResult, weight, anomalyFlags: [...anomalyFlags] });
    },
  };
}

export function createFakeContentRepo(): ContentRepo & { rows: Map<string, string> } {
  const rows = new Map<string, string>();
  return {
    rows,
    async insert(runId, contentRef) {
      rows.set(runId, contentRef);
    },
  };
}
