/**
 * Build and test @angular-translation-service/core against one supported
 * Angular major, in an isolated install so the workspace lockfile stays on 22.2.
 *
 *   bun scripts/verify-angular-peer.ts        # 19, 20, 21, and 22
 *   bun scripts/verify-angular-peer.ts 19
 */
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, sep } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface PeerSpec {
    angular: string;
    packagr: string;
    typescript: string;
}

/** Latest patch of each major that still matches that major's TypeScript range. */
const MATRIX: Record<string, PeerSpec> = {
    '19': { angular: '19.2.25', packagr: '19.2.2', typescript: '5.8.3' },
    '20': { angular: '20.3.35', packagr: '20.3.2', typescript: '5.9.3' },
    '21': { angular: '21.2.26', packagr: '21.2.7', typescript: '5.9.3' },
    '22': { angular: '22.2.6', packagr: '22.2.6', typescript: '6.0.3' },
};

const requested = process.argv.slice(2);
const majors = requested.length > 0 ? requested : Object.keys(MATRIX);

for (const major of majors) {
    if (!MATRIX[major]) {
        console.error(
            `Unknown Angular major "${major}". Expected one of: ${Object.keys(MATRIX).join(', ')}`,
        );
        process.exit(1);
    }
}

let failed = false;
for (const major of majors) {
    const ok = await verify(major, MATRIX[major]);
    if (!ok) failed = true;
}

if (failed) process.exit(1);

async function verify(major: string, spec: PeerSpec): Promise<boolean> {
    const work = mkdtempSync(join(tmpdir(), `ats-ng${major}-`));
    console.log(`\n=== Angular ${major} (${spec.angular}, typescript ${spec.typescript}) ===`);
    console.log(work);
    try {
        mkdirSync(join(work, 'packages'), { recursive: true });
        cpSync(join(ROOT, 'packages', 'core'), join(work, 'packages', 'core'), {
            recursive: true,
            filter: (src) => {
                const parts = src.split(sep);
                return !parts.includes('node_modules') && !parts.includes('dist') && !parts.includes('out-tsc');
            },
        });
        cpSync(join(ROOT, 'tsconfig.json'), join(work, 'tsconfig.json'));

        const angularPackages = [
            '@angular/common',
            '@angular/compiler',
            '@angular/compiler-cli',
            '@angular/core',
        ];
        const dependencies: Record<string, string> = {
            'ng-packagr': spec.packagr,
            rxjs: '7.8.1',
            tslib: '2.9.1',
            typescript: spec.typescript,
        };
        for (const name of angularPackages) dependencies[name] = spec.angular;

        writeFileSync(
            join(work, 'package.json'),
            JSON.stringify({ name: `ats-peer-${major}`, private: true, dependencies }, null, 2),
        );

        if (!(await run(work, ['bun', 'install']))) return false;
        if (
            !(await run(work, [
                'bunx',
                'ng-packagr',
                '-p',
                'packages/core/ng-package.json',
                '-c',
                'packages/core/tsconfig.lib.json',
            ]))
        ) {
            return false;
        }
        if (!(await run(work, ['bun', 'test', 'packages/core']))) return false;
        console.log(`Angular ${major} build + core tests passed`);
        return true;
    } finally {
        rmSync(work, { recursive: true, force: true });
    }
}

async function run(cwd: string, cmd: string[]): Promise<boolean> {
    const proc = Bun.spawn(cmd, { cwd, stdout: 'inherit', stderr: 'inherit' });
    const code = await proc.exited;
    if (code !== 0) {
        console.error(`Command failed (${code}): ${cmd.join(' ')}`);
        return false;
    }
    return true;
}
