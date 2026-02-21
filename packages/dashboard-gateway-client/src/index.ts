export type GatewayClientEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
};

export type GatewayClientResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: { code?: string; message?: string; details?: unknown };
};

export type GatewayClientHelloOk = {
  type: "hello-ok";
  protocol: number;
  features?: { methods?: string[]; events?: string[] };
  snapshot?: unknown;
};

const PROTOCOL_VERSION = 3;

type GatewayClientConnectParams = {
  minProtocol: number;
  maxProtocol: number;
  auth?: { token?: string; password?: string };
  client: {
    id: string;
    version: string;
    mode: string;
    platform: string;
    displayName?: string;
    instanceId?: string;
  };
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
};

export type GatewayClientOptions = {
  gatewayUrl: string;
  token?: string;
  password?: string;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onEvent?: (event: GatewayClientEventFrame) => void;
  onHello?: (hello: GatewayClientHelloOk) => void;
  onError?: (error: Error) => void;
  onGap?: (args: { expected: number; received: number }) => void;
  reconnect?: boolean;
};

const CONNECT_TIMEOUT_MS = 12_000;

function createRequestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export class DashboardGatewayClient {
  private readonly options: GatewayClientOptions;
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private stopped = false;
  private backoffMs = 800;
  private pending = new Map<string, PendingRequest>();
  private lastSeq: number | null = null;

  constructor(options: GatewayClientOptions) {
    this.options = options;
  }

  start() {
    this.stopped = false;
    this.connect();
  }

  stop() {
    this.stopped = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, "client stop");
      this.ws = null;
    }
    for (const pending of this.pending.values()) {
      pending.reject(new Error("gateway client stopped"));
    }
    this.pending.clear();
  }

  request<T = unknown>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("gateway not connected"));
    }
    const id = createRequestId();
    const frame = { type: "req", id, method, params };
    const promise = new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: (value) => resolve(value as T), reject });
    });
    this.ws.send(JSON.stringify(frame));
    return promise;
  }

  private connect() {
    if (this.stopped) {
      return;
    }

    const ws = new WebSocket(this.options.gatewayUrl);
    this.ws = ws;

    ws.addEventListener("open", () => {
      this.options.onOpen?.();
      void this.sendConnect();
    });

    ws.addEventListener("error", () => {
      this.options.onError?.(new Error("gateway websocket error"));
    });

    ws.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }
      this.handleMessage(event.data);
    });

    ws.addEventListener("close", (event) => {
      if (this.ws === ws) {
        this.ws = null;
      }
      this.options.onClose?.(event);
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`gateway disconnected (${event.code})`));
      }
      this.pending.clear();
      if (this.stopped || this.options.reconnect === false) {
        return;
      }
      const wait = this.backoffMs;
      this.backoffMs = Math.min(10_000, Math.round(this.backoffMs * 1.75));
      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, wait);
    });
  }

  private async sendConnect() {
    const ws = this.ws;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const connectId = createRequestId();
    const connectParams: GatewayClientConnectParams = {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      auth:
        this.options.token || this.options.password
          ? {
              token: this.options.token,
              password: this.options.password,
            }
          : undefined,
      client: {
        id: "openclaw-control-ui",
        version: "next-preview-0",
        mode: "ui",
        platform: typeof navigator === "undefined" ? "browser" : navigator.userAgent,
        displayName: "Next Preview Dashboard",
      },
    };

    ws.send(
      JSON.stringify({ type: "req", id: connectId, method: "connect", params: connectParams }),
    );

    const timeout = window.setTimeout(() => {
      if (this.ws === ws) {
        ws.close(1008, "connect timeout");
      }
    }, CONNECT_TIMEOUT_MS);

    this.pending.set(connectId, {
      resolve: (value) => {
        window.clearTimeout(timeout);
        this.backoffMs = 800;
        const hello = value as GatewayClientHelloOk;
        this.options.onHello?.(hello);
      },
      reject: (error) => {
        window.clearTimeout(timeout);
        this.options.onError?.(
          error instanceof Error
            ? error
            : new Error(typeof error === "string" ? error : "connect failed"),
        );
      },
    });
  }

  private handleMessage(raw: string) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") {
      return;
    }

    const frame = parsed as { type?: unknown };

    if (frame.type === "event") {
      const event = parsed as GatewayClientEventFrame;
      if (typeof event.seq === "number") {
        if (this.lastSeq !== null && event.seq > this.lastSeq + 1) {
          this.options.onGap?.({ expected: this.lastSeq + 1, received: event.seq });
        }
        this.lastSeq = event.seq;
      }
      this.options.onEvent?.(event);
      return;
    }

    if (frame.type === "res") {
      const response = parsed as GatewayClientResponseFrame;
      const pending = this.pending.get(response.id);
      if (!pending) {
        return;
      }
      this.pending.delete(response.id);
      if (response.ok) {
        pending.resolve(response.payload);
      } else {
        pending.reject(new Error(response.error?.message ?? "request failed"));
      }
    }
  }
}
