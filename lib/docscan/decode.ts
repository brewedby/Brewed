/**
 * Text-encoding detection for picked report files. Pure module.
 *
 * Square's transaction-items CSV export is UTF-16LE with a BOM — a real
 * file, not a hypothetical. UTF-8 (with or without BOM) stays the default.
 */
export function decodeTextBytes(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    let s = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) s += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
    return s;
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let s = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) s += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    return s;
  }
  let start = 0;
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) start = 3;
  let s = '';
  for (let i = start; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  try {
    // eslint-disable-next-line no-undef
    return decodeURIComponent(escape(s)); // UTF-8 re-decode
  } catch {
    return s; // already Latin-1/ASCII-safe
  }
}
