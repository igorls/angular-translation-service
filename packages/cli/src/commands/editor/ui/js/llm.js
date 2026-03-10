// ─── LLM Integration (ESM) ──────────────────────────────────

import * as S from './state.js';
import { flattenKeys, getNestedValue, setNestedValue, showSaveStatus } from './helpers.js';
import { loadProgress, loadValidation } from './api.js';
import { renderLLMStatus } from './render.js';

// ─── Provider Status Check ──────────────────────────────────

export async function checkProvider() {
    try {
        var params = 'provider=' + encodeURIComponent(S.llmProvider);
        var cfg = S.llmConfig[S.llmProvider] || {};

        if (S.llmProvider === 'ollama') {
            params += '&host=' + encodeURIComponent(cfg.host || 'localhost:11434');
        } else if (S.llmProvider === 'openai') {
            params += '&baseUrl=' + encodeURIComponent(cfg.baseUrl || 'https://api.openai.com');
            if (cfg.apiKey) params += '&apiKey=' + encodeURIComponent(cfg.apiKey);
        } else if (S.llmProvider === 'gemini') {
            if (cfg.apiKey) params += '&apiKey=' + encodeURIComponent(cfg.apiKey);
        }

        var res = await fetch('/api/llm/status?' + params);
        var data = await res.json();
        S.setLLMOnline(data.online);
        S.setLLMModels(data.models || []);
        if (S.llmModels.length > 0 && !S.llmModel) {
            S.setLLMModel(S.llmModels[0]);
        }
        // If current model is not in new list, pick first
        if (S.llmModels.length > 0 && S.llmModels.indexOf(S.llmModel) === -1) {
            S.setLLMModel(S.llmModels[0]);
        }
        renderLLMStatus();
    } catch(e) {
        S.setLLMOnline(false);
        S.setLLMModels([]);
        renderLLMStatus();
    }
}

// ─── Translate Status Helper ────────────────────────────────

function setTranslateStatus(msg, thinking) {
    var el = document.getElementById('translate-status');
    if (!el) return;
    var prefix = thinking ? '<span style="display:inline-block;animation:pulse 1.5s ease-in-out infinite"><i data-lucide="brain" style="width:14px;height:14px;vertical-align:middle"></i></span> ' : '';
    el.innerHTML = prefix + msg;
    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}

// ─── Textarea Patching ──────────────────────────────────────

export function patchTextarea(ns, key, lang, value) {
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
    if (S.translations[ns] && S.translations[ns][lang]) {
        setNestedValue(S.translations[ns][lang], key, value);
    }
}

// ─── SSE Stream Reader ──────────────────────────────────────

export async function streamTranslate(entries, ns, onStatus, onBatch, onDone, onError) {
    var cfg = S.llmConfig[S.llmProvider] || {};

    var body = {
        entries: entries,
        sourceLang: S.sourceLang,
        targetLang: S.targetLang,
        namespace: ns,
        provider: S.llmProvider,
        model: S.llmModel,
        batchSize: S.llmBatchSize,
    };

    // Add provider-specific config
    if (S.llmProvider === 'ollama') {
        body.host = cfg.host || 'localhost:11434';
    } else if (S.llmProvider === 'openai') {
        body.baseUrl = cfg.baseUrl || 'https://api.openai.com';
        body.apiKey = cfg.apiKey || '';
    } else if (S.llmProvider === 'gemini') {
        body.apiKey = cfg.apiKey || '';
    }

    var res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

// ─── Batch Translate ────────────────────────────────────────

export async function translateBatch(mode) {
    if (!S.llmOnline || !S.llmModel) {
        alert('LLM provider is not connected. Open the Translate panel to configure.');
        return;
    }
    if (!S.activeNs && !confirm('Translate ALL namespaces?')) return;

    var { loadNamespace } = await import('./api.js');
    var namespacesToTranslate = S.activeNs ? [S.activeNs] : S.config.namespaces;
    var btnEmpty = document.getElementById('btn-translate-empty');
    var btnAll = document.getElementById('btn-translate-all');
    if (btnEmpty) { btnEmpty.disabled = true; btnEmpty.textContent = 'Starting...'; }
    if (btnAll) { btnAll.disabled = true; }

    for (var ni = 0; ni < namespacesToTranslate.length; ni++) {
        var ns = namespacesToTranslate[ni];
        if (!S.translations[ns]) await loadNamespace(ns);

        var srcData = S.translations[ns][S.sourceLang] || {};
        var tgtData = S.translations[ns][S.targetLang] || {};
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

        try {
            await streamTranslate(entries, ns,
                function(data) {
                    setTranslateStatus(data.message, true);
                    if (btnEmpty) btnEmpty.textContent = 'Batch ' + data.batch + '/' + data.totalBatches;
                },
                function(data) {
                    setTranslateStatus('Batch ' + data.batch + '/' + data.totalBatches + ' — applied ' + data.applied + ' keys', false);
                    for (var tkey in data.translations) {
                        patchTextarea(data.namespace, tkey, S.targetLang, data.translations[tkey]);
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

// ─── Single Key Translate ───────────────────────────────────

export async function translateSingleKey(ns, key) {
    if (!S.llmOnline || !S.llmModel) {
        alert('LLM provider is not connected. Open the Translate panel to configure.');
        return;
    }
    var srcData = S.translations[ns] && S.translations[ns][S.sourceLang];
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
                    patchTextarea(data.namespace, tkey, S.targetLang, data.translations[tkey]);
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

    for (var j = 0; j < btns.length; j++) { btns[j].classList.remove('translating'); btns[j].innerHTML = '<i data-lucide="pen-line" style="width:12px;height:12px"></i>'; }
    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}
