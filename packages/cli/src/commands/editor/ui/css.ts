// ─── Editor CSS ─────────────────────────────────────────────
// Extracted from editor-ui.ts — all CSS for the Translation Editor UI.

export const CSS = /* css */ `
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
.search-icon { font-size: 0.8rem; display: flex; align-items: center; }
.search-icon svg { width: 14px; height: 14px; stroke: var(--text-muted); }

/* Lucide icon utilities */
.lucide-icon { display: inline-flex; align-items: center; vertical-align: middle; }
.lucide-icon svg { stroke: currentColor; }
.icon-sm svg { width: 14px; height: 14px; }
.icon-md svg { width: 16px; height: 16px; }
.icon-lg svg { width: 20px; height: 20px; }
.icon-xl svg { width: 40px; height: 40px; stroke-width: 1.5; }

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

.progress-separator {
  height: 1px;
  background: var(--border);
  margin: 6px 0;
}

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
.toolbar-badge.info { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }

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

/* LLM Provider Tabs */
.llm-provider-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 16px 0;
  border-bottom: 1px solid var(--border);
}

.llm-provider-tab {
  background: transparent;
  border: 1px solid transparent;
  border-bottom: none;
  color: var(--text-muted);
  padding: 6px 14px;
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  margin-bottom: -1px;
}

.llm-provider-tab:hover { color: var(--text-primary); background: var(--bg-hover); }
.llm-provider-tab.active {
  color: var(--accent);
  background: var(--bg-card);
  border-color: var(--border);
  border-bottom-color: var(--bg-card);
}

/* LLM Config Section */
.llm-config-section {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid var(--border);
}

.llm-config-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.llm-config-row label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  min-width: 70px;
  text-align: right;
  flex-shrink: 0;
}

.llm-config-row input[type="text"],
.llm-config-row input[type="password"],
.llm-config-row input[type="number"] {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 10px;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  outline: none;
  flex: 1;
  transition: border-color 0.15s;
}

.llm-config-row input:focus { border-color: var(--accent); }

.llm-config-row select {
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 5px 8px;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  outline: none;
}

.llm-config-row select:focus { border-color: var(--accent); }

/* LLM Status Dot (inline) */
.llm-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.llm-dot.online { background: var(--success); box-shadow: 0 0 4px var(--success); }
.llm-dot.offline { background: var(--danger); }

/* API Key Privacy Notice */
.llm-key-notice {
  font-size: 0.68rem;
  color: var(--text-muted);
  padding: 6px 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid rgba(251, 191, 36, 0.15);
  border-radius: var(--radius-sm);
  line-height: 1.4;
}

/* Config warnings banner */
.config-warnings {
  padding: 8px 16px;
  background: var(--bg-sidebar);
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.config-warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  color: var(--text-secondary);
}

.config-warning-item.error { color: var(--danger); }
.config-warning-item.warning { color: #f59e0b; }

/* Panel drawer */
.panel-drawer {
  display: none;
  background: var(--bg-card);
  border-top: 1px solid var(--border);
  max-height: 50vh;
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

/* Scan results */
.scan-row {
  display: grid;
  grid-template-columns: 50px 1fr 80px 120px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.75rem;
  align-items: center;
  gap: 8px;
}

.scan-row:hover { background: rgba(139, 92, 246, 0.03); }

.scan-score-bar {
  display: flex;
  gap: 1px;
  align-items: center;
}

.scan-score-bar .filled {
  width: 5px;
  height: 12px;
  border-radius: 1px;
  background: var(--accent);
}

.scan-score-bar .empty {
  width: 5px;
  height: 12px;
  border-radius: 1px;
  background: var(--border);
}

.scan-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scan-element {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-muted);
}

.scan-reasons {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}

.scan-reason-tag {
  font-size: 0.58rem;
  padding: 0 4px;
  border-radius: 3px;
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border);
  font-family: 'JetBrains Mono', monospace;
}

.scan-file-header {
  padding: 8px 16px 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--accent);
  font-family: 'JetBrains Mono', monospace;
  border-bottom: 1px solid var(--border);
  background: var(--bg-sidebar);
  display: flex;
  align-items: center;
  gap: 6px;
}

.scan-file-count {
  font-size: 0.62rem;
  color: var(--text-muted);
  font-weight: 400;
}

.scan-file-toggle {
  font-size: 0.6rem;
  color: var(--text-muted);
  transition: transform 0.15s;
}

.scan-context {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.2s ease;
}

.scan-context.open {
  max-height: 600px;
  overflow-y: auto;
}

.scan-context-code {
  margin: 0 16px 8px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.68rem;
  overflow-x: auto;
}

.scan-context-line {
  display: flex;
  line-height: 1.6;
  padding: 0 12px;
}

.scan-context-line:first-child { padding-top: 4px; }
.scan-context-line:last-child { padding-bottom: 4px; }

.scan-line-highlight {
  background: rgba(139, 92, 246, 0.12);
  border-left: 3px solid var(--accent);
  padding-left: 9px;
}

.scan-line-num {
  color: var(--text-muted);
  min-width: 36px;
  text-align: right;
  padding-right: 12px;
  user-select: none;
  opacity: 0.6;
}

.scan-line-text {
  white-space: pre;
  color: var(--text-secondary);
}

.scan-line-highlight .scan-line-text {
  color: var(--text-primary);
}

/* Custom Dropdown */
.custom-select {
  position: relative;
  flex: 1;
  min-width: 0;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 4px 8px;
  font-size: 0.82rem;
  font-family: 'JetBrains Mono', monospace;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
  outline: none;
  min-height: 28px;
}

.custom-select-trigger:hover { border-color: var(--text-muted); }
.custom-select.open .custom-select-trigger { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent-dim); }

.custom-select-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-select-chevron {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--text-muted);
}

.custom-select-chevron svg { width: 12px; height: 12px; }
.custom-select.open .custom-select-chevron { transform: rotate(180deg); color: var(--accent); }

.custom-select-options {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 50;
  max-height: 200px;
  overflow-y: auto;
  padding: 4px;
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.custom-select.open .custom-select-options {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

.custom-select-option {
  padding: 6px 10px;
  font-size: 0.8rem;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-select-option:hover,
.custom-select-option.focused {
  background: var(--accent-dim);
  color: var(--text-primary);
}

.custom-select-option.selected {
  color: var(--accent);
  font-weight: 500;
}

.custom-select-option.selected::after {
  content: '✓';
  float: right;
  font-size: 0.7rem;
  margin-left: 8px;
}

/* Modal custom-select needs higher z-index */
.modal .custom-select-options { z-index: 110; }
`;
