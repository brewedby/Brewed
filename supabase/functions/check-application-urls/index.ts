// Supabase Edge Function: check-application-urls
// Fetches every tracked event's application URL, hashes the page text and
// sets events.url_changed when it changes. The app shows the flag as a
// "page changed" banner on the event (app/(tabs)/events/[id]/index.tsx).
//
// Deploy with: supabase functions deploy check-application-urls
// Schedule: pg_cron with the SERVICE ROLE key (see
// supabase/migration_019_launch_hardening.sql). The function refuses any
// other caller — it reads every user's events, so it must not be
// triggerable with the public anon key.
//
// The directory (uk_events_directory) URL check lives in sync-directory.
// Push notifications are not sent: the app never registers push tokens.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function hashContent(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content.slice(0, 50_000)); // limit to 50KB
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function fetchPageContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BrewedByBoon/1.0; +application-status-check)',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Strip tags to reduce noise from dynamic content like timestamps
    return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
               .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\s+/g, ' ')
               .trim();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  if (!serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY not set' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  if (req.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return new Response(
      JSON.stringify({ error: 'Forbidden' }),
      { status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Upcoming events with an application URL that haven't been flagged yet.
  // Finished events are skipped — their application pages no longer matter.
  const today = new Date().toISOString().slice(0, 10);
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, user_id, application_url, page_hash, url_changed')
    .not('application_url', 'is', null)
    .eq('url_changed', false)
    .or(`date.gte.${today},end_date.gte.${today}`);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const results = { checked: 0, changed: 0, errors: 0 };

  for (const event of events ?? []) {
    if (!event.application_url) continue;
    results.checked++;

    const content = await fetchPageContent(event.application_url);
    if (!content) { results.errors++; continue; }

    const newHash = await hashContent(content);
    const now = new Date().toISOString();

    if (!event.page_hash) {
      // First check — just store the hash, don't alert
      await supabase
        .from('events')
        .update({ page_hash: newHash, url_last_checked_at: now })
        .eq('id', event.id);
      continue;
    }

    if (newHash !== event.page_hash) {
      // Page has changed — flag it
      results.changed++;
      await supabase
        .from('events')
        .update({ page_hash: newHash, url_last_checked_at: now, url_changed: true })
        .eq('id', event.id);
    } else {
      // No change — just update the check timestamp
      await supabase
        .from('events')
        .update({ url_last_checked_at: now })
        .eq('id', event.id);
    }
  }

  return new Response(
    JSON.stringify({ success: true, events: results }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
