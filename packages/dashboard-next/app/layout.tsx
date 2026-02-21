import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { GatewayProvider } from "../components/gateway-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GatewayProvider>
          <div className="app-shell">
            <header className="topbar">
              <strong>OpenClaw Dashboard (Next preview)</strong>
              <nav>
                <Link className="tab-link" href="/overview">
                  Overview
                </Link>
                <Link className="tab-link" href="/chat">
                  Chat
                </Link>
              </nav>
            </header>
            <main>{children}</main>
          </div>
        </GatewayProvider>
      </body>
    </html>
  );
}
