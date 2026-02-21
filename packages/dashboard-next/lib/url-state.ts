"use client";

const TOKEN_PARAM = "token";
const PASSWORD_PARAM = "password";
const GATEWAY_URL_PARAM = "gatewayUrl";

export type BootstrapUrlState = {
  token: string | null;
  gatewayUrl: string | null;
};

function parseHash(hash: string) {
  return new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
}

export function consumeBootstrapUrlState(): BootstrapUrlState {
  if (typeof window === "undefined") {
    return { token: null, gatewayUrl: null };
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(url.search);
  const hashParams = parseHash(url.hash);

  const tokenRaw = params.get(TOKEN_PARAM) ?? hashParams.get(TOKEN_PARAM);
  const gatewayUrlRaw = params.get(GATEWAY_URL_PARAM) ?? hashParams.get(GATEWAY_URL_PARAM);

  const token = tokenRaw?.trim() || null;
  const gatewayUrl = gatewayUrlRaw?.trim() || null;

  const hadSensitiveParam =
    tokenRaw !== null ||
    gatewayUrlRaw !== null ||
    params.has(PASSWORD_PARAM) ||
    hashParams.has(PASSWORD_PARAM);

  if (hadSensitiveParam) {
    params.delete(TOKEN_PARAM);
    params.delete(PASSWORD_PARAM);
    params.delete(GATEWAY_URL_PARAM);
    hashParams.delete(TOKEN_PARAM);
    hashParams.delete(PASSWORD_PARAM);
    hashParams.delete(GATEWAY_URL_PARAM);

    url.search = params.toString();
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : "";
    window.history.replaceState({}, "", url.toString());
  }

  return { token, gatewayUrl };
}
