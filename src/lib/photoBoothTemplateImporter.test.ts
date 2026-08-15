import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  detectTemplateCategory,
  detectTemplateColour,
  displayNameFromFilename,
  formatInvalidImport,
  inspectImportSources,
  mergeTemplateCatalogue,
  naturalTemplateCompare,
  stableTemplateId,
  validateTemplateDimensions,
} from '../../scripts/import-photo-strip-templates.mjs';

const temporaryDirectories: string[] = [];

const jpegHeader = (width: number, height: number) => Buffer.from([
  0xff, 0xd8,
  0xff, 0xc0, 0x00, 0x07, 0x08,
  (height >> 8) & 0xff, height & 0xff,
  (width >> 8) & 0xff, width & 0xff,
  0xff, 0xd9,
]);

const pngHeader = (width: number, height: number) => {
  const buffer = Buffer.alloc(24);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
};

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('Photo Strip Template bulk importer', () => {
  it('derives display names, stable IDs, colours and conservative categories from filenames', () => {
    expect(displayNameFromFilename('Dusty Blue 004.png')).toBe('Dusty Blue 004');
    expect(stableTemplateId('Dusty Blue 004.png')).toBe('photo-strip-dusty-blue-004');
    expect(detectTemplateColour('Dusty Blue 004')).toBe('Blue');
    expect(detectTemplateColour('Rose Gold 001')).toBe('Rose Gold');
    expect(detectTemplateColour('Dark Green 001')).toBe('Green');
    expect(detectTemplateColour('Grey 001')).toBe('Grey');
    expect(detectTemplateColour('Gray 002')).toBe('Grey');
    expect(detectTemplateColour('Aubergine 001')).toBe('Multicolour');
    expect(detectTemplateCategory('Botanical Green 001')).toBe('Botanical');
    expect(detectTemplateCategory('Blue 001')).toBe('General');
  });

  it('validates exact 1200 × 1800 dimensions and reports invalid actual dimensions', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ww-photo-strip-import-'));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, 'Blue 001.jpg'), jpegHeader(1200, 1800));
    await writeFile(join(directory, 'Pink 001.png'), pngHeader(1200, 1800));
    await writeFile(join(directory, 'Gold 001.jpeg'), jpegHeader(800, 600));
    await writeFile(join(directory, 'README.md'), 'ignored');

    const result = await inspectImportSources(directory);
    expect(result.scanned).toBe(3);
    expect(result.valid.map((entry) => entry.filename)).toEqual(['Blue 001.jpg', 'Pink 001.png']);
    expect(result.invalid).toEqual([{ filename: 'Gold 001.jpeg', width: 800, height: 600 }]);
    expect(formatInvalidImport(result.invalid[0])).toBe('Gold 001.jpeg: 800 x 600 (expected 1200 x 1800)');
    expect(validateTemplateDimensions({ width: 1200, height: 1800 })).toBe(true);
    expect(validateTemplateDimensions({ width: 1800, height: 1200 })).toBe(false);
  });

  it('reports unreadable and duplicate source files without rejecting other valid images', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'ww-photo-strip-import-'));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, 'Blue 001.jpg'), jpegHeader(1200, 1800));
    await writeFile(join(directory, 'Blue 001.png'), pngHeader(1200, 1800));
    await writeFile(join(directory, 'Broken 001.jpg'), Buffer.from('not an image'));

    const result = await inspectImportSources(directory);
    expect(result.valid).toHaveLength(1);
    expect(result.invalid.map(formatInvalidImport)).toEqual(expect.arrayContaining([
      expect.stringContaining('duplicates stable template ID photo-strip-blue-001'),
      'Broken 001.jpg: not a readable JPEG or PNG image',
    ]));
  });

  it('naturally sorts colour-number names and updates duplicates idempotently', () => {
    const entry = (name: string, sourceFilename = `${name}.jpg`) => ({
      id: stableTemplateId(sourceFilename), name, category: 'General', colour: detectTemplateColour(name),
      url: `/originals/${sourceFilename}`, thumbUrl: `/thumbs/${name}.jpg`, sourceFilename,
    });
    const incoming = [entry('Blue 010'), entry('Blue 002'), entry('Blue 001')].sort(naturalTemplateCompare);
    expect(incoming.map((item) => item.name)).toEqual(['Blue 001', 'Blue 002', 'Blue 010']);

    const oldBlue = { ...entry('Blue 001'), thumbUrl: '/old-thumb.jpg' };
    const retained = entry('Pink 001');
    const merged = mergeTemplateCatalogue([oldBlue, retained], incoming);
    expect(merged).toHaveLength(4);
    expect(merged.filter((item) => item.id === oldBlue.id)).toHaveLength(1);
    expect(merged.find((item) => item.id === oldBlue.id)?.thumbUrl).not.toBe('/old-thumb.jpg');
  });
});
