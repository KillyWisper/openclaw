import { ContextProvider } from "@lit/context";
import {
  DashboardGatewayClient,
  type GatewayClientEventFrame,
  type GatewayClientHelloOk,
} from "@openclaw/dashboard-gateway-client";
import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { gatewayContext, type GatewayState } from "../context/gateway-context.js";
import {
  loadStoredGatewayUrl,
  loadStoredToken,
  storeGatewayUrl,
  storeToken,
} from "../lib/local-settings.js";
import { consumeBootstrapUrlState } from "../lib/url-state.js";

function resolveDefaultGatewayUrl(): string {
  return typeof import.meta.env !== "undefined" && import.meta.env?.VITE_GATEWAY_URL
    ? String(import.meta.env.VITE_GATEWAY_URL)
    : "ws://127.0.0.1:18789";
}

const RECONNECT_FAILURE_THRESHOLD = 4;

@customElement("gateway-provider")
export class GatewayProvider extends LitElement {
  @state() connected = false;
  @state() connecting = true;
  @state() lastError: string | null = null;
  @state() lastCloseReason: string | null = null;
  @state() hello: GatewayClientHelloOk | null = null;
  @state() lastEvent: GatewayClientEventFrame | null = null;
  @state() reconnectFailures = 0;
  @state() retryStalled = false;

  private client: DashboardGatewayClient | null = null;
  private provider: ContextProvider<typeof gatewayContext> | null = null;
  private gatewayUrl = resolveDefaultGatewayUrl();
  private sharedSecret = "";
  private password = "";

  override connectedCallback(): void {
    super.connectedCallback();

    const bootstrap = consumeBootstrapUrlState();
    const token = bootstrap.token || loadStoredToken();
    const gatewayUrl = bootstrap.gatewayUrl || loadStoredGatewayUrl() || resolveDefaultGatewayUrl();

    if (bootstrap.token) {
      storeToken(bootstrap.token);
    }
    if (bootstrap.gatewayUrl) {
      storeGatewayUrl(bootstrap.gatewayUrl);
    }

    this.gatewayUrl = gatewayUrl;
    this.sharedSecret = token;
    this.startClient();

    this.provider = new ContextProvider(this, {
      context: gatewayContext,
      initialValue: this.buildGatewayState(),
    });
  }

  override disconnectedCallback(): void {
    this.stopClient();
    this.provider = null;
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (
      this.provider &&
      (changed.has("connected") ||
        changed.has("connecting") ||
        changed.has("lastError") ||
        changed.has("lastCloseReason") ||
        changed.has("hello") ||
        changed.has("lastEvent") ||
        changed.has("reconnectFailures") ||
        changed.has("retryStalled"))
    ) {
      this.provider.setValue(this.buildGatewayState());
    }
  }

  private startClient(): void {
    this.stopClient();
    this.connected = false;
    this.connecting = true;
    this.lastError = null;
    this.lastCloseReason = null;
    this.hello = null;
    this.reconnectFailures = 0;
    this.retryStalled = false;

    const token = this.sharedSecret || undefined;
    const pw = this.password || undefined;
    const client = new DashboardGatewayClient({
      gatewayUrl: this.gatewayUrl,
      token,
      password: pw ?? token,
      reconnect: true,
      onOpen: () => {
        this.connecting = true;
      },
      onHello: (nextHello) => {
        this.hello = nextHello;
        this.connected = true;
        this.connecting = false;
        this.lastError = null;
        this.lastCloseReason = null;
        this.reconnectFailures = 0;
        this.retryStalled = false;
      },
      onEvent: (event) => {
        this.lastEvent = event;
      },
      onClose: (event) => {
        this.connected = false;
        this.connecting = true;
        this.reconnectFailures += 1;
        this.retryStalled = this.reconnectFailures >= RECONNECT_FAILURE_THRESHOLD;
        if (event.reason) {
          this.lastCloseReason = event.reason;
        }
      },
      onError: (error) => {
        this.lastError = error.message || "gateway error";
      },
      onGap: ({ expected, received }) => {
        this.lastError = `event gap detected (expected ${expected}, got ${received})`;
      },
    });

    this.client = client;
    client.start();
    this.provider?.setValue(this.buildGatewayState());
  }

  private stopClient(): void {
    if (!this.client) {
      return;
    }
    this.client.stop();
    this.client = null;
  }

  private reconnect = (settings: { gatewayUrl: string; token: string; password: string }): void => {
    this.gatewayUrl = settings.gatewayUrl.trim() || resolveDefaultGatewayUrl();
    this.sharedSecret = settings.token.trim();
    this.password = settings.password.trim();

    storeGatewayUrl(this.gatewayUrl);
    storeToken(this.sharedSecret);
    this.startClient();
  };

  private retryNow = (): void => {
    this.startClient();
  };

  private buildGatewayState(): GatewayState {
    return {
      connected: this.connected,
      connecting: this.connecting,
      lastError: this.lastError,
      lastCloseReason: this.lastCloseReason,
      hello: this.hello,
      lastEvent: this.lastEvent,
      gatewayUrl: this.gatewayUrl,
      reconnectFailures: this.reconnectFailures,
      retryStalled: this.retryStalled,
      request: async (method, params) => {
        if (!this.client) {
          throw new Error("gateway client unavailable");
        }
        return this.client.request(method, params);
      },
      reconnect: this.reconnect,
      retryNow: this.retryNow,
    };
  }

  override render() {
    return html`
      <slot></slot>
    `;
  }
}
