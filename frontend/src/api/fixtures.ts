import type { SkillDetail } from "./types.js";

/**
 * Sample data for local development (`npm run dev`) and as the backing
 * data for `createMockApiClient` in tests. Deliberately covers every edge
 * case the briefing calls out: not-enough-data, low account diversity,
 * seed-data majority, and a category with no security signal at all.
 */
export const fixtureSkills: SkillDetail[] = [
  {
    skillId: "skill_bugfinder_v2",
    aggregationSourceUrl: "https://github.com/example-org/marktplatz/tree/main/backend/src/aggregation",
    metadata: {
      name: "Bugfinder v2",
      description: "Traces a bug report to its root cause across the whole call graph before proposing a fix.",
      githubUrl: "https://github.com/example-org/bugfinder",
      license: "MIT",
      maintainer: "example-org",
      declaredCategory: "debugging",
      githubStars: 1240,
    },
    categories: [
      {
        category: "debugging",
        sampleSize: 142,
        successDelta: { medianDelta: 0.18, confidenceInterval: { low: 0.09, high: 0.27 }, sampleSize: 142 },
        tokensDelta: { medianDelta: 3200, confidenceInterval: { low: 1800, high: 4600 }, sampleSize: 142 },
        durationDelta: { medianDelta: 45, confidenceInterval: { low: 20, high: 70 }, sampleSize: 142 },
        securityDelta: { medianDelta: 2.5, confidenceInterval: { low: 0.5, high: 4.5 }, sampleSize: 138 },
        isolationTierBreakdown: { A: 60, B: 70, C: 12 },
        distinctAccountCount: 87,
        seedDataMajority: false,
        distinctContentHashCount: 1,
        exportUrl: "/api/skills/skill_bugfinder_v2/export?category=debugging",
      },
      {
        // Deliberately below MIN_SAMPLE_SIZE, to exercise the "not enough data" path.
        category: "refactoring",
        sampleSize: 8,
        successDelta: { medianDelta: 0.1, confidenceInterval: null, sampleSize: 8 },
        tokensDelta: { medianDelta: 500, confidenceInterval: null, sampleSize: 8 },
        durationDelta: { medianDelta: 10, confidenceInterval: null, sampleSize: 8 },
        securityDelta: null,
        isolationTierBreakdown: { A: 2, B: 4, C: 2 },
        distinctAccountCount: 4,
        seedDataMajority: false,
        distinctContentHashCount: 1,
        exportUrl: "/api/skills/skill_bugfinder_v2/export?category=refactoring",
      },
    ],
  },
  {
    skillId: "skill_doc_writer",
    aggregationSourceUrl: "https://github.com/example-org/marktplatz/tree/main/backend/src/aggregation",
    // Deliberately uncatalogued — exercises the "no admin metadata yet" path.
    metadata: null,
    categories: [
      {
        category: "docs",
        sampleSize: 64,
        successDelta: { medianDelta: null, confidenceInterval: null, sampleSize: 0 },
        tokensDelta: { medianDelta: -400, confidenceInterval: { low: -900, high: 100 }, sampleSize: 64 },
        durationDelta: { medianDelta: 5, confidenceInterval: { low: -5, high: 15 }, sampleSize: 64 },
        securityDelta: null,
        isolationTierBreakdown: { A: 40, B: 20, C: 4 },
        distinctAccountCount: 3,
        seedDataMajority: false,
        distinctContentHashCount: 1,
        exportUrl: "/api/skills/skill_doc_writer/export?category=docs",
      },
    ],
  },
  {
    skillId: "skill_copywriter_pro",
    aggregationSourceUrl: "https://github.com/example-org/marktplatz/tree/main/backend/src/aggregation",
    metadata: {
      name: "Copywriter Pro",
      description: "Drafts ad copy variants tuned to a stated audience and tone.",
      githubUrl: "https://github.com/example-org/copywriter-pro",
      license: "Apache-2.0",
      maintainer: "example-org",
      declaredCategory: "marketing",
      githubStars: null,
    },
    categories: [
      {
        category: "marketing",
        sampleSize: 25,
        successDelta: { medianDelta: null, confidenceInterval: null, sampleSize: 0 },
        tokensDelta: { medianDelta: 200, confidenceInterval: { low: -100, high: 500 }, sampleSize: 25 },
        durationDelta: { medianDelta: 2, confidenceInterval: { low: -3, high: 7 }, sampleSize: 25 },
        securityDelta: null,
        isolationTierBreakdown: { A: 0, B: 5, C: 20 },
        distinctAccountCount: 22,
        // Most of this sample came from the Phase 6 pre-fill catalog run.
        seedDataMajority: true,
        distinctContentHashCount: 1,
        exportUrl: "/api/skills/skill_copywriter_pro/export?category=marketing",
      },
    ],
  },
];
