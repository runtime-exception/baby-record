import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = dirname(fileURLToPath(import.meta.url));
const source = join(root, 'src');
const output = join(root, 'dist');
const shared = join(output, 'lib/shared.js');
const appId = process.env.WECHAT_APP_ID || 'touristappid';
const configuredApi = process.env.MINIPROGRAM_API_BASE_URL || 'http://localhost:3000/api/v1';
const api = new URL(configuredApi);
if (api.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(api.hostname)) {
  throw new Error('MINIPROGRAM_API_BASE_URL 必须使用 HTTPS');
}

await rm(output, { recursive: true, force: true });

async function compile(file, target) {
  const input = await readFile(file, 'utf8');
  const libraryPath = relative(dirname(target), shared).split(sep).join('/');
  const code = ts.transpileModule(input, {
    fileName: file,
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText.replace(/require\("@baby-record\/shared"\)/g, 'require(' + JSON.stringify(libraryPath.startsWith('.') ? libraryPath : './' + libraryPath) + ')');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, code);
}

async function emit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    const target = join(output, relative(source, file));
    if (entry.isDirectory()) await emit(file);
    else if (file.endsWith('.d.ts')) continue;
    else if (file.endsWith('.ts')) await compile(file, target.replace(/\.ts$/, '.js'));
    else {
      await mkdir(dirname(target), { recursive: true });
      await cp(file, target);
    }
  }
}

await emit(source);
await compile(resolve(root, '../../packages/shared/src/index.ts'), shared);
await writeFile(join(output, 'lib/config.js'), 'exports.apiBase = ' + JSON.stringify(api.href.replace(/\/$/, '')) + ';\n');
await writeFile(join(output, 'project.config.json'), JSON.stringify({
  appid: appId, projectname: '宝宝成长记录', compileType: 'miniprogram', miniprogramRoot: './',
  setting: { es6: true, minified: true, urlCheck: api.protocol === 'https:' },
}, null, 2));
console.log(output);
