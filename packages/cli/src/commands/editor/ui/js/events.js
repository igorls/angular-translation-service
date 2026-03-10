// ─── Event Handlers & Init (ESM) ────────────────────────────
// This is the entry point module loaded by the HTML.

import * as S from './state.js';
import { removeNestedValue, showSaveStatus } from './helpers.js';
import { loadNamespace, loadProgress, pollUsage, loadValidation, loadScan } from './api.js';
import { renderEditor, renderSidebar, renderProgress, renderLangPicker, renderConfigWarnings, renderLLMStatus, selectNamespace, selectAllNamespaces } from './render.js';
import { togglePanel } from './panels.js';
import { checkProvider } from './llm.js';
import { initDropdown, getValue, setOptions } from './dropdown.js';

// Expose removeNestedValue for render.js delete handler
window.__atsHelpers = { removeNestedValue };

// Init
async function init() {
    var res = await fetch('/api/config');
    S.setConfig(await res.json());
    document.getElementById('project-path').textContent = S.config.i18nDir;

    // Default source = defaultLang from config, or first lang
    S.setSourceLang(S.config.defaultLang || S.config.languages[0] || '');
    S.setTargetLang(S.config.languages.filter(function(l) { return l !== S.sourceLang; })[0] || S.sourceLang);

    // Restore persisted prefs
    try {
        var saved = JSON.parse(localStorage.getItem('ats-editor-prefs') || '{}');
        if (saved.sourceLang && S.config.languages.indexOf(saved.sourceLang) >= 0) S.setSourceLang(saved.sourceLang);
        if (saved.targetLang && S.config.languages.indexOf(saved.targetLang) >= 0) S.setTargetLang(saved.targetLang);
        if (saved.llmProvider) S.setLLMProvider(saved.llmProvider);
        if (saved.llmModel) S.setLLMModel(saved.llmModel);
        if (saved.llmBatchSize > 0 && saved.llmBatchSize <= 100) S.setLLMBatchSize(saved.llmBatchSize);
        if (saved.llmConfig) {
            for (var prov in saved.llmConfig) {
                for (var key in saved.llmConfig[prov]) {
                    S.setLLMConfig(prov, key, saved.llmConfig[prov][key]);
                }
            }
        }
    } catch(e) {}

    renderConfigWarnings();

    // Init custom dropdowns before rendering lang picker
    initDropdown(document.getElementById('source-lang'), {
        onChange: function(val) {
            S.setSourceLang(val);
            renderProgress();
            renderEditor();
            S.savePrefs();
        }
    });
    initDropdown(document.getElementById('target-lang'), {
        onChange: function(val) {
            S.setTargetLang(val);
            renderProgress();
            renderSidebar();
            renderEditor();
            S.savePrefs();
        }
    });
    initDropdown(document.getElementById('modal-ns'), {});

    renderLangPicker();
    renderSidebar();
    setupEventListeners();
    loadProgress();
    pollUsage();
    checkProvider();
    loadValidation();

    if (S.config.namespaces.length > 0) {
        selectNamespace(S.config.namespaces[0]);
    }
}

function setupEventListeners() {
    var searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function() {
        S.setSearchQuery(this.value);
        // Auto-switch to all namespaces when searching
        if (S.searchQuery && S.activeNs !== null) {
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
            S.setSearchQuery('');
            renderEditor();
            searchInput.blur();
        }
    });

    // Language pickers are now handled by initDropdown onChange callbacks

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
            S.config.languages = data.languages;
            S.setTargetLang(code.trim());
            renderLangPicker();
            renderSidebar();
            loadProgress();
            // Reload current namespace
            if (S.activeNs) {
                S.translations[S.activeNs] = null;
                selectNamespace(S.activeNs);
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
    document.getElementById('btn-scan').addEventListener('click', function() {
        if (!S.scanResults) loadScan().then(function() { if (S.activePanel === 'scan') { import('./panels.js').then(function(m) { m.renderScanPanel(); }); } });
        togglePanel('scan');
    });
}

// Add Key Modal
function openAddKeyModal() {
    var overlay = document.getElementById('modal-overlay');
    document.getElementById('modal-title').textContent = 'Add New Key';
    var nsSelect = document.getElementById('modal-ns');
    var options = [];
    var selectedNs = S.activeNs || S.config.namespaces[0] || '';
    for (var i = 0; i < S.config.namespaces.length; i++) {
        var ns = S.config.namespaces[i];
        options.push({ value: ns, label: ns });
    }
    setOptions(nsSelect, options, selectedNs);
    nsSelect.parentElement.style.display = '';

    document.getElementById('modal-key').parentElement.style.display = '';
    document.getElementById('modal-key').previousElementSibling.style.display = '';

    var valuesDiv = document.getElementById('modal-values');
    var vhtml = '';
    for (var i = 0; i < S.config.languages.length; i++) {
        var lang = S.config.languages[i];
        vhtml += '<label>' + lang + '</label><input type="text" data-lang="' + lang +
            '" placeholder="Translation for ' + lang + '">';
    }
    valuesDiv.innerHTML = vhtml;

    overlay.classList.remove('hidden');
    document.getElementById('modal-key').focus();
    lucide.createIcons({ nameAttr: 'data-lucide', attrs: {} });
}

function closeAddKeyModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-key').value = '';
}

async function handleAddKey() {
    var ns = getValue(document.getElementById('modal-ns'));
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
    if (S.activeNs === ns || S.activeNs === null) renderEditor();
    closeAddKeyModal();
    showSaveStatus('saved');
    loadProgress();
}

// Boot
init();
