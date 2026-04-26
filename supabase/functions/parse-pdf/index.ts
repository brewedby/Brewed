/**
 * parse-pdf Edge Function
 *
 * Receives a Supabase Storage path for a PDF, downloads it,
 * extracts text, and returns structured sales line items.
 *
 * Invoke via: supabase.functions.invoke('parse-pdf', { body: { storagePath, eventId } })
 */
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Deno-compatible PDF text extraction using pdf-parse via esm.sh
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — Deno module import
import pdf from 'npm:pdf-parse@1.1.1';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { storagePath } = (await req.json()) as { storagePath: string };

    if (!storagePath) {
      return new Response(JSON.stringify({ error: 'storagePath is required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Download the PDF from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('sales-reports')
      .download(storagePath);

    if (downloadError || !fileData) {
      return new Response(JSON.stringify({ error: `Download failed: ${downloadError?.message}` }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const buffer = await fileData.arrayBuffer();
    const parsed = await pdf(new Uint8Array(buffer));
    const text: string = parsed.text;

    const lines = extractSalesLines(text);

    return new Response(JSON.stringify({ lines, rawText: text }), {
      status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

interface ParsedLine {
  product_name: string;
  quantity: number;
  unit_price: number | null;
  line_total: number;
}

/**
 * Extract sales lines from PDF plain text.
 *
 * Attempts to match patterns common in settlement reports from
 * UK concessions companies (tabular text blocks with qty + price).
 *
 * Pattern: <Product Name>   <qty>   <unit price>   <total>
 * e.g.  "Flat White        45      3.50            157.50"
 */
function extractSalesLines(text: string): ParsedLine[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ParsedLine[] = [];

  // Regex: product name (text) followed by 2–3 numbers, last being the total
  // Handles optional £/$ symbols, commas in numbers
  const pattern = /^(.+?)\s{2,}(\d[\d,]*(?:\.\d{1,2})?)\s+(?:[£$€]?([\d,]+(?:\.\d{1,2})?)\s+)?[£$€]?([\d,]+(?:\.\d{1,2})?)$/;

  for (const line of lines) {
    // Skip obvious header/footer lines
    if (/^(total|subtotal|vat|tax|grand|payment|amount due|commission|settlement)/i.test(line)) continue;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(line)) continue; // dates
    if (line.length < 8) continue;

    const m = line.match(pattern);
    if (!m) continue;

    const productName = m[1].trim();
    const qty         = parseFloat(m[2].replace(/,/g, ''));
    const unitPrice   = m[3] ? parseFloat(m[3].replace(/,/g, '')) : null;
    const lineTotal   = parseFloat(m[4].replace(/,/g, ''));

    if (isNaN(qty) || isNaN(lineTotal)) continue;
    if (qty <= 0 || lineTotal < 0) continue;
    if (productName.length < 2 || productName.length > 100) continue;

    results.push({ product_name: productName, quantity: qty, unit_price: unitPrice, line_total: lineTotal });
  }

  return results;
}
