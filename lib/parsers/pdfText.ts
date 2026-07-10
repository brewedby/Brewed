/**
 * On-device PDF text extraction engine.
 *
 * Everything runs locally — no network, no OCR service, no uploads.
 * Verified against real EPOS/settlement documents from Dines, Square,
 * Global Payments and Togather (PandaDoc) generators.
 *
 * Capabilities (each one exists because a real document needed it):
 *  - CR/LF/CRLF stream delimiters (PandaDoc contracts use \r\n)
 *  - FlateDecode via pako
 *  - Object streams (/ObjStm) — modern writers hide font dicts inside them
 *  - ToUnicode CMaps, 1- and 2-byte codespaces (Global Payments reports
 *    use 2-byte CID fonts that are pure glyph soup without the CMap)
 *  - Indirect /Resources and /Font references (PandaDoc)
 *  - Per-string font tracking via the Tf operator
 *  - Line assembly from Td/TD/Tm/T* with y-awareness (per-glyph
 *    positioning must not split every character onto its own line)
 *  - Uniform-shift fallback for subset fonts with NO ToUnicode (Dines
 *    statements) — flagged so callers can lower confidence
 *
 * NOT supported (honest limits): encrypted PDFs (detected + reported),
 * image-only/scanned pages (no OCR — detected + reported), JBIG2/CCITT.
 */

import pako from 'pako';

// ── Binary helpers ───────────────────────────────────────────────────────────

function bytesToLatin1(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}
function latin1ToBytes(s: string): Uint8Array {
  const b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xff;
  return b;
}

// ── Object model ─────────────────────────────────────────────────────────────

interface PdfObj { dict: string; stream: string | null }

function inflateOrNull(data: string): string | null {
  try { return bytesToLatin1(pako.inflate(latin1ToBytes(data))); } catch { return null; }
}

/** Parse every indirect object; decode Flate streams; unpack /ObjStm. */
function parseObjects(raw: string): Map<number, PdfObj> {
  const objs = new Map<number, PdfObj>();
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    const id = parseInt(m[1], 10);
    const start = re.lastIndex;
    const end = raw.indexOf('endobj', start);
    if (end === -1) continue;
    const body = raw.slice(start, end);
    const streamM = body.match(/stream(\r\n|\r|\n)/);
    let dict = body;
    let stream: string | null = null;
    if (streamM && streamM.index !== undefined) {
      dict = body.slice(0, streamM.index);
      const dataStart = streamM.index + streamM[0].length;
      const dataEnd = body.lastIndexOf('endstream');
      let data = body.slice(dataStart, dataEnd === -1 ? undefined : dataEnd).replace(/[\r\n]+$/, '');
      if (/\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[\s*\/FlateDecode\s*\]/.test(dict)) {
        data = inflateOrNull(data) ?? '';
      }
      stream = data;
    }
    objs.set(id, { dict, stream });
  }

  // /ObjStm: header of N (objnum, offset) pairs then concatenated bodies.
  for (const [, obj] of Array.from(objs)) {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict) || !obj.stream) continue;
    const nM = obj.dict.match(/\/N\s+(\d+)/);
    const firstM = obj.dict.match(/\/First\s+(\d+)/);
    if (!nM || !firstM) continue;
    const n = parseInt(nM[1], 10);
    const first = parseInt(firstM[1], 10);
    const header = obj.stream.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const objNum = header[k * 2];
      const off = header[k * 2 + 1];
      const nextOff = k + 1 < n ? header[(k + 1) * 2 + 1] : obj.stream.length - first;
      if (objNum === undefined || off === undefined) continue;
      const body = obj.stream.slice(first + off, first + nextOff);
      if (!objs.has(objNum)) objs.set(objNum, { dict: body, stream: null });
    }
  }
  return objs;
}

// ── ToUnicode CMaps ──────────────────────────────────────────────────────────

interface CMap { byteWidth: 1 | 2; map: Map<number, string> }

function parseCMap(cmapText: string): CMap {
  const map = new Map<number, string>();
  let byteWidth: 1 | 2 = 1;
  const cs = cmapText.match(/begincodespacerange\s*<([0-9a-fA-F]+)>/);
  if (cs && cs[1].length >= 4) byteWidth = 2;

  const hexToStr = (hex: string): string => {
    const padded = hex.length % 4 === 0 ? hex : hex.padStart(Math.ceil(hex.length / 4) * 4, '0');
    let out = '';
    for (let i = 0; i + 4 <= padded.length; i += 4) {
      const cp = parseInt(padded.slice(i, i + 4), 16);
      if (!isNaN(cp) && cp > 0) out += String.fromCharCode(cp);
    }
    return out;
  };

  const bfcharRe = /beginbfchar([\s\S]*?)endbfchar/g;
  let m: RegExpExecArray | null;
  while ((m = bfcharRe.exec(cmapText)) !== null) {
    const pairRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let p: RegExpExecArray | null;
    while ((p = pairRe.exec(m[1])) !== null) {
      map.set(parseInt(p[1], 16), hexToStr(p[2]));
    }
  }

  const bfrangeRe = /beginbfrange([\s\S]*?)endbfrange/g;
  while ((m = bfrangeRe.exec(cmapText)) !== null) {
    const rangeRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\[([\s\S]*?)\])/g;
    let r: RegExpExecArray | null;
    while ((r = rangeRe.exec(m[1])) !== null) {
      const lo = parseInt(r[1], 16), hi = parseInt(r[2], 16);
      if (hi - lo > 65535) continue;
      if (r[3]) {
        const dstStart = parseInt(r[3], 16);
        for (let c = lo; c <= hi; c++) map.set(c, String.fromCharCode(dstStart + (c - lo)));
      } else if (r[4]) {
        const dsts = Array.from(r[4].matchAll(/<([0-9a-fA-F]+)>/g)).map((x) => x[1]);
        for (let c = lo; c <= hi && c - lo < dsts.length; c++) map.set(c, hexToStr(dsts[c - lo]));
      }
    }
  }
  return { byteWidth, map };
}

/** Resource font name (/F1, /TT0…) → CMap, across the whole document.
 *  Handles inline (/Font <</F1 5 0 R>>) and indirect (/Font 55 0 R). */
function buildFontMaps(objs: Map<number, PdfObj>): Map<string, CMap> {
  const cmapByObj = new Map<number, CMap>();
  for (const [id, obj] of objs) {
    if (!/\/Type\s*\/Font/.test(obj.dict) && !/\/BaseFont/.test(obj.dict)) continue;
    const tu = obj.dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    if (!tu) continue;
    const cmapObj = objs.get(parseInt(tu[1], 10));
    if (!cmapObj?.stream) continue;
    cmapByObj.set(id, parseCMap(cmapObj.stream));
  }

  const byName = new Map<string, CMap>();
  const harvest = (mapText: string) => {
    const entryRe = /\/([A-Za-z0-9]+)\s+(\d+)\s+\d+\s+R/g;
    let e: RegExpExecArray | null;
    while ((e = entryRe.exec(mapText)) !== null) {
      const cmap = cmapByObj.get(parseInt(e[2], 10));
      if (cmap) byName.set(e[1], cmap);
    }
  };
  for (const [, obj] of objs) {
    const inline = obj.dict.match(/\/Font\s*<<([\s\S]*?)>>/);
    if (inline) harvest(inline[1]);
    const indirect = obj.dict.match(/\/Font\s+(\d+)\s+\d+\s+R/);
    if (indirect) {
      const target = objs.get(parseInt(indirect[1], 10));
      if (target) harvest(target.dict);
    }
  }
  return byName;
}

function decodeWithCMap(rawStr: string, cmap: CMap | null): string {
  if (!cmap) return rawStr;
  if (cmap.byteWidth === 2) {
    const parts: (string | null)[] = [];
    let unmapped = 0;
    for (let i = 0; i + 1 < rawStr.length; i += 2) {
      const code = (rawStr.charCodeAt(i) << 8) | rawStr.charCodeAt(i + 1);
      const mapped = cmap.map.get(code);
      if (mapped === undefined) unmapped++;
      parts.push(mapped ?? null);
    }
    // A string that's MOSTLY unmapped comes from a decorative/uncovered
    // font — drop it rather than flooding output with placeholders. An
    // isolated gap in otherwise-mapped text stays VISIBLE as � so a
    // partially-corrupt amount can never be mistaken for a clean one.
    if (parts.length > 0 && unmapped / parts.length > 0.5) return '';
    return parts.map((p) => p ?? '�').join('');
  }
  let out = '';
  for (let i = 0; i < rawStr.length; i++) {
    const code = rawStr.charCodeAt(i);
    out += cmap.map.get(code) ?? rawStr[i];
  }
  return out;
}

// ── Content-stream text assembly ─────────────────────────────────────────────

function extractLines(content: string, fonts: Map<string, CMap>): string[] {
  const lines: string[] = [];
  let cur = '';
  let currentFont: CMap | null = null;
  const operands: number[] = [];
  let lastTmY: number | null = null;
  const flush = () => { const t = cur.trim(); if (t) lines.push(t); cur = ''; };

  const readLiteral = (block: string, from: number): { str: string; next: number } => {
    let j = from + 1, str = '';
    while (j < block.length) {
      if (block[j] === '\\' && j + 1 < block.length) {
        const esc = block[j + 1];
        if (esc === 'n') str += '\n';
        else if (esc === 'r') str += '\r';
        else if (esc === 't') str += '\t';
        else if (esc >= '0' && esc <= '7') {
          const oct = block.slice(j + 1).match(/^[0-7]{1,3}/)![0];
          str += String.fromCharCode(parseInt(oct, 8));
          j += oct.length - 1;
        } else str += esc;
        j += 2;
        continue;
      }
      if (block[j] === ')') { j++; break; }
      str += block[j]; j++;
    }
    return { str, next: j };
  };

  const readHex = (block: string, from: number): { str: string; next: number } => {
    let j = from + 1, hex = '';
    while (j < block.length && block[j] !== '>') { hex += block[j]; j++; }
    j++;
    if (hex.length % 2 === 1) hex += '0';
    let raw = '';
    for (let k = 0; k + 2 <= hex.length; k += 2) raw += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
    return { str: raw, next: j };
  };

  const btRe = /BT([\s\S]*?)ET/g;
  let bm: RegExpExecArray | null;
  while ((bm = btRe.exec(content)) !== null) {
    flush();
    const block = bm[1];
    let i = 0;
    while (i < block.length) {
      const ch = block[i];
      if (/\s/.test(ch)) { i++; continue; }

      if (ch === '/') {
        const fm = block.slice(i).match(/^\/([A-Za-z0-9]+)\s+[\d.]+\s+Tf/);
        if (fm) { currentFont = fonts.get(fm[1]) ?? null; i += fm[0].length; continue; }
        const nm = block.slice(i).match(/^\/[A-Za-z0-9]*/);
        i += Math.max(1, nm?.[0].length ?? 1);
        continue;
      }

      if (ch === '(') {
        const { str, next } = readLiteral(block, i);
        cur += decodeWithCMap(str, currentFont);
        i = next;
        continue;
      }

      if (ch === '<' && block[i + 1] !== '<') {
        const { str, next } = readHex(block, i);
        cur += decodeWithCMap(str, currentFont);
        i = next;
        continue;
      }

      if (ch === '[') {
        let j = i + 1, depth = 0;
        while (j < block.length) {
          if (block[j] === '[') { depth++; j++; continue; }
          if (block[j] === ']') { if (depth === 0) { j++; break; } depth--; j++; continue; }
          if (block[j] === '(') {
            const { str, next } = readLiteral(block, j);
            cur += decodeWithCMap(str, currentFont);
            j = next;
          } else if (block[j] === '<') {
            const { str, next } = readHex(block, j);
            cur += decodeWithCMap(str, currentFont);
            j = next;
          } else j++;
        }
        i = j;
        continue;
      }

      const num = block.slice(i).match(/^[+-]?[\d.]+/);
      if (num) { operands.push(parseFloat(num[0])); i += num[0].length; continue; }

      const op = block.slice(i).match(/^[a-zA-Z*"']+/);
      if (op) {
        i += op[0].length;
        // Line breaks: only when y actually moves. Per-glyph positioning
        // with ty=0 (Global Payments) or unchanged Tm-f (Dines) stays on
        // the same visual line, glyph runs separated by a space.
        if (op[0] === 'Td' || op[0] === 'TD') {
          const ty = operands[operands.length - 1] ?? 0;
          if (Math.abs(ty) > 0.01) flush(); else cur += ' ';
        } else if (op[0] === 'Tm') {
          const f = operands[operands.length - 1] ?? 0;
          if (lastTmY === null || Math.abs(f - lastTmY) > 0.01) flush(); else cur += ' ';
          lastTmY = f;
        } else if (op[0] === 'T*' || op[0] === '"' || op[0] === "'") {
          flush();
        }
        operands.length = 0;
        continue;
      }

      i++;
    }
    flush();
  }
  return lines.filter((l) => l.trim().length > 0);
}

// ── Glyph-run collapsing ─────────────────────────────────────────────────────

/**
 * Per-glyph positioned text arrives as "D a i l y   R e p o r t" (single
 * space between glyphs, 2+ between words). Collapse only when the line is
 * dominated by single-char tokens, so normal text is untouched.
 */
export function collapseGlyphRuns(line: string): string {
  const tokens = line.split(' ');
  const singles = tokens.filter((t) => t.length === 1).length;
  if (tokens.length < 4 || singles / tokens.length < 0.6) return line;
  return line
    .split(/ {2,}/)
    .map((word) => word.replace(/ /g, ''))
    .filter(Boolean)
    .join(' ');
}

// ── Uniform-shift fallback (subset fonts without ToUnicode) ──────────────────

const COMMON_BIGRAMS = ['th', 'he', 'in', 'er', 'an', 'on', 'es', 'ti', 're', 'at'];

function englishScore(text: string): number {
  if (!text) return 0;
  let score = 0;
  let printable = 0;
  for (const c of text) {
    const code = c.charCodeAt(0);
    if ((code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) || c === ' ') printable++;
  }
  score = printable / text.length;
  const lower = text.toLowerCase();
  for (const bg of COMMON_BIGRAMS) {
    if (lower.includes(bg)) score += 0.02;
  }
  return score;
}

/**
 * Detect a uniform glyph-code offset (real char = stored char + shift).
 * Dines statements store every character at code−1 with no ToUnicode.
 * Returns the shift when confident, else null.
 */
export function detectUniformShift(lines: string[]): number | null {
  const sample = lines.filter((l) => l.replace(/\s/g, '').length > 8).slice(0, 25).join('\n');
  if (sample.length < 40) return null;
  const baseline = englishScore(sample);
  // LAST RESORT ONLY: text that already reads as language must never be
  // shifted — a "better-scoring" shift of readable digits/punctuation
  // corrupts correct output. Baseline must be clearly garbage first.
  if (baseline > 0.35) return null;
  let bestShift = 0;
  let bestScore = baseline;
  for (let shift = -3; shift <= 34; shift++) {
    if (shift === 0) continue;
    let cand = '';
    for (const c of sample) {
      const code = c.charCodeAt(0) + shift;
      cand += code > 0 && code < 0xffff ? String.fromCharCode(code) : c;
    }
    const s = englishScore(cand);
    if (s > bestScore) { bestScore = s; bestShift = shift; }
  }
  // Decisive win required: strong absolute score AND a big jump over garbage.
  return bestShift !== 0 && bestScore > 0.55 && bestScore > baseline * 2 ? bestShift : null;
}

function applyShift(lines: string[], shift: number): string[] {
  return lines.map((l) => {
    let out = '';
    for (const c of l) {
      const code = c.charCodeAt(0) + shift;
      out += code > 0 && code < 0xffff ? String.fromCharCode(code) : c;
    }
    return out;
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

export type PdfTextReason =
  | 'ok'
  | 'ok_shift_decoded' // uniform-shift fallback applied — lower confidence
  | 'not_pdf'
  | 'encrypted'
  | 'image_only'
  | 'no_text';

export interface PdfTextResult {
  lines: string[];
  reason: PdfTextReason;
  fontsMapped: number;
  objectCount: number;
  usedShiftFallback: boolean;
}

export function extractPdfText(pdfBytes: Uint8Array): PdfTextResult {
  const empty = (reason: PdfTextReason, objectCount = 0, fontsMapped = 0): PdfTextResult =>
    ({ lines: [], reason, fontsMapped, objectCount, usedShiftFallback: false });

  if (!(pdfBytes[0] === 0x25 && pdfBytes[1] === 0x50 && pdfBytes[2] === 0x44 && pdfBytes[3] === 0x46)) {
    return empty('not_pdf');
  }

  const raw = bytesToLatin1(pdfBytes);
  if (/\/Encrypt\s+\d+/.test(raw)) return empty('encrypted');

  const objs = parseObjects(raw);
  const fonts = buildFontMaps(objs);

  let lines: string[] = [];
  let sawContent = false;
  for (const [, obj] of objs) {
    if (!obj.stream) continue;
    if (/\/Subtype\s*\/Image/.test(obj.dict)) continue;
    if (!/BT/.test(obj.stream)) continue;
    sawContent = true;
    lines = lines.concat(extractLines(obj.stream, fonts));
  }

  if (lines.length === 0) {
    // Streams existed but none carried text → image-only or fully opaque.
    const hasImages = Array.from(objs.values()).some((o) => /\/Subtype\s*\/Image/.test(o.dict));
    return empty(hasImages && !sawContent ? 'image_only' : 'no_text', objs.size, fonts.size);
  }

  lines = lines.map(collapseGlyphRuns);

  // Shift fallback for subset fonts with no ToUnicode (Dines).
  let usedShiftFallback = false;
  const shift = detectUniformShift(lines);
  if (shift !== null) {
    lines = applyShift(lines, shift);
    usedShiftFallback = true;
  }

  return {
    lines,
    reason: usedShiftFallback ? 'ok_shift_decoded' : 'ok',
    fontsMapped: fonts.size,
    objectCount: objs.size,
    usedShiftFallback,
  };
}
