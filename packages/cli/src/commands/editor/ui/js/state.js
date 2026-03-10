// ─── Application State (ESM) ────────────────────────────────

export var config = null;
export var activeNs = null;       // null = "All" in search mode
export var translations = {};     // { ns: { lang: data } }
export var searchQuery = '';
export var saveTimeout = null;
export var sourceLang = '';
export var targetLang = '';
export var progress = null;
export var usageData = null;
export var usageReady = false;
export var validationIssues = [];
export var activePanel = null;  // 'translate' | 'validate' | 'scan' | null
export var scanResults = null;

// ─── LLM Provider State ─────────────────────────────────────

export var llmProvider = 'ollama';  // 'ollama' | 'openai' | 'gemini'
export var llmOnline = false;
export var llmModels = [];
export var llmModel = '';
export var llmBatchSize = 20;
export var llmConfig = {
    ollama: { host: 'localhost:11434' },
    openai: { baseUrl: 'https://api.openai.com', apiKey: '' },
    gemini: { apiKey: '' },
};

// Setters for state mutation from other modules
export function setConfig(v) { config = v; }
export function setActiveNs(v) { activeNs = v; }
export function setSearchQuery(v) { searchQuery = v; }
export function setSaveTimeout(v) { saveTimeout = v; }
export function setSourceLang(v) { sourceLang = v; }
export function setTargetLang(v) { targetLang = v; }
export function setProgress(v) { progress = v; }
export function setUsageData(v) { usageData = v; }
export function setUsageReady(v) { usageReady = v; }
export function setValidationIssues(v) { validationIssues = v; }
export function setActivePanel(v) { activePanel = v; }
export function setScanResults(v) { scanResults = v; }

// LLM setters
export function setLLMProvider(v) { llmProvider = v; }
export function setLLMOnline(v) { llmOnline = v; }
export function setLLMModels(v) { llmModels = v; }
export function setLLMModel(v) { llmModel = v; }
export function setLLMBatchSize(v) { llmBatchSize = v; }
export function setLLMConfig(provider, key, value) {
    if (llmConfig[provider]) llmConfig[provider][key] = value;
}

export function savePrefs() {
    try {
        localStorage.setItem('ats-editor-prefs', JSON.stringify({
            sourceLang: sourceLang,
            targetLang: targetLang,
            llmProvider: llmProvider,
            llmModel: llmModel,
            llmBatchSize: llmBatchSize,
            llmConfig: llmConfig,
        }));
    } catch(e) {}
}
