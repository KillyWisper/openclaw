import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icon } from "./icons.js";

@customElement("log-tail")
export class LogTail extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Array }) lines: string[] = [];
  @property({ type: Boolean }) redacted = false;

  @state() private collapsed = true;

  override updated(changed: Map<string, unknown>) {
    if (changed.has("lines") && !this.collapsed) {
      requestAnimationFrame(() => {
        const pre = this.querySelector<HTMLElement>(".log-tail-content");
        if (pre) {
          pre.scrollTop = pre.scrollHeight;
        }
      });
    }
  }

  override render() {
    return html`
      <div class="glass-dashboard-card">
        <button
          class="expandable-toggle"
          @click=${() => {
            this.collapsed = !this.collapsed;
          }}
          aria-expanded=${!this.collapsed}
        >
          ${icon(this.collapsed ? "chevronRight" : "chevronDown", { className: "icon-xs" })}
          ${icon("scrollText", { className: "icon-sm" })}
          Gateway Logs
          <span class="count-badge">${this.lines.length}</span>
          <span style="margin-left:auto;" @click=${(e: Event) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent("refresh-logs", { bubbles: true, composed: true }));
          }}>
            ${icon("refresh", { className: "icon-xs" })}
          </span>
        </button>

        ${
          this.collapsed
            ? nothing
            : html`
            <div class="log-tail-content ${this.redacted ? "privacy-blur" : ""}">
              ${
                this.redacted
                  ? "[log hidden]"
                  : this.lines.length === 0
                    ? "No log lines"
                    : this.lines.join("\n")
              }
            </div>
          `
        }
      </div>
    `;
  }
}
