/**
 * Zero-dependency STDIO MCP transport.
 *
 * Implements the Model Context Protocol JSON-RPC 2.0 transport over stdin/stdout.
 * All logging goes to stderr to keep stdout clean for MCP protocol messages.
 */

// ─── Types ──────────────────────────────────────────────────

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    id?: string | number;
    method: string;
    params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: unknown;
    error?: { code: number; message: string; data?: unknown };
}

export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required?: string[];
    };
}

export type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

// ─── MCP Error Codes ────────────────────────────────────────

export const MCP_ERRORS = {
    PARSE_ERROR: -32700,
    INVALID_REQUEST: -32600,
    METHOD_NOT_FOUND: -32601,
    INVALID_PARAMS: -32602,
    INTERNAL_ERROR: -32603,
} as const;

// ─── STDIO Transport ───────────────────────────────────────

export class MCPTransport {
    private tools = new Map<string, { definition: MCPToolDefinition; handler: ToolHandler }>();
    private serverName: string;
    private serverVersion: string;
    private buffer = '';

    constructor(serverName: string, serverVersion: string) {
        this.serverName = serverName;
        this.serverVersion = serverVersion;
    }

    registerTool(definition: MCPToolDefinition, handler: ToolHandler): void {
        this.tools.set(definition.name, { definition, handler });
    }

    /** Start listening on stdin for JSON-RPC messages */
    start(): void {
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', (chunk: string) => {
            this.buffer += chunk;
            this.processBuffer();
        });
        process.stdin.on('end', () => {
            process.exit(0);
        });
        this.log(`MCP server started (${this.tools.size} tools registered)`);
    }

    private processBuffer(): void {
        // Handle newline-delimited JSON-RPC
        const lines = this.buffer.split('\n');
        this.buffer = lines.pop() ?? '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            this.handleLine(trimmed);
        }
    }

    private async handleLine(line: string): Promise<void> {
        let request: JsonRpcRequest;

        try {
            request = JSON.parse(line);
        } catch {
            this.sendError(null, MCP_ERRORS.PARSE_ERROR, 'Invalid JSON');
            return;
        }

        if (request.jsonrpc !== '2.0' || !request.method) {
            this.sendError(request.id ?? null, MCP_ERRORS.INVALID_REQUEST, 'Invalid JSON-RPC request');
            return;
        }

        try {
            switch (request.method) {
                case 'initialize':
                    this.handleInitialize(request);
                    break;
                case 'initialized':
                    // Notification, no response needed
                    this.log('Client initialized');
                    break;
                case 'tools/list':
                    this.handleToolsList(request);
                    break;
                case 'tools/call':
                    await this.handleToolsCall(request);
                    break;
                case 'ping':
                    this.sendResult(request.id!, {});
                    break;
                default:
                    // Unknown notifications are silently ignored per spec
                    if (request.id !== undefined) {
                        this.sendError(request.id, MCP_ERRORS.METHOD_NOT_FOUND, `Unknown method: ${request.method}`);
                    }
            }
        } catch (err) {
            if (request.id !== undefined) {
                this.sendError(request.id, MCP_ERRORS.INTERNAL_ERROR, (err as Error).message);
            }
        }
    }

    private handleInitialize(req: JsonRpcRequest): void {
        this.sendResult(req.id!, {
            protocolVersion: '2024-11-05',
            capabilities: {
                tools: {},
            },
            serverInfo: {
                name: this.serverName,
                version: this.serverVersion,
            },
        });
        this.log('Initialized');
    }

    private handleToolsList(req: JsonRpcRequest): void {
        const tools = Array.from(this.tools.values()).map(t => t.definition);
        this.sendResult(req.id!, { tools });
    }

    private async handleToolsCall(req: JsonRpcRequest): Promise<void> {
        const params = req.params as { name: string; arguments?: Record<string, unknown> };

        if (!params?.name) {
            this.sendError(req.id!, MCP_ERRORS.INVALID_PARAMS, 'Missing tool name');
            return;
        }

        const tool = this.tools.get(params.name);
        if (!tool) {
            this.sendError(req.id!, MCP_ERRORS.METHOD_NOT_FOUND, `Unknown tool: ${params.name}`);
            return;
        }

        this.log(`Calling tool: ${params.name}`);
        const startTime = performance.now();

        try {
            const result = await tool.handler(params.arguments ?? {});
            const elapsed = Math.round(performance.now() - startTime);
            this.log(`  ✓ ${params.name} completed (${elapsed}ms)`);

            this.sendResult(req.id!, {
                content: [
                    {
                        type: 'text',
                        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
                    },
                ],
            });
        } catch (err) {
            const elapsed = Math.round(performance.now() - startTime);
            this.log(`  ✗ ${params.name} failed (${elapsed}ms): ${(err as Error).message}`);

            this.sendResult(req.id!, {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ error: (err as Error).message }),
                    },
                ],
                isError: true,
            });
        }
    }

    // ─── I/O Helpers ────────────────────────────────────────

    private sendResult(id: string | number, result: unknown): void {
        this.send({ jsonrpc: '2.0', id, result });
    }

    private sendError(id: string | number | null, code: number, message: string): void {
        this.send({ jsonrpc: '2.0', id, error: { code, message } });
    }

    private send(response: JsonRpcResponse): void {
        process.stdout.write(JSON.stringify(response) + '\n');
    }

    /** Log to stderr (stdout is reserved for MCP protocol) */
    log(message: string): void {
        process.stderr.write(`[ats-mcp] ${message}\n`);
    }
}
