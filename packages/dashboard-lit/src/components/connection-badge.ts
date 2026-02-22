import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import { icon } from "./icons.js";

@customElement("connection-badge")
export class ConnectionBadge extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  override render() {
    const g = this.gateway;
    if (!g) {
      return html`<span class="connection-badge">
        <span class="connection-badge__dot connection-badge__dot--disconnected"></span>
        ${icon("loader", { className: "icon-xs icon-spin" })}
      </span>`;
    }

    if (g.connected) {
      return html`<span class="connection-badge">
        <span class="connection-badge__dot connection-badge__dot--connected"></span>
        ${icon("radio", { className: "icon-xs" })}
      </span>`;
    }

    if (g.connecting) {
      return html`<span class="connection-badge">
        <span class="connection-badge__dot connection-badge__dot--connecting"></span>
        ${icon("loader", { className: "icon-xs icon-spin" })}
      </span>`;
    }

    if (g.lastError) {
      return html`<span class="connection-badge">
        <span class="connection-badge__dot connection-badge__dot--error"></span>
        ${icon("alert", { className: "icon-xs" })}
      </span>`;
    }

    return html`<span class="connection-badge">
      <span class="connection-badge__dot connection-badge__dot--disconnected"></span>
      ${icon("link", { className: "icon-xs" })}
    </span>`;
  }
}
