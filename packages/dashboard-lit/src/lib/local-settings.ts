const TOKEN_KEY = "openclaw.dashboard.token";
const GATEWAY_URL_KEY = "openclaw.dashboard.gateway-url";
const DEVICE_IDENTITY_KEY = "openclaw-device-identity-v1";
const DEVICE_AUTH_KEY = "openclaw.device.auth.v1";

export function clearDeviceAuth(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(DEVICE_IDENTITY_KEY);
  window.localStorage.removeItem(DEVICE_AUTH_KEY);
}

export function loadStoredToken(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(TOKEN_KEY) ?? "";
}

export function storeToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!token.trim()) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, token.trim());
}

export function loadStoredGatewayUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(GATEWAY_URL_KEY) ?? "";
}

export function storeGatewayUrl(url: string): void {
  if (typeof window === "undefined") {
    return;
  }
  if (!url.trim()) {
    window.localStorage.removeItem(GATEWAY_URL_KEY);
    return;
  }
  window.localStorage.setItem(GATEWAY_URL_KEY, url.trim());
}
