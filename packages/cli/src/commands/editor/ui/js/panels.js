// ─── Panel Renderers (ESM) ──────────────────────────────────

import * as S from './state.js';
import { escapeHtml, escapeAttr, showSaveStatus } from './helpers.js';
import { loadValidation, loadScan } from './api.js';
import { translateBatch, checkProvider } from './llm.js';
import { selectNamespace, renderEditor, renderSidebar } from './render.js';

export function togglePanel(panelName) {
    var drawer = document.getElementById('panel-drawer');
    if (S.activePanel === panelName) {
        S.setActivePanel(null);
        drawer.classList.remove('open');
        document.getElementById('btn-translate').classList.remove('active');
        document.getElementById('btn-validate').classList.remove('active');
        document.getElementById('btn-scan').classList.remove('active');
        return;
    }
    S.setActivePanel(panelName);
    drawer.classList.add('open');
    document.getElementById('btn-translate').classList.toggle('active', panelName === 'translate');
    document.getElementById('btn-validate').classList.toggle('active', panelName === 'validate');
    document.getElementById('btn-scan').classList.toggle('active', panelName === 'scan');

    if (panelName === 'translate') renderTranslatePanel();
    if (panelName === 'validate') renderValidatePanel();
    if (panelName === 'scan') renderScanPanel();
}

var PROVIDERS = [
    { id: 'ollama', label: 'Ollama', icon: 'hard-drive' },
    { id: 'openai', label: 'OpenAI', icon: 'cloud' },
    { id: 'gemini', label: 'Gemini', icon: 'sparkles' },
];

export function renderTranslatePanel() {
    var drawer = document.getElementById('panel-drawer');
    var modelOptions = '';
    for (var i = 0; i < S.llmModels.length; i++) {
        modelOptions += '<option value="' + S.llmModels[i] + '"' + (S.llmModels[i] === S.llmModel ? ' selected' : '') + '>' + S.llmModels[i] + '</option>';
    }

    // ── Header ──────────────────────────────────────────────
    var html = '<div class="panel-header">' +
        '<h4><i data-lucide="languages" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> LLM Translation</h4>' +
        '<div class="panel-actions">' +
        '<button class="btn btn-primary" id="btn-translate-empty" style="padding:4px 12px;font-size:0.75rem"' + (!S.llmOnline ? ' disabled' : '') + '>Translate Empty</button>' +
        '<button class="btn btn-secondary" id="btn-translate-all" style="padding:4px 12px;font-size:0.75rem"' + (!S.llmOnline ? ' disabled' : '') + '>Re-translate All</button>' +
        '<button class="btn-icon" id="btn-close-panel" title="Close" style="width:24px;height:24px;font-size:0.8rem"><i data-lucide="x" style="width:12px;height:12px"></i></button>' +
        '</div></div>';

    // ── Provider Tabs ───────────────────────────────────────
    html += '<div class="llm-provider-tabs">';
    for (var pi = 0; pi < PROVIDERS.length; pi++) {
        var p = PROVIDERS[pi];
        var isActive = S.llmProvider === p.id;
        html += '<button class="llm-provider-tab' + (isActive ? ' active' : '') + '" data-provider="' + p.id + '">' +
            '<i data-lucide="' + p.icon + '" style="width:13px;height:13px"></i> ' + p.label + '</button>';
    }
    html += '</div>';

    // ── Provider Config ─────────────────────────────────────
    html += '<div class="llm-config-section">';
    var cfg = S.llmConfig[S.llmProvider] || {};

    if (S.llmProvider === 'ollama') {
        html += '<div class="llm-config-row">' +
            '<label>Host</label>' +
            '<input type="text" id="llm-host" value="' + escapeAttr(cfg.host || 'localhost:11434') + '" placeholder="localhost:11434">' +
            '</div>';
    } else if (S.llmProvider === 'openai') {
        html += '<div class="llm-config-row">' +
            '<label>Base URL</label>' +
            '<input type="text" id="llm-base-url" value="' + escapeAttr(cfg.baseUrl || 'https://api.openai.com') + '" placeholder="https://api.openai.com">' +
            '</div>';
        html += '<div class="llm-config-row">' +
            '<label>API Key</label>' +
            '<input type="password" id="llm-api-key" value="' + escapeAttr(cfg.apiKey || '') + '" placeholder="sk-...">' +
            '</div>';
    } else if (S.llmProvider === 'gemini') {
        html += '<div class="llm-config-row">' +
            '<label>API Key</label>' +
            '<input type="password" id="llm-api-key" value="' + escapeAttr(cfg.apiKey || '') + '" placeholder="AIza...">' +
            '</div>';
    }

    // API key warning for cloud providers
    if (S.llmProvider !== 'ollama') {
        html += '<div class="llm-key-notice">' +
            '<i data-lucide="shield" style="width:11px;height:11px;vertical-align:middle;margin-right:3px"></i>' +
            'Keys are stored locally in your browser and only sent to the provider API. Never use on shared machines.' +
            '</div>';
    }

    // Model + status row
    html += '<div class="llm-config-row">' +
        '<label>Model</label>' +
        '<div style="display:flex;gap:6px;align-items:center;flex:1">' +
        '<select id="llm-model-select" style="flex:1">' + (modelOptions || '<option value="">—</option>') + '</select>' +
        '<button class="btn btn-secondary" id="btn-llm-connect" style="padding:3px 10px;font-size:0.72rem;white-space:nowrap">' +
        '<i data-lucide="refresh-cw" style="width:11px;height:11px;vertical-align:middle;margin-right:2px"></i> Connect</button>' +
        '<span id="llm-status-dot" class="llm-dot ' + (S.llmOnline ? 'online' : 'offline') + '"></span>' +
        '</div></div>';

    // Batch size
    html += '<div class="llm-config-row">' +
        '<label>Batch size</label>' +
        '<input type="number" id="llm-batch-size" min="1" max="100" value="' + S.llmBatchSize + '" style="width:60px">' +
        '</div>';

    html += '</div>';  // close llm-config-section

    // ── Status area ─────────────────────────────────────────
    if (S.llmOnline) {
        html += '<div id="translate-status" style="padding:8px 16px;font-size:0.78rem;color:var(--text-secondary)">' +
            'Translate <strong>' + S.sourceLang + '</strong> → <strong>' + S.targetLang + '</strong> using <strong>' + S.llmModel + '</strong>. ' +
            'Per-key: use the <i data-lucide="pen-line" style="width:11px;height:11px;vertical-align:middle"></i> button on each row.' +
            '</div>';
    } else {
        html += '<div id="translate-status" style="padding:8px 16px;font-size:0.78rem;color:var(--text-muted)">' +
            'Configure your provider and click <strong>Connect</strong> to get started.' +
            '</div>';
    }

    drawer.innerHTML = html;

    // ── Wire Events ─────────────────────────────────────────

    // Provider tabs
    var tabs = drawer.querySelectorAll('.llm-provider-tab');
    for (var ti = 0; ti < tabs.length; ti++) {
        tabs[ti].addEventListener('click', function() {
            S.setLLMProvider(this.dataset.provider);
            S.setLLMOnline(false);
            S.setLLMModels([]);
            S.setLLMModel('');
            S.savePrefs();
            renderTranslatePanel();
            checkProvider();
        });
    }

    // Connect button
    var btnConnect = document.getElementById('btn-llm-connect');
    if (btnConnect) btnConnect.addEventListener('click', function() {
        // Save current config first
        saveCurrentConfig();
        checkProvider().then(function() {
            renderTranslatePanel(); // re-render with updated status
        });
    });

    // Model selector
    var modelSel = document.getElementById('llm-model-select');
    if (modelSel) modelSel.addEventListener('change', function() { S.setLLMModel(this.value); S.savePrefs(); });

    // Batch size
    var batchInput = document.getElementById('llm-batch-size');
    if (batchInput) batchInput.addEventListener('change', function() {
        var v = parseInt(this.value, 10);
        if (v > 0 && v <= 100) { S.setLLMBatchSize(v); S.savePrefs(); }
    });

    // Config inputs — save on change
    var hostInput = document.getElementById('llm-host');
    if (hostInput) hostInput.addEventListener('change', function() {
        S.setLLMConfig('ollama', 'host', this.value);
        S.savePrefs();
    });

    var baseUrlInput = document.getElementById('llm-base-url');
    if (baseUrlInput) baseUrlInput.addEventListener('change', function() {
        S.setLLMConfig('openai', 'baseUrl', this.value);
        S.savePrefs();
    });

    var apiKeyInput = document.getElementById('llm-api-key');
    if (apiKeyInput) apiKeyInput.addEventListener('change', function() {
        S.setLLMConfig(S.llmProvider, 'apiKey', this.value);
        S.savePrefs();
    });

    // Translate buttons
    var btnEmpty = document.getElementById('btn-translate-empty');
    if (btnEmpty) btnEmpty.addEventListener('click', function() { translateBatch('empty'); });

    var btnAll = document.getElementById('btn-translate-all');
    if (btnAll) btnAll.addEventListener('click', function() { translateBatch('all'); });

    var btnClose = document.getElementById('btn-close-panel');
    if (btnClose) btnClose.addEventListener('click', function() { togglePanel(S.activePanel); });

    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}

function saveCurrentConfig() {
    var hostInput = document.getElementById('llm-host');
    if (hostInput) S.setLLMConfig('ollama', 'host', hostInput.value);

    var baseUrlInput = document.getElementById('llm-base-url');
    if (baseUrlInput) S.setLLMConfig('openai', 'baseUrl', baseUrlInput.value);

    var apiKeyInput = document.getElementById('llm-api-key');
    if (apiKeyInput) S.setLLMConfig(S.llmProvider, 'apiKey', apiKeyInput.value);

    S.savePrefs();
}

export function renderValidatePanel() {
    var drawer = document.getElementById('panel-drawer');
    var html = '<div class="panel-header">' +
        '<h4><i data-lucide="shield-check" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> Validation (' + S.validationIssues.length + ' issues)</h4>' +
        '<div class="panel-actions">' +
        '<button class="btn btn-secondary" id="btn-refresh-validation" style="padding:4px 12px;font-size:0.75rem"><i data-lucide="refresh-cw" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> Refresh</button>' +
        '<button class="btn-icon" id="btn-close-panel2" title="Close" style="width:24px;height:24px;font-size:0.8rem"><i data-lucide="x" style="width:12px;height:12px"></i></button>' +
        '</div></div>';

    if (S.validationIssues.length === 0) {
        html += '<div style="padding:20px;text-align:center;color:var(--success)">✓ All translations are valid</div>';
    } else {
        html += '<div class="issue-row" style="font-weight:600;color:var(--text-muted);font-size:0.68rem;text-transform:uppercase;letter-spacing:0.06em">' +
            '<div>Type</div><div>Language</div><div>Namespace</div><div>Key</div><div></div></div>';
        for (var i = 0; i < S.validationIssues.length; i++) {
            var issue = S.validationIssues[i];
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
    if (btnClose) btnClose.addEventListener('click', function() { togglePanel(S.activePanel); });

    // Wire Go-to-key buttons
    var goButtons = drawer.querySelectorAll('.issue-action-btn');
    for (var j = 0; j < goButtons.length; j++) {
        goButtons[j].addEventListener('click', function() {
            var ns = this.dataset.ns;
            var lang = this.dataset.lang;
            S.setTargetLang(lang);
            var tgtSel = document.getElementById('target-lang');
            var opts = [];
            for (var li = 0; li < S.config.languages.length; li++) {
                opts.push({ value: S.config.languages[li], label: S.config.languages[li] });
            }
            setOptions(tgtSel, opts, lang);
            selectNamespace(ns);
            togglePanel('validate');
        });
    }

    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}

export function renderScanPanel() {
    var drawer = document.getElementById('panel-drawer');
    var count = S.scanResults ? S.scanResults.totalCandidates : 0;
    var html = '<div class="panel-header">' +
        '<h4><i data-lucide="scan-search" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"></i> Hardcoded String Scanner (' + count + ' candidates)</h4>' +
        '<div class="panel-actions">' +
        '<button class="btn btn-secondary" id="btn-export-scan" style="padding:4px 12px;font-size:0.75rem"><i data-lucide="download" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> Export JSON</button>' +
        '<button class="btn btn-secondary" id="btn-refresh-scan" style="padding:4px 12px;font-size:0.75rem"><i data-lucide="refresh-cw" style="width:12px;height:12px;vertical-align:middle;margin-right:2px"></i> Rescan</button>' +
        '<button class="btn-icon" id="btn-close-panel3" title="Close" style="width:24px;height:24px;font-size:0.8rem"><i data-lucide="x" style="width:12px;height:12px"></i></button>' +
        '</div></div>';

    if (!S.scanResults || S.scanResults.totalCandidates === 0) {
        html += '<div style="padding:20px;text-align:center;color:var(--success)">✓ No hardcoded strings found — looking good!</div>';
    } else {
        // Group by file
        var byFile = {};
        for (var i = 0; i < S.scanResults.candidates.length; i++) {
            var c = S.scanResults.candidates[i];
            if (!byFile[c.file]) byFile[c.file] = [];
            byFile[c.file].push(c);
        }

        var fileIdx = 0;
        for (var file in byFile) {
            var items = byFile[file];
            html += '<div class="scan-file-header" data-file-idx="' + fileIdx + '" style="cursor:pointer">' +
                '<span class="scan-file-toggle" id="toggle-' + fileIdx + '">▼</span> <i data-lucide="file-text" style="width:12px;height:12px;vertical-align:middle"></i> ' + file +
                ' <span class="scan-file-count">(' + items.length + ')</span></div>';
            html += '<div class="scan-file-body" id="file-body-' + fileIdx + '">';
            for (var j = 0; j < items.length; j++) {
                var item = items[j];
                var scoreMax = 8;
                var filled = Math.min(item.score, scoreMax);
                var barHtml = '<div class="scan-score-bar">';
                for (var k = 0; k < scoreMax; k++) {
                    barHtml += '<div class="' + (k < filled ? 'filled' : 'empty') + '"></div>';
                }
                barHtml += '</div>';

                var truncText = item.text.length > 55 ? item.text.substring(0, 52) + '...' : item.text;
                var reasonsHtml = '';
                for (var r = 0; r < item.reasons.length; r++) {
                    reasonsHtml += '<span class="scan-reason-tag">' + item.reasons[r] + '</span>';
                }

                var rowId = 'scan-ctx-' + fileIdx + '-' + j;
                html += '<div class="scan-row" data-file="' + escapeAttr(item.file) + '" data-line="' + item.line + '" data-ctx-id="' + rowId + '" style="cursor:pointer">' +
                    '<div>' + barHtml + '</div>' +
                    '<div><div class="scan-text" title="' + escapeAttr(item.text) + '">' + escapeHtml(truncText) + '</div>' +
                    '<div class="scan-reasons">' + reasonsHtml + '</div></div>' +
                    '<div class="scan-element">&lt;' + item.element + '&gt; L' + item.line + '</div>' +
                    '<div></div>' +
                    '</div>';
                html += '<div class="scan-context" id="' + rowId + '"></div>';
            }
            html += '</div>';
            fileIdx++;
        }
    }

    drawer.innerHTML = html;

    // Wire refresh
    var btnRefresh = document.getElementById('btn-refresh-scan');
    if (btnRefresh) btnRefresh.addEventListener('click', function() {
        loadScan().then(function() { renderScanPanel(); });
    });

    // Wire close
    var btnClose = document.getElementById('btn-close-panel3');
    if (btnClose) btnClose.addEventListener('click', function() { togglePanel(S.activePanel); });

    // Wire export
    var btnExport = document.getElementById('btn-export-scan');
    if (btnExport) btnExport.addEventListener('click', function() {
        var a = document.createElement('a');
        a.href = '/api/scan/export';
        a.download = 'scan-report.json';
        a.click();
    });

    // Wire file header collapse
    var fileHeaders = drawer.querySelectorAll('.scan-file-header');
    for (var fi = 0; fi < fileHeaders.length; fi++) {
        fileHeaders[fi].addEventListener('click', function() {
            var idx = this.dataset.fileIdx;
            var body = document.getElementById('file-body-' + idx);
            var toggle = document.getElementById('toggle-' + idx);
            if (body.style.display === 'none') {
                body.style.display = '';
                toggle.textContent = '▼';
            } else {
                body.style.display = 'none';
                toggle.textContent = '▶';
            }
        });
    }

    // Wire expandable scan rows — click to load context
    var scanRows = drawer.querySelectorAll('.scan-row[data-file]');
    for (var si = 0; si < scanRows.length; si++) {
        scanRows[si].addEventListener('click', function(e) {
            e.stopPropagation();
            var ctxId = this.dataset.ctxId;
            var ctxEl = document.getElementById(ctxId);
            if (!ctxEl) return;

            if (ctxEl.classList.contains('open')) {
                ctxEl.classList.remove('open');
                ctxEl.innerHTML = '';
                return;
            }

            var file = this.dataset.file;
            var line = this.dataset.line;
            ctxEl.innerHTML = '<div style="padding:8px 16px;color:var(--text-muted);font-size:0.72rem">Loading...</div>';
            ctxEl.classList.add('open');

            fetch('/api/scan/context?file=' + encodeURIComponent(file) + '&line=' + line + '&radius=5')
                .then(function(res) { return res.json(); })
                .then(function(data) {
                    var ctxHtml = '<div class="scan-context-code">';
                    for (var ci = 0; ci < data.context.length; ci++) {
                        var cl = data.context[ci];
                        var cls = cl.highlight ? ' scan-line-highlight' : '';
                        ctxHtml += '<div class="scan-context-line' + cls + '">' +
                            '<span class="scan-line-num">' + cl.line + '</span>' +
                            '<span class="scan-line-text">' + escapeHtml(cl.text) + '</span>' +
                            '</div>';
                    }
                    ctxHtml += '</div>';
                    ctxEl.innerHTML = ctxHtml;
                })
                .catch(function() {
                    ctxEl.innerHTML = '<div style="padding:8px 16px;color:var(--danger);font-size:0.72rem">Failed to load context</div>';
                });
        });
    }

    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}
