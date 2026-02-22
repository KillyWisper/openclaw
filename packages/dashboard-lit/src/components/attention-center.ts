import { LitElement, html, nothing } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { AttentionItem } from "../types/dashboard.js";
import { icon } from "./icons.js";

@customElement("attention-center")
export class AttentionCenter extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Array }) items: AttentionItem[] = [];

  override render() {
    return html`
      <div class="glass-dashboard-card" style="max-height:450px;overflow-y:auto;">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Attention</h3>
          ${
            this.items.length > 0
              ? html`<span class="count-badge count-badge--amber">${this.items.length}</span>`
              : nothing
          }
        </div>

        ${
          this.items.length === 0
            ? html`<div class="all-clear">
              ${icon("check", { className: "icon-sm" })} All systems healthy
            </div>`
            : this.items.map((item) => this.renderRow(item))
        }
      </div>
    `;
  }

  private renderRow(item: AttentionItem) {
    const dotClass = `severity-dot severity-dot--${item.severity}`;
    const iconName = this.iconForItem(item.icon);

    return html`
      <div class="attention-row">
        <span class=${dotClass}></span>
        <span style="flex-shrink:0;color:var(--muted);">
          ${icon(iconName, { className: "icon-sm" })}
        </span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:0.82rem;font-weight:600;color:var(--text);">${item.title}</div>
          <div class="muted" style="font-size:0.72rem;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
            ${item.description}
          </div>
        </div>
        ${
          item.href
            ? html`<a
              class="card-header__link"
              href=${item.href}
              target=${item.external ? "_blank" : "_self"}
              rel=${item.external ? "noreferrer" : ""}
            >
              ${item.external ? "Docs" : "View"} ${icon("externalLink", { className: "icon-xs" })}
            </a>`
            : nothing
        }
      </div>
    `;
  }

  private iconForItem(name: string): import("./icons.js").IconName {
    const valid: Set<string> = new Set([
      "x",
      "key",
      "shield",
      "alert",
      "clock",
      "zap",
      "bug",
      "link",
    ]);
    return (valid.has(name) ? name : "alert") as import("./icons.js").IconName;
  }
}
