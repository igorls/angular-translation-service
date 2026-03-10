// ─── API Helpers (ESM) ──────────────────────────────────────

import * as S from './state.js';
import { setNestedValue } from './helpers.js';
import { showSaveStatus } from './helpers.js';

export async function loadNamespace(ns) {
    var data = {};
    for (var i = 0; i < S.config.languages.length; i++) {
        var lang = S.config.languages[i];
        var res = await fetch('/api/translations/' + lang + '/' + ns);
        var json = await res.json();
        data[lang] = json.data;
    }
    S.translations[ns] = data;
    return data;
}

export async function loadAllNamespaces() {
    for (var i = 0; i < S.config.namespaces.length; i++) {
        if (!S.translations[S.config.namespaces[i]]) {
            await loadNamespace(S.config.namespaces[i]);
        }
    }
}

export async function saveValue(lang, ns, key, value) {
    setNestedValue(S.translations[ns][lang], key, value);
    showSaveStatus('saving');
    clearTimeout(S.saveTimeout);
    S.setSaveTimeout(setTimeout(async function() {
        await fetch('/api/translations/' + lang + '/' + ns, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: S.translations[ns][lang] }),
        });
        showSaveStatus('saved');
        loadProgress();
    }, 500));
}

// Progress
export async function loadProgress() {
    var res = await fetch('/api/progress');
    S.setProgress(await res.json());
    // Dynamically import render to avoid circular deps
    var { renderProgress, renderSidebar } = await import('./render.js');
    renderProgress();
    renderSidebar();
}

// Usage polling
export async function pollUsage() {
    try {
        var res = await fetch('/api/usage');
        var data = await res.json();
        S.setUsageReady(data.ready);
        S.setUsageData(data.usage);
        if (!S.usageReady) {
            setTimeout(pollUsage, 2000);
        } else {
            var { renderEditor } = await import('./render.js');
            renderEditor();
        }
    } catch(e) {
        setTimeout(pollUsage, 3000);
    }
}

export function getUsageCount(ns, key) {
    if (!S.usageData) return -1;
    var fullKey = ns + ':' + key;
    var direct = S.usageData[fullKey];
    var scopeKey = ns + ':*';
    var scoped = S.usageData[scopeKey];
    var count = 0;
    if (direct) count += direct.length;
    if (scoped) count += scoped.length;
    return count;
}

export function getUsageEntries(ns, key) {
    if (!S.usageData) return [];
    var entries = [];
    var fullKey = ns + ':' + key;
    if (S.usageData[fullKey]) entries = entries.concat(S.usageData[fullKey]);
    var scopeKey = ns + ':*';
    if (S.usageData[scopeKey]) entries = entries.concat(S.usageData[scopeKey]);
    return entries;
}

// Validation
export async function loadValidation() {
    try {
        var res = await fetch('/api/validate');
        var data = await res.json();
        S.setValidationIssues(data.issues || []);
        var badge = document.getElementById('validate-badge');
        if (S.validationIssues.length > 0) {
            badge.textContent = S.validationIssues.length;
            badge.className = 'toolbar-badge danger';
        } else {
            badge.textContent = '✓';
            badge.className = 'toolbar-badge success';
        }
    } catch(e) { /* ignore */ }
}

// Scan
export async function loadScan() {
    try {
        var badge = document.getElementById('scan-badge');
        badge.textContent = '…';
        badge.className = 'toolbar-badge info';
        var res = await fetch('/api/scan?minScore=3');
        S.setScanResults(await res.json());
        if (S.scanResults.totalCandidates > 0) {
            badge.textContent = S.scanResults.totalCandidates;
            badge.className = 'toolbar-badge danger';
        } else {
            badge.textContent = '✓';
            badge.className = 'toolbar-badge success';
        }
    } catch(e) {
        document.getElementById('scan-badge').textContent = '!';
    }
}
