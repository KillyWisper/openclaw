import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { icon } from "./icons.js";

@customElement("quick-actions")
export class QuickActions extends LitElement {
  override createRenderRoot() {
    return this;
  }

  override render() {
    return html`
      <div class="quick-actions-row">
        <button
          class="quick-action-btn"
          @click=${() => this.fire("action", "new-session")}
        >
          ${icon("plus", { className: "icon-xs" })} New Session
        </button>
        <button
          class="quick-action-btn"
          @click=${() => this.fire("navigate", "cron")}
        >
          ${icon("zap", { className: "icon-xs" })} Automation
        </button>
        <button
          class="quick-action-btn"
          @click=${() => this.fire("action", "refresh-all")}
        >
          ${icon("refresh", { className: "icon-xs" })} Refresh All
        </button>
        <button
          class="quick-action-btn"
          @click=${() => this.fire("navigate", "sessions")}
        >
          ${icon("terminal", { className: "icon-xs" })} Terminal
        </button>
      </div>
    `;
  }

  private fire(eventName: string, detail: string) {
    this.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true, composed: true }));
  }
}
