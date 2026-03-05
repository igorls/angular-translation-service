import { describe, it, expect, mock } from 'bun:test';
import { httpLoader, importLoader } from './loader';

describe('httpLoader', () => {
    it('should construct the correct URL from basePath, lang, and namespace', async () => {
        const mockFetch = mock(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ title: 'Hello' }),
            } as Response),
        );
        globalThis.fetch = mockFetch as any;

        const loader = httpLoader('/assets/i18n');
        await loader('en', 'common');

        expect(mockFetch).toHaveBeenCalledWith('/assets/i18n/en/common.json');
    });

    it('should return parsed JSON data', async () => {
        const data = { nav: { home: 'Home', about: 'About' } };
        globalThis.fetch = mock(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(data),
            } as Response),
        ) as any;

        const loader = httpLoader('/i18n');
        const result = await loader('pt-BR', 'common');

        expect(result).toEqual(data);
    });

    it('should throw on non-OK response', async () => {
        globalThis.fetch = mock(() =>
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            } as Response),
        ) as any;

        const loader = httpLoader('/assets/i18n');
        expect(loader('en', 'missing')).rejects.toThrow('Failed to load');
    });
});

describe('importLoader', () => {
    it('should call the factory with lang and namespace', async () => {
        const factory = mock(() =>
            Promise.resolve({ default: { greeting: 'Olá' } }),
        );

        const loader = importLoader(factory as any);
        await loader('pt-BR', 'common');

        expect(factory).toHaveBeenCalledWith('pt-BR', 'common');
    });

    it('should extract default export', async () => {
        const data = { title: 'Hello' };
        const factory = mock(() => Promise.resolve({ default: data }));

        const loader = importLoader(factory as any);
        const result = await loader('en', 'app');

        expect(result).toEqual(data);
    });

    it('should fall back to module itself when no default export', async () => {
        const data = { title: 'Hello' };
        const factory = mock(() => Promise.resolve(data));

        const loader = importLoader(factory as any);
        const result = await loader('en', 'app');

        expect(result).toEqual(data);
    });
});
