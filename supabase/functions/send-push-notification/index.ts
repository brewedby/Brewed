// Supabase Edge Function: send-push-notification
// Sends a push notification to an Expo push token via the Expo Push API
// Deploy with: supabase functions deploy send-push-notification

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface PushPayload {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const payload: PushPayload = await req.json();

    if (!payload.to || !payload.to.startsWith('ExponentPushToken[')) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing Expo push token' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const message = {
      to: payload.to,
      sound: payload.sound ?? 'default',
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      badge: payload.badge ?? 1,
    };

    const expoRes = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    });

    const expoData = await expoRes.json();

    return new Response(
      JSON.stringify({ success: true, expo: expoData }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
