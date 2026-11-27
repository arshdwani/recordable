// A small, dependency-free PDF writer for incident reports and logs: Letter pages, Helvetica, word-wrapped headings, paragraphs
// and bullets. Text is WinAnsi (Latin-1 plus typographic quotes and dashes), which covers English.

// Helvetica advance widths (1/1000 em) for ASCII 32..126, from the standard Adobe AFM.
const W = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const WIN = { '€': 0x80, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '…': 0x85, '™': 0x99, '→': 0x3e };

/** Map a string to WinAnsi byte values (unknown characters become '?'). */
export function winAnsi(s) {
  const out = [];
  for (const ch of String(s)) {
    const cp = ch.codePointAt(0);
    if (cp === 0x2192) { out.push(0x2d, 0x3e); continue; } // → as ->
    if (WIN[ch] !== undefined) out.push(WIN[ch]);
    else if (cp >= 32 && cp <= 126) out.push(cp);
    else if (cp >= 160 && cp <= 255) out.push(cp);
    else if (cp === 9) out.push(32);
    else out.push(63);
  }
  return out;
}

const charWidth = (b) => (b >= 32 && b <= 126 ? W[b - 32] : 556);
export const textWidth = (s, size, bold = false) => (winAnsi(s).reduce((a, b) => a + charWidth(b), 0) * size * (bold ? 1.06 : 1)) / 1000;

/** Greedy word wrap to `width` points. */
export function wrap(text, size, width, bold = false) {
  const lines = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= width || !line) line = next;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}

const esc = (s) => winAnsi(s).map((b) => (b === 0x28 || b === 0x29 || b === 0x5c ? `\\${String.fromCharCode(b)}` : b > 126 ? `\\${b.toString(8).padStart(3, '0')}` : String.fromCharCode(b))).join('');

const STYLE = {
  title: { size: 16, bold: true, before: 4, after: 6, lead: 20 },
  h: { size: 11.5, bold: true, before: 10, after: 3, lead: 14 },
  p: { size: 9.5, bold: false, before: 0, after: 5, lead: 12.5 },
  li: { size: 9.5, bold: false, before: 0, after: 2, lead: 12.5, indent: 12 },
  small: { size: 7.5, bold: false, before: 0, after: 5, lead: 9.5, gray: true },
  gap: { size: 10, before: 0, after: 8, lead: 0 },
};
const INK = '0.09 0.11 0.15 rg';
const GRAY = '0.38 0.4 0.45 rg';

/**
 * Render blocks to a PDF (US Letter). Returns a Buffer. Blocks:
 *   { t: 'title'|'h'|'p'|'li'|'small'|'gap', text }
 *   { t: 'kv', rows: [[label, value], ...] }                  two-column label/value rows
 *   { t: 'table', cols: [{ title, w }], rows: [[cell, ...]], size } a ruled table; header repeats on new pages; w in points
 *   { t: 'box', lines: [text, ...] }                             a ruled box (certification, notices)
 * opts: { title, footer, landscape }
 */
export function renderPdf(blocks, { title = 'Document', footer = '', landscape = false } = {}) {
  const PW = landscape ? 792 : 612;
  const PH = landscape ? 612 : 792;
  const M = landscape ? 36 : 50;
  const width = PW - 2 * M;
  const pages = [[]];
  let y = PH - M;
  const ops = () => pages[pages.length - 1];
  const newPage = () => {
    pages.push([]);
    y = PH - M;
  };
  const textAt = (x, yy, str, size, bold = false, gray = false) => {
    ops().push(gray ? GRAY : INK);
    ops().push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${esc(str)}) Tj ET`);
  };
  const line = (x1, y1, x2, y2, gray = 0.75) => ops().push(`${gray} ${gray} ${gray} RG 0.5 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
  const fill = (x, yy, w, h, g = 0.94) => ops().push(`${g} ${g} ${g} rg ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  const room = (h) => { if (y - h < M + 20) newPage(); };

  for (const blk of blocks) {
    if (blk.t === 'gap') { y -= STYLE.gap.after; continue; }
    if (blk.t === 'kv') {
      const size = blk.size || 9;
      const lw = blk.labelWidth || 150;
      for (const [k, v] of blk.rows) {
        const lines = wrap(String(v ?? ''), size, width - lw - 6);
        room(lines.length * (size + 3) + 2);
        y -= size + 3;
        textAt(M, y, String(k), size, true, true);
        lines.forEach((l, i) => textAt(M + lw, y - i * (size + 3), l, size));
        y -= (lines.length - 1) * (size + 3) + 2;
      }
      y -= 4;
      continue;
    }
    if (blk.t === 'box') {
      const size = blk.size || 9;
      const all = blk.lines.flatMap((l) => wrap(String(l), size, width - 16));
      const h = all.length * (size + 3) + 12;
      room(h + 4);
      ops().push(`0.6 0.6 0.6 RG 0.7 w ${M.toFixed(2)} ${(y - h).toFixed(2)} ${width.toFixed(2)} ${h.toFixed(2)} re S`);
      let yy = y - 6;
      for (const l of all) { yy -= size + 3; textAt(M + 8, yy, l, size); }
      y -= h + 8;
      continue;
    }
    if (blk.t === 'table') {
      const size = blk.size || 7.5;
      const lead = size + 2.2;
      const total = blk.cols.reduce((a, c) => a + c.w, 0);
      const k = width / total;
      const cols = blk.cols.map((c) => ({ ...c, w: c.w * k }));
      const header = () => {
        const hl = cols.map((c) => wrap(c.title, size, c.w - 4, true));
        const hh = Math.max(...hl.map((l) => l.length)) * lead + 4;
        room(hh + lead * 2);
        fill(M, y - hh, width, hh);
        let x = M;
        cols.forEach((c, i) => { hl[i].forEach((l, j) => textAt(x + 2, y - 3 - (j + 1) * lead + 2, l, size, true)); x += c.w; });
        y -= hh;
        line(M, y, M + width, y, 0.5);
      };
      header();
      for (const row of blk.rows) {
        const cl = cols.map((c, i) => wrap(String(row[i] ?? ''), size, c.w - 4));
        const rh = Math.max(1, ...cl.map((l) => l.length)) * lead + 3;
        if (y - rh < M + 20) { newPage(); header(); }
        let x = M;
        cols.forEach((c, i) => { cl[i].forEach((l, j) => textAt(x + 2, y - (j + 1) * lead + 1, l, size)); x += c.w; });
        y -= rh;
        line(M, y, M + width, y);
      }
      y -= 8;
      continue;
    }
    const st = STYLE[blk.t] || STYLE.p;
    const indent = st.indent || 0;
    const lines = wrap(blk.text || '', st.size, width - indent, st.bold);
    y -= st.before;
    lines.forEach((ln, i) => {
      if (y - st.lead < M + 20) newPage();
      y -= st.lead;
      if (blk.t === 'li' && i === 0) textAt(M + 2, y, '•', st.size);
      textAt(M + indent, y, ln, st.size, st.bold, st.gray);
    });
    y -= st.after;
  }
  if (blocks.length && !pages[pages.length - 1].length) pages.pop();

  // Objects: 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, 5 info, then page + content pairs.
  const objs = [];
  const n = pages.length;
  const kids = pages.map((_, i) => `${6 + i * 2} 0 R`).join(' ');
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${kids}] /Count ${n} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objs[5] = `<< /Title (${esc(title)}) /Producer (Recordable) >>`;
  pages.forEach((o, i) => {
    const foot = `${GRAY} BT /F1 7.5 Tf ${M} 22 Td (${esc(`${footer}${footer ? ' · ' : ''}page ${i + 1} of ${n}`)}) Tj ET`;
    const stream = [...o, foot].join('\n');
    const len = Buffer.byteLength(stream, 'latin1');
    objs[6 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`;
    objs[7 + i * 2] = `<< /Length ${len} >>\nstream\n${stream}\nendstream`;
  });
  let out = '%PDF-1.4\n%âãÏÓ\n';
  const offsets = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(out, 'latin1');
    out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
