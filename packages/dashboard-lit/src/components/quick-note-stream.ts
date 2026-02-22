import { LitElement, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { formatRelativeTimestamp } from "../lib/format.js";
import { icon } from "./icons.js";

const STORAGE_KEY = "claw-dash:quick-notes:v1";
const MAX_NOTES = 50;

type SavedNote = {
  id: string;
  html: string;
  plainText: string;
  createdAt: number;
};

@customElement("quick-note-stream")
export class QuickNoteStream extends LitElement {
  override createRenderRoot() {
    return this;
  }

  @property({ type: Boolean }) redacted = false;

  @state() private notes: SavedNote[] = [];
  @state() private editorExpanded = false;

  private editorRef: HTMLDivElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.loadNotes();
  }

  override render() {
    return html`
      <div class="glass-dashboard-card">
        <div class="card-header">
          <span class="card-header__prefix">></span>
          <h3 class="card-header__title">Quick Notes</h3>
          <span class="count-badge">${this.notes.length}</span>
        </div>

        ${this.renderToolbar()}
        ${this.renderEditor()}
        ${this.renderSaveButton()}
        ${this.renderNotesFeed()}
      </div>
    `;
  }

  private renderToolbar() {
    type TbBtn = { label: string; cmd: string; arg?: string };
    const buttons: TbBtn[] = [
      { label: "B", cmd: "bold" },
      { label: "I", cmd: "italic" },
      { label: "S", cmd: "strikeThrough" },
      { label: "<>", cmd: "insertHTML", arg: "<code>code</code>" },
      { label: "H1", cmd: "formatBlock", arg: "h1" },
      { label: "H2", cmd: "formatBlock", arg: "h2" },
      { label: "•", cmd: "insertUnorderedList" },
      { label: "1.", cmd: "insertOrderedList" },
      { label: "❝", cmd: "formatBlock", arg: "blockquote" },
    ];

    return html`
      <div class="quick-note-toolbar">
        ${buttons.map(
          (b) => html`
            <button
              class="quick-note-toolbar-btn"
              title=${b.label}
              @mousedown=${(e: Event) => {
                e.preventDefault();
                document.execCommand(b.cmd, false, b.arg);
              }}
            >${b.label}</button>
          `,
        )}
      </div>
    `;
  }

  private renderEditor() {
    const maxH = this.editorExpanded ? "200px" : "80px";
    return html`
      <div
        class="quick-note-editor"
        contenteditable="true"
        style="max-height:${maxH};"
        @focus=${(e: Event) => {
          this.editorRef = e.target as HTMLDivElement;
        }}
      ></div>
    `;
  }

  private renderSaveButton() {
    return html`
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
        <button class="quick-action-btn" @click=${this.saveNote}>
          ${icon("plus", { className: "icon-xs" })} Save Note
        </button>
        <button
          class="btn-ghost"
          @click=${() => {
            this.editorExpanded = !this.editorExpanded;
          }}
          title=${this.editorExpanded ? "Collapse editor" : "Expand editor"}
        >
          ${icon(this.editorExpanded ? "chevronUp" : "chevronDown", { className: "icon-xs" })}
        </button>
      </div>
    `;
  }

  private renderNotesFeed() {
    if (this.notes.length === 0) {
      return nothing;
    }

    return html`
      <div class="note-feed ${this.redacted ? "privacy-blur" : ""}">
        ${this.notes.map(
          (note) => html`
            <div class="note-item">
              <div class="note-item__content" .innerHTML=${this.sanitize(note.html)}></div>
              <div class="note-item__meta">
                <span>${formatRelativeTimestamp(note.createdAt)}</span>
                <button class="note-item__action" title="Copy" @click=${() => this.copyNote(note)}>
                  ${icon("copy", { className: "icon-xs" })}
                </button>
                <button class="note-item__action" title="Delete" @click=${() => this.deleteNote(note.id)}>
                  ${icon("x", { className: "icon-xs" })}
                </button>
              </div>
            </div>
          `,
        )}
      </div>
    `;
  }

  private saveNote = () => {
    const el = this.editorRef ?? this.querySelector<HTMLDivElement>(".quick-note-editor");
    if (!el) {
      return;
    }
    const htmlContent = el.innerHTML.trim();
    const plainText = el.textContent?.trim() ?? "";
    if (!plainText) {
      return;
    }

    const note: SavedNote = {
      id: crypto.randomUUID(),
      html: htmlContent,
      plainText,
      createdAt: Date.now(),
    };

    this.notes = [note, ...this.notes].slice(0, MAX_NOTES);
    this.persistNotes();
    el.innerHTML = "";
  };

  private deleteNote(id: string) {
    this.notes = this.notes.filter((n) => n.id !== id);
    this.persistNotes();
  }

  private async copyNote(note: SavedNote) {
    try {
      await navigator.clipboard.writeText(note.plainText);
    } catch {
      /* ignore */
    }
  }

  private persistNotes() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notes));
    } catch {
      /* ignore */
    }
  }

  private loadNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.notes = parsed.slice(0, MAX_NOTES);
        }
      }
    } catch {
      /* ignore */
    }
  }

  /** Strips dangerous tags/attributes for safe rendering. */
  private sanitize(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;
    for (const el of div.querySelectorAll("script,style,iframe,object,embed,form")) {
      el.remove();
    }
    for (const el of div.querySelectorAll("*")) {
      for (const attr of Array.from(el.attributes)) {
        if (attr.name.startsWith("on") || attr.name === "style") {
          el.removeAttribute(attr.name);
        }
      }
    }
    return div.innerHTML;
  }
}
