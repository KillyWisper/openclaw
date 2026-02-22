import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("stat-card")
export class StatCard extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property() label = "";
  @property() value = "";
  @property() subtitle = "";
  @property() tooltip = "";
  @property({ type: Boolean }) hero = false;
  @property({ type: Boolean }) redacted = false;

  override render() {
    const cls = `usage-inner-card ${this.hero ? "stat-card--hero" : ""}`;

    return html`
      <div class=${cls}>
        <div class="stat-card__label">
          ${this.label}
          ${
            this.tooltip
              ? html`<span class="stat-card__tooltip-trigger" title=${this.tooltip}>ⓘ</span>`
              : nothing
          }
        </div>
        <div class="stat-card__value ${this.redacted ? "privacy-redacted" : ""}">
          ${this.redacted ? "•••" : this.value}
        </div>
        ${
          this.subtitle
            ? html`<div class="stat-card__subtitle ${this.redacted ? "privacy-redacted" : ""}">
              ${this.redacted ? "•••" : this.subtitle}
            </div>`
            : nothing
        }
      </div>
    `;
  }
}
