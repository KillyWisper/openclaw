import { createContext } from "@lit/context";
import type {
  GatewayClientEventFrame,
  GatewayClientHelloOk,
} from "@openclaw/dashboard-gateway-client";

export type GatewayState = {
  connected: boolean;
  connecting: boolean;
  lastError: string | null;
  lastCloseReason: string | null;
  hello: GatewayClientHelloOk | null;
  lastEvent: GatewayClientEventFrame | null;
  gatewayUrl: string;
  reconnectFailures: number;
  retryStalled: boolean;
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
  reconnect: (settings: { gatewayUrl: string; token: string; password: string }) => void;
  retryNow: () => void;
};

export const gatewayContext = createContext<GatewayState>("dashboard-gateway");
