import type { IncomingMessage } from 'http';
import {
    getNestedValue as readPath,
    removeNestedValue,
    setNestedValue as writePath,
} from '../utils';

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
    return readPath(obj, path);
}

export function removeNestedKey(obj: Record<string, unknown>, path: string): void {
    removeNestedValue(obj, path);
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
    writePath(obj, path, value);
}
