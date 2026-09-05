import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import type { Category } from "@marktplatz/schema";
import type { AccountStore } from "./accounts/accountStore.js";
import type { RunResultRepo } from "./ingestion/runResultRepo.js";
import type { ContentRepo } from "./ingestion/contentRepo.js";
import { ingestRunResult } from "./ingestion/ingestRunResult.js";
import type { SkillCategoryMetrics } from "./aggregation/metrics.js";
import { toCsv } from "./api/export.js";
import { exportUrlFor, type RawExportRecord, type SkillDetailResponse, type SkillListResponse } from "./api/publicApi.js";
import { registerAdminRoutes } from "./api/adminRoutes.js";
import type { AdminUserStore } from "./admin/adminUserStore.js";
import type { AdminSessionStore } from "./admin/sessions.js";
import type { SkillMetadataStore } from "./admin/skillMetadataStore.js";

export interface AppDeps {
  accountStore: AccountStore;
  runResultRepo: RunResultRepo;
  contentRepo: ContentRepo;
  trustedHashes: ReadonlySet<string>;
  getSkillMetrics: (skillId: string) => Promise<SkillCategoryMetrics[]>;
  getAllSkillMetrics: () => Promise<SkillCategoryMetrics[]>;
  /** Backs GET /api/skills — the frontend's public listing contract (frontend/src/api/types.ts). */
  listSkills: (options: { category?: Category; cursor?: string | null }) => Promise<SkillListResponse>;
  /** Backs GET /api/skills/:skillId — null means "no data for this skill", mapped to 404. */
  getSkillDetail: (skillId: string) => Promise<SkillDetailResponse | null>;
  /** Backs GET /api/skills/:skillId/export?category= — raw, non-plaintext records behind one aggregate (briefing point 6). */
  getRawExportRecords: (skillId: string, category: Category) => Promise<RawExportRecord[]>;
  now?: () => Date;
  /** Admin login + skill catalog CRUD (/api/admin/*, not part of any briefing — see db/migrations/003). */
  adminUserStore: AdminUserStore;
  sessionStore: AdminSessionStore;
  skillMetadataStore: SkillMetadataStore;
}

const VALID_CATEGORIES: readonly Category[] = ["debugging", "feature", "refactoring", "docs", "marketing", "other"];

function parseCategory(value: unknown): Category | undefined {
  return typeof value === "string" && (VALID_CATEGORIES as readonly string[]).includes(value)
    ? (value as Category)
    : undefined;
}

/**
 * Pure HTTP wiring — all actual logic lives in ingestion/aggregation/
 * accounts modules and is unit-tested there directly. This file (and its
 * test/app.test.ts) only checks status codes and response shape.
 *
 * Two API surfaces on purpose: `/v1/*` is the CLI-facing ingestion +
 * internal-metrics API (briefing 04); `/api/*` is the public frontend
 * contract (frontend/src/api/types.ts, briefing 05) — same aggregation
 * logic underneath, different response shape because the frontend
 * contract predates and doesn't mirror the internal one field-for-field.
 */
export function buildApp(deps: AppDeps): FastifyInstance {
  const app = Fastify({ logger: false });

  app.post("/v1/accounts", async (request, reply) => {
    const body = request.body as { account_id?: unknown; signing_secret?: unknown } | undefined;
    if (typeof body?.account_id !== "string" || body.account_id.length === 0) {
      return reply.code(400).send({ error: "account_id must be a non-empty string" });
    }
    if (typeof body.signing_secret !== "string" || body.signing_secret.length === 0) {
      return reply.code(400).send({ error: "signing_secret must be a non-empty string" });
    }

    const { status } = await deps.accountStore.register(body.account_id, body.signing_secret);
    if (status === "already_registered_different_secret") {
      // Deliberately not 409-with-detail: don't help an attacker distinguish
      // "wrong secret" from "account taken" beyond what's necessary.
      return reply.code(409).send({ error: "account_id already registered with a different secret" });
    }
    return reply.code(status === "created" ? 201 : 200).send({ account_id: body.account_id, status });
  });

  app.post("/v1/run-results", async (request, reply) => {
    const outcome = await ingestRunResult(request.body, {
      accountStore: deps.accountStore,
      runResultRepo: deps.runResultRepo,
      contentRepo: deps.contentRepo,
      trustedHashes: deps.trustedHashes,
      now: deps.now,
    });

    if (outcome.ok) {
      return reply.code(201).send({ run_id: outcome.runId, weight: outcome.weight });
    }

    switch (outcome.error) {
      case "invalid_payload":
        return reply.code(400).send({ error: outcome.error, details: outcome.details });
      case "unregistered_account":
        return reply.code(401).send({ error: outcome.error });
      case "invalid_signature":
        return reply.code(401).send({ error: outcome.error });
      case "duplicate_run_id":
        return reply.code(409).send({ error: outcome.error });
    }
  });

  app.get("/v1/skills/:skillId/metrics", async (request) => {
    const { skillId } = request.params as { skillId: string };
    const metrics = await deps.getSkillMetrics(skillId);
    // Array, one entry per category — never a single merged value (briefing
    // point 3 / acceptance criterion), enforced structurally by the shape.
    return { skill_id: skillId, metrics_by_category: metrics };
  });

  app.get("/v1/export.json", async () => {
    return { metrics: await deps.getAllSkillMetrics() };
  });

  app.get("/v1/export.csv", async (_request, reply) => {
    const metrics = await deps.getAllSkillMetrics();
    reply.type("text/csv");
    return toCsv(metrics);
  });

  // --- Public frontend contract (briefing 05, frontend/src/api/*) --------
  //
  // Encapsulated in its own plugin scope so CORS applies only here — this
  // is the one surface meant to be called directly from a browser (the
  // marketplace frontend, possibly on a different origin). `/v1/*` above
  // stays without CORS: it's called from the CLI/server-to-server, never
  // from browser JS, and doesn't need it.
  app.register(async (publicApi) => {
    await publicApi.register(cors, { methods: ["GET"] });

    publicApi.get("/api/skills", async (request) => {
      const query = request.query as { category?: unknown; cursor?: unknown };
      return deps.listSkills({
        category: parseCategory(query.category),
        cursor: typeof query.cursor === "string" ? query.cursor : null,
      });
    });

    publicApi.get("/api/skills/:skillId", async (request, reply) => {
      const { skillId } = request.params as { skillId: string };
      const detail = await deps.getSkillDetail(skillId);
      if (!detail) {
        return reply.code(404).send({ error: "unknown_skill" });
      }
      return {
        skillId: detail.skillId,
        aggregationSourceUrl: detail.aggregationSourceUrl,
        metadata: detail.metadata,
        categories: detail.categories.map((c) => ({
          category: c.category,
          sampleSize: c.sampleSize,
          successDelta: c.successDelta,
          tokensDelta: c.tokensDelta,
          durationDelta: c.durationDelta,
          securityDelta: c.securityDelta,
          isolationTierBreakdown: c.isolationTierBreakdown,
          distinctAccountCount: c.distinctAccountCount,
          seedDataMajority: c.seedDataMajority,
          exportUrl: exportUrlFor(detail.skillId, c.category),
        })),
      };
    });

    publicApi.get("/api/skills/:skillId/export", async (request, reply) => {
      const { skillId } = request.params as { skillId: string };
      const query = request.query as { category?: unknown };
      const category = parseCategory(query.category);
      if (!category) {
        return reply.code(400).send({ error: "category query parameter is required" });
      }
      const records = await deps.getRawExportRecords(skillId, category);
      return { skillId, category, records };
    });
  });

  registerAdminRoutes(app, {
    adminUserStore: deps.adminUserStore,
    sessionStore: deps.sessionStore,
    skillMetadataStore: deps.skillMetadataStore,
  });

  return app;
}
