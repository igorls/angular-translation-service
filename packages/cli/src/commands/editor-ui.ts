/**
 * Editor UI — returns the complete HTML/CSS/JS as a single string.
 * Zero-dependency vanilla frontend for the Translation Editor.
 *
 * v2: Source/Target language picker, global search, progress tracking, usage badges.
 */

export function getEditorHTML(): string {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>ATS Translation Editor</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">',
    '<style>',
    CSS,
    '</style>',
    '</head>',
    '<body>',
    HTML_BODY,
    '<script>',
    JS,
    '</script>',
    '</body>',
    '</html>',
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────

const CSS = /* css */ `
:root {
  --bg-body: #0f0f1a;
  --bg-sidebar: #141425;
  --bg-main: #12121f;
  --bg-card: #1a1a2e;
  --bg-input: #1e1e35;
  --bg-hover: #252545;
  --bg-active: #2a2a55;
  --border: #2a2a45;
  --border-focus: #8b5cf6;
  --text-primary: #f0f0f5;
  --text-secondary: #9090b0;
  --text-muted: #606080;
  --accent: #8b5cf6;
  --accent-dim: rgba(139, 92, 246, 0.15);
  --success: #34d399;
  --warning: #fbbf24;
  --danger: #f87171;
  --radius: 8px;
  --radius-sm: 4px;
  --shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', -apple-system, sans-serif;
  background: var(--bg-body);
  color: var(--text-primary);
  height: 100vh;
  overflow: hidden;
}

#app { display: flex; flex-direction: column; height: 100vh; }

/* Header */
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.header-left { display: flex; align-items: center; gap: 16px; }

.logo { font-size: 1rem; letter-spacing: -0.02em; }

.logo strong {
  background: linear-gradient(135deg, #8b5cf6, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.project-path {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  max-width: 400px;
  margin: 0 auto;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0 12px;
  height: 32px;
  width: 100%;
  transition: border-color 0.15s;
}

.search-box:focus-within { border-color: var(--accent); }
.search-icon { font-size: 0.8rem; }

.search-box input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--text-primary);
  font-size: 0.85rem;
  width: 100%;
  font-family: inherit;
}

.search-box kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  background: var(--bg-card);
  padding: 2px 6px;
  border-radius: 3px;
  color: var(--text-muted);
  border: 1px solid var(--border);
  white-space: nowrap;
}

.header-right { display: flex; align-items: center; gap: 16px; }
.save-status { font-size: 0.75rem; color: var(--success); font-weight: 500; }
.save-status.saving { color: var(--warning); }

.key-count {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

/* Layout */
.layout { display: flex; flex: 1; overflow: hidden; }

/* Sidebar */
aside {
  width: 280px;
  min-width: 280px;
  background: var(--bg-sidebar);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.sidebar-section h3 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 8px;
}

.lang-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lang-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-picker-row label {
  font-size: 0.72rem;
  color: var(--text-muted);
  width: 52px;
  text-transform: uppercase;
  font-weight: 600;
  flex-shrink: 0;
}

.lang-picker-row select {
  flex: 1;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 4px 8px;
  font-size: 0.82rem;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
  cursor: pointer;
}

.lang-picker-row select:focus { border-color: var(--accent); }

.btn-add-lang {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 4px 10px;
  font-size: 0.72rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  margin-top: 4px;
  width: 100%;
}

.btn-add-lang:hover { border-color: var(--accent); color: var(--text-primary); }

/* Progress bars */
.progress-section { padding: 12px 16px; border-bottom: 1px solid var(--border); }

.progress-bar-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
}

.progress-label-name { color: var(--text-secondary); font-weight: 500; }

.progress-label-pct {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
}

.progress-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s, background-color 0.3s;
}

/* Sidebar namespace list */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
}

.sidebar-header h3 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  font-weight: 600;
  margin-bottom: 0;
}

.btn-icon {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-primary);
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  transition: all 0.15s;
}

.btn-icon:hover { background: var(--accent-dim); border-color: var(--accent); }

.ns-list { list-style: none; flex: 1; overflow-y: auto; padding: 0 8px; }

.ns-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-bottom: 2px;
  transition: all 0.1s;
}

.ns-item:hover { background: var(--bg-hover); }
.ns-item.active { background: var(--accent-dim); border-left: 2px solid var(--accent); }

.ns-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ns-name { font-size: 0.85rem; font-weight: 500; }

.ns-badge {
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 10px;
  font-family: 'JetBrains Mono', monospace;
}

.ns-bar {
  height: 3px;
  background: var(--border);
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;
}

.ns-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
}

/* "All" ns item for global search */
.ns-item.ns-all .ns-name { font-style: italic; color: var(--text-secondary); }

/* Main */
main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.editor-area { flex: 1; overflow-y: auto; padding: 0; }

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  gap: 12px;
}

.placeholder-icon { font-size: 3rem; }
.placeholder h2 { font-size: 1.2rem; font-weight: 600; color: var(--text-secondary); }
.placeholder p { font-size: 0.9rem; }

/* Key table */
.key-table-header {
  display: grid;
  grid-template-columns: 260px 1fr 1fr 60px;
  padding: 10px 20px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  position: sticky;
  top: 0;
  z-index: 5;
}

.key-row {
  display: grid;
  grid-template-columns: 260px 1fr 1fr 60px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border);
  transition: background 0.1s;
  align-items: start;
}

.key-row:hover { background: rgba(139, 92, 246, 0.03); }

.key-cell { padding: 10px 8px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }

.key-path {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: var(--text-primary);
  word-break: break-all;
}

.key-ns-tag {
  font-size: 0.62rem;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  background: var(--bg-input);
  padding: 1px 5px;
  border-radius: 3px;
  display: inline-block;
  width: fit-content;
}

/* Usage badge */
.usage-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.62rem;
  padding: 1px 6px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 2px;
  width: fit-content;
}

.usage-badge.used {
  background: rgba(52, 211, 153, 0.12);
  color: var(--success);
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.usage-badge.unused {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

.usage-badge.scanning {
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.usage-badge:hover { filter: brightness(1.2); }

/* Usage context (expandable) */
.usage-context {
  display: none;
  grid-column: 1 / -1;
  padding: 0 20px 12px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}

.usage-context.open { display: block; }

.usage-file {
  font-size: 0.75rem;
  padding: 6px 0;
  border-bottom: 1px solid var(--border);
}

.usage-file:last-child { border-bottom: none; }

.usage-file-path {
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
}

.usage-file-line {
  color: var(--text-muted);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
}

.usage-file-context {
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  margin-top: 2px;
  padding: 3px 8px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  overflow: hidden;
}

/* Value inputs */
.value-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  resize: vertical;
  min-height: 36px;
  outline: none;
  transition: border-color 0.15s;
  line-height: 1.4;
}

.value-input:focus { border-color: var(--accent); }
.value-input.missing { border-color: var(--danger); background: rgba(248, 113, 113, 0.05); }
.value-input.empty-val { border-color: var(--warning); background: rgba(251, 191, 36, 0.05); }

.key-actions { display: flex; align-items: center; justify-content: center; padding: 10px 0; }

.btn-delete {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all 0.15s;
}

.key-row:hover .btn-delete { opacity: 1; }
.btn-delete:hover { color: var(--danger); background: rgba(248, 113, 113, 0.1); }

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  backdrop-filter: blur(4px);
}

.modal-overlay.hidden { display: none; }

.modal {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 480px;
  max-width: 90vw;
  box-shadow: var(--shadow);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 { font-size: 1rem; font-weight: 600; }

.modal-body { padding: 20px; display: flex; flex-direction: column; gap: 12px; }

.modal-body label { font-size: 0.82rem; font-weight: 500; color: var(--text-secondary); }
.modal-body .hint { color: var(--text-muted); font-weight: 400; }

.modal-body input,
.modal-body select,
.modal-body textarea {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 0.88rem;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
}

.modal-body input:focus,
.modal-body select:focus { border-color: var(--accent); }

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--border);
  transition: all 0.15s;
  font-family: inherit;
}

.btn-primary { background: var(--accent); border-color: var(--accent); color: white; }
.btn-primary:hover { filter: brightness(1.1); }
.btn-secondary { background: var(--bg-input); color: var(--text-secondary); }
.btn-secondary:hover { background: var(--bg-hover); }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.highlight { background: rgba(251, 191, 36, 0.25); border-radius: 2px; padding: 0 1px; }

/* Source/Target set icons on progress bars */
.progress-actions {
  display: flex;
  gap: 4px;
}

.progress-set-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.58rem;
  padding: 0 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'JetBrains Mono', monospace;
  line-height: 1.6;
}

.progress-set-btn:hover { border-color: var(--accent); color: var(--text-primary); }
.progress-set-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

/* Bottom toolbar */
.bottom-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 16px;
  background: var(--bg-sidebar);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.toolbar-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 5px 12px;
  font-size: 0.78rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn:hover { border-color: var(--accent); color: var(--text-primary); }
.toolbar-btn.active { background: var(--accent-dim); border-color: var(--accent); color: var(--accent); }

.toolbar-badge {
  font-size: 0.65rem;
  padding: 0 5px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
}

.toolbar-badge.danger { background: rgba(248, 113, 113, 0.2); color: var(--danger); }
.toolbar-badge.success { background: rgba(52, 211, 153, 0.2); color: var(--success); }

.toolbar-spacer { flex: 1; }

.ollama-status {
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.ollama-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.ollama-dot.online { background: var(--success); }
.ollama-dot.offline { background: var(--danger); }

/* Panel drawer */
.panel-drawer {
  display: none;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  max-height: 280px;
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-drawer.open { display: block; }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg-card);
  z-index: 3;
}

.panel-header h4 { font-size: 0.82rem; font-weight: 600; }

.panel-actions { display: flex; gap: 6px; align-items: center; }

.panel-actions select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 3px 8px;
  font-size: 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  outline: none;
}

/* Validation issues list */
.issue-row {
  display: grid;
  grid-template-columns: 80px 90px 120px 1fr 100px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  align-items: center;
}

.issue-row:hover { background: rgba(139, 92, 246, 0.03); }

.issue-type {
  font-size: 0.68rem;
  padding: 1px 6px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  width: fit-content;
}

.issue-type.missing { background: rgba(248, 113, 113, 0.15); color: var(--danger); }
.issue-type.extra { background: rgba(251, 191, 36, 0.15); color: var(--warning); }
.issue-type.empty { background: rgba(96, 96, 128, 0.2); color: var(--text-muted); }

.issue-key {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-primary);
}

.issue-action-btn {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-muted);
  padding: 2px 8px;
  font-size: 0.68rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}

.issue-action-btn:hover { border-color: var(--accent); color: var(--text-primary); }

/* Translate button per-row */
.btn-translate-key {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.72rem;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all 0.15s;
  font-family: 'JetBrains Mono', monospace;
}

.key-row:hover .btn-translate-key { opacity: 1; }
.btn-translate-key:hover { color: var(--accent); background: var(--accent-dim); }
.btn-translate-key.translating { opacity: 1; color: var(--warning); }
`;

// ─────────────────────────────────────────────────────────────
// HTML
// ─────────────────────────────────────────────────────────────

const HTML_BODY = /* html */ `
<div id="app">
  <header id="header">
    <div class="header-left">
      <span class="logo">🌐 <strong>ATS</strong> Editor</span>
      <span id="project-path" class="project-path"></span>
    </div>
    <div class="header-center">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input id="search" type="text" placeholder="Search all keys &amp; values..." autocomplete="off">
        <kbd>Ctrl+K</kbd>
      </div>
    </div>
    <div class="header-right">
      <span id="save-status" class="save-status">Ready</span>
      <span id="key-count" class="key-count"></span>
    </div>
  </header>

  <div class="layout">
    <aside id="sidebar">
      <!-- Language Picker -->
      <div class="sidebar-section">
        <h3>Languages</h3>
        <div class="lang-picker">
          <div class="lang-picker-row">
            <label>Source</label>
            <select id="source-lang"></select>
          </div>
          <div class="lang-picker-row">
            <label>Target</label>
            <select id="target-lang"></select>
          </div>
          <button id="btn-add-lang" class="btn-add-lang">+ Add Language</button>
        </div>
      </div>

      <!-- Progress -->
      <div class="sidebar-section" id="progress-section">
        <h3>Translation Progress</h3>
        <div id="progress-bars" class="progress-bar-container"></div>
      </div>

      <!-- Namespaces -->
      <div class="sidebar-header">
        <h3>Namespaces</h3>
        <button id="btn-add-key" class="btn-icon" title="Add new key">＋</button>
      </div>
      <ul id="ns-list" class="ns-list"></ul>
    </aside>

    <main id="main">
      <div id="editor-area" class="editor-area">
        <div id="placeholder" class="placeholder">
          <div class="placeholder-icon">📦</div>
          <h2>Select a namespace</h2>
          <p>Choose a namespace from the sidebar to start editing translations.</p>
        </div>
      </div>

      <!-- Panel drawer (LLM / Validation) -->
      <div id="panel-drawer" class="panel-drawer"></div>

      <!-- Bottom toolbar -->
      <div class="bottom-toolbar">
        <button id="btn-translate" class="toolbar-btn">🤖 Translate</button>
        <button id="btn-validate" class="toolbar-btn">⚡ Validate <span id="validate-badge" class="toolbar-badge"></span></button>
        <span class="toolbar-spacer"></span>
        <span id="ollama-status" class="ollama-status"></span>
      </div>
    </main>
  </div>
</div>

<!-- Add Key Modal -->
<div id="modal-overlay" class="modal-overlay hidden">
  <div class="modal">
    <div class="modal-header">
      <h3 id="modal-title">Add New Key</h3>
      <button id="modal-close" class="btn-icon">✕</button>
    </div>
    <div class="modal-body" id="modal-body-content">
      <label>Namespace</label>
      <select id="modal-ns"></select>
      <label>Key Path <span class="hint">(e.g. nav.home)</span></label>
      <input id="modal-key" type="text" placeholder="section.key_name" autocomplete="off">
      <div id="modal-values"></div>
    </div>
    <div class="modal-footer">
      <button id="modal-cancel" class="btn btn-secondary">Cancel</button>
      <button id="modal-save" class="btn btn-primary">Add Key</button>
    </div>
  </div>
</div>
`;

// ─────────────────────────────────────────────────────────────
// JavaScript
// ─────────────────────────────────────────────────────────────

const JS = /* js */ `
// State
var config = null;
var activeNs = null;       // null = "All" in search mode
var translations = {};     // { ns: { lang: data } }
var searchQuery = '';
var saveTimeout = null;
var sourceLang = '';
var targetLang = '';
var progress = null;
var usageData = null;
var usageReady = false;
var ollamaOnline = false;
var ollamaModels = [];
var ollamaModel = '';
var ollamaHost = 'localhost:11434';
var ollamaBatchSize = 20;
var validationIssues = [];
var activePanel = null;  // 'translate' | 'validate' | null

// Init
async function init() {
    var res = await fetch('/api/config');
    config = await res.json();
    document.getElementById('project-path').textContent = config.i18nDir;

    // Default source = first lang, target = second or first
    sourceLang = config.languages[0] || '';
    targetLang = config.languages[1] || config.languages[0] || '';

    // Restore persisted prefs
    try {
        var saved = JSON.parse(localStorage.getItem('ats-editor-prefs') || '{}');
        if (saved.sourceLang && config.languages.indexOf(saved.sourceLang) >= 0) sourceLang = saved.sourceLang;
        if (saved.targetLang && config.languages.indexOf(saved.targetLang) >= 0) targetLang = saved.targetLang;
        if (saved.ollamaModel) ollamaModel = saved.ollamaModel;
        if (saved.ollamaBatchSize > 0 && saved.ollamaBatchSize <= 100) ollamaBatchSize = saved.ollamaBatchSize;
    } catch(e) {}

    renderLangPicker();
    renderSidebar();
    setupEventListeners();
    loadProgress();
    pollUsage();
    checkOllama();
    loadValidation();

    if (config.namespaces.length > 0) {
        selectNamespace(config.namespaces[0]);
    }
}

function savePrefs() {
    try {
        localStorage.setItem('ats-editor-prefs', JSON.stringify({
            sourceLang: sourceLang,
            targetLang: targetLang,
            ollamaModel: ollamaModel,
            ollamaBatchSize: ollamaBatchSize,
        }));
    } catch(e) {}
}

// API helpers
async function loadNamespace(ns) {
    var data = {};
    for (var i = 0; i < config.languages.length; i++) {
        var lang = config.languages[i];
        var res = await fetch('/api/translations/' + lang + '/' + ns);
        var json = await res.json();
        data[lang] = json.data;
    }
    translations[ns] = data;
    return data;
}

async function loadAllNamespaces() {
    for (var i = 0; i < config.namespaces.length; i++) {
        if (!translations[config.namespaces[i]]) {
            await loadNamespace(config.namespaces[i]);
        }
    }
}

async function saveValue(lang, ns, key, value) {
    setNestedValue(translations[ns][lang], key, value);
    showSaveStatus('saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async function() {
        await fetch('/api/translations/' + lang + '/' + ns, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: translations[ns][lang] }),
        });
        showSaveStatus('saved');
        loadProgress();
    }, 500);
}

// Progress
async function loadProgress() {
    var res = await fetch('/api/progress');
    progress = await res.json();
    renderProgress();
    renderSidebar();
}

function renderProgress() {
    var container = document.getElementById('progress-bars');
    if (!progress) { container.innerHTML = ''; return; }

    var html = '';
    for (var i = 0; i < config.languages.length; i++) {
        var lang = config.languages[i];
        var p = progress.progress[lang];
        if (!p) continue;
        var pct = p.percentage;
        var color = pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
        var isDefault = lang === progress.defaultLang;
        var isSrc = lang === sourceLang;
        var isTgt = lang === targetLang;
        html += '<div class="progress-item">' +
            '<div class="progress-label">' +
            '<span class="progress-label-name">' + lang + (isDefault ? ' (default)' : '') + '</span>' +
            '<span class="progress-actions">' +
            '<button class="progress-set-btn' + (isSrc ? ' active' : '') + '" data-action="set-src" data-lang="' + lang + '" title="Set as source">SRC</button>' +
            '<button class="progress-set-btn' + (isTgt ? ' active' : '') + '" data-action="set-tgt" data-lang="' + lang + '" title="Set as target">TGT</button>' +
            '<span class="progress-label-pct" style="margin-left:4px">' + p.translated + '/' + p.total + ' (' + pct + '%)</span>' +
            '</span>' +
            '</div>' +
            '<div class="progress-bar"><div class="progress-fill" style="width: ' + pct + '%; background: ' + color + '"></div></div>' +
            '</div>';
    }
    container.innerHTML = html;

    // Wire SRC/TGT buttons
    var srcBtns = container.querySelectorAll('[data-action="set-src"]');
    for (var si = 0; si < srcBtns.length; si++) {
        srcBtns[si].addEventListener('click', function() { setSourceLang(this.dataset.lang); });
    }
    var tgtBtns = container.querySelectorAll('[data-action="set-tgt"]');
    for (var ti = 0; ti < tgtBtns.length; ti++) {
        tgtBtns[ti].addEventListener('click', function() { setTargetLang(this.dataset.lang); });
    }
}

// Usage polling
async function pollUsage() {
    try {
        var res = await fetch('/api/usage');
        var data = await res.json();
        usageReady = data.ready;
        usageData = data.usage;
        if (!usageReady) {
            setTimeout(pollUsage, 2000);
        } else {
            renderEditor();
        }
    } catch(e) {
        setTimeout(pollUsage, 3000);
    }
}

function getUsageCount(ns, key) {
    if (!usageData) return -1;
    var fullKey = ns + ':' + key;
    var direct = usageData[fullKey];
    var scopeKey = ns + ':*';
    var scoped = usageData[scopeKey];
    var count = 0;
    if (direct) count += direct.length;
    if (scoped) count += scoped.length;
    return count;
}

function getUsageEntries(ns, key) {
    if (!usageData) return [];
    var entries = [];
    var fullKey = ns + ':' + key;
    if (usageData[fullKey]) entries = entries.concat(usageData[fullKey]);
    var scopeKey = ns + ':*';
    if (usageData[scopeKey]) entries = entries.concat(usageData[scopeKey]);
    return entries;
}

// Language picker
function renderLangPicker() {
    var srcSel = document.getElementById('source-lang');
    var tgtSel = document.getElementById('target-lang');
    var srcHtml = '';
    var tgtHtml = '';
    for (var i = 0; i < config.languages.length; i++) {
        var lang = config.languages[i];
        srcHtml += '<option value="' + lang + '"' + (lang === sourceLang ? ' selected' : '') + '>' + lang + '</option>';
        tgtHtml += '<option value="' + lang + '"' + (lang === targetLang ? ' selected' : '') + '>' + lang + '</option>';
    }
    srcSel.innerHTML = srcHtml;
    tgtSel.innerHTML = tgtHtml;
}

// Sidebar
function renderSidebar() {
    var list = document.getElementById('ns-list');
    var html = '';

    // "All namespaces" option for global search
    html += '<li class="ns-item ns-all' + (activeNs === null ? ' active' : '') + '" data-ns="__all__">' +
        '<div class="ns-item-top"><div class="ns-name">All Namespaces</div>' +
        '<span class="ns-badge" style="background: var(--bg-input); color: var(--text-muted)">' +
        config.namespaces.length + '</span></div></li>';

    for (var i = 0; i < config.namespaces.length; i++) {
        var ns = config.namespaces[i];
        var isActive = ns === activeNs ? ' active' : '';

        // Get per-namespace progress for target lang
        var barHtml = '';
        if (progress && progress.progress[targetLang]) {
            var nsProg = progress.progress[targetLang].byNamespace[ns];
            if (nsProg) {
                var pct = nsProg.total > 0 ? Math.round((nsProg.translated / nsProg.total) * 100) : 100;
                var color = pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
                barHtml = '<div class="ns-bar"><div class="ns-bar-fill" style="width: ' + pct + '%; background: ' + color + '"></div></div>';
            }
        }

        html += '<li class="ns-item' + isActive + '" data-ns="' + ns + '">' +
            '<div class="ns-item-top"><div class="ns-name">' + ns + '</div>' +
            '</div>' + barHtml + '</li>';
    }
    list.innerHTML = html;

    var items = list.querySelectorAll('.ns-item');
    for (var j = 0; j < items.length; j++) {
        items[j].addEventListener('click', function() {
            var ns = this.dataset.ns;
            if (ns === '__all__') {
                selectAllNamespaces();
            } else {
                selectNamespace(ns);
            }
        });
    }
}

// Namespace selection
async function selectNamespace(ns) {
    activeNs = ns;
    updateActiveNsUI();
    if (!translations[ns]) await loadNamespace(ns);
    renderEditor();
}

async function selectAllNamespaces() {
    activeNs = null;
    updateActiveNsUI();
    await loadAllNamespaces();
    renderEditor();
}

function updateActiveNsUI() {
    var items = document.querySelectorAll('.ns-item');
    for (var i = 0; i < items.length; i++) {
        var ns = items[i].dataset.ns;
        if (activeNs === null) {
            items[i].classList.toggle('active', ns === '__all__');
        } else {
            items[i].classList.toggle('active', ns === activeNs);
        }
    }
}

// Editor
function renderEditor() {
    var area = document.getElementById('editor-area');
    var namespacesToShow = activeNs ? [activeNs] : config.namespaces;

    // Collect all keys across selected namespaces
    var allEntries = []; // { ns, key }
    for (var ni = 0; ni < namespacesToShow.length; ni++) {
        var ns = namespacesToShow[ni];
        if (!translations[ns]) continue;
        var allKeys = {};
        // Collect from source + target langs
        var srcData = translations[ns][sourceLang] || {};
        var tgtData = translations[ns][targetLang] || {};
        var srcKeys = flattenKeys(srcData, '');
        var tgtKeys = flattenKeys(tgtData, '');
        for (var ki = 0; ki < srcKeys.length; ki++) allKeys[srcKeys[ki]] = true;
        for (var ki2 = 0; ki2 < tgtKeys.length; ki2++) allKeys[tgtKeys[ki2]] = true;
        var sorted = Object.keys(allKeys).sort();
        for (var si = 0; si < sorted.length; si++) {
            allEntries.push({ ns: ns, key: sorted[si] });
        }
    }

    // Filter by search (global)
    if (searchQuery) {
        var q = searchQuery.toLowerCase();
        allEntries = allEntries.filter(function(entry) {
            // Match key path
            if (entry.key.toLowerCase().indexOf(q) !== -1) return true;
            // Match namespace name
            if (entry.ns.toLowerCase().indexOf(q) !== -1) return true;
            // Match values in any loaded language
            for (var li = 0; li < config.languages.length; li++) {
                var data = translations[entry.ns] && translations[entry.ns][config.languages[li]];
                if (!data) continue;
                var val = getNestedValue(data, entry.key);
                if (typeof val === 'string' && val.toLowerCase().indexOf(q) !== -1) return true;
            }
            return false;
        });
    }

    // Render header
    var html = '<div class="key-table-header">';
    html += '<div>Key</div>';
    html += '<div>' + sourceLang.toUpperCase() + ' (source)</div>';
    html += '<div>' + targetLang.toUpperCase() + ' (target)</div>';
    html += '<div></div>';
    html += '</div>';

    // Render rows
    for (var ei = 0; ei < allEntries.length; ei++) {
        var entry = allEntries[ei];
        var rowId = 'row-' + entry.ns + '-' + entry.key.replace(/\\./g, '_');
        var usageCount = getUsageCount(entry.ns, entry.key);
        var usageBadgeHtml = '';

        if (!usageReady) {
            usageBadgeHtml = '<span class="usage-badge scanning">scanning...</span>';
        } else if (usageCount > 0) {
            usageBadgeHtml = '<span class="usage-badge used" data-ns="' + entry.ns + '" data-key="' + entry.key + '" data-row="' + rowId + '">' + usageCount + ' ref' + (usageCount > 1 ? 's' : '') + '</span>';
        } else {
            usageBadgeHtml = '<span class="usage-badge unused">unused</span>';
        }

        // Key cell with ns tag (when showing all)
        var nsTag = activeNs === null ? '<span class="key-ns-tag">' + entry.ns + '</span>' : '';

        html += '<div class="key-row" id="' + rowId + '">';
        html += '<div class="key-cell"><span class="key-path">' + highlightMatch(entry.key) + '</span>' + nsTag + usageBadgeHtml + '</div>';

        // Source value (read-only if source lang)
        var srcVal = getNestedValue(translations[entry.ns][sourceLang] || {}, entry.key);
        var srcStr = typeof srcVal === 'string' ? srcVal : '';
        html += '<div class="key-cell"><textarea class="value-input" data-lang="' + sourceLang + '" data-ns="' + entry.ns + '" data-key="' + entry.key + '" rows="1" spellcheck="false">' + escapeHtml(srcStr) + '</textarea></div>';

        // Target value
        var tgtVal = getNestedValue(translations[entry.ns][targetLang] || {}, entry.key);
        var tgtStr = typeof tgtVal === 'string' ? tgtVal : '';
        var tgtCls = tgtVal === undefined ? ' missing' : tgtVal === '' ? ' empty-val' : '';
        html += '<div class="key-cell"><textarea class="value-input' + tgtCls + '" data-lang="' + targetLang + '" data-ns="' + entry.ns + '" data-key="' + entry.key + '" rows="1" spellcheck="false">' + escapeHtml(tgtStr) + '</textarea></div>';

        // Delete
        // Delete + Translate
        html += '<div class="key-actions">' +
            '<button class="btn-translate-key" data-ns="' + entry.ns + '" data-key="' + entry.key + '" title="Translate with LLM">\u270e</button>' +
            '<button class="btn-delete" data-ns="' + entry.ns + '" data-key="' + entry.key + '" title="Delete key">\ud83d\uddd1</button></div>';
        html += '</div>';

        // Usage context (hidden, toggle on badge click)
        html += '<div class="usage-context" id="ctx-' + rowId + '"></div>';
    }

    if (allEntries.length === 0) {
        html += '<div class="placeholder" style="min-height: 300px"><div class="placeholder-icon">🔍</div>' +
            '<h2>No keys found</h2><p>' +
            (searchQuery ? 'No keys match your search.' : 'This namespace is empty.') +
            '</p></div>';
    }

    area.innerHTML = html;
    updateKeyCount(allEntries.length);

    // Wire textareas
    var inputs = area.querySelectorAll('.value-input');
    for (var ii = 0; ii < inputs.length; ii++) {
        autoResize(inputs[ii]);
        inputs[ii].addEventListener('input', function() {
            autoResize(this);
            saveValue(this.dataset.lang, this.dataset.ns, this.dataset.key, this.value);
        });
    }

    // Wire delete buttons
    var delBtns = area.querySelectorAll('.btn-delete');
    for (var di = 0; di < delBtns.length; di++) {
        delBtns[di].addEventListener('click', function() {
            var ns = this.dataset.ns;
            var key = this.dataset.key;
            if (!confirm('Delete key "' + key + '" from all languages?')) return;
            fetch('/api/delete-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ namespace: ns, key: key }),
            }).then(function() {
                for (var li = 0; li < config.languages.length; li++) {
                    if (translations[ns] && translations[ns][config.languages[li]]) {
                        removeNestedValue(translations[ns][config.languages[li]], key);
                    }
                }
                renderEditor();
                showSaveStatus('saved');
                loadProgress();
            });
        });
    }
    // Wire usage badges
    var badges = area.querySelectorAll('.usage-badge.used');

    // Wire per-key translate buttons
    var trnBtns = area.querySelectorAll('.btn-translate-key');
    for (var ti = 0; ti < trnBtns.length; ti++) {
        trnBtns[ti].addEventListener('click', function() {
            translateSingleKey(this.dataset.ns, this.dataset.key);
        });
    }

    for (var bi = 0; bi < badges.length; bi++) {
        badges[bi].addEventListener('click', function() {
            var ns = this.dataset.ns;
            var key = this.dataset.key;
            var rowId = this.dataset.row;
            var ctxEl = document.getElementById('ctx-' + rowId);
            if (!ctxEl) return;

            if (ctxEl.classList.contains('open')) {
                ctxEl.classList.remove('open');
                return;
            }

            var entries = getUsageEntries(ns, key);
            var ctxHtml = '';
            for (var ui = 0; ui < entries.length; ui++) {
                var u = entries[ui];
                ctxHtml += '<div class="usage-file">' +
                    '<span class="usage-file-path">' + escapeHtml(u.file) + '</span>' +
                    '<span class="usage-file-line"> :' + u.line + '</span>' +
                    '<div class="usage-file-context">' + escapeHtml(u.context) + '</div>' +
                    '</div>';
            }
            ctxEl.innerHTML = ctxHtml;
            ctxEl.classList.add('open');
        });
    }
}

// Helpers
function flattenKeys(obj, prefix) {
    var keys = [];
    if (typeof obj !== 'object' || obj === null) return keys;
    var entries = Object.entries(obj);
    for (var i = 0; i < entries.length; i++) {
        var k = entries[i][0], v = entries[i][1];
        var fullKey = prefix ? prefix + '.' + k : k;
        if (typeof v === 'string' || typeof v === 'number') {
            keys.push(fullKey);
        } else if (typeof v === 'object' && v !== null) {
            keys = keys.concat(flattenKeys(v, fullKey));
        }
    }
    return keys;
}

function getNestedValue(obj, path) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = current[parts[i]];
    }
    return current;
}

function setNestedValue(obj, path, value) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

function removeNestedValue(obj, path) {
    var parts = path.split('.');
    var stack = [];
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
        if (typeof current !== 'object' || current === null) return;
        stack.push({ obj: current, key: parts[i] });
        current = current[parts[i]];
    }
    if (typeof current === 'object' && current !== null) {
        delete current[parts[parts.length - 1]];
        for (var i = stack.length - 1; i >= 0; i--) {
            var parent = stack[i];
            var child = parent.obj[parent.key];
            if (typeof child === 'object' && child !== null && Object.keys(child).length === 0) {
                delete parent.obj[parent.key];
            } else break;
        }
    }
}

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function highlightMatch(text) {
    if (!searchQuery) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var q = escapeHtml(searchQuery);
    var idx = escaped.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escaped;
    return escaped.substring(0, idx) + '<span class="highlight">' + escaped.substring(idx, idx + q.length) + '</span>' + escaped.substring(idx + q.length);
}

function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(36, el.scrollHeight) + 'px';
}

function showSaveStatus(status) {
    var el = document.getElementById('save-status');
    if (status === 'saving') {
        el.textContent = 'Saving...';
        el.className = 'save-status saving';
    } else {
        el.textContent = 'Saved';
        el.className = 'save-status';
        setTimeout(function() { el.textContent = 'Ready'; }, 2000);
    }
}

function updateKeyCount(count) {
    document.getElementById('key-count').textContent = count + ' keys';
}

// Events
function setupEventListeners() {
    var searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function() {
        searchQuery = this.value;
        // Auto-switch to all namespaces when searching
        if (searchQuery && activeNs !== null) {
            selectAllNamespaces();
        } else {
            renderEditor();
        }
    });

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchQuery = '';
            renderEditor();
            searchInput.blur();
        }
    });

    // Language pickers
    document.getElementById('source-lang').addEventListener('change', function() {
        sourceLang = this.value;
        renderEditor();
        savePrefs();
    });

    document.getElementById('target-lang').addEventListener('change', function() {
        targetLang = this.value;
        renderSidebar();
        renderEditor();
        savePrefs();
    });

    // Add language
    document.getElementById('btn-add-lang').addEventListener('click', function() {
        var code = prompt('Enter language code (e.g. es, fr, de, ja):');
        if (!code || !code.trim()) return;
        fetch('/api/add-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code.trim() }),
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.error) { alert(data.error); return; }
            config.languages = data.languages;
            targetLang = code.trim();
            renderLangPicker();
            renderSidebar();
            loadProgress();
            // Reload current namespace
            if (activeNs) {
                translations[activeNs] = null;
                selectNamespace(activeNs);
            }
        });
    });

    // Add key modal
    document.getElementById('btn-add-key').addEventListener('click', openAddKeyModal);
    document.getElementById('modal-close').addEventListener('click', closeAddKeyModal);
    document.getElementById('modal-cancel').addEventListener('click', closeAddKeyModal);
    document.getElementById('modal-save').addEventListener('click', handleAddKey);
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === e.currentTarget) closeAddKeyModal();
    });

    // Bottom toolbar panels
    document.getElementById('btn-translate').addEventListener('click', function() { togglePanel('translate'); });
    document.getElementById('btn-validate').addEventListener('click', function() { togglePanel('validate'); });
}

// Add Key Modal
function openAddKeyModal() {
    var overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Add New Key';
    var nsSelect = document.getElementById('modal-ns');
    var html = '';
    for (var i = 0; i < config.namespaces.length; i++) {
        var ns = config.namespaces[i];
        var sel = (ns === activeNs || (activeNs === null && i === 0)) ? ' selected' : '';
        html += '<option value="' + ns + '"' + sel + '>' + ns + '</option>';
    }
    nsSelect.innerHTML = html;
    nsSelect.parentElement.style.display = '';

    document.getElementById('modal-key').parentElement.style.display = '';
    document.getElementById('modal-key').previousElementSibling.style.display = '';

    var valuesDiv = document.getElementById('modal-values');
    var vhtml = '';
    for (var i = 0; i < config.languages.length; i++) {
        var lang = config.languages[i];
        vhtml += '<label>' + lang + '</label><input type="text" data-lang="' + lang +
            '" placeholder="Translation for ' + lang + '">';
    }
    valuesDiv.innerHTML = vhtml;

    overlay.classList.remove('hidden');
    document.getElementById('modal-key').focus();
}

function closeAddKeyModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-key').value = '';
}

async function handleAddKey() {
    var ns = document.getElementById('modal-ns').value;
    var key = document.getElementById('modal-key').value.trim();
    if (!key) {
        document.getElementById('modal-key').style.borderColor = 'var(--danger)';
        return;
    }

    var values = {};
    var inputs = document.querySelectorAll('#modal-values input');
    for (var i = 0; i < inputs.length; i++) {
        values[inputs[i].dataset.lang] = inputs[i].value;
    }

    await fetch('/api/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namespace: ns, key: key, values: values }),
    });

    await loadNamespace(ns);
    if (activeNs === ns || activeNs === null) renderEditor();
    closeAddKeyModal();
    showSaveStatus('saved');
    loadProgress();
}

// Ollama status
async function checkOllama() {
    try {
        var res = await fetch('/api/ollama-status?host=' + ollamaHost);
        var data = await res.json();
        ollamaOnline = data.online;
        ollamaModels = data.models || [];
        if (ollamaModels.length > 0 && !ollamaModel) {
            ollamaModel = ollamaModels[0];
        }
        renderOllamaStatus();
    } catch(e) {
        ollamaOnline = false;
        renderOllamaStatus();
    }
}

function renderOllamaStatus() {
    var el = document.getElementById('ollama-status');
    if (ollamaOnline) {
        el.innerHTML = '<span class="ollama-dot online"></span> Ollama (' + ollamaModels.length + ' models)';
        el.style.color = 'var(--success)';
    } else {
        el.innerHTML = '<span class="ollama-dot offline"></span> Ollama offline';
        el.style.color = 'var(--text-muted)';
    }
}

// Validation
async function loadValidation() {
    try {
        var res = await fetch('/api/validate');
        var data = await res.json();
        validationIssues = data.issues || [];
        var badge = document.getElementById('validate-badge');
        if (validationIssues.length > 0) {
            badge.textContent = validationIssues.length;
            badge.className = 'toolbar-badge danger';
        } else {
            badge.textContent = '✓';
            badge.className = 'toolbar-badge success';
        }
    } catch(e) { /* ignore */ }
}

// Panels
function togglePanel(panelName) {
    var drawer = document.getElementById('panel-drawer');
    if (activePanel === panelName) {
        activePanel = null;
        drawer.classList.remove('open');
        document.getElementById('btn-translate').classList.remove('active');
        document.getElementById('btn-validate').classList.remove('active');
        return;
    }
    activePanel = panelName;
    drawer.classList.add('open');
    document.getElementById('btn-translate').classList.toggle('active', panelName === 'translate');
    document.getElementById('btn-validate').classList.toggle('active', panelName === 'validate');

    if (panelName === 'translate') renderTranslatePanel();
    if (panelName === 'validate') renderValidatePanel();
}

function renderTranslatePanel() {
    var drawer = document.getElementById('panel-drawer');
    var modelOptions = '';
    for (var i = 0; i < ollamaModels.length; i++) {
        modelOptions += '<option value="' + ollamaModels[i] + '"' + (ollamaModels[i] === ollamaModel ? ' selected' : '') + '>' + ollamaModels[i] + '</option>';
    }

    var html = '<div class="panel-header">' +
        '<h4>🤖 LLM Translation (Ollama)</h4>' +
        '<div class="panel-actions">' +
        '<select id="ollama-model-select">' + modelOptions + '</select>' +
        '<label style="font-size:0.7rem;color:var(--text-muted);display:flex;align-items:center;gap:4px">Batch <input id="ollama-batch-size" type="number" min="1" max="100" value="' + ollamaBatchSize + '" style="width:44px;background:var(--bg-input);border:1px solid var(--border);border-radius:3px;color:var(--text-primary);padding:2px 4px;font-size:0.72rem;font-family:JetBrains Mono,monospace;text-align:center"></label>' +
        '<button class="btn btn-primary" id="btn-translate-empty" style="padding:4px 12px;font-size:0.75rem">Translate Empty</button>' +
        '<button class="btn btn-secondary" id="btn-translate-all" style="padding:4px 12px;font-size:0.75rem">Re-translate All</button>' +
        '<button class="btn-icon" id="btn-close-panel" title="Close" style="width:24px;height:24px;font-size:0.8rem">✕</button>' +
        '</div></div>';

    if (!ollamaOnline) {
        html += '<div style="padding:20px;text-align:center;color:var(--text-muted)">Ollama is not running. Start it with <code style="background:var(--bg-input);padding:2px 6px;border-radius:3px">ollama serve</code></div>';
    } else {
        html += '<div id="translate-status" style="padding:8px 16px;font-size:0.78rem;color:var(--text-secondary)">' +
            'Translate <strong>' + sourceLang + '</strong> → <strong>' + targetLang + '</strong> using <strong>' + ollamaModel + '</strong>. ' +
            'Per-key: use the ✎ button on each row.' +
            '</div>';
    }

    drawer.innerHTML = html;

    // Wire events
    var modelSel = document.getElementById('ollama-model-select');
    if (modelSel) modelSel.addEventListener('change', function() { ollamaModel = this.value; savePrefs(); });

    var batchInput = document.getElementById('ollama-batch-size');
    if (batchInput) batchInput.addEventListener('change', function() {
        var v = parseInt(this.value, 10);
        if (v > 0 && v <= 100) { ollamaBatchSize = v; savePrefs(); }
    });

    var btnEmpty = document.getElementById('btn-translate-empty');
    if (btnEmpty) btnEmpty.addEventListener('click', function() { translateBatch('empty'); });

    var btnAll = document.getElementById('btn-translate-all');
    if (btnAll) btnAll.addEventListener('click', function() { translateBatch('all'); });

    var btnClose = document.getElementById('btn-close-panel');
    if (btnClose) btnClose.addEventListener('click', function() { togglePanel(activePanel); });
}

function setTranslateStatus(msg, thinking) {
    var el = document.getElementById('translate-status');
    if (!el) return;
    var prefix = thinking ? '<span style="display:inline-block;animation:pulse 1.5s ease-in-out infinite">🧠</span> ' : '';
    el.innerHTML = prefix + msg;
}

// Update a single textarea in the editor without re-rendering
function patchTextarea(ns, key, lang, value) {
    var textareas = document.querySelectorAll('textarea[data-ns="' + ns + '"][data-key="' + key + '"][data-lang="' + lang + '"]');
    for (var i = 0; i < textareas.length; i++) {
        textareas[i].value = value;
        textareas[i].classList.remove('missing', 'empty-val');
        textareas[i].style.transition = 'background 0.3s';
        textareas[i].style.background = 'rgba(52, 211, 153, 0.08)';
        (function(ta) {
            setTimeout(function() { ta.style.background = ''; }, 1500);
        })(textareas[i]);
    }
    // Also update in-memory translations
    if (translations[ns] && translations[ns][lang]) {
        setNestedValueLocal(translations[ns][lang], key, value);
    }
}

function setNestedValueLocal(obj, path, value) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
}

// SSE stream reader for translate API
async function streamTranslate(entries, ns, onStatus, onBatch, onDone, onError) {
    var res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            entries: entries,
            sourceLang: sourceLang,
            targetLang: targetLang,
            namespace: ns,
            model: ollamaModel,
            host: ollamaHost,
            batchSize: ollamaBatchSize,
        }),
    });

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';

    while (true) {
        var result = await reader.read();
        if (result.done) break;

        buffer += decoder.decode(result.value, { stream: true });
        var lines = buffer.split(String.fromCharCode(10));
        buffer = lines.pop();

        var currentEvent = '';
        for (var li = 0; li < lines.length; li++) {
            var line = lines[li];
            if (line.startsWith('event: ')) {
                currentEvent = line.slice(7);
            } else if (line.startsWith('data: ')) {
                var data = JSON.parse(line.slice(6));
                if (currentEvent === 'status') onStatus(data);
                else if (currentEvent === 'batch') onBatch(data);
                else if (currentEvent === 'done') onDone(data);
                else if (currentEvent === 'error') onError(data);
                currentEvent = '';
            }
        }
    }
}

async function translateBatch(mode) {
    if (!ollamaOnline || !ollamaModel) { alert('Ollama is not running'); return; }
    if (!activeNs && !confirm('Translate ALL namespaces?')) return;

    var namespacesToTranslate = activeNs ? [activeNs] : config.namespaces;
    var btnEmpty = document.getElementById('btn-translate-empty');
    var btnAll = document.getElementById('btn-translate-all');
    if (btnEmpty) { btnEmpty.disabled = true; btnEmpty.textContent = 'Starting...'; }
    if (btnAll) { btnAll.disabled = true; }

    for (var ni = 0; ni < namespacesToTranslate.length; ni++) {
        var ns = namespacesToTranslate[ni];
        if (!translations[ns]) await loadNamespace(ns);

        var srcData = translations[ns][sourceLang] || {};
        var tgtData = translations[ns][targetLang] || {};
        var srcKeys = flattenKeys(srcData, '');
        var entries = [];

        for (var ki = 0; ki < srcKeys.length; ki++) {
            var key = srcKeys[ki];
            var srcVal = getNestedValue(srcData, key);
            if (typeof srcVal !== 'string' || !srcVal) continue;

            if (mode === 'empty') {
                var tgtVal = getNestedValue(tgtData, key);
                if (typeof tgtVal === 'string' && tgtVal !== '') continue;
            }
            entries.push({ key: key, value: srcVal });
        }

        if (entries.length === 0) {
            setTranslateStatus(ns + ': nothing to translate', false);
            continue;
        }

        var currentNs = ns;
        try {
            await streamTranslate(entries, ns,
                function(data) {
                    setTranslateStatus(data.message, true);
                    if (btnEmpty) btnEmpty.textContent = 'Batch ' + data.batch + '/' + data.totalBatches;
                },
                function(data) {
                    setTranslateStatus('Batch ' + data.batch + '/' + data.totalBatches + ' — applied ' + data.applied + ' keys', false);
                    // Patch textareas in-place
                    for (var tkey in data.translations) {
                        patchTextarea(data.namespace, tkey, targetLang, data.translations[tkey]);
                    }
                },
                function(data) {
                    setTranslateStatus('✓ Done: ' + data.totalApplied + '/' + data.total + ' translations applied', false);
                },
                function(data) {
                    setTranslateStatus('✗ Batch ' + data.batch + ' failed: ' + data.message, false);
                }
            );
        } catch(e) {
            setTranslateStatus('✗ Error: ' + e.message, false);
        }
    }

    loadProgress();
    loadValidation();
    showSaveStatus('saved');
    if (btnEmpty) { btnEmpty.disabled = false; btnEmpty.textContent = 'Translate Empty'; }
    if (btnAll) { btnAll.disabled = false; btnAll.textContent = 'Re-translate All'; }
}

async function translateSingleKey(ns, key) {
    if (!ollamaOnline || !ollamaModel) { alert('Ollama is not running'); return; }
    var srcData = translations[ns] && translations[ns][sourceLang];
    if (!srcData) return;

    var srcVal = getNestedValue(srcData, key);
    if (typeof srcVal !== 'string' || !srcVal) return;

    var btns = document.querySelectorAll('.btn-translate-key[data-ns="' + ns + '"][data-key="' + key + '"]');
    for (var i = 0; i < btns.length; i++) { btns[i].classList.add('translating'); btns[i].textContent = '⏳'; }

    try {
        await streamTranslate([{ key: key, value: srcVal }], ns,
            function() {},
            function(data) {
                for (var tkey in data.translations) {
                    patchTextarea(data.namespace, tkey, targetLang, data.translations[tkey]);
                }
            },
            function() {
                showSaveStatus('saved');
                loadProgress();
            },
            function(data) { alert('Translation failed: ' + data.message); }
        );
    } catch(e) {
        alert('Translation failed: ' + e.message);
    }

    for (var j = 0; j < btns.length; j++) { btns[j].classList.remove('translating'); btns[j].textContent = '✎'; }
}

// Validation panel
function renderValidatePanel() {
    var drawer = document.getElementById('panel-drawer');
    var html = '<div class="panel-header">' +
        '<h4>⚡ Validation (' + validationIssues.length + ' issues)</h4>' +
        '<div class="panel-actions">' +
        '<button class="btn btn-secondary" id="btn-refresh-validation" style="padding:4px 12px;font-size:0.75rem">↻ Refresh</button>' +
        '<button class="btn-icon" id="btn-close-panel2" title="Close" style="width:24px;height:24px;font-size:0.8rem">✕</button>' +
        '</div></div>';

    if (validationIssues.length === 0) {
        html += '<div style="padding:20px;text-align:center;color:var(--success)">✓ All translations are valid</div>';
    } else {
        html += '<div class="issue-row" style="font-weight:600;color:var(--text-muted);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em">' +
            '<div>Type</div><div>Language</div><div>Namespace</div><div>Key</div><div></div></div>';
        for (var i = 0; i < validationIssues.length; i++) {
            var issue = validationIssues[i];
            html += '<div class="issue-row">' +
                '<div><span class="issue-type ' + issue.type + '">' + issue.type + '</span></div>' +
                '<div style="font-family:JetBrains Mono,monospace;font-size:0.72rem">' + issue.lang + '</div>' +
                '<div style="font-family:JetBrains Mono,monospace;font-size:0.72rem">' + issue.namespace + '</div>' +
                '<div class="issue-key">' + issue.key + '</div>' +
                '<div><button class="issue-action-btn" data-ns="' + issue.namespace + '" data-key="' + issue.key + '" data-lang="' + issue.lang + '">Go to key</button></div>' +
                '</div>';
        }
    }

    drawer.innerHTML = html;

    var btnRefresh = document.getElementById('btn-refresh-validation');
    if (btnRefresh) btnRefresh.addEventListener('click', function() {
        loadValidation().then(function() { renderValidatePanel(); });
    });

    var btnClose = document.getElementById('btn-close-panel2');
    if (btnClose) btnClose.addEventListener('click', function() { togglePanel(activePanel); });

    // Wire Go-to-key buttons
    var goButtons = drawer.querySelectorAll('.issue-action-btn');
    for (var j = 0; j < goButtons.length; j++) {
        goButtons[j].addEventListener('click', function() {
            var ns = this.dataset.ns;
            var lang = this.dataset.lang;
            targetLang = lang;
            document.getElementById('target-lang').value = lang;
            selectNamespace(ns);
            togglePanel('validate');
        });
    }
}

// Source/target quick-set on progress bars
function setSourceLang(lang) {
    sourceLang = lang;
    document.getElementById('source-lang').value = lang;
    renderProgress();
    renderEditor();
    savePrefs();
}

function setTargetLang(lang) {
    targetLang = lang;
    document.getElementById('target-lang').value = lang;
    renderSidebar();
    renderEditor();
    savePrefs();
}

// Boot
init();
`;
