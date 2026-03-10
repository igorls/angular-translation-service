import { describe, it, expect } from 'bun:test';
import { extractHardcodedStrings, scoreCandidate, extractTranslatableAttributes } from './scan';

// ─── scoreCandidate ─────────────────────────────────────────

describe('scoreCandidate', () => {
    it('should score multi-word sentence-case text highly', () => {
        const result = scoreCandidate('Getting Started', 'h1');
        expect(result.score).toBeGreaterThanOrEqual(5);
        expect(result.reasons).toContain('multi-word');
        expect(result.reasons).toContain('sentence-case');
        expect(result.reasons).toContain('<h1>');
    });

    it('should score single word in semantic element', () => {
        const result = scoreCandidate('Settings', 'h2');
        expect(result.score).toBeGreaterThanOrEqual(3);
    });

    it('should reject empty strings', () => {
        const result = scoreCandidate('', 'p');
        expect(result.score).toBe(0);
    });

    it('should reject pure numbers', () => {
        const result = scoreCandidate('12345', 'span');
        expect(result.score).toBe(0);
    });

    it('should reject code identifiers (camelCase with dots)', () => {
        const result = scoreCandidate('nav.home.title', 'td');
        expect(result.score).toBe(0);
    });

    it('should reject snake_case identifiers', () => {
        const result = scoreCandidate('translation_service', 'span');
        expect(result.score).toBe(0);
    });

    it('should reject kebab-case identifiers', () => {
        const result = scoreCandidate('my-component', 'span');
        expect(result.score).toBe(0);
    });

    it('should reject URLs', () => {
        const result = scoreCandidate('https://github.com/foo', 'a');
        expect(result.score).toBe(0);
    });

    it('should reject file paths', () => {
        const result = scoreCandidate('/assets/images/logo.png', 'img');
        expect(result.score).toBe(0);
    });

    it('should score long descriptive text highly', () => {
        const result = scoreCandidate(
            'A signal-based translation library with lazy namespace loading and crash-free templates.',
            'p',
        );
        expect(result.score).toBeGreaterThanOrEqual(6);
        expect(result.reasons).toContain('long-text');
        expect(result.reasons).toContain('paragraph-length');
    });

    it('should score UI vocabulary positively', () => {
        const result = scoreCandidate('Save Changes', 'button');
        expect(result.score).toBeGreaterThanOrEqual(5);
        expect(result.reasons).toContain('ui-vocabulary');
    });

    it('should reject pure punctuation', () => {
        const result = scoreCandidate('...', 'span');
        expect(result.score).toBe(0);
    });

    it('should reject single characters', () => {
        const result = scoreCandidate('X', 'span');
        expect(result.score).toBe(0);
    });
});

// ─── extractHardcodedStrings ────────────────────────────────

describe('extractHardcodedStrings', () => {
    it('should extract plain text from headings', () => {
        const html = '<h1>Getting Started</h1>';
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.some((r) => r.text.includes('Getting Started'))).toBe(true);
    });

    it('should extract text from paragraphs', () => {
        const html = '<p>This is a great translation library for Angular.</p>';
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.length).toBeGreaterThanOrEqual(1);
        expect(results.some((r) => r.text.includes('great translation library'))).toBe(true);
    });

    it('should skip content inside <code> tags', () => {
        const html = '<code>provideTranslation()</code>';
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.filter((r) => r.text.includes('provideTranslation'))).toHaveLength(0);
    });

    it('should skip content inside <pre> tags', () => {
        const html = `<pre>const x = this.i18n.translate('key');
this is code
</pre>`;
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.filter((r) => r.text.includes('translate'))).toHaveLength(0);
    });

    it('should skip Angular interpolation', () => {
        const html = '<h1>{{ title() }}</h1>';
        const results = extractHardcodedStrings(html, 'test.html');
        // After removing interpolation, nothing translatable remains
        expect(results.filter((r) => r.score >= 2)).toHaveLength(0);
    });

    it('should skip Angular control flow', () => {
        const html = '@if (ready()) {';
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.filter((r) => r.score >= 2)).toHaveLength(0);
    });

    it('should handle mixed content: text + interpolation', () => {
        const html = '<p>Hello {{ name() }}!</p>';
        const results = extractHardcodedStrings(html, 'test.html');
        // "Hello !" would remain — but it might not score highly enough
        // The important thing is the interpolation was removed
        for (const r of results) {
            expect(r.text).not.toContain('{{');
        }
    });

    it('should handle multiple elements on separate lines', () => {
        const html = `<section>
  <h2>API Reference</h2>
  <p>Complete documentation for the translation service.</p>
</section>`;
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it('should not flag HTML entities alone', () => {
        const html = '<span>&amp; &lt; &gt;</span>';
        const results = extractHardcodedStrings(html, 'test.html');
        expect(results.filter((r) => r.score >= 2)).toHaveLength(0);
    });
});

// ─── extractTranslatableAttributes ──────────────────────────

describe('extractTranslatableAttributes', () => {
    it('should detect title attributes', () => {
        const html = '<button title="Click to save">Save</button>';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.some((r) => r.text === 'Click to save')).toBe(true);
    });

    it('should detect alt attributes', () => {
        const html = '<img alt="User profile photo" src="/img.png" />';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.some((r) => r.text === 'User profile photo')).toBe(true);
    });

    it('should detect aria-label attributes', () => {
        const html = '<button aria-label="Close dialog">X</button>';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.some((r) => r.text === 'Close dialog')).toBe(true);
    });

    it('should detect placeholder attributes', () => {
        const html = '<input placeholder="Search translations..." />';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.some((r) => r.text === 'Search translations...')).toBe(true);
    });

    it('should skip Angular bound attributes [title]', () => {
        const html = '<button [title]="buttonTitle()">Save</button>';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.filter((r) => r.text.includes('buttonTitle'))).toHaveLength(0);
    });

    it('should skip interpolated attribute values', () => {
        const html = '<img alt="{{ imageAlt() }}" src="/img.png" />';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results).toHaveLength(0);
    });

    it('should skip image file names in alt', () => {
        const html = '<img alt="logo.png" src="/img.png" />';
        const results = extractTranslatableAttributes(html, 'test.html');
        expect(results.filter((r) => r.text === 'logo.png')).toHaveLength(0);
    });
});
