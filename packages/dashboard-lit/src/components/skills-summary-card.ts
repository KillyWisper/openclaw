import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SkillStatusEntry } from "../types/dashboard.js";
import { icon } from "./icons.js";

@customElement("skills-summary-card")
export class SkillsSummaryCard extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Array }) skills: SkillStatusEntry[] = [];
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) redacted = false;

  override render() {
    return html`
      <div class="glass-dashboard-card">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Skills</h3>
          <span class="count-badge">${this.skills.length}</span>
          <div class="card-header__actions">
            <span
              class="card-header__link"
              @click=${() => this.dispatchEvent(new CustomEvent("navigate", { detail: "skills", bubbles: true, composed: true }))}
            >Manage ${icon("externalLink", { className: "icon-xs" })}</span>
          </div>
        </div>

        ${
          this.loading
            ? html`<div class="muted">${icon("loader", { className: "icon-xs icon-spin" })} Loading…</div>`
            : this.skills.length === 0
              ? html`
                  <div class="muted">No skills registered</div>
                `
              : this.renderContent()
        }
      </div>
    `;
  }

  private renderContent() {
    const enabled = this.skills.filter((s) => s.eligible && !s.disabled && !s.blockedByAllowlist);
    const disabled = this.skills.filter((s) => s.disabled);
    const blocked = this.skills.filter((s) => s.blockedByAllowlist);
    const missingDeps = this.skills.filter(
      (s) => !s.disabled && !s.blockedByAllowlist && Object.keys(s.missing).length > 0,
    );
    const total = this.skills.length;

    return html`
      ${this.renderStatusPills(enabled.length, disabled.length, blocked.length, missingDeps.length)}
      ${this.renderProportionBar(enabled.length, disabled.length, blocked.length, missingDeps.length, total)}
      ${this.renderNeedsAttention(blocked, missingDeps)}
      ${this.renderSkillChips(enabled)}
    `;
  }

  private renderStatusPills(enabled: number, disabled: number, blocked: number, missing: number) {
    return html`
      <div class="status-pills">
        <span class="status-pill">
          <span class="status-pill__dot status-pill__dot--emerald"></span>
          Enabled ${enabled}
        </span>
        <span class="status-pill">
          <span class="status-pill__dot status-pill__dot--neutral"></span>
          Disabled ${disabled}
        </span>
        ${
          blocked > 0
            ? html`<span class="status-pill">
              <span class="status-pill__dot status-pill__dot--amber"></span>
              Blocked ${blocked}
            </span>`
            : nothing
        }
        ${
          missing > 0
            ? html`<span class="status-pill">
              <span class="status-pill__dot status-pill__dot--red"></span>
              Missing deps ${missing}
            </span>`
            : nothing
        }
      </div>
    `;
  }

  private renderProportionBar(
    enabled: number,
    disabled: number,
    blocked: number,
    missing: number,
    total: number,
  ) {
    if (total === 0) {
      return nothing;
    }
    const pct = (n: number) => `${(n / total) * 100}%`;

    return html`
      <div class="proportion-bar">
        ${enabled > 0 ? html`<div class="proportion-bar__segment proportion-bar__segment--emerald" style="width:${pct(enabled)}"></div>` : nothing}
        ${disabled > 0 ? html`<div class="proportion-bar__segment proportion-bar__segment--neutral" style="width:${pct(disabled)}"></div>` : nothing}
        ${blocked > 0 ? html`<div class="proportion-bar__segment proportion-bar__segment--amber" style="width:${pct(blocked)}"></div>` : nothing}
        ${missing > 0 ? html`<div class="proportion-bar__segment proportion-bar__segment--red" style="width:${pct(missing)}"></div>` : nothing}
      </div>
    `;
  }

  private renderNeedsAttention(blocked: SkillStatusEntry[], missingDeps: SkillStatusEntry[]) {
    const items = [
      ...missingDeps.slice(0, 3).map((s) => ({
        name: s.name,
        badge: "degraded" as const,
        detail: `Missing: ${Object.keys(s.missing).join(", ")}`,
      })),
      ...blocked.slice(0, 3).map((s) => ({
        name: s.name,
        badge: "at-risk" as const,
        detail: "Blocked by allowlist",
      })),
    ];

    if (items.length === 0) {
      return nothing;
    }

    const moreCount = Math.max(0, missingDeps.length - 3) + Math.max(0, blocked.length - 3);

    return html`
      <div style="margin-top:0.5rem;">
        <div class="muted" style="font-size:0.68rem;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.04em;">
          Needs Attention
        </div>
        ${items.map(
          (item) => html`
            <div class="attention-row">
              <div style="flex:1;min-width:0;">
                <div style="font-size:0.78rem;font-weight:600;color:var(--text);">${item.name}</div>
                <div class="muted" style="font-size:0.68rem;">${item.detail}</div>
              </div>
              <span class="needs-attention-badge needs-attention-badge--${item.badge}">
                ${item.badge === "degraded" ? "Degraded" : "At Risk"}
              </span>
            </div>
          `,
        )}
        ${
          moreCount > 0
            ? html`<div class="muted" style="font-size:0.72rem;margin-top:4px;">
              +${moreCount} more…
            </div>`
            : nothing
        }
      </div>
    `;
  }

  private renderSkillChips(enabled: SkillStatusEntry[]) {
    if (enabled.length === 0) {
      return nothing;
    }
    const display = enabled.slice(0, 5);

    return html`
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:0.5rem;">
        ${display.map((s) => html`<span class="count-badge">${s.emoji ?? ""} ${s.name}</span>`)}
        ${
          enabled.length > 5
            ? html`<span class="count-badge">+${enabled.length - 5}</span>`
            : nothing
        }
      </div>
    `;
  }
}
