import type { DiscoveryResult } from '../discover';

export interface EditorOptions {
    input?: string;
    port: string;
    src?: string;
}

export interface UsageEntry {
    file: string;       // relative path
    line: number;       // 1-indexed line number
    context: string;    // surrounding line content (trimmed)
}

export type UsageCache = Record<string, UsageEntry[]>;

export interface ScanCandidate {
    text: string;
    score: number;
    reasons: string[];
    file: string;
    line: number;
    element: string;
}

export interface ScanCache {
    totalFiles: number;
    candidates: ScanCandidate[];
}

export type CorsHeaders = Record<string, string>;

/**
 * Shared context passed to every API handler.
 */
export interface HandlerContext {
    discovery: DiscoveryResult;
    corsHeaders: CorsHeaders;
    srcDir: string;
    getUsageCache: () => UsageCache | null;
    setUsageCache: (c: UsageCache) => void;
    getScanCache: () => ScanCache | null;
    setScanCache: (c: ScanCache) => void;
}
