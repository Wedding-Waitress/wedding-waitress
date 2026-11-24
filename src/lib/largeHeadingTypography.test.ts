import { beforeEach, describe, expect, it } from 'vitest';
import { LARGE_HEADING_MARKER, updateLargeHeadings } from './largeHeadingTypography';

describe('large interface heading opt-in', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="root"></div>'; });
  const render = (html: string) => { document.getElementById('root')!.innerHTML = html; updateLargeHeadings(); };
  const category = (id: string) => document.getElementById(id)?.getAttribute(LARGE_HEADING_MARKER);

  it('covers public hero and large section headings while leaving card headings and body copy alone', () => {
    render('<main class="ww-public"><h1 id="hero" class="ww-display">Hero</h1><h2 id="section" class="ww-title">Section</h2><h2 id="blog" class="text-2xl md:text-3xl">Article section</h2><h3 id="card" style="font-size:20px">Card</h3><p id="body" style="font-size:24px">Lead</p><button id="button" style="font-size:24px">Action</button></main>');
    expect(category('hero')).toBe('hero');
    expect(category('section')).toBe('section');
    expect(category('blog')).toBe('section');
    for (const id of ['card', 'body', 'button']) expect(category(id)).toBeNull();
  });

  it('preserves small text and button labels while including explicit print-size labels and export titles', () => {
    render('<main><h1 id="main" style="font-size:28px">Dashboard</h1><h3 id="section" style="font-size:20px">Section</h3><h3 id="small" style="font-size:14px">Small</h3><button><h2 id="button" style="font-size:24px">Action</h2><span id="size" class="_printSizeTitle_123">A3</span></button><div id="export" data-export-controls-heading style="font-size:14px">Export Controls</div></main>');
    expect(category('main')).toBe('main');
    expect(category('section')).toBe('compact');
    expect(category('small')).toBeNull();
    expect(category('button')).toBeNull();
    expect(category('size')).toBe('main');
    expect(category('export')).toBe('control');
  });

  it('reaches portalled pop-outs without styling artwork, PDF documents, slideshow stages or sidebar text', () => {
    render('<main><div data-print-mirror-document><h1 id="document" style="font-size:36px">Printed title</h1></div><div data-slideshow-preview-stage><h2 id="slide" style="font-size:32px">Slide content</h2></div><div data-dashboard-sidebar><h2 id="sidebar" style="font-size:24px">Navigation</h2></div></main>');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML = '<h2 id="dialog" style="font-size:20px">Add Expense</h2><div data-dashboard-artwork><h2 id="artwork" style="font-size:40px">Couple names</h2></div>';
    document.body.append(dialog);
    updateLargeHeadings();
    expect(category('dialog')).toBe('main');
    for (const id of ['document', 'slide', 'sidebar', 'artwork']) expect(category(id)).toBeNull();
  });

  it('does not change buttons embedded in editable headings through inheritance', () => {
    render('<h3 id="editable" style="font-size:24px"><button>Edit section title</button></h3>');
    expect(category('editable')).toBeNull();
  });

  it('includes the explicitly requested print-guidelines title even though it uses a paragraph element', () => {
    render('<p id="guidelines" class="ww-signage-guidelines-title" style="font-size:20px"><span>Professional Wedding Print Guidelines</span></p><p id="copy" style="font-size:20px">General text</p>');
    expect(category('guidelines')).toBe('compact');
    expect(category('copy')).toBeNull();
  });

  it('matches invitation and signage size labels and explicitly promoted management headings at the main size', () => {
    render('<button><strong id="paper" data-ww-paper-size style="font-size:24px">A4</strong><span id="description">Larger invitation</span></button><p id="manage" data-ww-heading="main" style="font-size:13px">Manage your invitations and cards</p>');
    expect(category('paper')).toBe('main');
    expect(category('manage')).toBe('main');
    expect(category('description')).toBeNull();
  });

  it('opts the five shared feature-page headers into their larger size without promoting the description', () => {
    render('<h1 id="feature" data-ww-heading="workspace" style="font-size:24px">Photo &amp; Video Sharing</h1><p id="description" style="font-size:13px">Manage your event</p>');
    expect(category('feature')).toBe('workspace');
    expect(category('description')).toBeNull();
    document.getElementById('feature')!.setAttribute('data-ww-heading', 'main');
    updateLargeHeadings(document.getElementById('feature')!);
    expect(category('feature')).toBe('main');
  });

  it('includes explicitly identified countdown headings without changing ordinary paragraphs', () => {
    render('<p id="timer" data-ww-heading style="font-size:24px">Your event details &amp; countdown timer</p><p id="event" data-ww-heading style="font-size:24px">Event name</p><p id="body" style="font-size:24px">General text</p>');
    expect(category('timer')).toBe('main');
    expect(category('event')).toBe('main');
    expect(category('body')).toBeNull();
    document.getElementById('timer')!.removeAttribute('data-ww-heading');
    updateLargeHeadings(document.getElementById('timer')!);
    expect(category('timer')).toBeNull();
  });
});
