// ─── Editor HTML Body ───────────────────────────────────────
// Extracted from editor-ui.ts — the HTML structure of the editor UI.

export const HTML_BODY = /* html */ `
<div id="app">
  <header id="header">
    <div class="header-left">
      <span class="logo"><i data-lucide="globe" style="width:16px;height:16px;vertical-align:middle;margin-right:2px"></i> <strong>ATS</strong> Editor</span>
      <span id="project-path" class="project-path"></span>
    </div>
    <div class="header-center">
      <div class="search-box">
        <span class="search-icon"><i data-lucide="search"></i></span>
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
            <div id="source-lang" class="custom-select">
              <button type="button" class="custom-select-trigger">
                <span class="custom-select-label"></span>
                <span class="custom-select-chevron"><i data-lucide="chevron-down"></i></span>
              </button>
              <div class="custom-select-options"></div>
            </div>
          </div>
          <div class="lang-picker-row">
            <label>Target</label>
            <div id="target-lang" class="custom-select">
              <button type="button" class="custom-select-trigger">
                <span class="custom-select-label"></span>
                <span class="custom-select-chevron"><i data-lucide="chevron-down"></i></span>
              </button>
              <div class="custom-select-options"></div>
            </div>
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
        <button id="btn-add-key" class="btn-icon" title="Add new key"><i data-lucide="plus" style="width:16px;height:16px"></i></button>
      </div>
      <ul id="ns-list" class="ns-list"></ul>
    </aside>

    <main id="main">
      <div id="config-warnings" class="config-warnings" style="display:none"></div>
      <div id="editor-area" class="editor-area">
        <div id="placeholder" class="placeholder">
          <div class="placeholder-icon"><i data-lucide="package" style="width:40px;height:40px;stroke-width:1.5"></i></div>
          <h2>Select a namespace</h2>
          <p>Choose a namespace from the sidebar to start editing translations.</p>
        </div>
      </div>

      <!-- Panel drawer (LLM / Validation) -->
      <div id="panel-drawer" class="panel-drawer"></div>

      <!-- Bottom toolbar -->
      <div class="bottom-toolbar">
        <button id="btn-translate" class="toolbar-btn"><i data-lucide="languages" style="width:14px;height:14px"></i> Translate</button>
        <button id="btn-validate" class="toolbar-btn"><i data-lucide="shield-check" style="width:14px;height:14px"></i> Validate <span id="validate-badge" class="toolbar-badge"></span></button>
        <button id="btn-scan" class="toolbar-btn"><i data-lucide="scan-search" style="width:14px;height:14px"></i> Scan <span id="scan-badge" class="toolbar-badge"></span></button>
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
      <button id="modal-close" class="btn-icon"><i data-lucide="x" style="width:14px;height:14px"></i></button>
    </div>
    <div class="modal-body" id="modal-body-content">
      <label>Namespace</label>
      <div id="modal-ns" class="custom-select">
        <button type="button" class="custom-select-trigger">
          <span class="custom-select-label"></span>
          <span class="custom-select-chevron"><i data-lucide="chevron-down"></i></span>
        </button>
        <div class="custom-select-options"></div>
      </div>
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
