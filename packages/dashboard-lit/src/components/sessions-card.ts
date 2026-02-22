import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { SessionSummary } from "../controllers/sessions.js";
import { formatRelativeTimestamp } from "../lib/format.js";
import { icon } from "./icons.js";

@customElement("sessions-card")
export class SessionsCard extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Array }) sessions: SessionSummary[] = [];
  @property({ type: Number }) totalCount = 0;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) redacted = false;

  @state() private expanded = false;

  override render() {
    return html`
      <div class="glass-dashboard-card">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Active Sessions</h3>
          <span class="count-badge">${this.totalCount}</span>
          <div class="card-header__actions">
            <span
              class="card-header__link"
              @click=${() => this.dispatchEvent(new CustomEvent("navigate", { detail: "sessions", bubbles: true, composed: true }))}
            >View all ${icon("externalLink", { className: "icon-xs" })}</span>
          </div>
        </div>

        ${
          this.loading
            ? html`<div class="muted">${icon("loader", { className: "icon-xs icon-spin" })} Loading…</div>`
            : this.sessions.length === 0
              ? html`
                  <div class="muted">No sessions</div>
                `
              : this.renderList()
        }
      </div>
    `;
  }

  private renderList() {
    const visible = this.expanded ? this.sessions : this.sessions.slice(0, 5);
    const hasMore = this.sessions.length > 5;

    return html`
      <div class=${this.redacted ? "privacy-blur" : ""}>
        ${visible.map((s) => this.renderRow(s))}
      </div>
      ${
        hasMore
          ? html`<button class="expandable-toggle" style="margin-top:4px;"
            @click=${() => {
              this.expanded = !this.expanded;
            }}>
            ${this.expanded ? "Show less" : `Show ${this.sessions.length - 5} more…`}
          </button>`
          : nothing
      }
    `;
  }

  private renderRow(s: SessionSummary) {
    const label = s.derivedTitle || s.displayName || s.label || s.key;
    const shortModel = s.model ? (s.model.split("/").pop()?.split(":")[0] ?? s.model) : null;

    return html`
      <div class="ov-session-row">
        <span class="ov-session-row__key" title=${s.key}>${label}</span>
        <div class="ov-session-row__meta">
          ${
            s.kind && s.kind !== "main"
              ? html`<span class="ov-kind-badge">${s.kind}</span>`
              : nothing
          }
          ${
            shortModel
              ? html`<span class="ov-model-tag">${icon("monitor", { className: "icon-xs" })} ${shortModel}</span>`
              : nothing
          }
          ${
            s.totalTokens != null
              ? html`<span class="muted" style="font-size:0.68rem;font-variant-numeric:tabular-nums;">${s.totalTokens}</span>`
              : nothing
          }
          <span>${formatRelativeTimestamp(s.updatedAt)}</span>
        </div>
      </div>
    `;
  }
}
