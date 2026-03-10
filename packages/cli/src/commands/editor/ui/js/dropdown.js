// ─── Custom Dropdown Component (ESM) ────────────────────────
// Replaces native <select> with a themed custom dropdown.

var _openDropdown = null; // track currently open dropdown

// Close any open dropdown
function closeAll() {
    if (_openDropdown) {
        _openDropdown.classList.remove('open');
        _openDropdown = null;
    }
}

// Global listeners (once)
var _globalBound = false;
function bindGlobal() {
    if (_globalBound) return;
    _globalBound = true;

    document.addEventListener('click', function (e) {
        if (_openDropdown && !_openDropdown.contains(e.target)) {
            closeAll();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeAll();

        if (!_openDropdown) return;
        var items = _openDropdown.querySelectorAll('.custom-select-option');
        if (!items.length) return;

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var focused = _openDropdown.querySelector('.custom-select-option.focused');
            var idx = -1;
            for (var i = 0; i < items.length; i++) {
                if (items[i] === focused) { idx = i; break; }
            }
            if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
            else idx = Math.max(idx - 1, 0);

            for (var j = 0; j < items.length; j++) items[j].classList.remove('focused');
            items[idx].classList.add('focused');
            items[idx].scrollIntoView({ block: 'nearest' });
        }

        if (e.key === 'Enter') {
            var el = _openDropdown.querySelector('.custom-select-option.focused');
            if (el) el.click();
        }
    });
}

/**
 * Initialize a custom dropdown on a .custom-select container.
 * @param {HTMLElement} container - The .custom-select element
 * @param {{ onChange?: (value: string) => void }} opts
 */
export function initDropdown(container, opts) {
    bindGlobal();
    opts = opts || {};

    var trigger = container.querySelector('.custom-select-trigger');
    trigger.addEventListener('click', function (e) {
        e.stopPropagation();

        if (_openDropdown === container) {
            closeAll();
            return;
        }

        closeAll();
        container.classList.add('open');
        _openDropdown = container;

        // Focus the selected item
        var items = container.querySelectorAll('.custom-select-option');
        for (var i = 0; i < items.length; i++) {
            items[i].classList.remove('focused');
            if (items[i].classList.contains('selected')) {
                items[i].classList.add('focused');
                items[i].scrollIntoView({ block: 'nearest' });
            }
        }
    });

    container._atsOnChange = opts.onChange || null;
}

/**
 * Populate dropdown options.
 * @param {HTMLElement} container
 * @param {Array<{ value: string, label: string }>} options
 * @param {string} selectedValue
 */
export function setOptions(container, options, selectedValue) {
    var panel = container.querySelector('.custom-select-options');
    var trigger = container.querySelector('.custom-select-trigger');
    var label = trigger.querySelector('.custom-select-label');
    var html = '';

    for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var sel = opt.value === selectedValue ? ' selected' : '';
        html += '<div class="custom-select-option' + sel + '" data-value="' + opt.value + '">' + opt.label + '</div>';
    }
    panel.innerHTML = html;

    // Set trigger label
    var found = options.find(function (o) { return o.value === selectedValue; });
    label.textContent = found ? found.label : (options[0] ? options[0].label : '');
    container.dataset.value = selectedValue || '';

    // Wire option clicks
    var items = panel.querySelectorAll('.custom-select-option');
    for (var j = 0; j < items.length; j++) {
        items[j].addEventListener('click', function () {
            var newVal = this.dataset.value;
            // Update selection visual
            var siblings = this.parentNode.querySelectorAll('.custom-select-option');
            for (var k = 0; k < siblings.length; k++) siblings[k].classList.remove('selected');
            this.classList.add('selected');
            label.textContent = this.textContent;
            container.dataset.value = newVal;
            closeAll();

            if (container._atsOnChange) container._atsOnChange(newVal);
        });
    }
}

/**
 * Get current dropdown value.
 * @param {HTMLElement} container
 * @returns {string}
 */
export function getValue(container) {
    return container.dataset.value || '';
}
