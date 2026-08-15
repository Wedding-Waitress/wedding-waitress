import { createHash } from 'node:crypto';
import {
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REQUIRED_TEMPLATE_SIZE = Object.freeze({ width: 1200, height: 1800 });
export const SUPPORTED_TEMPLATE_EXTENSIONS = Object.freeze(['.jpg', '.jpeg', '.png']);
export const SUPPORTED_TEMPLATE_COLOURS = Object.freeze([
  'Black', 'Black and White', 'Blue', 'Brown', 'Burgundy', 'Champagne', 'Cream',
  'Gold', 'Green', 'Grey', 'Ivory', 'Orange', 'Pink', 'Purple', 'Red', 'Rose Gold',
  'Silver', 'Teal', 'White', 'Yellow', 'Multicolour',
]);

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(scriptDirectory, '..');
export const IMPORT_DIRECTORY = join(PROJECT_ROOT, 'photo-strip-template-import');
export const ORIGINALS_DIRECTORY = join(PROJECT_ROOT, 'public', 'photobooth-templates', 'originals');
export const THUMBNAILS_DIRECTORY = join(PROJECT_ROOT, 'public', 'photobooth-templates', 'thumbnails');
export const CATALOGUE_PATH = join(PROJECT_ROOT, 'src', 'lib', 'photoBoothBackgroundTemplates.catalogue.json');

const naturalCollator = new Intl.Collator('en-AU', { numeric: true, sensitivity: 'base' });
const normaliseWords = (value) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, ' ');

const colourMatchers = [
  ['Rose Gold', /\brose[\s_-]*gold\b/i],
  ['Black and White', /\bblack[\s_-]*(?:and|&)[\s_-]*white\b|\bblack[\s_-]*white\b/i],
  ['Multicolour', /\bmulti[\s_-]*colou?r\b|\brainbow\b/i],
  ['Champagne', /\bchampagne\b/i],
  ['Burgundy', /\bburgundy\b|\bmaroon\b|\bwine\b/i],
  ['Cream', /\bcream\b/i],
  ['Ivory', /\bivory\b/i],
  ['Silver', /\bsilver\b/i],
  ['Grey', /\bgr[ae]y\b/i],
  ['Purple', /\bpurple\b|\blavender\b|\blilac\b|\bplum\b/i],
  ['Orange', /\borange\b|\bterracotta\b/i],
  ['Pink', /\bpink\b|\bblush\b/i],
  ['Green', /\bgreen\b|\bsage\b|\bemerald\b/i],
  ['Blue', /\bblue\b|\bnavy\b|\bteal blue\b/i],
  ['Teal', /\bteal\b|\bturquoise\b/i],
  ['Brown', /\bbrown\b|\bespresso\b|\bchocolate\b/i],
  ['Gold', /\bgold\b|\bgolden\b/i],
  ['Black', /\bblack\b|\bcharcoal\b/i],
  ['White', /\bwhite\b/i],
  ['Red', /\bred\b|\bscarlet\b|\bcrimson\b/i],
  ['Yellow', /\byellow\b/i],
];

const categoryMatchers = [
  ['Wedding Waitress', /\bwedding[\s_-]*waitress\b/i],
  ['Botanical', /\bbotanical\b|\bgarden\b/i],
  ['Classic', /\bclassic\b/i],
  ['Elegant', /\belegan(?:t|ce)\b/i],
  ['Floral', /\bfloral\b|\brose\b/i],
  ['Modern', /\bmodern\b/i],
  ['Luxe', /\bluxe\b|\bluxury\b/i],
  ['Boho', /\bboho\b/i],
];

export const displayNameFromFilename = (filename) => basename(filename, extname(filename)).trim();

export const detectTemplateColour = (name) => {
  const words = normaliseWords(name);
  return colourMatchers.find(([, matcher]) => matcher.test(words))?.[0] ?? 'Multicolour';
};

export const detectTemplateCategory = (name) => {
  const words = normaliseWords(name);
  return categoryMatchers.find(([, matcher]) => matcher.test(words))?.[0] ?? 'General';
};

export const stableTemplateId = (filename) => {
  const stem = displayNameFromFilename(filename);
  const slug = normaliseWords(stem)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const safeSlug = slug || createHash('sha256').update(stem).digest('hex').slice(0, 12);
  return `photo-strip-${safeSlug}`;
};

export const naturalTemplateCompare = (left, right) =>
  naturalCollator.compare(left.colour, right.colour)
  || naturalCollator.compare(left.name, right.name)
  || naturalCollator.compare(left.id, right.id);

export const mergeTemplateCatalogue = (existing, incoming) => {
  const merged = [];
  const incomingIds = new Set(incoming.map((entry) => entry.id.toLowerCase()));
  const incomingNames = new Set(incoming.map((entry) => entry.sourceFilename.toLowerCase()));
  for (const entry of existing) {
    if (!incomingIds.has(entry.id.toLowerCase()) && !incomingNames.has(entry.sourceFilename.toLowerCase())) {
      merged.push(entry);
    }
  }
  return [...merged, ...incoming].sort(naturalTemplateCompare);
};

const parsePngDimensions = (buffer) => {
  const signature = '89504e470d0a1a0a';
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return null;
  return { format: 'png', width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const jpegStartOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
const parseJpegDimensions = (buffer) => {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    while (buffer[offset] === 0xff) offset += 1;
    const marker = buffer[offset];
    offset += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (marker === 0xda) break;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    if (jpegStartOfFrameMarkers.has(marker) && segmentLength >= 7) {
      return { format: 'jpeg', height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
    }
    offset += segmentLength;
  }
  return null;
};

export const readImageDimensions = async (path) => {
  const buffer = await readFile(path);
  return parsePngDimensions(buffer) ?? parseJpegDimensions(buffer);
};

export const validateTemplateDimensions = ({ width, height }) =>
  width === REQUIRED_TEMPLATE_SIZE.width && height === REQUIRED_TEMPLATE_SIZE.height;

export const formatInvalidImport = ({ filename, width, height, reason }) => {
  if (Number.isFinite(width) && Number.isFinite(height)) {
    return `${filename}: ${width} x ${height} (expected 1200 x 1800)`;
  }
  return `${filename}: ${reason || 'could not read image dimensions'}`;
};

export const inspectImportSources = async (directory = IMPORT_DIRECTORY) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const supported = entries
    .filter((entry) => entry.isFile() && SUPPORTED_TEMPLATE_EXTENSIONS.includes(extname(entry.name).toLowerCase()))
    .sort((a, b) => naturalCollator.compare(a.name, b.name));
  const valid = [];
  const invalid = [];
  const seenIds = new Set();

  for (const entry of supported) {
    const sourcePath = join(directory, entry.name);
    try {
      const dimensions = await readImageDimensions(sourcePath);
      if (!dimensions) {
        invalid.push({ filename: entry.name, reason: 'not a readable JPEG or PNG image' });
        continue;
      }
      const expectedFormat = extname(entry.name).toLowerCase() === '.png' ? 'png' : 'jpeg';
      if (dimensions.format !== expectedFormat) {
        invalid.push({ filename: entry.name, reason: `file contents are ${dimensions.format}, not ${expectedFormat}` });
        continue;
      }
      if (!validateTemplateDimensions(dimensions)) {
        invalid.push({ filename: entry.name, width: dimensions.width, height: dimensions.height });
        continue;
      }
      const id = stableTemplateId(entry.name);
      if (seenIds.has(id)) {
        invalid.push({ filename: entry.name, reason: `duplicates stable template ID ${id}` });
        continue;
      }
      seenIds.add(id);
      valid.push({ filename: entry.name, sourcePath, id, ...dimensions });
    } catch (error) {
      invalid.push({ filename: entry.name, reason: error instanceof Error ? error.message : String(error) });
    }
  }
  return { scanned: supported.length, valid, invalid };
};

const createThumbnails = async (jobs) => {
  if (process.platform !== 'win32') {
    throw new Error('Thumbnail generation currently requires Windows PowerShell.');
  }
  const jobFile = join(tmpdir(), `ww-photo-strip-jobs-${process.pid}.json`);
  const resultFile = join(tmpdir(), `ww-photo-strip-results-${process.pid}.json`);
  await writeFile(jobFile, JSON.stringify(jobs), 'utf8');
  try {
    const powershell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    const result = spawnSync(powershell, [
      '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
      '-File', join(scriptDirectory, 'create-photo-strip-thumbnails.ps1'),
      '-JobsFile', jobFile,
      '-ResultsFile', resultFile,
    ], { encoding: 'utf8' });
    if (result.status !== 0) throw new Error(result.stderr.trim() || 'Thumbnail generation failed.');
    const raw = (await readFile(resultFile, 'utf8')).replace(/^\uFEFF/, '');
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [parsed];
  } finally {
    await rm(jobFile, { force: true });
    await rm(resultFile, { force: true });
  }
};

const writeCatalogueAtomically = async (catalogue) => {
  const temporaryPath = `${CATALOGUE_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(catalogue, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, CATALOGUE_PATH);
};

export const runImport = async () => {
  await mkdir(ORIGINALS_DIRECTORY, { recursive: true });
  await mkdir(THUMBNAILS_DIRECTORY, { recursive: true });
  const inspection = await inspectImportSources();
  const existing = JSON.parse(await readFile(CATALOGUE_PATH, 'utf8'));
  const jobs = inspection.valid.map((source) => ({
    id: source.id,
    source: source.sourcePath,
    destination: join(THUMBNAILS_DIRECTORY, `${source.id}-thumb.jpg`),
  }));
  const thumbnailResults = jobs.length ? await createThumbnails(jobs) : [];
  const resultById = new Map(thumbnailResults.map((result) => [result.id, result]));
  const imported = [];
  const processingFailures = [];
  const unrecognisedColours = [];

  for (const source of inspection.valid) {
    const thumbnailResult = resultById.get(source.id);
    if (!thumbnailResult?.ok) {
      processingFailures.push({ filename: source.filename, reason: thumbnailResult?.error || 'thumbnail was not generated' });
      continue;
    }
    const extension = extname(source.filename).toLowerCase();
    const originalFilename = `${source.id}${extension}`;
    await copyFile(source.sourcePath, join(ORIGINALS_DIRECTORY, originalFilename));
    const name = displayNameFromFilename(source.filename);
    const colour = detectTemplateColour(name);
    if (colour === 'Multicolour' && !/multi[\s_-]*colou?r|rainbow/i.test(name)) unrecognisedColours.push(source.filename);
    imported.push({
      id: source.id,
      name,
      category: detectTemplateCategory(name),
      colour,
      url: `/photobooth-templates/originals/${encodeURIComponent(originalFilename)}`,
      thumbUrl: `/photobooth-templates/thumbnails/${encodeURIComponent(`${source.id}-thumb.jpg`)}`,
      sourceFilename: source.filename,
    });
  }

  const catalogue = mergeTemplateCatalogue(existing, imported);
  await writeCatalogueAtomically(catalogue);
  const failures = [...inspection.invalid, ...processingFailures];

  console.log('\nPhoto Strip Template Import');
  console.log(`Scanned: ${inspection.scanned}`);
  console.log(`Imported or updated: ${imported.length}`);
  console.log(`Catalogue total: ${catalogue.length}`);
  console.log(`Skipped: ${failures.length}`);
  if (failures.length) {
    console.log('\nSkipped files:');
    failures.forEach((failure) => console.log(`- ${formatInvalidImport(failure)}`));
  }
  if (unrecognisedColours.length) {
    console.log('\nAssigned Multicolour because no recognised colour was found:');
    unrecognisedColours.forEach((filename) => console.log(`- ${filename}`));
  }
  console.log(`\nSupported colours: ${SUPPORTED_TEMPLATE_COLOURS.join(', ')}`);
  return { ...inspection, imported, catalogue, failures, unrecognisedColours };
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  runImport().catch((error) => {
    console.error(`Photo-strip template import failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
