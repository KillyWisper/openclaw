"use client";

import {
  DashboardGatewayClient,
  type GatewayClientEventFrame,
  type GatewayClientHelloOk,
} from "@openclaw/dashboard-gateway-client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  loadStoredGatewayUrl,
  loadStoredToken,
  storeGatewayUrl,
  storeToken,
} from "../lib/local-settings";
import { consumeBootstrapUrlState } from "../lib/url-state";

type GatewayState = {
  connected: boolean;
  connecting: boolean;
  lastError: string | null;
  hello: GatewayClientHelloOk | null;
  lastEvent: GatewayClientEventFrame | null;
  request: <T = unknown>(method: string, params?: unknown) => Promise<T>;
};

const GatewayContext = createContext<GatewayState | null>(null);

function resolveDefaultGatewayUrl() {
  return process.env.NEXT_PUBLIC_GATEWAY_URL ?? "ws://127.0.0.1:18789";
}

export function GatewayProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<DashboardGatewayClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);
  const [hello, setHello] = useState<GatewayClientHelloOk | null>(null);
  const [lastEvent, setLastEvent] = useState<GatewayClientEventFrame | null>(null);

  useEffect(() => {
    const bootstrap = consumeBootstrapUrlState();
    const token = bootstrap.token || loadStoredToken();
    const gatewayUrl = bootstrap.gatewayUrl || loadStoredGatewayUrl() || resolveDefaultGatewayUrl();

    if (bootstrap.token) {
      storeToken(bootstrap.token);
    }
    if (bootstrap.gatewayUrl) {
      storeGatewayUrl(bootstrap.gatewayUrl);
    }

    const client = new DashboardGatewayClient({
      gatewayUrl,
      token: token || undefined,
      reconnect: true,
      onOpen: () => {
        setConnecting(true);
      },
      onHello: (nextHello) => {
        setHello(nextHello);
        setConnected(true);
        setConnecting(false);
        setLastError(null);
      },
      onEvent: (event) => {
        setLastEvent(event);
      },
      onClose: () => {
        setConnected(false);
        setConnecting(true);
      },
      onError: (error) => {
        setLastError(error.message || "gateway error");
      },
      onGap: ({ expected, received }) => {
        setLastError(`event gap detected (expected ${expected}, got ${received})`);
      },
    });

    clientRef.current = client;
    client.start();

    return () => {
      client.stop();
      clientRef.current = null;
    };
  }, []);

  const value = useMemo<GatewayState>(
    () => ({
      connected,
      connecting,
      lastError,
      hello,
      lastEvent,
      request: async (method, params) => {
        const client = clientRef.current;
        if (!client) {
          throw new Error("gateway client unavailable");
        }
        return client.request(method, params);
      },
    }),
    [connected, connecting, hello, lastError, lastEvent],
  );

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway() {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error("useGateway must be used inside <GatewayProvider>");
  }
  return context;
}
