import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { icon } from "./icons.js";

export type MobileTab = "home" | "agent" | "docs" | "terminal";

@customElement("bottom-tabs")
export class BottomTabs extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property() activeTab: MobileTab = "home";

  override render() {
    const tabs: Array<{ id: MobileTab; label: string; iconName: import("./icons.js").IconName }> = [
      { id: "home", label: "Dashboard", iconName: "barChart" },
      { id: "agent", label: "Agent", iconName: "bot" },
      { id: "docs", label: "Docs", iconName: "book" },
      { id: "terminal", label: "Terminal", iconName: "terminal" },
    ];

    return html`
      <div class="bottom-tabs">
        ${tabs.map(
          (t) => html`
            <button
              class="bottom-tab ${this.activeTab === t.id ? "bottom-tab--active" : ""}"
              @click=${() =>
                this.dispatchEvent(
                  new CustomEvent("mobile-tab-change", {
                    detail: t.id,
                    bubbles: true,
                    composed: true,
                  }),
                )}
            >
              ${icon(t.iconName, { className: "icon-sm" })}
              <span>${t.label}</span>
            </button>
          `,
        )}
      </div>
    `;
  }
}
