import { describe, expect, it } from 'bun:test';
import { join } from 'path';

const CLI = join(import.meta.dir, '..', 'index.ts');

async function run(args: string[]) {
    const proc = Bun.spawn(['bun', CLI, ...args], {
        stdout: 'pipe',
        stderr: 'pipe',
    });
    const stdout = await new Response(proc.stdout).text();
    const stderr = await new Response(proc.stderr).text();
    const code = await proc.exited;
    return { stdout, stderr, code };
}

describe('ats argument parsing', () => {
    it('prints the package version', async () => {
        const { stdout, code } = await run(['--version']);
        expect(code).toBe(0);
        expect(stdout.trim()).toBe('0.4.7');
    });

    it('documents generate flags', async () => {
        const { stdout, code } = await run(['generate', '--help']);
        expect(code).toBe(0);
        expect(stdout).toContain('--input');
        expect(stdout).toContain('--output');
        expect(stdout).toContain('--check');
    });

    it('rejects an unknown command', async () => {
        const { code, stderr } = await run(['not-a-command']);
        expect(code).not.toBe(0);
        expect(stderr.length + code).toBeGreaterThan(0);
    });

    it('rejects a generate run whose input directory is missing', async () => {
        const { code, stderr } = await run([
            'generate',
            '--input',
            '/tmp/ats-cli-missing-input',
            '--output',
            '/tmp/ats-cli-missing-output.ts',
        ]);
        expect(code).not.toBe(0);
        expect(stderr).toContain('Input directory not found');
    });
});
