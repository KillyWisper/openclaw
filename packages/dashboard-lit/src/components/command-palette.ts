import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { icon, type IconName } from "./icons.js";

type PaletteItem = {
  id: string;
  label: string;
  icon: IconName;
  category: "search" | "navigation" | "skills";
  action: string;
  description?: string;
};

const PALETTE_ITEMS: PaletteItem[] = [
  // Search / slash commands
  {
    id: "status",
    label: "/status",
    icon: "activity",
    category: "search",
    action: "/status",
    description: "Show current status",
  },
  {
    id: "models",
    label: "/model",
    icon: "monitor",
    category: "search",
    action: "/model",
    description: "Show/set model",
  },
  {
    id: "feedback",
    label: "/usage",
    icon: "barChart",
    category: "search",
    action: "/usage",
    description: "Show usage",
  },
  {
    id: "think",
    label: "/think",
    icon: "brain",
    category: "search",
    action: "/think",
    description: "Set thinking level",
  },
  {
    id: "reset",
    label: "/reset",
    icon: "refresh",
    category: "search",
    action: "/reset",
    description: "Reset session",
  },
  {
    id: "help",
    label: "/help",
    icon: "book",
    category: "search",
    action: "/help",
    description: "Show help",
  },
  // Navigation
  {
    id: "nav-overview",
    label: "Overview",
    icon: "barChart",
    category: "navigation",
    action: "nav:overview",
  },
  {
    id: "nav-sessions",
    label: "Sessions",
    icon: "fileText",
    category: "navigation",
    action: "nav:sessions",
  },
  { id: "nav-cron", label: "Scheduled", icon: "clock", category: "navigation", action: "nav:cron" },
  { id: "nav-skills", label: "Skills", icon: "zap", category: "navigation", action: "nav:skills" },
  {
    id: "nav-config",
    label: "Settings",
    icon: "settings",
    category: "navigation",
    action: "nav:config",
  },
  {
    id: "nav-agents",
    label: "Agents",
    icon: "folder",
    category: "navigation",
    action: "nav:agents",
  },
  // Skills
  {
    id: "skill-shell",
    label: "Shell Command",
    icon: "terminal",
    category: "skills",
    action: "/skill shell",
    description: "Run shell",
  },
  {
    id: "skill-debug",
    label: "Debug Mode",
    icon: "bug",
    category: "skills",
    action: "/verbose full",
    description: "Toggle debug",
  },
];

@customElement("command-palette")
export class CommandPalette extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) open = false;

  @state() private query = "";
  @state() private activeIndex = 0;

  private keyHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      this.dispatchEvent(new CustomEvent("toggle-palette", { bubbles: true, composed: true }));
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("keydown", this.keyHandler);
  }

  override disconnectedCallback(): void {
    window.removeEventListener("keydown", this.keyHandler);
    super.disconnectedCallback();
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has("open") && this.open) {
      this.query = "";
      this.activeIndex = 0;
      requestAnimationFrame(() => {
        this.querySelector<HTMLInputElement>(".command-palette__input")?.focus();
      });
    }
  }

  override render() {
    if (!this.open) {
      return nothing;
    }

    const filtered = this.filteredItems;
    const grouped = this.groupItems(filtered);

    return html`
      <div class="command-palette-overlay" @click=${this.onBackdropClick}>
        <div class="command-palette" @click=${(e: Event) => e.stopPropagation()}>
          <input
            class="command-palette__input"
            placeholder="Type a command…"
            .value=${this.query}
            @input=${(e: Event) => {
              this.query = (e.target as HTMLInputElement).value;
              this.activeIndex = 0;
            }}
            @keydown=${this.onKeydown}
          />
          <div class="command-palette__results">
            ${
              grouped.length === 0
                ? html`
                    <div class="muted" style="padding: 12px 16px">No results</div>
                  `
                : grouped.map(([category, items]) => this.renderGroup(category, items, filtered))
            }
          </div>
        </div>
      </div>
    `;
  }

  private get filteredItems(): PaletteItem[] {
    if (!this.query) {
      return PALETTE_ITEMS;
    }
    const q = this.query.toLowerCase();
    return PALETTE_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false),
    );
  }

  private groupItems(items: PaletteItem[]): Array<[string, PaletteItem[]]> {
    const map = new Map<string, PaletteItem[]>();
    for (const item of items) {
      const group = map.get(item.category) ?? [];
      group.push(item);
      map.set(item.category, group);
    }
    return [...map.entries()];
  }

  private renderGroup(category: string, items: PaletteItem[], allFiltered: PaletteItem[]) {
    const label =
      { search: "Search", navigation: "Navigation", skills: "Skills" }[category] ?? category;

    return html`
      <div class="command-palette__group-label">${label}</div>
      ${items.map((item) => {
        const globalIndex = allFiltered.indexOf(item);
        const isActive = globalIndex === this.activeIndex;
        return html`
          <div
            class="command-palette__item ${isActive ? "command-palette__item--active" : ""}"
            @click=${() => this.selectItem(item)}
            @mouseenter=${() => {
              this.activeIndex = globalIndex;
            }}
          >
            ${icon(item.icon, { className: "icon-sm" })}
            <span>${item.label}</span>
            ${
              item.description
                ? html`<span class="command-palette__item-desc">${item.description}</span>`
                : nothing
            }
          </div>
        `;
      })}
    `;
  }

  private onKeydown = (e: KeyboardEvent) => {
    const filtered = this.filteredItems;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, filtered.length - 1);
        this.scrollActiveIntoView();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.scrollActiveIntoView();
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[this.activeIndex]) {
          this.selectItem(filtered[this.activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        this.close();
        break;
    }
  };

  private scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const active = this.querySelector<HTMLElement>(".command-palette__item--active");
      active?.scrollIntoView({ block: "nearest" });
    });
  }

  private selectItem(item: PaletteItem) {
    if (item.action.startsWith("nav:")) {
      const tab = item.action.slice(4);
      this.dispatchEvent(
        new CustomEvent("navigate", { detail: tab, bubbles: true, composed: true }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("slash-command", { detail: item.action, bubbles: true, composed: true }),
      );
    }
    this.close();
  }

  private onBackdropClick = () => {
    this.close();
  };

  private close() {
    this.dispatchEvent(new CustomEvent("toggle-palette", { bubbles: true, composed: true }));
  }
}
