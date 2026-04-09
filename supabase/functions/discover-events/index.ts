// Supabase Edge Function: discover-events
// Searches for UK food market / festival events using Brave Search API
// Deploy with: supabase functions deploy discover-events
// Set secret: supabase secrets set BRAVE_SEARCH_API_KEY=your_key

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  location: string | null;
  dateHint: string | null;
  category: string;
}

// Common UK event application platforms and directories
const TRUSTED_DOMAINS = [
  'streetfood.org.uk', 'ncass.org.uk', 'artisanfoodmarket.co.uk',
  'eventbrite.co.uk', 'festivalguide.co.uk', 'ukfoodfestival.co.uk',
  'streetfoodunion.com', 'craftmarkets.co.uk', 'applieddirector.co.uk',
  'bigfeastival.com', 'lovefood.org', 'farmersmarketsonline.com',
  'lovefoodhatewasteapply.co.uk', 'grassroots.org',
];

function detectCategory(title: string, description: string): string {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('festival')) return 'Festival';
  if (text.includes('market') || text.includes('farmers')) return 'Market';
  if (text.includes('fair') || text.includes('fete')) return 'Fair';
  if (text.includes('corporate') || text.includes('office') || text.includes('workplace')) return 'Corporate';
  if (text.includes('street food') || text.includes('streetfood')) return 'Street Food';
  if (text.includes('pop-up') || text.includes('pop up')) return 'Pop-Up';
  if (text.includes('wedding')) return 'Wedding';
  return 'Event';
}

function extractLocation(title: string, description: string): string | null {
  const ukCities = [
    'London', 'Birmingham', 'Manchester', 'Leeds', 'Sheffield', 'Bristol',
    'Glasgow', 'Edinburgh', 'Liverpool', 'Newcastle', 'Brighton', 'Cardiff',
    'Nottingham', 'Leicester', 'Coventry', 'Southampton', 'Oxford', 'Cambridge',
    'Bath', 'York', 'Exeter', 'Norwich', 'Derby', 'Bournemouth', 'Reading',
    'Portsmouth', 'Kent', 'Surrey', 'Essex', 'Suffolk', 'Norfolk', 'Devon',
    'Cornwall', 'Dorset', 'Sussex', 'Hampshire', 'Berkshire',
  ];
  const text = title + ' ' + description;
  for (const city of ukCities) {
    if (text.includes(city)) return city;
  }
  return null;
}

function extractDateHint(title: string, description: string): string | null {
  const text = title + ' ' + description;
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  for (const month of months) {
    if (text.includes(month)) {
      const match = text.match(new RegExp(`\\d{1,2}[\\s\\-–]+${month}\\s+\\d{4}|${month}\\s+\\d{4}|${month}\\s+\\d{1,2}`));
      if (match) return match[0];
    }
  }
  // Look for year
  const yearMatch = text.match(/202[5-9]/);
  if (yearMatch) return yearMatch[0];
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { query, region, category } = await req.json();
    const braveKey = Deno.env.get('BRAVE_SEARCH_API_KEY');

    if (!braveKey) {
      return new Response(
        JSON.stringify({ error: 'BRAVE_SEARCH_API_KEY not configured in Supabase secrets' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Build search query
    const regionStr = region && region !== 'All UK' ? ` ${region}` : '';
    const categoryStr = category && category !== 'All' ? ` ${category.toLowerCase()}` : '';
    const baseQuery = query || `UK street food coffee trader vendor applications${regionStr}${categoryStr} 2025 apply now`;

    const params = new URLSearchParams({
      q: baseQuery,
      count: '20',
      country: 'GB',
      search_lang: 'en',
      safesearch: 'moderate',
      freshness: 'py', // past year
    });

    const braveRes = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': braveKey,
      },
    });

    if (!braveRes.ok) {
      const errText = await braveRes.text();
      return new Response(
        JSON.stringify({ error: `Brave Search error: ${braveRes.status}`, detail: errText }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const braveData = await braveRes.json();
    const webResults = braveData?.web?.results ?? [];

    const results: SearchResult[] = webResults
      .filter((r: any) => r.url && r.title)
      .map((r: any, i: number) => {
        const title = r.title ?? '';
        const desc = r.description ?? r.extra_snippets?.[0] ?? '';
        const hostname = new URL(r.url).hostname.replace('www.', '');
        return {
          id: `brave-${i}-${Date.now()}`,
          title,
          description: desc,
          url: r.url,
          source: hostname,
          location: extractLocation(title, desc),
          dateHint: extractDateHint(title, desc),
          category: detectCategory(title, desc),
        };
      });

    return new Response(
      JSON.stringify({ results, query: baseQuery, count: results.length }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
