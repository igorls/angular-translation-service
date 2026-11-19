import { afterEach, describe, expect, it } from 'bun:test';
import { MCPTransport, type JsonRpcResponse } from './transport';

function capture() {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const originalOut = process.stdout.write;
    const originalErr = process.stderr.write;
    process.stdout.write = ((chunk: string | Uint8Array) => {
        stdout.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
        return true;
    }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: string | Uint8Array) => {
        stderr.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
        return true;
    }) as typeof process.stderr.write;
    return {
        stdout,
        stderr,
        restore() {
            process.stdout.write = originalOut;
            process.stderr.write = originalErr;
        },
    };
}

function messages(chunks: string[]): JsonRpcResponse[] {
    return chunks.join('').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

describe('MCPTransport framing', () => {
    const captured: Array<ReturnType<typeof capture>> = [];

    afterEach(() => {
        for (const item of captured) item.restore();
        captured.length = 0;
    });

    function transport() {
        const io = capture();
        captured.push(io);
        const server = new MCPTransport('ats-mcp', '0.0.0');
        server.registerTool(
            {
                name: 'echo',
                description: 'Echo',
                inputSchema: { type: 'object', properties: {} },
            },
            async (params) => ({ heard: params.text ?? null }),
        );
        return { server, io };
    }

    it('buffers a message split across chunks and ignores a blank line', async () => {
        const { server, io } = transport();
        const payload = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' });
        server.ingest(payload.slice(0, 10));
        expect(io.stdout).toHaveLength(0);
        server.ingest(payload.slice(10) + '\n\n');
        const parsed = messages(io.stdout);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe(1);
        expect(parsed[0].result).toEqual({});
    });

    it('accepts two newline-delimited messages in one chunk', () => {
        const { server, io } = transport();
        server.ingest(
            [
                JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/list' }),
                JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
            ].join('\n') + '\n',
        );
        const parsed = messages(io.stdout);
        expect(parsed).toHaveLength(1);
        const tools = (parsed[0].result as { tools: Array<{ name: string }> }).tools;
        expect(tools.map((tool) => tool.name)).toEqual(['echo']);
        expect(io.stderr.some((line) => line.includes('Client initialized'))).toBe(true);
    });

    it('reads a Content-Length frame and does not treat the header as JSON', () => {
        const { server, io } = transport();
        const body = JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'ping' });
        const frame = `Content-Length: ${Buffer.byteLength(body)}\r\nContent-Type: application/vscode-jsonrpc; charset=utf-8\r\n\r\n${body}`;
        server.ingest(frame);
        const parsed = messages(io.stdout);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe(3);
        expect(parsed[0].error).toBeUndefined();
    });

    it('waits until a Content-Length body is complete', () => {
        const { server, io } = transport();
        const body = JSON.stringify({ jsonrpc: '2.0', id: 4, method: 'ping' });
        const header = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n`;
        server.ingest(header + body.slice(0, 4));
        expect(io.stdout).toHaveLength(0);
        server.ingest(body.slice(4));
        expect(messages(io.stdout)[0].id).toBe(4);
    });

    it('returns a parse error for a bad line and continues with the next message', () => {
        const { server, io } = transport();
        server.ingest('{not json\n' + JSON.stringify({ jsonrpc: '2.0', id: 0, method: 'ping' }) + '\n');
        const parsed = messages(io.stdout);
        expect(parsed[0].error?.code).toBe(-32700);
        expect(parsed[1].id).toBe(0);
        expect(parsed[1].result).toEqual({});
    });

    it('reports an unknown tool and a tool failure without dropping the response id', async () => {
        const { server, io } = transport();
        server.registerTool(
            {
                name: 'boom',
                description: 'Fails',
                inputSchema: { type: 'object', properties: {} },
            },
            async () => {
                throw new Error('provider down');
            },
        );
        server.ingest(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 9,
                method: 'tools/call',
                params: { name: 'missing' },
            }) + '\n',
        );
        server.ingest(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 10,
                method: 'tools/call',
                params: { name: 'boom' },
            }) + '\n',
        );
        server.ingest(
            JSON.stringify({
                jsonrpc: '2.0',
                id: 11,
                method: 'tools/call',
                params: { name: 'echo', arguments: { text: 'hi' } },
            }) + '\n',
        );
        await new Promise((resolve) => setTimeout(resolve, 0));
        const parsed = messages(io.stdout);
        expect(parsed.find((message) => message.id === 9)?.error?.code).toBe(-32601);
        const failed = parsed.find((message) => message.id === 10);
        expect((failed?.result as { isError?: boolean }).isError).toBe(true);
        const echoed = parsed.find((message) => message.id === 11);
        expect((echoed?.result as { content: Array<{ text: string }> }).content[0].text).toContain('hi');
    });
});
