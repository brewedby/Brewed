// Supabase Edge Function: check-application-urls
// Fetches all event application URLs, hashes content, flags changes, sends push notifications
// Deploy with: supabase functions deploy check-application-urls
// Schedule daily via pg_cron (see migrations.sql)
// Required secrets: SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

serve(async (req) => {
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Fetch all events that have an application URL and haven't been flagged yet
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, user_id, application_url, page_hash, url_changed')
    .not('application_url', 'is', null)
    .eq('url_changed', false);

  if (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const results = { checked: 0, changed: 0, errors: 0, notified: 0 };

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

      // Get the user's push token
      const { data: profile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', event.user_id)
        .single();

      if (profile?.push_token) {
        // Send push notification via our send-push-notification function
        try {
          await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              to: profile.push_token,
              title: '📋 Application Page Changed',
              body: `"${event.name}" — the application page has been updated. Tap to check your status.`,
              data: { eventId: event.id, type: 'url_changed' },
            }),
          });
          results.notified++;
        } catch { /* notification failed silently */ }
      }
    } else {
      // No change — just update the check timestamp
      await supabase
        .from('events')
        .update({ url_last_checked_at: now })
        .eq('id', event.id);
    }
  }

  return new Response(
    JSON.stringify({ success: true, ...results }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
