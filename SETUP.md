# Brewed by Boon — Setup & Installation Guide

Complete instructions for getting the app running on your iPhone and Mac.

---

## What You Need

| Tool | Why | Free? |
|------|-----|-------|
| [Supabase](https://supabase.com) account | Cloud database + backend | Yes |
| [Expo](https://expo.dev) account | Building and deploying the app | Yes |
| [Brave Search API](https://api.search.brave.com) key | Event discovery feature | Free tier available |
| [Node.js](https://nodejs.org) (v18+) | Run the build tools | Yes |
| iPhone with iOS 16+ | Run the app | — |

---

## Part 1 — Supabase Setup (Database + Backend)

### 1.1 Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name it `brewed-by-boon`, choose a strong database password, pick a region close to you (e.g. `eu-west-2 London`)
3. Wait ~2 minutes for it to provision

### 1.2 Run the database migrations

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/migrations.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** — you should see "Success. No rows returned"

This creates all the tables: `profiles`, `concessions_companies`, `events`, `event_financials`, `staffing_entries`, `infrastructure_items` with all the correct columns, RLS policies, and triggers.

### 1.3 Get your API keys

In your Supabase project:
- Go to **Settings → API**
- Copy **Project URL** → this is your `EXPO_PUBLIC_SUPABASE_URL`
- Copy **anon public** key → this is your `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Copy **service_role** key → this is your `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — only used server-side)

### 1.4 Create your .env file

In the project root, copy the example file:

```bash
cp .env.example .env
```

Then fill in your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
BRAVE_SEARCH_API_KEY=BSA...your-brave-key...
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...
```

### 1.5 Get a Brave Search API key

1. Go to [api.search.brave.com](https://api.search.brave.com)
2. Sign up and create an API key (free tier gives 2,000 queries/month)
3. Add it to your `.env` as `BRAVE_SEARCH_API_KEY`

---

## Part 2 — Deploy Edge Functions (Backend Logic)

The app uses three serverless functions on Supabase for:
- **discover-events** — searches for UK events via Brave Search
- **check-application-urls** — monitors application pages for changes
- **send-push-notification** — sends push alerts to your iPhone

### 2.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 2.2 Log in and link your project

```bash
supabase login
supabase link --project-ref your-project-ref
```

(Find your project ref in Supabase → Settings → General — it's in the project URL: `https://your-ref.supabase.co`)

### 2.3 Set secrets for the Edge Functions

```bash
supabase secrets set BRAVE_SEARCH_API_KEY=your_brave_key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.4 Deploy all three functions

```bash
supabase functions deploy discover-events
supabase functions deploy check-application-urls
supabase functions deploy send-push-notification
```

Each deploy takes about 30 seconds. You should see "Deployed Function" in the output.

### 2.5 Schedule automatic URL checking (optional)

To have the app automatically check application pages daily:

1. In Supabase → **SQL Editor**, run:
```sql
-- Enable pg_cron extension (may already be enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily URL check at 9am UTC
SELECT cron.schedule(
  'check-application-urls-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-project-ref.supabase.co/functions/v1/check-application-urls',
    headers := '{"Authorization": "Bearer your-service-role-key"}'::jsonb
  );
  $$
);
```

Replace `your-project-ref` and `your-service-role-key` with your actual values.

---

## Part 3 — Running on Your iPhone (Development — Free)

This uses **Expo Go**, a free app that lets you run the app instantly without any App Store submission.

### 3.1 Install dependencies

In the project folder:

```bash
npm install
```

### 3.2 Start the development server

```bash
npx expo start
```

You'll see a QR code in your terminal.

### 3.3 Install Expo Go on your iPhone

1. Open the **App Store** on your iPhone
2. Search for **Expo Go** and install it

### 3.4 Open the app

1. Open the **Camera** app on your iPhone
2. Point it at the QR code in your terminal
3. Tap the banner that appears — the app will open in Expo Go

**That's it!** The app will load with your live data.

> **Note:** Both your Mac and iPhone need to be on the **same WiFi network** for this to work.

### Re-opening later

After the first setup:
1. `npx expo start` on your Mac
2. Scan QR code, or open Expo Go and it remembers recent apps

---

## Part 4 — Installing on Your iPhone Properly (No Expo Go)

For a proper installation on your home screen (like a real app), you need to build it with EAS Build.

### 4.1 Install EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 4.2 Configure EAS

In the project folder:

```bash
eas build:configure
```

This creates an `eas.json` file. Accept all defaults.

### 4.3 Build for iOS

```bash
eas build --platform ios --profile preview
```

- This uploads the code to Expo's build servers
- Takes 10–20 minutes the first time
- You'll get a URL to download the `.ipa` file when done
- No Apple Developer account needed for a personal device build using EAS preview profile

### 4.4 Install on your iPhone

Once the build is complete:
1. EAS will give you a QR code or link
2. Open the link on your iPhone (in Safari)
3. Tap **Install** when prompted
4. Go to **Settings → General → VPN & Device Management** and trust the developer certificate

The app icon will appear on your home screen.

---

## Part 5 — Mac App (Optional)

Expo supports running the app as a Mac app via Mac Catalyst, but the simplest approach for Mac is to just use the web version or keep it as iPhone-only (since it's designed for mobile use on the go).

To run on your Mac for testing:

```bash
npx expo start --ios
```

This opens the iOS Simulator (requires Xcode installed from the App Store).

---

## Part 6 — Setting Up Two Devices

To use the app on both your iPhone and a staff member's iPhone:

**Same account (shared data):**
1. Both devices sign into the app with the same email/password
2. All events, companies, and financials are shared between devices
3. Good for owner + one staff member who needs to see everything

**Separate accounts (separate data):**
1. Each device creates a separate account
2. Each person only sees their own data
3. Good if staff should only see events they're working on

---

## Troubleshooting

**"Network request failed" on startup**
→ Check your `.env` file has the correct Supabase URL and anon key (no trailing spaces)

**"Discover" search returns no results**
→ Make sure your Brave Search API key is set: `supabase secrets set BRAVE_SEARCH_API_KEY=...`

**Push notifications not arriving**
→ On first launch, accept the notification permission prompt. Then go to an event detail page — the app registers your push token. If you dismissed it, go to iPhone Settings → Brewed (or Expo Go) → Notifications and enable.

**App won't open after QR scan**
→ Make sure iPhone and Mac are on the same WiFi. If on different networks, use `npx expo start --tunnel` instead.

**TypeScript / build errors**
→ Run `npm install` first. If errors persist, `rm -rf node_modules && npm install`.

---

## Project Structure (Quick Reference)

```
app/           — All screens (Expo Router file-based routing)
components/    — Reusable UI components
lib/           — Supabase client, React Query hooks, formatters
supabase/
  functions/   — Edge Functions (deployed to Supabase, not the phone)
  migrations.sql — Run this once in Supabase SQL Editor
types/         — TypeScript types
.env           — Your credentials (never commit this file)
```

---

## Key Features

| Feature | How it works |
|---------|-------------|
| **Events tracker** | Full CRUD with status tracking (Pending → Accepted/Rejected/Waitlisted) |
| **Application timeline** | Visual journey showing where each application is |
| **URL monitoring** | Paste an application portal URL; app alerts you if the page changes |
| **Event discovery** | Brave Search finds UK markets/festivals you can apply to |
| **Add discovered events** | One tap adds a found event to your tracker |
| **Financials** | Track gross sales, COGS, pitch fee, staffing, travel — auto-calculates net profit & margin |
| **Reports** | Monthly breakdown, top events by profit, CSV export |
| **Dashboard** | YTD stats, revenue chart, acceptance rate, upcoming events |
| **Multi-device** | Cloud sync via Supabase — same data on all your devices |
