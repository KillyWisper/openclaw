// RPC response types for the dashboard overview.
// Standalone copies — the Lit dashboard doesn't import from the monorepo root.

// ── Cost / Usage ────────────────────────────────────────

export type CostUsageTotals = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
  totalTokens: number;
  totalCost: number;
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  missingCostEntries: number;
};

export type SessionMessageCounts = {
  total: number;
  user: number;
  assistant: number;
  toolCalls: number;
  toolResults: number;
  errors: number;
};

export type SessionToolUsage = {
  totalCalls: number;
  uniqueTools: number;
  tools: Array<{ name: string; count: number }>;
};

export type SessionModelUsage = {
  provider?: string;
  model?: string;
  count: number;
  totals: CostUsageTotals;
};

export type SessionLatencyStats = {
  count: number;
  avgMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
};

export type SessionDailyLatency = SessionLatencyStats & { date: string };

export type SessionDailyModelUsage = {
  date: string;
  provider?: string;
  model?: string;
  tokens: number;
  cost: number;
  count: number;
};

export type SessionCostSummary = CostUsageTotals & {
  sessionId?: string;
  firstActivity?: number;
  lastActivity?: number;
  durationMs?: number;
  messageCounts?: SessionMessageCounts;
  toolUsage?: SessionToolUsage;
  modelUsage?: SessionModelUsage[];
  latency?: SessionLatencyStats;
};

export type SessionUsageEntry = {
  key: string;
  label?: string;
  sessionId?: string;
  updatedAt?: number;
  agentId?: string;
  channel?: string;
  chatType?: string;
  model?: string;
  modelProvider?: string;
  usage: SessionCostSummary | null;
};

export type SessionsUsageAggregates = {
  messages: SessionMessageCounts;
  tools: SessionToolUsage;
  byModel: SessionModelUsage[];
  byProvider: SessionModelUsage[];
  byAgent: Array<{ agentId: string; totals: CostUsageTotals }>;
  byChannel: Array<{ channel: string; totals: CostUsageTotals }>;
  latency?: SessionLatencyStats;
  dailyLatency?: SessionDailyLatency[];
  modelDaily?: SessionDailyModelUsage[];
  daily: Array<{
    date: string;
    tokens: number;
    cost: number;
    messages: number;
    toolCalls: number;
    errors: number;
  }>;
};

export type SessionsUsageResult = {
  updatedAt: number;
  startDate: string;
  endDate: string;
  sessions: SessionUsageEntry[];
  totals: CostUsageTotals;
  aggregates: SessionsUsageAggregates;
};

// ── Skills ──────────────────────────────────────────────

export type SkillStatusConfigCheck = {
  key: string;
  ok: boolean;
  message?: string;
};

export type SkillInstallOption = {
  label: string;
  command: string;
};

export type Requirements = Record<string, string>;

export type SkillStatusEntry = {
  name: string;
  description: string;
  source: string;
  bundled: boolean;
  filePath: string;
  baseDir: string;
  skillKey: string;
  primaryEnv?: string;
  emoji?: string;
  homepage?: string;
  always: boolean;
  disabled: boolean;
  blockedByAllowlist: boolean;
  eligible: boolean;
  requirements: Requirements;
  missing: Requirements;
  configChecks: SkillStatusConfigCheck[];
  install: SkillInstallOption[];
};

export type SkillStatusReport = {
  workspaceDir: string;
  managedSkillsDir: string;
  skills: SkillStatusEntry[];
};

// ── Cron ────────────────────────────────────────────────

export type CronSchedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string; staggerMs?: number };

export type CronPayload =
  | { kind: "systemEvent"; text: string }
  | {
      kind: "agentTurn";
      message: string;
      model?: string;
      thinking?: string;
      timeoutSeconds?: number;
      deliver?: boolean;
      channel?: string;
      to?: string;
    };

export type CronJobState = {
  nextRunAtMs?: number;
  runningAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error" | "skipped";
  lastError?: string;
  lastDurationMs?: number;
  consecutiveErrors?: number;
  lastDelivered?: boolean;
};

export type CronJob = {
  id: string;
  agentId?: string;
  sessionKey?: string;
  name: string;
  description?: string;
  enabled: boolean;
  deleteAfterRun?: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: CronSchedule;
  sessionTarget: "main" | "isolated";
  payload: CronPayload;
  state: CronJobState;
};

export type CronStatusSummary = {
  enabled: boolean;
  storePath?: string;
  jobs: number;
  nextWakeAtMs: number | null;
};

// ── Models ──────────────────────────────────────────────

export type ModelCatalogEntry = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
  input?: Array<"text" | "image">;
};

// ── Logs ────────────────────────────────────────────────

export type LogsTailResult = {
  file: string;
  cursor: number;
  size: number;
  lines: string[];
  truncated: boolean;
  reset: boolean;
};

// ── Health ──────────────────────────────────────────────

export type HealthSummary = {
  ok: boolean;
  ts: number;
  durationMs: number;
  heartbeatSeconds: number;
  defaultAgentId: string;
  agents: Array<{ id: string; name?: string }>;
  sessions: {
    path: string;
    count: number;
    recent: Array<{ key: string; updatedAt: number | null; age: number | null }>;
  };
};

// ── Attention ───────────────────────────────────────────

export type AttentionSeverity = "error" | "warning" | "info";

export type AttentionItem = {
  severity: AttentionSeverity;
  icon: string;
  title: string;
  description: string;
  href?: string;
  external?: boolean;
};
