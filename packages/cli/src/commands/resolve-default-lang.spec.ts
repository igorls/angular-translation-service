import { describe, it, expect, mock, afterEach } from 'bun:test';
import { resolveDefaultLang } from './resolve-default-lang';

describe('resolveDefaultLang', () => {
    const mockExit = mock(() => undefined as never);
    const originalExit = process.exit;

    afterEach(() => {
        process.exit = originalExit;
    });

    it('should return the first language when no explicit lang is given', () => {
        const result = resolveDefaultLang(['de', 'en', 'fr']);
        expect(result).toBe('de');
    });

    it('should return the explicit lang when it exists in langDirs', () => {
        const result = resolveDefaultLang(['de', 'en', 'fr'], 'fr');
        expect(result).toBe('fr');
    });

    it('should return the explicit lang even if it is not alphabetically first', () => {
        const result = resolveDefaultLang(['de', 'en', 'fr'], 'en');
        expect(result).toBe('en');
    });

    it('should exit when explicit lang does not exist in langDirs', () => {
        process.exit = mockExit as unknown as typeof process.exit;
        try {
            resolveDefaultLang(['de', 'en', 'fr'], 'pt');
        } catch {
            // process.exit mock may throw
        }
        expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('should return undefined-safe fallback with single element array', () => {
        const result = resolveDefaultLang(['en']);
        expect(result).toBe('en');
    });
});
