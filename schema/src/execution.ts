import { z } from "zod";

export const agentSchema = z.enum(["claude", "codex"]);
export type Agent = z.infer<typeof agentSchema>;
export const executionSchema = z.object({
  agent: agentSchema,
  model: z.string().min(1).max(200),
  agent_version: z.string().min(1),
  reasoning_effort: z.string().min(1).max(40).nullable(),
}).strict();
export type Execution = z.infer<typeof executionSchema>;
export type ExecutionFilter = { agent?: Agent; model?: string; reasoning_effort?: string };

/** Legacy signed payloads are never rewritten or assigned an invented model. */
export const legacyExecution: Execution = {
  agent: "claude", model: "unknown", agent_version: "unknown", reasoning_effort: null,
};

export function executionKey(execution: Execution): string {
  return JSON.stringify([execution.agent, execution.model, execution.reasoning_effort]);
}

export function matchesExecution(execution: Execution, filter: ExecutionFilter): boolean {
  return (!filter.agent || execution.agent === filter.agent)
    && (!filter.model || execution.model === filter.model)
    && (filter.reasoning_effort === undefined || (execution.reasoning_effort ?? "") === filter.reasoning_effort);
}
