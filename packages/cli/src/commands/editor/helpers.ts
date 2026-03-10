import type { IncomingMessage } from 'http';

// ─── Node.js Helpers ────────────────────────────────────────

export function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        req.on('error', reject);
    });
}

// ─── Nested Object Utilities ────────────────────────────────

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const p of parts) {
        if (typeof current !== 'object' || current === null) return undefined;
        current = (current as Record<string, unknown>)[p];
    }
    return current;
}

export function removeNestedKey(obj: Record<string, unknown>, path: string): void {
    const parts = path.split('.');
    let current: unknown = obj;
    const stack: Array<{ obj: Record<string, unknown>; key: string }> = [];

    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current !== 'object' || current === null) break;
        stack.push({ obj: current as Record<string, unknown>, key: parts[i] });
        current = (current as Record<string, unknown>)[parts[i]];
    }

    if (typeof current === 'object' && current !== null) {
        delete (current as Record<string, unknown>)[parts[parts.length - 1]];
        for (let i = stack.length - 1; i >= 0; i--) {
            const parent = stack[i];
            const child = parent.obj[parent.key];
            if (typeof child === 'object' && child !== null && Object.keys(child).length === 0) {
                delete parent.obj[parent.key];
            }
        }
    }
}

export function emptyValues(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
        if (typeof v === 'string') {
            result[k] = '';
        } else if (typeof v === 'object' && v !== null) {
            result[k] = emptyValues(v as Record<string, unknown>);
        } else {
            result[k] = v;
        }
    }
    return result;
}

export function setNestedValue(obj: Record<string, unknown>, path: string, value: string): void {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (typeof current[parts[i]] !== 'object' || current[parts[i]] === null) {
            current[parts[i]] = {};
        }
        current = current[parts[i]] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
}
