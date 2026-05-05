import type { ProductCatalogItem, ParsedSalesLine, ReconciledLine } from '@/types/cogs';

/** Normalise a string for comparison — lowercase, alphanumeric + spaces only.
 *  Defensive: tolerates null/undefined/non-string input so a single bad row
 *  in the catalog (e.g. a product with name=null) doesn't crash the whole
 *  reconciliation pass. */
function norm(s: unknown): string {
  if (s === null || s === undefined) return '';
  const str = typeof s === 'string' ? s : String(s);
  return str.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/**
 * Levenshtein edit distance between two strings.
 * O(m×n) time — acceptable for catalog sizes up to a few hundred items.
 */
function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = Array.from({ length: n + 1 }, (_, i) => i);
  const curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return curr[n];
}

/**
 * Similarity score 0.0–1.0 between two strings.
 * Combines exact / substring / token-set / edit-distance checks.
 */
function similarity(a: string, b: string): number {
  const na = norm(a), nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Substring containment
  if (na.includes(nb) || nb.includes(na)) {
    // Reward longer matches more
    return 0.85 + 0.1 * (Math.min(na.length, nb.length) / Math.max(na.length, nb.length));
  }

  // Token-set ratio (handles word order differences like "flat white" vs "white flat")
  const tokA = new Set(na.split(' ').filter(Boolean));
  const tokB = new Set(nb.split(' ').filter(Boolean));
  const intersection = [...tokA].filter((t) => tokB.has(t)).length;
  const tokenScore = intersection > 0
    ? (2 * intersection) / (tokA.size + tokB.size)
    : 0;

  if (tokenScore >= 0.8) return tokenScore;

  // Levenshtein similarity
  const dist = editDistance(na, nb);
  const levScore = 1 - dist / Math.max(na.length, nb.length);

  return Math.max(tokenScore, levScore);
}

/**
 * Match a raw product name from a sales file against the catalog.
 * Returns the best match and its confidence score, or null if below threshold.
 */
export function matchProduct(
  productName: string,
  catalog: ProductCatalogItem[],
  threshold = 0.65,
): { product: ProductCatalogItem; confidence: number } | null {
  const activeCatalog = catalog.filter((p) => p.is_active);
  let best: ProductCatalogItem | null = null;
  let bestScore = threshold;

  for (const product of activeCatalog) {
    // Exact SKU match is always definitive
    if (product.sku && norm(productName) === norm(product.sku)) {
      return { product, confidence: 1.0 };
    }

    const score = similarity(productName, product.name);
    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return best ? { product: best, confidence: bestScore } : null;
}

/**
 * Reconcile a full list of parsed sales lines against the product catalog.
 * Returns enriched lines with COGS calculated where a match was found.
 */
export function reconcileLines(
  parsedLines: ParsedSalesLine[],
  catalog: ProductCatalogItem[],
): ReconciledLine[] {
  return parsedLines.map((line) => {
    const match = matchProduct(line.product_name, catalog);
    if (!match) {
      return {
        ...line,
        matched_product: null,
        match_confidence: 0,
        unit_cost_snapshot: null,
        cogs_calculated: null,
      };
    }
    const unitCost = match.product.unit_cost;
    return {
      ...line,
      matched_product: match.product,
      match_confidence: match.confidence,
      unit_cost_snapshot: unitCost,
      cogs_calculated: Math.round(line.quantity * unitCost * 100) / 100,
    };
  });
}
