import { consume } from "@lit/context";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import { icon } from "./icons.js";

/**
 * Topbar connection pill. When connected, clicking opens a disconnect
 * confirmation popover. When offline, shows status + click to retry.
 */
@customElement("connection-status")
export class ConnectionStatus extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @consume({ context: gatewayContext, subscribe: true })
  gateway!: GatewayState;

  @state() private showMenu = false;

  private handleClick = () => {
    const g = this.gateway;
    if (!g) {
      return;
    }

    if (g.connected) {
      this.showMenu = !this.showMenu;
    } else if (g.retryStalled || this.isPairingRequired) {
      g.retryNow();
    }
  };

  private handleDisconnect = () => {
    this.showMenu = false;
    this.gateway?.reconnect({ gatewayUrl: "", token: "", password: "" });
  };

  private handleClickOutside = (e: MouseEvent) => {
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.showMenu = false;
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this.handleClickOutside, true);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("click", this.handleClickOutside, true);
    super.disconnectedCallback();
  }

  private get isPairingRequired(): boolean {
    const g = this.gateway;
    if (!g) {
      return false;
    }
    const err = g.lastError?.toLowerCase() ?? "";
    const close = g.lastCloseReason?.toLowerCase() ?? "";
    return (
      err.includes("pairing required") ||
      err.includes("not_paired") ||
      close.includes("pairing required")
    );
  }

  override render() {
    const g = this.gateway;
    const connected = g?.connected ?? false;
    const connecting = g?.connecting ?? false;
    const stalled = g?.retryStalled ?? false;
    const pairing = this.isPairingRequired;

    const stateClass = connected
      ? "connection-status-btn--connected"
      : stalled || pairing
        ? "connection-status-btn--danger"
        : "connection-status-btn--connecting";

    const label = connected
      ? "Connected"
      : pairing
        ? "Pairing Required"
        : stalled
          ? "Offline"
          : "Connecting…";

    const hint = connected
      ? "Click to disconnect"
      : pairing
        ? "Device pairing required — click to retry"
        : stalled
          ? "Click to retry"
          : "Establishing connection";

    return html`
      <div class="connection-status-wrapper">
        <button
          class="connection-status-btn ${stateClass}"
          @click=${this.handleClick}
          title=${hint}
          aria-expanded=${this.showMenu}
          ?disabled=${connecting && !stalled && !pairing}
        >
          <span class="status-dot ${connected ? "status-dot--ok" : stalled ? "" : "status-dot--pulse"}"></span>
          <span>${label}</span>
        </button>
        ${
          this.showMenu
            ? html`
          <div class="connection-menu">
            <button class="connection-menu__item connection-menu__item--danger" @click=${this.handleDisconnect}>
              ${icon("link", { className: "icon-xs" })}
              Disconnect
            </button>
          </div>
        `
            : nothing
        }
      </div>
    `;
  }
}
