/**
 * WHO 儿童生长标准 → growth-standards.json 生成脚本（一次性数据工具）
 *
 * 数据源（WHO Child Growth Standards 2006，百分位展开表，按日 0–1856 天）：
 * - 身长/身高 lhfa-boys|girls-percentiles-expanded-tables.xlsx
 * - 体重   wfa-boys|girls-percentiles-expanded-tables.xlsx
 *
 * 抽取规则：按表头定位 P3 / P50 / P97 列；月龄 m(0–60) 采样日 = round(m × 30.4375)。
 * 产出：apps/backend/src/config/growth-standards.json
 * 身高保留 1 位小数(cm)，体重保留 2 位小数(kg)。
 *
 * 运行：node scripts/build-growth-standards.mjs
 */
import { inflateRawSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { get as httpsGet } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '../apps/backend/src/config/growth-standards.json');

const BASE = 'https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators';
const SOURCES = {
  heightBoys: `${BASE}/length-height-for-age/expandable-tables/lhfa-boys-percentiles-expanded-tables.xlsx`,
  heightGirls: `${BASE}/length-height-for-age/expandable-tables/lhfa-girls-percentiles-expanded-tables.xlsx`,
  weightBoys: `${BASE}/weight-for-age/expanded-tables/wfa-boys-percentiles-expanded-tables.xlsx`,
  weightGirls: `${BASE}/weight-for-age/expanded-tables/wfa-girls-percentiles-expanded-tables.xlsx`,
};
const SOURCE_URL = 'https://www.who.int/tools/child-growth-standards/standards/length-height-for-age';

const MONTH_DAYS = 30.4375; // WHO 一个月的平均天数
const MONTHS = 60;

// ---------- 极简 xlsx（zip）读取 ----------
function unzip(buffer) {
  // 定位 End of Central Directory
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 65558; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('zip: EOCD not found');
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const files = new Map();
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(p) !== 0x02014b50) throw new Error('zip: bad central directory');
    const method = buffer.readUInt16LE(p + 10);
    const compressedSize = buffer.readUInt32LE(p + 20);
    const nameLen = buffer.readUInt16LE(p + 28);
    const extraLen = buffer.readUInt16LE(p + 30);
    const commentLen = buffer.readUInt16LE(p + 32);
    const localOffset = buffer.readUInt32LE(p + 42);
    const name = buffer.slice(p + 46, p + 46 + nameLen).toString('utf8');
    // local header: 30 字节定长 + 文件名 + 扩展字段
    const lNameLen = buffer.readUInt16LE(localOffset + 26);
    const lExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buffer.slice(dataStart, dataStart + compressedSize);
    files.set(name, method === 8 ? inflateRawSync(raw) : raw);
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

function parseSharedStrings(xml) {
  const strings = [];
  for (const m of xml.matchAll(/<si[^>]*>([\s\S]*?)<\/si>/g)) {
    const text = [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('');
    strings.push(text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  }
  return strings;
}

/** 返回 { headers: string[], rows: Map<number, number[]> }，rows 键为首列（天龄）数值 */
function parseSheet(sheetXml, sharedStrings) {
  const rows = [];
  for (const rowMatch of sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c[^>]*?\/>|<c[^>]*>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[0].slice(0, cellMatch[0].indexOf('>'));
      const t = /t="(\w+)"/.exec(attrs)?.[1];
      const v = /<v>([^<]*)<\/v>/.exec(cellMatch[0])?.[1];
      if (v === undefined) { cells.push(null); continue; }
      cells.push(t === 's' ? sharedStrings[Number(v)] : Number(v));
    }
    rows.push(cells);
  }
  const headers = rows[0].map((h) => String(h));
  const dataRows = new Map();
  for (const cells of rows.slice(1)) {
    const day = cells[0];
    if (typeof day !== 'number' || !Number.isInteger(day)) continue;
    dataRows.set(day, cells);
  }
  return { headers, dataRows };
}

function fetchBuffer(url, redirects = 3) {
  return new Promise((resolve, reject) => {
    httpsGet(url, { headers: { 'User-Agent': 'baby-record-data-build' } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        resolve(fetchBuffer(new URL(res.headers.location, url).toString(), redirects - 1));
        return;
      }
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode} for ${url}`)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/** 从一份 xlsx 提取月龄 0–60 的 P3/P50/P97 */
async function extractMetric(url, unitDecimals) {
  const zip = unzip(await fetchBuffer(url));
  const sheetName = [...zip.keys()].find((n) => /^xl\/worksheets\/sheet1\.xml$/.test(n));
  const sharedStrings = parseSharedStrings(zip.get('xl/sharedStrings.xml').toString('utf8'));
  const { headers, dataRows } = parseSheet(zip.get(sheetName).toString('utf8'), sharedStrings);

  const idx = { p3: headers.indexOf('P3'), p50: headers.indexOf('P50'), p97: headers.indexOf('P97') };
  if (idx.p3 < 0 || idx.p50 < 0 || idx.p97 < 0) throw new Error(`columns not found in ${url}: ${headers}`);

  const round = (v, d) => Number(v.toFixed(d));
  const out = { p3: [], p50: [], p97: [] };
  for (let month = 0; month <= MONTHS; month++) {
    const day = Math.round(month * MONTH_DAYS);
    const row = dataRows.get(day);
    if (!row || typeof row[idx.p3] !== 'number') throw new Error(`missing day ${day} (month ${month}) in ${url}`);
    out.p3.push(round(row[idx.p3], unitDecimals));
    out.p50.push(round(row[idx.p50], unitDecimals));
    out.p97.push(round(row[idx.p97], unitDecimals));
  }
  // 断言：逐月 P3 < P50 < P97
  for (let m = 0; m <= MONTHS; m++) {
    if (!(out.p3[m] < out.p50[m] && out.p50[m] < out.p97[m])) {
      throw new Error(`percentiles not monotonic at month ${m}: ${out.p3[m]},${out.p50[m]},${out.p97[m]}`);
    }
  }
  return out;
}

// ---------- 主流程 ----------
const config = {
  source: 'WHO Child Growth Standards (2006), percentiles expanded tables',
  sourceUrl: SOURCE_URL,
  generatedAt: new Date().toISOString().slice(0, 10),
  note: '身高 0–24 月为卧式身长、24 月后为立式身高（WHO 展开表已含换算）；体重单位 kg。索引 = 月龄（0–60）。',
  heightCm: { boys: null, girls: null },
  weightKg: { boys: null, girls: null },
};

const jobs = [
  ['heightCm', 'boys', SOURCES.heightBoys, 1],
  ['heightCm', 'girls', SOURCES.heightGirls, 1],
  ['weightKg', 'boys', SOURCES.weightBoys, 2],
  ['weightKg', 'girls', SOURCES.weightGirls, 2],
];

for (const [metric, gender, url, decimals] of jobs) {
  process.stdout.write(`提取 ${metric}.${gender} … `);
  config[metric][gender] = await extractMetric(url, decimals);
  console.log(`ok（m0: P3=${config[metric][gender].p3[0]} P50=${config[metric][gender].p50[0]} P97=${config[metric][gender].p97[0]}，m60: P50=${config[metric][gender].p50[MONTHS]}）`);
}

// 与 WHO 公布值抽查比对（±1 容差）
const spot = (label, actual, expected, tol) => {
  if (Math.abs(actual - expected) > tol) throw new Error(`${label}: got ${actual}, expected ≈ ${expected}`);
};
spot('boys height m0 P50', config.heightCm.boys.p50[0], 49.9, 0.2);
spot('boys height m12 P50', config.heightCm.boys.p50[12], 75.7, 0.3);
spot('boys weight m0 P50', config.weightKg.boys.p50[0], 3.3, 0.2);
spot('girls height m24 P50', config.heightCm.girls.p50[24], 85.7, 0.3);
spot('girls weight m12 P50', config.weightKg.girls.p50[12], 8.9, 0.3);
console.log('抽查值通过');

mkdirSync(dirname(OUT_PATH), { recursive: true });
writeFileSync(OUT_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log(`已写入 ${OUT_PATH}`);
