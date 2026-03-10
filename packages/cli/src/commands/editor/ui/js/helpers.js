// ─── Client-side Helpers (ESM) ──────────────────────────────

export function flattenKeys(obj, prefix) {
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

export function getNestedValue(obj, path) {
    var parts = path.split('.');
    var current = obj;
    for (var i = 0; i < parts.length; i++) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = current[parts[i]];
    }
    return current;
}

export function setNestedValue(obj, path, value) {
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

export function removeNestedValue(obj, path) {
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

export function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function escapeAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.max(36, el.scrollHeight) + 'px';
}

export function showSaveStatus(status) {
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

export function updateKeyCount(count) {
    document.getElementById('key-count').textContent = count + ' keys';
}

export function highlightMatch(text, searchQuery) {
    if (!searchQuery) return escapeHtml(text);
    var escaped = escapeHtml(text);
    var q = escapeHtml(searchQuery);
    var idx = escaped.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return escaped;
    return escaped.substring(0, idx) + '<span class="highlight">' + escaped.substring(idx, idx + q.length) + '</span>' + escaped.substring(idx + q.length);
}
