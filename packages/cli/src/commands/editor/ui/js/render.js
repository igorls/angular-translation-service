// ─── Render Functions (ESM) ─────────────────────────────────

import * as S from './state.js';
import { loadNamespace, loadAllNamespaces, saveValue, getUsageCount, getUsageEntries, loadProgress } from './api.js';
import { flattenKeys, getNestedValue, escapeHtml, highlightMatch, autoResize, showSaveStatus, updateKeyCount } from './helpers.js';
import { translateSingleKey } from './llm.js';
import { setOptions } from './dropdown.js';

// Namespace selection
export async function selectNamespace(ns) {
    S.setActiveNs(ns);
    updateActiveNsUI();
    if (!S.translations[ns]) await loadNamespace(ns);
    renderEditor();
}

export async function selectAllNamespaces() {
    S.setActiveNs(null);
    updateActiveNsUI();
    await loadAllNamespaces();
    renderEditor();
}

function updateActiveNsUI() {
    var items = document.querySelectorAll('.ns-item');
    for (var i = 0; i < items.length; i++) {
        var ns = items[i].dataset.ns;
        if (S.activeNs === null) {
            items[i].classList.toggle('active', ns === '__all__');
        } else {
            items[i].classList.toggle('active', ns === S.activeNs);
        }
    }
}

// Language picker
export function renderLangPicker() {
    var srcSel = document.getElementById('source-lang');
    var tgtSel = document.getElementById('target-lang');
    var options = [];
    for (var i = 0; i < S.config.languages.length; i++) {
        var lang = S.config.languages[i];
        options.push({ value: lang, label: lang });
    }
    setOptions(srcSel, options, S.sourceLang);
    setOptions(tgtSel, options, S.targetLang);
}

// Progress bars
export function renderProgress() {
    var container = document.getElementById('progress-bars');
    if (!S.progress) { container.innerHTML = ''; return; }

    var html = '';
    // Sort so default language appears first
    var sortedLangs = S.config.languages.slice().sort(function(a, b) {
        if (a === S.progress.defaultLang) return -1;
        if (b === S.progress.defaultLang) return 1;
        return 0;
    });
    for (var i = 0; i < sortedLangs.length; i++) {
        var lang = sortedLangs[i];
        var p = S.progress.progress[lang];
        if (!p) continue;
        var pct = p.percentage;
        var color = pct >= 100 ? 'var(--success)' : pct >= 70 ? 'var(--warning)' : 'var(--danger)';
        var isDefault = lang === S.progress.defaultLang;
        var isSrc = lang === S.sourceLang;
        var isTgt = lang === S.targetLang;
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
        // Add separator after default language
        if (isDefault && sortedLangs.length > 1) {
            html += '<div class="progress-separator"></div>';
        }
    }
    container.innerHTML = html;

    // Wire SRC/TGT buttons
    var srcBtns = container.querySelectorAll('[data-action="set-src"]');
    for (var si = 0; si < srcBtns.length; si++) {
        srcBtns[si].addEventListener('click', function() { setSourceLangUI(this.dataset.lang); });
    }
    var tgtBtns = container.querySelectorAll('[data-action="set-tgt"]');
    for (var ti = 0; ti < tgtBtns.length; ti++) {
        tgtBtns[ti].addEventListener('click', function() { setTargetLangUI(this.dataset.lang); });
    }
}

// Source/target quick-set on progress bars
export function setSourceLangUI(lang) {
    S.setSourceLang(lang);
    var srcSel = document.getElementById('source-lang');
    var options = [];
    for (var i = 0; i < S.config.languages.length; i++) {
        options.push({ value: S.config.languages[i], label: S.config.languages[i] });
    }
    setOptions(srcSel, options, lang);
    renderProgress();
    renderEditor();
    S.savePrefs();
}

export function setTargetLangUI(lang) {
    S.setTargetLang(lang);
    var tgtSel = document.getElementById('target-lang');
    var options = [];
    for (var i = 0; i < S.config.languages.length; i++) {
        options.push({ value: S.config.languages[i], label: S.config.languages[i] });
    }
    setOptions(tgtSel, options, lang);
    renderProgress();
    renderSidebar();
    renderEditor();
    S.savePrefs();
}

// Config warnings
export function renderConfigWarnings() {
    var el = document.getElementById('config-warnings');
    if (!S.config.configWarnings || S.config.configWarnings.length === 0) {
        el.style.display = 'none';
        return;
    }
    var html = '';
    for (var i = 0; i < S.config.configWarnings.length; i++) {
        var w = S.config.configWarnings[i];
        html += '<div class="config-warning-item ' + w.type + '">' +
            (w.type === 'error' ? '⛔ ' : '⚠️ ') + w.message + '</div>';
    }
    el.innerHTML = html;
    el.style.display = '';
}

// LLM status rendering
export function renderLLMStatus() {
    var el = document.getElementById('ollama-status');
    if (!el) return;
    var providerName = S.llmProvider.charAt(0).toUpperCase() + S.llmProvider.slice(1);
    if (S.llmOnline) {
        el.innerHTML = '<span class="ollama-dot online"></span> ' + providerName + ' (' + S.llmModels.length + ' models)';
        el.style.color = 'var(--success)';
    } else {
        el.innerHTML = '<span class="ollama-dot offline"></span> ' + providerName + ' offline';
        el.style.color = 'var(--text-muted)';
    }
}

// Sidebar
export function renderSidebar() {
    var list = document.getElementById('ns-list');
    var html = '';

    // "All namespaces" option for global search
    html += '<li class="ns-item ns-all' + (S.activeNs === null ? ' active' : '') + '" data-ns="__all__">' +
        '<div class="ns-item-top"><div class="ns-name">All Namespaces</div>' +
        '<span class="ns-badge" style="background: var(--bg-input); color: var(--text-muted)">' +
        S.config.namespaces.length + '</span></div></li>';

    for (var i = 0; i < S.config.namespaces.length; i++) {
        var ns = S.config.namespaces[i];
        var isActive = ns === S.activeNs ? ' active' : '';

        // Get per-namespace progress for target lang
        var barHtml = '';
        if (S.progress && S.progress.progress[S.targetLang]) {
            var nsProg = S.progress.progress[S.targetLang].byNamespace[ns];
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

// Editor
export function renderEditor() {
    var area = document.getElementById('editor-area');
    var namespacesToShow = S.activeNs ? [S.activeNs] : S.config.namespaces;

    // Collect all keys across selected namespaces
    var allEntries = []; // { ns, key }
    for (var ni = 0; ni < namespacesToShow.length; ni++) {
        var ns = namespacesToShow[ni];
        if (!S.translations[ns]) continue;
        var allKeys = {};
        // Collect from source + target langs
        var srcData = S.translations[ns][S.sourceLang] || {};
        var tgtData = S.translations[ns][S.targetLang] || {};
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
    if (S.searchQuery) {
        var q = S.searchQuery.toLowerCase();
        allEntries = allEntries.filter(function(entry) {
            // Match key path
            if (entry.key.toLowerCase().indexOf(q) !== -1) return true;
            // Match namespace name
            if (entry.ns.toLowerCase().indexOf(q) !== -1) return true;
            // Match values in any loaded language
            for (var li = 0; li < S.config.languages.length; li++) {
                var data = S.translations[entry.ns] && S.translations[entry.ns][S.config.languages[li]];
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
    html += '<div>' + S.sourceLang.toUpperCase() + ' (source)</div>';
    html += '<div>' + S.targetLang.toUpperCase() + ' (target)</div>';
    html += '<div></div>';
    html += '</div>';

    // Render rows
    for (var ei = 0; ei < allEntries.length; ei++) {
        var entry = allEntries[ei];
        var rowId = 'row-' + entry.ns + '-' + entry.key.replace(/\./g, '_');
        var usageCount = getUsageCount(entry.ns, entry.key);
        var usageBadgeHtml = '';

        if (!S.usageReady) {
            usageBadgeHtml = '<span class="usage-badge scanning">scanning...</span>';
        } else if (usageCount > 0) {
            usageBadgeHtml = '<span class="usage-badge used" data-ns="' + entry.ns + '" data-key="' + entry.key + '" data-row="' + rowId + '">' + usageCount + ' ref' + (usageCount > 1 ? 's' : '') + '</span>';
        } else {
            usageBadgeHtml = '<span class="usage-badge unused">unused</span>';
        }

        // Key cell with ns tag (when showing all)
        var nsTag = S.activeNs === null ? '<span class="key-ns-tag">' + entry.ns + '</span>' : '';

        html += '<div class="key-row" id="' + rowId + '">';
        html += '<div class="key-cell"><span class="key-path">' + highlightMatch(entry.key, S.searchQuery) + '</span>' + nsTag + usageBadgeHtml + '</div>';

        // Source value
        var srcVal = getNestedValue(S.translations[entry.ns][S.sourceLang] || {}, entry.key);
        var srcStr = typeof srcVal === 'string' ? srcVal : '';
        html += '<div class="key-cell"><textarea class="value-input" data-lang="' + S.sourceLang + '" data-ns="' + entry.ns + '" data-key="' + entry.key + '" rows="1" spellcheck="false">' + escapeHtml(srcStr) + '</textarea></div>';

        // Target value
        var tgtVal = getNestedValue(S.translations[entry.ns][S.targetLang] || {}, entry.key);
        var tgtStr = typeof tgtVal === 'string' ? tgtVal : '';
        var tgtCls = tgtVal === undefined ? ' missing' : tgtVal === '' ? ' empty-val' : '';
        html += '<div class="key-cell"><textarea class="value-input' + tgtCls + '" data-lang="' + S.targetLang + '" data-ns="' + entry.ns + '" data-key="' + entry.key + '" rows="1" spellcheck="false">' + escapeHtml(tgtStr) + '</textarea></div>';

        // Delete + Translate
        html += '<div class="key-actions">' +
            '<button class="btn-translate-key" data-ns="' + entry.ns + '" data-key="' + entry.key + '" title="Translate with LLM"><i data-lucide="pen-line" style="width:12px;height:12px"></i></button>' +
            '<button class="btn-delete" data-ns="' + entry.ns + '" data-key="' + entry.key + '" title="Delete key"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button></div>';
        html += '</div>';

        // Usage context (hidden, toggle on badge click)
        html += '<div class="usage-context" id="ctx-' + rowId + '"></div>';
    }

    if (allEntries.length === 0) {
        html += '<div class="placeholder" style="min-height: 300px"><div class="placeholder-icon"><i data-lucide="search-x" style="width:40px;height:40px;stroke-width:1.5"></i></div>' +
            '<h2>No keys found</h2><p>' +
            (S.searchQuery ? 'No keys match your search.' : 'This namespace is empty.') +
            '</p></div>';
    }

    area.innerHTML = html;
    updateKeyCount(allEntries.length);
    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });

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
                var { removeNestedValue } = window.__atsHelpers;
                for (var li = 0; li < S.config.languages.length; li++) {
                    if (S.translations[ns] && S.translations[ns][S.config.languages[li]]) {
                        removeNestedValue(S.translations[ns][S.config.languages[li]], key);
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
