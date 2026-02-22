import { consume } from "@lit/context";
import type { GatewayClientEventFrame } from "@openclaw/dashboard-gateway-client";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import type { MobileTab } from "../components/bottom-tabs.js";
import type { EventLog } from "../components/event-log.js";
import { icon } from "../components/icons.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import { loadCronJobs, loadCronStatus } from "../controllers/cron.js";
import { loadHealth } from "../controllers/health.js";
import { loadLogsTail } from "../controllers/logs.js";
import {
  parseOverviewSnapshot,
  formatDuration,
  formatRelativeTime,
} from "../controllers/overview.js";
import { loadSessions, type SessionsListResult } from "../controllers/sessions.js";
import { loadSkillsStatus } from "../controllers/skills.js";
import { loadUsage } from "../controllers/usage.js";
// Component imports — side-effect registrations
import "../components/usage-overview.js";
import "../components/sessions-card.js";
import "../components/skills-summary-card.js";
import "../components/cron-summary-card.js";
import "../components/event-log.js";
import "../components/attention-center.js";
import "../components/quick-note-stream.js";
import "../components/log-tail.js";
import "../components/quick-actions.js";
import "../components/command-palette.js";
import "../components/bottom-tabs.js";
import { loadStoredToken, storeGatewayUrl, storeToken } from "../lib/local-settings.js";
import type {
  SessionsUsageResult,
  SkillStatusReport,
  CronJob,
  CronStatusSummary,
  AttentionItem,
} from "../types/dashboard.js";

const STREAM_MODE_KEY = "claw-dash:stream-mode";

@customElement("overview-view")
export class OverviewView extends LitElement {
  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  override createRenderRoot() {
    return this;
  }

  // ── State ──────────────────────────────────────────
  @state() private loading = false;
  @state() private sessionsResult: SessionsListResult | null = null;
  @state() private usageResult: SessionsUsageResult | null = null;
  @state() private skillsReport: SkillStatusReport | null = null;
  @state() private cronJobs: CronJob[] = [];
  @state() private cronStatus: CronStatusSummary | null = null;
  @state() private logLines: string[] = [];
  @state() private logCursor = 0;
  @state() private usageDays = 3;
  @state() private paletteOpen = false;
  @state() private streamMode = false;
  @state() private mobileTab: MobileTab = "home";
  @state() private attentionItems: AttentionItem[] = [];

  // Gateway Access form state
  @state() private gatewayUrlInput = "";
  @state() private tokenInput = "";
  @state() private tokenVisible = false;
  @state() private passwordInput = "";
  @state() private sessionKeyInput = "agent:main:main";
  @state() private channelsLastRefresh: number | null = null;

  private lastConnectedState: boolean | null = null;
  private prevLastEvent: GatewayClientEventFrame | null = null;

  // ── Lifecycle ──────────────────────────────────────
  override connectedCallback(): void {
    super.connectedCallback();
    this.streamMode = localStorage.getItem(STREAM_MODE_KEY) === "true";
    this.tokenInput = loadStoredToken();
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "agent" || tab === "docs" || tab === "terminal") {
      this.mobileTab = tab;
    }
  }

  override updated(): void {
    const connected = this.gateway?.connected ?? false;
    if (connected && this.lastConnectedState !== true) {
      void this.refreshAll();
    }
    this.lastConnectedState = connected;

    if (this.gateway && !this.gatewayUrlInput) {
      this.gatewayUrlInput = this.gateway.gatewayUrl;
    }

    // Push new gateway events to EventLog
    const lastEvent = this.gateway?.lastEvent;
    if (lastEvent && lastEvent !== this.prevLastEvent) {
      this.prevLastEvent = lastEvent;
      const el = this.querySelector<EventLog>("event-log");
      el?.addEvent(lastEvent);
    }
  }

  // ── Data Loading ───────────────────────────────────

  private async refreshAll(): Promise<void> {
    if (!this.gateway?.connected || this.loading) {
      return;
    }
    this.loading = true;
    try {
      const [sessions, usage, skills, cronJobs, cronStatus, logs, _health, channels] =
        await Promise.allSettled([
          loadSessions(this.gateway.request, { limit: 20, includeDerivedTitles: true }),
          loadUsage(this.gateway.request, { days: this.usageDays }),
          loadSkillsStatus(this.gateway.request),
          loadCronJobs(this.gateway.request),
          loadCronStatus(this.gateway.request),
          loadLogsTail(this.gateway.request, { cursor: this.logCursor }),
          loadHealth(this.gateway.request),
          this.gateway.request("channels.status", { probe: false }),
        ]);

      if (sessions.status === "fulfilled") {
        this.sessionsResult = sessions.value;
      }
      if (usage.status === "fulfilled") {
        this.usageResult = usage.value;
      }
      if (skills.status === "fulfilled") {
        this.skillsReport = skills.value;
      }
      if (cronJobs.status === "fulfilled") {
        this.cronJobs = cronJobs.value;
      }
      if (cronStatus.status === "fulfilled") {
        this.cronStatus = cronStatus.value;
      }
      if (logs.status === "fulfilled") {
        this.logLines = [...this.logLines, ...logs.value.lines];
        this.logCursor = logs.value.cursor;
      }
      if (channels.status === "fulfilled") {
        this.channelsLastRefresh = Date.now();
      }

      this.attentionItems = this.buildAttentionItems();
    } finally {
      this.loading = false;
    }
  }

  private async refreshUsage(): Promise<void> {
    if (!this.gateway?.connected) {
      return;
    }
    try {
      this.usageResult = await loadUsage(this.gateway.request, { days: this.usageDays });
    } catch {
      /* ignore */
    }
  }

  private async refreshLogs(): Promise<void> {
    if (!this.gateway?.connected) {
      return;
    }
    try {
      const result = await loadLogsTail(this.gateway.request, { cursor: this.logCursor });
      this.logLines = [...this.logLines, ...result.lines];
      this.logCursor = result.cursor;
    } catch {
      /* ignore */
    }
  }

  // ── Attention Items ────────────────────────────────

  private buildAttentionItems(): AttentionItem[] {
    const items: AttentionItem[] = [];
    const g = this.gateway;

    if (g?.lastError) {
      items.push({
        severity: "error",
        icon: "x",
        title: "Gateway Error",
        description: g.lastError,
      });
    }

    const hello = g?.hello;
    if (hello?.auth?.scopes && !hello.auth.scopes.includes("operator.read")) {
      items.push({
        severity: "warning",
        icon: "key",
        title: "Missing operator.read scope",
        description:
          "This connection does not have the operator.read scope. Some features may be unavailable.",
        href: "https://docs.openclaw.ai/web/dashboard",
        external: true,
      });
    }

    // Skills with missing deps
    const missingDeps =
      this.skillsReport?.skills.filter((s) => !s.disabled && Object.keys(s.missing).length > 0) ??
      [];
    if (missingDeps.length > 0) {
      const names = missingDeps.slice(0, 3).map((s) => s.name);
      const more = missingDeps.length > 3 ? ` +${missingDeps.length - 3} more` : "";
      items.push({
        severity: "warning",
        icon: "zap",
        title: "Skills with missing dependencies",
        description: `${names.join(", ")}${more}`,
      });
    }

    // Blocked skills
    const blocked = this.skillsReport?.skills.filter((s) => s.blockedByAllowlist) ?? [];
    if (blocked.length > 0) {
      items.push({
        severity: "warning",
        icon: "shield",
        title: `${blocked.length} skill${blocked.length > 1 ? "s" : ""} blocked`,
        description: blocked.map((s) => s.name).join(", "),
      });
    }

    // Failed cron jobs
    const failedCron = this.cronJobs.filter((j) => j.state.lastStatus === "error");
    if (failedCron.length > 0) {
      items.push({
        severity: "error",
        icon: "clock",
        title: `${failedCron.length} cron job${failedCron.length > 1 ? "s" : ""} failed`,
        description: failedCron.map((j) => j.name).join(", "),
      });
    }

    // Overdue cron jobs (next run >5min past)
    const now = Date.now();
    const overdue = this.cronJobs.filter(
      (j) => j.enabled && j.state.nextRunAtMs != null && now - j.state.nextRunAtMs > 300_000,
    );
    if (overdue.length > 0) {
      items.push({
        severity: "warning",
        icon: "clock",
        title: `${overdue.length} overdue job${overdue.length > 1 ? "s" : ""}`,
        description: overdue.map((j) => j.name).join(", "),
      });
    }

    return items;
  }

  // ── Stream Mode ────────────────────────────────────

  private toggleStreamMode() {
    this.streamMode = !this.streamMode;
    localStorage.setItem(STREAM_MODE_KEY, String(this.streamMode));
  }

  // ── Event Handlers ─────────────────────────────────

  private handleDateRangeChange = (e: CustomEvent<number>) => {
    this.usageDays = e.detail;
    void this.refreshUsage();
  };

  private handleNavigate = (e: CustomEvent<string>) => {
    this.dispatchEvent(
      new CustomEvent("tab-change", { detail: e.detail, bubbles: true, composed: true }),
    );
  };

  private handleAction = (e: CustomEvent<string>) => {
    switch (e.detail) {
      case "new-session":
        this.mobileTab = "agent";
        break;
      case "refresh-all":
        void this.refreshAll();
        break;
    }
  };

  private handleMobileTabChange = (e: CustomEvent<MobileTab>) => {
    this.mobileTab = e.detail;
  };

  // ── Gateway Access ─────────────────────────────────

  private onConnect(): void {
    const url = this.gatewayUrlInput.trim();
    const token = this.tokenInput.trim();
    const password = this.passwordInput.trim();
    if (url) {
      storeGatewayUrl(url);
    }
    if (token) {
      storeToken(token);
    }
    this.gateway.reconnect({
      gatewayUrl: url || "ws://127.0.0.1:18789",
      token,
      password,
    });
  }

  private onRefresh(): void {
    void this.refreshAll();
  }

  private handleConnectKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Enter") {
      this.onConnect();
    }
  };

  private renderGatewayAccess() {
    const g = this.gateway;
    const snapshot = parseOverviewSnapshot(g.hello);
    const connected = g.connected;
    const isTrustedProxy = snapshot.authMode === "trusted-proxy";

    return html`
      <div class="overview-access-grid">
        <div class="glass-dashboard-card">
          <div class="card-header">
            <span class="card-header__prefix">${icon("link", { className: "icon-xs" })}</span>
            <h3 class="card-header__title">Gateway Access</h3>
          </div>
          <p class="muted" style="margin:0 0 14px; font-size:0.82rem;">
            Where the dashboard connects and how it authenticates.
          </p>
          <div class="connect-form">
            <label>
              WebSocket URL
              <input
                .value=${this.gatewayUrlInput}
                @input=${(e: Event) => {
                  this.gatewayUrlInput = (e.target as HTMLInputElement).value;
                }}
                @keydown=${this.handleConnectKeyDown}
                placeholder="ws://127.0.0.1:18789"
              />
            </label>
            ${
              isTrustedProxy
                ? nothing
                : html`
                <label>
                  Gateway Token
                  <div class="input-with-toggle">
                    <input
                      type=${this.tokenVisible ? "text" : "password"}
                      .value=${this.tokenInput}
                      @input=${(e: Event) => {
                        this.tokenInput = (e.target as HTMLInputElement).value;
                      }}
                      @keydown=${this.handleConnectKeyDown}
                      placeholder="OPENCLAW_GATEWAY_TOKEN"
                    />
                    <button
                      type="button"
                      class="input-toggle-btn"
                      @click=${() => {
                        this.tokenVisible = !this.tokenVisible;
                      }}
                      title=${this.tokenVisible ? "Hide token" : "Show token"}
                    >
                      ${icon(this.tokenVisible ? "eyeOff" : "eye", { className: "icon-xs" })}
                    </button>
                  </div>
                </label>
                <label>
                  Password (not stored)
                  <input
                    type="password"
                    .value=${this.passwordInput}
                    @input=${(e: Event) => {
                      this.passwordInput = (e.target as HTMLInputElement).value;
                    }}
                    @keydown=${this.handleConnectKeyDown}
                    placeholder="system or shared password"
                  />
                </label>
              `
            }
            <label>
              Default Session Key
              <input
                .value=${this.sessionKeyInput}
                @input=${(e: Event) => {
                  this.sessionKeyInput = (e.target as HTMLInputElement).value;
                }}
              />
            </label>
            <label>
              Language
              <select
                .value=${"en"}
                @change=${(_e: Event) => {}}
              >
                <option value="en">English</option>
                <option value="zh-CN">简体中文</option>
                <option value="zh-TW">繁體中文</option>
                <option value="pt-BR">Português (Brasil)</option>
              </select>
            </label>
          </div>
          <div style="display:flex; gap:8px; align-items:center; margin-top:14px;">
            <button @click=${() => this.onConnect()}>Connect</button>
            <button @click=${() => this.onRefresh()}>Refresh</button>
            <span class="muted" style="font-size:0.82rem;">
              ${
                isTrustedProxy
                  ? "Authenticated via trusted proxy."
                  : "Click Connect to apply connection changes."
              }
            </span>
          </div>
        </div>

        <div class="glass-dashboard-card">
          <div class="card-header">
            <span class="card-header__prefix">${icon("activity", { className: "icon-xs" })}</span>
            <h3 class="card-header__title">Snapshot</h3>
          </div>
          <p class="muted" style="margin:0 0 14px; font-size:0.82rem;">
            Latest gateway handshake information.
          </p>
          <div class="stats-row" style="margin-top:0;">
            <div class="stat-card">
              <div class="stat-label">Status</div>
              <div class="stat-value ${connected ? "stat-value--ok" : "stat-value--warn"}">
                ${connected ? "OK" : "Offline"}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Uptime</div>
              <div class="stat-value">
                ${snapshot.uptimeMs != null ? formatDuration(snapshot.uptimeMs) : "n/a"}
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Tick Interval</div>
              <div class="stat-value">
                ${
                  snapshot.tickIntervalMs != null
                    ? `${(snapshot.tickIntervalMs / 1000).toFixed(snapshot.tickIntervalMs % 1000 === 0 ? 0 : 1)}s`
                    : "n/a"
                }
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Last Channels Refresh</div>
              <div class="stat-value">
                ${this.channelsLastRefresh != null ? formatRelativeTime(this.channelsLastRefresh) : "n/a"}
              </div>
            </div>
          </div>
          ${
            g.lastError
              ? html`<div class="alert-card" style="margin-top:14px;">
                <div>${g.lastError}</div>
              </div>`
              : html`<div class="overview-callout" style="margin-top:14px;">
                ${icon("link", { className: "icon-xs" })}
                Use Channels to link WhatsApp, Telegram, Discord, Signal, or iMessage.
              </div>`
          }
        </div>
      </div>
    `;
  }

  // ── Render ─────────────────────────────────────────

  override render() {
    const g = this.gateway;
    if (!g) {
      return html`<div class="muted" style="padding:2rem;text-align:center;">
        ${icon("loader", { className: "icon-sm icon-spin" })} Loading…
      </div>`;
    }

    return html`
      <div style="display:flex;flex-direction:column;height:100%;">
        <command-palette
          .open=${this.paletteOpen}
          @toggle-palette=${() => {
            this.paletteOpen = !this.paletteOpen;
          }}
          @navigate=${this.handleNavigate}
        ></command-palette>

        ${
          g.lastError
            ? html`<div class="overview-banner overview-banner--error">
              ${icon("alert", { className: "icon-xs" })} ${g.lastError}
            </div>`
            : nothing
        }
        ${
          this.streamMode
            ? html`<div class="overview-banner overview-banner--stream">
              ${icon("eyeOff", { className: "icon-xs" })} Stream mode — values redacted
              <button class="btn-ghost" style="margin-left:auto;font-size:0.72rem;" @click=${() => this.toggleStreamMode()}>
                Disable
              </button>
            </div>`
            : nothing
        }

        <div style="flex:1;display:flex;overflow:hidden;">
          <main
            class="overview-scroll"
            style=${this.mobileTab !== "home" ? "display:none;" : ""}
          >
            ${this.renderGatewayAccess()}

            <hr class="glass-divider" />

            <usage-overview
              .usage=${this.usageResult}
              .loading=${this.loading && !this.usageResult}
              .redacted=${this.streamMode}
              .days=${this.usageDays}
              @date-range-change=${this.handleDateRangeChange}
            ></usage-overview>

            <hr class="glass-divider" />

            <div class="overview-infra-grid">
              <sessions-card
                .sessions=${this.sessionsResult?.sessions ?? []}
                .totalCount=${this.sessionsResult?.count ?? 0}
                .loading=${this.loading && !this.sessionsResult}
                .redacted=${this.streamMode}
                @navigate=${this.handleNavigate}
              ></sessions-card>

              <skills-summary-card
                .skills=${this.skillsReport?.skills ?? []}
                .loading=${this.loading && !this.skillsReport}
                .redacted=${this.streamMode}
                @navigate=${this.handleNavigate}
              ></skills-summary-card>
            </div>

            <cron-summary-card
              .jobs=${this.cronJobs}
              .status=${this.cronStatus}
              .loading=${this.loading && !this.cronStatus}
              .redacted=${this.streamMode}
              @navigate=${this.handleNavigate}
            ></cron-summary-card>

            <hr class="glass-divider" />

            <div class="overview-bottom-grid">
              <event-log .redacted=${this.streamMode}></event-log>
              <attention-center .items=${this.attentionItems}></attention-center>
            </div>

            <log-tail
              .lines=${this.logLines}
              .redacted=${this.streamMode}
              @refresh-logs=${() => void this.refreshLogs()}
            ></log-tail>

            <quick-actions
              @navigate=${this.handleNavigate}
              @action=${this.handleAction}
            ></quick-actions>

            <div class="overview-footer">
              <a href="https://docs.openclaw.ai/legal/terms" target="_blank" rel="noreferrer">Terms</a>
              &nbsp;·&nbsp;
              <a href="https://docs.openclaw.ai/legal/privacy" target="_blank" rel="noreferrer">Privacy</a>
            </div>
          </main>

          ${
            this.mobileTab !== "home"
              ? html`
                  <div style="flex: 1; overflow: hidden">
                    <agent-panel mode="fullpage"></agent-panel>
                  </div>
                `
              : nothing
          }
        </div>

        <bottom-tabs
          .activeTab=${this.mobileTab}
          @mobile-tab-change=${this.handleMobileTabChange}
        ></bottom-tabs>
      </div>
    `;
  }
}
