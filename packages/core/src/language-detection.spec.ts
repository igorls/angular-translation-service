import { describe, it, expect, beforeEach } from 'bun:test';
import { detectLanguage } from './language-detection';

describe('detectLanguage', () => {
    // ── localStorage detection ────────────────────────────────────────

    it('should return stored language from localStorage', () => {
        const originalLocalStorage = globalThis.localStorage;
        const store: Record<string, string> = { 'app-lang': 'pt-BR' };
        (globalThis as any).localStorage = {
            getItem: (key: string) => store[key] ?? null,
            setItem: (key: string, val: string) => { store[key] = val; },
        };

        const result = detectLanguage(
            ['en', 'pt-BR', 'es'],
            'en',
            { storageKey: 'app-lang' },
        );
        expect(result).toBe('pt-BR');

        (globalThis as any).localStorage = originalLocalStorage;
    });

    it('should skip localStorage if stored language is not supported', () => {
        const store: Record<string, string> = { 'app-lang': 'fr' };
        (globalThis as any).localStorage = {
            getItem: (key: string) => store[key] ?? null,
        };

        const result = detectLanguage(
            ['en', 'pt-BR'],
            'en',
            { storageKey: 'app-lang' },
        );
        expect(result).toBe('en'); // falls through to default

        delete (globalThis as any).localStorage;
    });

    // ── Browser language detection ────────────────────────────────────

    it('should detect exact match from navigator.language', () => {
        const origNav = globalThis.navigator;
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'pt-BR', languages: ['pt-BR', 'en'] },
            writable: true,
            configurable: true,
        });

        const result = detectLanguage(['en', 'pt-BR', 'es'], 'en');
        expect(result).toBe('pt-BR');

        Object.defineProperty(globalThis, 'navigator', {
            value: origNav,
            writable: true,
            configurable: true,
        });
    });

    it('should match base language when exact is not supported', () => {
        Object.defineProperty(globalThis, 'navigator', {
            value: { language: 'pt', languages: ['pt'] },
            writable: true,
            configurable: true,
        });

        const result = detectLanguage(['en', 'pt-BR', 'es'], 'en');
        expect(result).toBe('pt-BR'); // pt matches pt-BR

        Object.defineProperty(globalThis, 'navigator', {
            value: undefined,
            writable: true,
            configurable: true,
        });
    });

    // ── Default fallback ──────────────────────────────────────────────

    it('should return default language when nothing matches', () => {
        // No localStorage, no navigator
        const result = detectLanguage(['en', 'pt-BR'], 'en');
        expect(result).toBe('en');
    });
});
