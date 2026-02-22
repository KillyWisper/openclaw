import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import { formatDurationHuman, formatRelativeTimestamp, formatSchedule } from "../lib/format.js";
import type { CronJob, CronStatusSummary } from "../types/dashboard.js";
import { icon } from "./icons.js";

@customElement("cron-summary-card")
export class CronSummaryCard extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Array }) jobs: CronJob[] = [];
  @property({ type: Object }) status: CronStatusSummary | null = null;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) redacted = false;

  override render() {
    return html`
      <div class="glass-dashboard-card" style="max-height:324px;overflow-y:auto;">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Scheduled Jobs</h3>
          <span class="count-badge">${this.activeCount}/${this.jobs.length}</span>
          <div class="card-header__actions">
            <span
              class="card-header__link"
              @click=${() => this.dispatchEvent(new CustomEvent("navigate", { detail: "cron", bubbles: true, composed: true }))}
            >Manage ${icon("externalLink", { className: "icon-xs" })}</span>
          </div>
        </div>

        ${
          this.loading
            ? html`<div class="muted">${icon("loader", { className: "icon-xs icon-spin" })} Loading…</div>`
            : html`${this.renderEngineStatus()} ${this.renderDurationStats()} ${this.renderUpcoming()}`
        }
      </div>
    `;
  }

  private get activeCount() {
    return this.jobs.filter((j) => j.enabled).length;
  }

  private renderEngineStatus() {
    if (!this.status) {
      return nothing;
    }
    const running = this.status.enabled;
    const okCount = this.jobs.filter((j) => j.state.lastStatus === "ok").length;
    const failedCount = this.jobs.filter((j) => j.state.lastStatus === "error").length;
    const runningCount = this.jobs.filter((j) => j.state.runningAtMs != null).length;
    const lastRun = this.jobs
      .map((j) => j.state.lastRunAtMs)
      .filter((t): t is number => t != null)
      .toSorted((a, b) => b - a)[0];

    return html`
      <div class="engine-status-row">
        <span class="engine-badge ${running ? "engine-badge--running" : "engine-badge--paused"}">
          ${icon(running ? "zap" : "loader", { className: "icon-xs" })}
          ${running ? "Running" : "Paused"}
        </span>
        ${
          okCount > 0
            ? html`<span class="health-badge health-badge--ok">
              ${icon("check", { className: "icon-xs" })} ${okCount}
            </span>`
            : nothing
        }
        ${
          failedCount > 0
            ? html`<span class="health-badge health-badge--failed">
              ${icon("x", { className: "icon-xs" })} ${failedCount}
            </span>`
            : nothing
        }
        ${
          runningCount > 0
            ? html`<span class="health-badge health-badge--running">
              ${icon("clock", { className: "icon-xs" })} ${runningCount}
            </span>`
            : nothing
        }
        ${
          lastRun
            ? html`<span class="muted" style="font-size:0.68rem;">Last: ${formatRelativeTimestamp(lastRun)}</span>`
            : nothing
        }
      </div>
    `;
  }

  private renderDurationStats() {
    const withDuration = this.jobs.filter(
      (j) => j.state.lastDurationMs != null && j.state.lastDurationMs > 0,
    );
    if (withDuration.length === 0) {
      return nothing;
    }

    withDuration.sort((a, b) => (b.state.lastDurationMs ?? 0) - (a.state.lastDurationMs ?? 0));
    const longest = withDuration[0];
    const avg =
      withDuration.reduce((s, j) => s + (j.state.lastDurationMs ?? 0), 0) / withDuration.length;
    const isLong = (longest.state.lastDurationMs ?? 0) > 60_000;

    return html`
      <div style="display:flex;gap:1rem;font-size:0.75rem;margin-bottom:0.75rem;flex-wrap:wrap;" class=${this.redacted ? "privacy-blur" : ""}>
        <span>
          Longest: <strong class=${isLong ? "duration-warn" : ""}>${longest.name}</strong>
          ${formatDurationHuman(longest.state.lastDurationMs)}
        </span>
        <span>Avg: ${formatDurationHuman(avg)}</span>
      </div>
    `;
  }

  private renderUpcoming() {
    const upcoming = this.jobs
      .filter((j) => j.enabled && j.state.nextRunAtMs != null)
      .toSorted((a, b) => (a.state.nextRunAtMs ?? 0) - (b.state.nextRunAtMs ?? 0))
      .slice(0, 3);

    if (upcoming.length === 0) {
      return html`
        <div class="muted">No upcoming jobs</div>
      `;
    }

    return html`
      <div class=${this.redacted ? "privacy-blur" : ""}>
        ${upcoming.map(
          (j) => html`
            <div class="cron-job-row">
              <span class="cron-job-row__name">${j.name}</span>
              <span class="cron-job-row__schedule">${formatSchedule(j.schedule)}</span>
              <span class="cron-job-row__next">
                ${formatRelativeTimestamp(j.state.nextRunAtMs)}
              </span>
            </div>
          `,
        )}
      </div>
    `;
  }
}
