import type { GatewayClientEventFrame } from "@openclaw/dashboard-gateway-client";
import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icon } from "./icons.js";

const MAX_EVENTS = 200;
const FILTER_STORAGE_KEY = "claw-dash:event-filters";

type EventTypeKey =
  | "agent"
  | "presence"
  | "tick"
  | "shutdown"
  | "connect.challenge"
  | "session.update"
  | "health.update"
  | "other";

const EVENT_TYPES: EventTypeKey[] = [
  "agent",
  "presence",
  "tick",
  "shutdown",
  "connect.challenge",
  "session.update",
  "health.update",
];

function classifyEvent(eventName: string): EventTypeKey {
  for (const t of EVENT_TYPES) {
    if (eventName === t || eventName.startsWith(`${t}.`)) {
      return t;
    }
  }
  return "other";
}

function badgeClass(type: EventTypeKey): string {
  const map: Record<string, string> = {
    agent: "event-type-badge--agent",
    presence: "event-type-badge--presence",
    tick: "event-type-badge--tick",
    shutdown: "event-type-badge--shutdown",
    "connect.challenge": "event-type-badge--challenge",
  };
  return map[type] ?? "event-type-badge--default";
}

function chipClass(type: EventTypeKey): string {
  const map: Record<string, string> = {
    agent: "filter-chip--agent",
    presence: "filter-chip--presence",
    tick: "filter-chip--tick",
    shutdown: "filter-chip--shutdown",
    "connect.challenge": "filter-chip--challenge",
  };
  return map[type] ?? "";
}

type StoredEvent = {
  event: string;
  type: EventTypeKey;
  payload: unknown;
  timestamp: number;
};

@customElement("event-log")
export class EventLog extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) redacted = false;

  @state() private events: StoredEvent[] = [];
  @state() private filters: Set<EventTypeKey> = new Set(EVENT_TYPES);
  @state() private expandedIndex: number | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadFilters();
  }

  /** Called by the parent view when a new gateway event arrives. */
  addEvent(frame: GatewayClientEventFrame) {
    const type = classifyEvent(frame.event);
    const entry: StoredEvent = {
      event: frame.event,
      type,
      payload: frame.payload,
      timestamp: Date.now(),
    };
    this.events = [entry, ...this.events].slice(0, MAX_EVENTS);
  }

  override render() {
    const filtered = this.events.filter((e) => this.filters.has(e.type));

    return html`
      <div class="glass-dashboard-card">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Event Log</h3>
          <span class="count-badge">${filtered.length}/${this.events.length}</span>
          <div class="card-header__actions">
            <button class="btn-ghost" @click=${this.clearEvents} title="Clear">
              ${icon("x", { className: "icon-xs" })}
            </button>
          </div>
        </div>

        ${this.renderFilterChips()}

        <div style="max-height:360px;overflow-y:auto;">
          ${
            filtered.length === 0
              ? html`<div class="muted" style="padding:0.5rem 0;">
                ${this.events.length === 0 ? "No events yet" : "All events filtered out"}
              </div>`
              : filtered.map((e, i) => this.renderEventRow(e, i))
          }
        </div>
      </div>
    `;
  }

  private renderFilterChips() {
    const allActive = this.filters.size === EVENT_TYPES.length;

    return html`
      <div class="filter-chips">
        <button
          class="filter-chip ${allActive ? "filter-chip--active" : ""}"
          @click=${() => {
            if (allActive) {
              this.filters = new Set();
            } else {
              this.filters = new Set(EVENT_TYPES);
            }
            this.saveFilters();
          }}
        >${allActive ? "All" : "None"}</button>
        ${EVENT_TYPES.map(
          (t) => html`
            <button
              class="filter-chip ${this.filters.has(t) ? `filter-chip--active ${chipClass(t)}` : ""}"
              @click=${() => this.toggleFilter(t)}
            >${t}</button>
          `,
        )}
      </div>
    `;
  }

  private renderEventRow(e: StoredEvent, index: number) {
    const isExpanded = this.expandedIndex === index;
    const time = new Date(e.timestamp);
    const timeStr = time.toLocaleTimeString("en-US", { hour12: false });
    const summary = this.redacted ? "[payload hidden]" : this.summarizePayload(e.payload);

    return html`
      <div
        class="glass-event-row"
        @click=${() => {
          if (this.redacted) {
            return;
          }
          this.expandedIndex = isExpanded ? null : index;
        }}
      >
        <div style="display:flex;align-items:center;gap:6px;">
          <span class="event-type-badge ${badgeClass(e.type)}">${e.event}</span>
          <span class="muted" style="font-size:0.72rem;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${summary}
          </span>
          <span class="muted" style="font-size:0.68rem;font-variant-numeric:tabular-nums;flex-shrink:0;">
            ${timeStr}
          </span>
        </div>
        ${
          isExpanded && !this.redacted
            ? html`<pre style="margin:6px 0 0;font-size:0.72rem;color:var(--muted);white-space:pre-wrap;max-height:200px;overflow:auto;">${JSON.stringify(e.payload, null, 2)}</pre>`
            : nothing
        }
      </div>
    `;
  }

  private summarizePayload(payload: unknown): string {
    if (payload == null) {
      return "";
    }
    if (typeof payload !== "object") {
      return JSON.stringify(payload);
    }
    const obj = payload as Record<string, unknown>;
    return Object.entries(obj)
      .slice(0, 4)
      .map(([k, v]) => {
        const val = typeof v === "string" ? v : typeof v === "number" ? String(v) : typeof v;
        return `${k}:${String(val).slice(0, 30)}`;
      })
      .join(" · ");
  }

  private toggleFilter(type: EventTypeKey) {
    const next = new Set(this.filters);
    if (next.has(type)) {
      next.delete(type);
    } else {
      next.add(type);
    }
    this.filters = next;
    this.saveFilters();
  }

  private clearEvents = () => {
    this.events = [];
    this.expandedIndex = null;
  };

  private saveFilters() {
    try {
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify([...this.filters]));
    } catch {
      /* ignore */
    }
  }

  private loadFilters() {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        this.filters = new Set(
          arr.filter((t): t is EventTypeKey => EVENT_TYPES.includes(t as EventTypeKey)),
        );
      }
    } catch {
      /* ignore */
    }
  }
}
