// Supabase Edge Function: sync-directory
// Searches Brave Search for new UK food market / festival trader opportunities
// and upserts them into uk_events_directory.
//
// Deploy:   supabase functions deploy sync-directory
// Secrets:  supabase secrets set BRAVE_SEARCH_API_KEY=your_key
// Schedule: run daily at 03:00 UTC via pg_cron (see supabase/migration_004.sql)
//
// The function is idempotent — it uses ON CONFLICT (name) DO UPDATE,
// so running it multiple times will not create duplicates.

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

// Search queries designed to find UK trader application pages
const SEARCH_QUERIES = [
  'UK music festival street food coffee trader application 2025 apply',
  'UK food festival concessions trader application 2025',
  'UK street food market stall holder application 2025 apply now',
  'UK Christmas market trader application 2025 2026',
  'UK outdoor festival catering pitch application open',
  'UK county show food trader stall application 2025',
  'UK motorsport event catering trader apply 2025',
  'Glastonbury Latitude Victorious food trader application',
  'UK farmers market artisan food stall application',
];

// Known concessions companies to specifically check
const COMPANY_QUERIES = [
  'Togather traders festival UK apply coffee 2025',
  'D&J Catering Events traders apply UK',
  'Eat Drink Festivals trader application 2025',
  'Severn Events trader stall apply',
  'NCASS food truck trader application UK',
];

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

type DirectoryCategory =
  | 'Music Festival'
  | 'Food Festival'
  | 'Street Food Market'
  | 'Christmas Market'
  | 'Garden and Lifestyle'
  | 'Motorsport'
  | 'Equestrian'
  | 'Concessions Company'
  | 'Industry Body'
  | 'Event';

function detectCategory(title: string, description: string): DirectoryCategory {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('concessions') || text.includes('trader portal') || text.includes('catering company')) return 'Concessions Company';
  if (text.includes('ncass') || text.includes('industry') || text.includes('association')) return 'Industry Body';
  if (text.includes('christmas market') || text.includes('xmas market') || text.includes('winter market')) return 'Christmas Market';
  if (text.includes('music festival') || text.includes('glastonbury') || text.includes('latitude') || text.includes('victorious')) return 'Music Festival';
  if (text.includes('food festival') || text.includes('food & drink') || text.includes('eat & drink')) return 'Food Festival';
  if (text.includes('street food') || text.includes('streetfood') || text.includes('food market')) return 'Street Food Market';
  if (text.includes('motorsport') || text.includes('grand prix') || text.includes('goodwood') || text.includes('silverstone')) return 'Motorsport';
  if (text.includes('equestrian') || text.includes('horse') || text.includes('polo')) return 'Equestrian';
  if (text.includes('garden') || text.includes('lifestyle') || text.includes('flower') || text.includes('hampton court') || text.includes('chelsea')) return 'Garden and Lifestyle';
  return 'Event';
}

function extractRegion(title: string, description: string, url: string): string | null {
  const text = (title + ' ' + description + ' ' + url).toLowerCase();
  if (text.includes('london') || text.includes('hyde park') || text.includes('victoria park')) return 'London';
  if (text.includes('edinburgh') || text.includes('glasgow') || text.includes('scotland')) return 'Scotland';
  if (text.includes('wales') || text.includes('cardiff') || text.includes('welsh')) return 'Wales';
  if (text.includes('bristol') || text.includes('bath') || text.includes('somerset') || text.includes('south west')) return 'South West';
  if (text.includes('manchester') || text.includes('liverpool') || text.includes('north west') || text.includes('creamfields')) return 'North West';
  if (text.includes('yorkshire') || text.includes('leeds') || text.includes('sheffield')) return 'Yorkshire';
  if (text.includes('birmingham') || text.includes('midlands') || text.includes('coventry')) return 'Midlands';
  if (text.includes('norfolk') || text.includes('suffolk') || text.includes('east anglia') || text.includes('cambridge')) return 'East of England';
  if (text.includes('kent') || text.includes('surrey') || text.includes('essex') || text.includes('south east')) return 'South East';
  if (text.includes('national') || text.includes('uk wide') || text.includes('across the uk')) return 'National';
  return null;
}

function extractDateHint(title: string, description: string): string | null {
  const text = title + ' ' + description;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  for (const month of months) {
    const match = text.match(new RegExp(`\\d{1,2}[\\s\\-\u2013]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`, 'i'));
    if (match) return match[0];
  }
  const yearMatch = text.match(/202[5-9]/);
  if (yearMatch) return yearMatch[0];
  return null;
}

// Detect if a result looks like a genuine trader application page
function isRelevantResult(result: BraveResult): boolean {
  const url = result.url.toLowerCase();
  const title = result.title.toLowerCase();
  const desc = result.description.toLowerCase();

  const skipDomains = ['twitter.com', 'facebook.com', 'instagram.com', 'reddit.com',
    'tripadvisor.co.uk', 'yelp.co.uk', 'bbc.co.uk', 'theguardian.com',
    'dailymail.co.uk', 'timeout.com', 'visitscotland.com'];
  if (skipDomains.some((d) => url.includes(d))) return false;

  const keywords = ['trader', 'vendor', 'apply', 'stall', 'pitch', 'application', 'catering', 'concessions'];
  return keywords.some((kw) => title.includes(kw) || desc.includes(kw));
}

async function searchBrave(query: string, apiKey: string): Promise<BraveResult[]> {
  const params = new URLSearchParams({
    q: query,
    count: '10',
    country: 'GB',
    search_lang: 'en',
    safesearch: 'moderate',
    freshness: 'py',
  });

  try {
    const res = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data?.web?.results ?? []) as BraveResult[];
  } catch {
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!braveKey) {
    return new Response(
      JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not set. Deploy with: supabase secrets set BRAVE_SEARCH_API_KEY=your_key' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  let added = 0;
  let skipped = 0;

  const allQueries = [...SEARCH_QUERIES, ...COMPANY_QUERIES];

  for (const queryStr of allQueries) {
    const results = await searchBrave(queryStr, braveKey);

    for (const result of results) {
      if (!isRelevantResult(result)) { skipped++; continue; }

      const title = result.title.replace(/\s*[-|\u2013]\s*.+$/, '').trim();
      if (!title || title.length < 5) { skipped++; continue; }

      const category = detectCategory(result.title, result.description);
      const region = extractRegion(result.title, result.description, result.url);
      const dateHint = extractDateHint(result.title, result.description);
      const hostname = new URL(result.url).hostname.replace('www.', '');

      const entry = {
        name: title.slice(0, 200),
        category,
        description: result.description?.slice(0, 500) ?? '',
        website: result.url,
        application_url: result.url,
        location: null as string | null,
        region,
        typical_dates: dateHint,
        organiser: hostname,
        source: 'brave_search',
        featured: false,
        last_verified_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('uk_events_directory')
        .upsert(entry, { onConflict: 'name', ignoreDuplicates: false });

      if (error) {
        skipped++;
      } else {
        added++;
      }
    }

    // Brave free tier rate limit: 1 req/sec
    await new Promise((r) => setTimeout(r, 1100));
  }

  // Also run URL freshness check on directory entries
  const { data: directoryEntries } = await supabase
    .from('uk_events_directory')
    .select('id, name, application_url, page_hash')
    .not('application_url', 'is', null)
    .not('application_url', 'eq', '');

  let urlsChecked = 0;
  let urlsChanged = 0;

  for (const entry of directoryEntries ?? []) {
    if (!entry.application_url) continue;
    try {
      const res = await fetch(entry.application_url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0)' },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      const cleaned = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 50_000);

      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cleaned));
      const newHash = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');

      urlsChecked++;
      const now = new Date().toISOString();

      if (!entry.page_hash) {
        await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now }).eq('id', entry.id);
      } else if (newHash !== entry.page_hash) {
        urlsChanged++;
        await supabase.from('uk_events_directory').update({ page_hash: newHash, last_verified_at: now, application_changed: true }).eq('id', entry.id);
      } else {
        await supabase.from('uk_events_directory').update({ last_verified_at: now }).eq('id', entry.id);
      }
    } catch {
      // URL fetch failed — skip silently
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sync: { added, skipped, queriesRun: allQueries.length },
      urlCheck: { checked: urlsChecked, changed: urlsChanged },
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
