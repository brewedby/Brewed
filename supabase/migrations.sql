-- Run this in your Supabase SQL editor to set up the database schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Concessions companies
CREATE TABLE IF NOT EXISTS public.concessions_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.concessions_companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own companies" ON public.concessions_companies
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Events
CREATE TYPE IF NOT EXISTS application_status AS ENUM (
  'pending', 'accepted', 'rejected', 'waitlisted', 'withdrawn'
);

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  end_date DATE,
  location TEXT NOT NULL,
  description TEXT,
  application_date DATE,
  status application_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  company_id UUID REFERENCES public.concessions_companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own events" ON public.events
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Event financials (1-to-1 with events)
CREATE TABLE IF NOT EXISTS public.event_financials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL UNIQUE REFERENCES public.events(id) ON DELETE CASCADE,
  gross_sales NUMERIC(12,2) NOT NULL DEFAULT 0,
  cost_of_goods NUMERIC(12,2) NOT NULL DEFAULT 0,
  pitch_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  travel_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  equipment_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  staffing_costs NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own event_financials" ON public.event_financials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.user_id = auth.uid()
    )
  );

-- Staffing entries
CREATE TABLE IF NOT EXISTS public.staffing_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  staff_name TEXT NOT NULL,
  hours_worked NUMERIC(6,2) NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(8,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staffing_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own staffing_entries" ON public.staffing_entries
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );

-- Infrastructure items
CREATE TYPE IF NOT EXISTS infrastructure_category AS ENUM (
  'pitch_fee', 'travel', 'equipment', 'supplies', 'other'
);

CREATE TABLE IF NOT EXISTS public.infrastructure_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  category infrastructure_category NOT NULL DEFAULT 'other',
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.infrastructure_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own infrastructure_items" ON public.infrastructure_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.user_id = auth.uid())
  );

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.concessions_companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.event_financials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.staffing_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.infrastructure_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- Migration 002: Event discovery, URL monitoring, push tokens
-- ============================================================

-- Add push token to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS business_name_updated TEXT;

-- Add URL monitoring fields to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS application_url TEXT,
  ADD COLUMN IF NOT EXISTS page_hash TEXT,
  ADD COLUMN IF NOT EXISTS url_last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS url_changed BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable pg_cron and pg_net for scheduled URL checks
-- (run separately if these extensions are not already enabled)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the check-application-urls edge function to run daily at 8am UTC
-- Uncomment and update YOUR_SUPABASE_PROJECT_REF and YOUR_ANON_KEY after setup:
-- SELECT cron.schedule(
--   'check-application-urls-daily',
--   '0 8 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_SUPABASE_PROJECT_REF.supabase.co/functions/v1/check-application-urls',
--     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );

-- ============================================================
-- Migration 003: Fleet (units), enhanced financials, Discover
-- ============================================================
-- Safe to run multiple times — uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

-- Unit status enum
DO $$ BEGIN
  CREATE TYPE unit_status AS ENUM ('active', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Units (fleet) table
CREATE TABLE IF NOT EXISTS public.units (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  registration TEXT,
  notes       TEXT,
  status      unit_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can CRUD own units"
    ON public.units FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- New columns on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS overnight_stay BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS documents_uploaded BOOLEAN NOT NULL DEFAULT FALSE;

-- New columns on event_financials
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS zero_rated_sales        NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS standard_rated_sales    NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS concessions_commission_pct NUMERIC(7,4) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS pitch_fee_refund_pct    NUMERIC(7,4) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS power_fee              NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS camping_costs          NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS fresh_milk_litres      NUMERIC(8,2)  NOT NULL DEFAULT 0;
ALTER TABLE public.event_financials ADD COLUMN IF NOT EXISTS alt_milk_litres        NUMERIC(8,2)  NOT NULL DEFAULT 0;

-- UK Events & Concessions Company Directory
CREATE TABLE IF NOT EXISTS public.uk_events_directory (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                TEXT        NOT NULL,
  organiser           TEXT,
  website             TEXT,
  location            TEXT,
  region              TEXT,
  category            TEXT,
  description         TEXT,
  application_url     TEXT,
  typical_dates       TEXT,
  next_date           TEXT,
  estimated_footfall  TEXT,
  pitch_fee_range     TEXT,
  events_managed      TEXT,
  contact_phone       TEXT,
  contact_email       TEXT,
  last_verified_at    TIMESTAMPTZ,
  application_changed BOOLEAN     NOT NULL DEFAULT FALSE,
  page_hash           TEXT,
  source              TEXT        NOT NULL DEFAULT 'manual',
  featured            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if upgrading from an older version of the table
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS events_managed      TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_phone       TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS contact_email       TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS last_verified_at    TIMESTAMPTZ;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS application_changed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS page_hash           TEXT;
ALTER TABLE public.uk_events_directory ADD COLUMN IF NOT EXISTS next_date           TEXT;

-- Unique constraint so we can safely upsert seed data
ALTER TABLE public.uk_events_directory ADD CONSTRAINT IF NOT EXISTS uk_events_directory_name_key UNIQUE (name);

-- Trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_directory()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.uk_events_directory;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uk_events_directory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_directory();

-- ── Seed: Concessions Companies ──────────────────────────────────────────────
-- Uses upsert so it is safe to run again without creating duplicates.

INSERT INTO public.uk_events_directory
  (name, category, description, website, application_url, featured,
   events_managed, contact_phone, contact_email, region, source)
VALUES

('D&J Catering & Events',
 'Concessions Company',
 'One of the UK''s longest-established concessions operators, managing catering at hundreds of events annually across music festivals, motorsport and outdoor shows.',
 'https://www.dnjcatering.co.uk', 'https://www.dnjcatering.co.uk/traders', TRUE,
 'Glastonbury, Download, Isle of Wight Festival, Creamfields, V Festival, Silverstone',
 NULL, 'traders@dnjcatering.co.uk', 'National', 'manual'),

('Togather',
 'Concessions Company',
 'Modern concessions platform partnering with independent street food traders for festivals, corporate events and markets. Online application portal with rolling availability.',
 'https://www.togather.com', 'https://www.togather.com/traders', TRUE,
 'Latitude, Wilderness Festival, Victorious, Cambridge Folk Festival',
 NULL, 'traders@togather.com', 'National', 'manual'),

('Central Fusion',
 'Concessions Company',
 'Boutique concessions agency focusing on premium festivals and lifestyle events. Strong relationships with independent food and drink operators.',
 'https://www.centralfusion.co.uk', 'https://www.centralfusion.co.uk/apply', FALSE,
 'British Summer Time Hyde Park, Kew the Music, Carfest',
 NULL, 'hello@centralfusion.co.uk', 'London & South', 'manual'),

('RB Vernon',
 'Concessions Company',
 'Established concessions contractor primarily serving motorsport, air shows and outdoor sporting events. Known for large-scale pitches.',
 'https://www.rbvernon.co.uk', 'https://www.rbvernon.co.uk/catering-enquiries', FALSE,
 'Silverstone Grand Prix, Goodwood, RIAT Air Tattoo, Cheltenham Festival',
 NULL, 'catering@rbvernon.co.uk', 'Midlands & South', 'manual'),

('Severn Events',
 'Concessions Company',
 'Regional concessions operator covering the Midlands, Wales and South West. Strong presence at county shows, food festivals and rural events.',
 'https://www.severnevents.co.uk', 'https://www.severnevents.co.uk/traders', FALSE,
 'Three Counties Show, Royal Welsh Show, Malvern Shows',
 '01905 000000', 'traders@severnevents.co.uk', 'Midlands & Wales', 'manual'),

('Eat & Drink Festivals',
 'Concessions Company',
 'Specialist food and drink festival organiser running consumer shows across the UK. Direct application process for food and beverage traders.',
 'https://www.eatanddrinkfestivals.com', 'https://www.eatanddrinkfestivals.com/traders', TRUE,
 'Eat & Drink Festival (multiple cities), BBC Good Food Show',
 NULL, 'traders@eatanddrinkfestivals.com', 'National', 'manual'),

('FEAST',
 'Concessions Company',
 'Award-winning street food festival organiser creating premium outdoor dining events at historic and cultural venues across the UK.',
 'https://www.feastonline.co.uk', 'https://www.feastonline.co.uk/apply', FALSE,
 'FEAST at Blenheim Palace, FEAST Winchester, FEAST Arundel',
 NULL, 'hello@feastonline.co.uk', 'South & South East', 'manual'),

('Kerb',
 'Concessions Company',
 'London''s leading street food collective, operating markets at permanent and pop-up sites and managing concessions at major events. Highly competitive application process.',
 'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', TRUE,
 'Kerb Camden, Kerb King''s Cross, Glastonbury, All Points East',
 NULL, 'traders@kerbfood.com', 'London', 'manual'),

('Tuck (by Coggers)',
 'Concessions Company',
 'Growing concessions network supplying traders to community events, food markets and smaller festivals. Good entry point for new traders.',
 'https://www.tuckmarket.co.uk', 'https://www.tuckmarket.co.uk/apply', FALSE,
 'Tuck Markets (various), local county fairs, community festivals',
 NULL, 'hello@tuckmarket.co.uk', 'National', 'manual'),

('Urban Food Fest',
 'Concessions Company',
 'Street food festival organiser running high-footfall weekend markets in city centres. Known for quality curation and social media promotion.',
 'https://www.urbanfoodfest.com', 'https://www.urbanfoodfest.com/traders', FALSE,
 'Urban Food Fest Manchester, Birmingham, Leeds, Bristol',
 NULL, 'traders@urbanfoodfest.com', 'National', 'manual'),

('Street Food Warehouse',
 'Concessions Company',
 'Fast-growing street food event company running converted warehouse events across the North of England. Seeking specialist coffee and hot drink traders.',
 'https://www.streetfoodwarehouse.co.uk', 'https://www.streetfoodwarehouse.co.uk/traders', FALSE,
 'Street Food Warehouse Leeds, Manchester, Sheffield, Newcastle',
 NULL, 'traders@streetfoodwarehouse.co.uk', 'North England', 'manual'),

('VIP Events Catering',
 'Concessions Company',
 'Premium concessions contractor for corporate hospitality, sporting events and high-end festivals. Focus on quality and premium branding.',
 'https://www.vipevents.co.uk', 'https://www.vipevents.co.uk/catering-partners', FALSE,
 'Polo events, equestrian shows, corporate summer parties',
 NULL, 'catering@vipevents.co.uk', 'South England', 'manual'),

-- New major companies
('Great British Food Festival',
 'Concessions Company',
 'The UK''s largest touring food festival, visiting stately homes and heritage venues across England. Dedicated trader application portal with seasonal availability.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
 'Great British Food Festival at Audley End, Tatton Park, Hardwick Hall, Chatsworth, Shugborough',
 NULL, 'traders@greatbritishfoodfestival.com', 'National', 'manual'),

('Foodies Festival',
 'Concessions Company',
 'UK''s premier outdoor food and drink festival brand, running 8+ events per year at iconic venues. Strong coffee trading opportunity.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
 'Foodies Festival Edinburgh, Oxford, Brighton, Birmingham, London',
 NULL, 'trade@foodiesfestival.com', 'National', 'manual'),

('Food and Drink Festivals UK',
 'Concessions Company',
 'Regional food festival organiser running events at country parks and showgrounds across England. Coffee and hot beverage traders always welcome.',
 'https://www.foodanddrinkfestivals.com', 'https://www.foodanddrinkfestivals.com/traders', FALSE,
 'Food & Drink Festival (East Midlands, West Midlands, Yorkshire)',
 NULL, 'info@foodanddrinkfestivals.com', 'Midlands & Yorkshire', 'manual'),

('Mellors Group',
 'Concessions Company',
 'National funfair and outdoor events catering contractor. Operates at theme parks, outdoor festivals and touring shows across the UK.',
 'https://www.mellorsgroup.com', 'https://www.mellorsgroup.com/contact', FALSE,
 'Travelling fairs, theme park events, outdoor shows',
 '01623 707 666', 'enquiries@mellorsgroup.com', 'National', 'manual'),

('Broadwick Live',
 'Concessions Company',
 'Premium live events company running some of the UK''s most iconic festivals. Competitive application but excellent returns for accepted traders.',
 'https://www.broadwicklive.com', 'https://www.broadwicklive.com', TRUE,
 'Tobacco Dock events, Field Day, Printworks London',
 NULL, 'production@broadwicklive.com', 'London', 'manual'),

('RHS Shows',
 'Concessions Company',
 'Royal Horticultural Society catering concessions at flagship flower shows. Prestigious venues with wealthy demographics — premium coffee pricing well received.',
 'https://www.rhs.org.uk', 'https://www.rhs.org.uk/shows-events/exhibiting', TRUE,
 'RHS Chelsea Flower Show, RHS Hampton Court, RHS Tatton Park, RHS Cardiff',
 NULL, 'commercialventures@rhs.org.uk', 'National', 'manual'),

('Taste Festivals',
 'Concessions Company',
 'Premium food and wine festival brand with prestige venues. Application requires established brand and quality credentials.',
 'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
 'Taste of London, Taste of Edinburgh',
 NULL, 'participate@tastefestivals.com', 'London & Scotland', 'manual'),

('Channell Events',
 'Concessions Company',
 'Specialist motorsport and outdoor events caterer with strong presence at UK race circuits. Reliable pitch fees and experienced operations team.',
 'https://www.channellevents.co.uk', 'https://www.channellevents.co.uk/traders', FALSE,
 'Thruxton, Snetterton, Brands Hatch, Castle Combe',
 NULL, 'traders@channellevents.co.uk', 'South & East', 'manual'),

('Street Food Hub',
 'Concessions Company',
 'Curated street food market organiser placing traders at local authority events, business parks and pop-up markets. Good for building regular income.',
 'https://www.streetfoodhub.co.uk', 'https://www.streetfoodhub.co.uk/apply', FALSE,
 'Corporate catering days, local authority events, weekend markets',
 NULL, 'hello@streetfoodhub.co.uk', 'National', 'manual'),

('NCASS (Nationwide Caterers Association)',
 'Industry Body',
 'The trade association for mobile caterers and street food traders in the UK. Provides insurance, food hygiene certificates, licensing advice and a members events directory.',
 'https://www.ncass.org.uk', 'https://www.ncass.org.uk/membership', TRUE,
 'NCASS members have access to an exclusive events listing not available elsewhere',
 '0121 603 2524', 'info@ncass.org.uk', 'National', 'manual'),

('Street Food Union (SFU)',
 'Industry Body',
 'Trade body and community for street food vendors. Runs markets and advocates for fair pitch fees and sustainable trading conditions.',
 'https://www.streetfoodunion.com', 'https://www.streetfoodunion.com/join', FALSE,
 NULL, NULL, 'hello@streetfoodunion.com', 'National', 'manual')

ON CONFLICT (name) DO UPDATE SET
  description        = EXCLUDED.description,
  website            = EXCLUDED.website,
  application_url    = EXCLUDED.application_url,
  featured           = EXCLUDED.featured,
  events_managed     = EXCLUDED.events_managed,
  contact_phone      = EXCLUDED.contact_phone,
  contact_email      = EXCLUDED.contact_email,
  region             = EXCLUDED.region,
  updated_at         = NOW();

-- ── Seed: UK Events & Festivals ──────────────────────────────────────────────

INSERT INTO public.uk_events_directory
  (name, category, description, website, application_url, featured,
   organiser, location, region, typical_dates, next_date, estimated_footfall, pitch_fee_range, source)
VALUES

('Glastonbury Festival',
 'Music Festival',
 'The world''s largest greenfield festival. Coffee trading here is highly competitive but extremely high volume — expect 200,000+ attendees. Managed via D&J Catering & Events.',
 'https://www.glastonburyfestivals.co.uk', NULL, TRUE,
 'D&J Catering & Events', 'Pilton, Somerset', 'South West', 'Late June', '2026-06-26',
 '200,000+', '£3,000–£12,000', 'manual'),

('Download Festival',
 'Music Festival',
 'UK''s premier rock and metal festival at Donington Park. Three days, 100,000+ attendance. D&J manages concessions.',
 'https://www.downloadfestival.co.uk', NULL, TRUE,
 'D&J Catering & Events', 'Donington Park, Leicestershire', 'Midlands', 'June', '2026-06-06',
 '100,000+', '£2,000–£8,000', 'manual'),

('Reading Festival',
 'Music Festival',
 'Iconic dual-site festival (Reading + Leeds). Apply through D&J for Reading. One of the best concessions events in the UK calendar.',
 'https://www.readingfestival.com', NULL, TRUE,
 'D&J Catering & Events', 'Little John''s Farm, Reading', 'South East', 'August Bank Holiday', '2026-08-28',
 '105,000+', '£2,500–£9,000', 'manual'),

('Leeds Festival',
 'Music Festival',
 'Twin event with Reading. High-volume weekend event with strong coffee trading opportunities throughout the day.',
 'https://www.leedsfestival.com', NULL, TRUE,
 'D&J Catering & Events', 'Bramham Park, Leeds', 'Yorkshire', 'August Bank Holiday', '2026-08-28',
 '105,000+', '£2,500–£9,000', 'manual'),

('Creamfields',
 'Music Festival',
 'UK''s biggest electronic music festival. 70,000 per day, 4-day event. Very strong early morning coffee demand.',
 'https://www.creamfields.com', NULL, FALSE,
 'D&J Catering & Events', 'Daresbury, Cheshire', 'North West', 'August', '2026-08-27',
 '70,000/day', '£1,500–£5,000', 'manual'),

('Latitude Festival',
 'Music Festival',
 'Arts and music festival in Suffolk. Relaxed family-friendly atmosphere, premium demographics — ideal for specialty coffee.',
 'https://www.latitudefestival.com', NULL, FALSE,
 'Togather', 'Henham Park, Suffolk', 'East of England', 'July', '2026-07-16',
 '35,000', '£1,200–£4,500', 'manual'),

('Wilderness Festival',
 'Music Festival',
 'Boutique lifestyle festival at Cornbury Park. Upmarket crowd, premium spend — excellent for high-end coffee concepts.',
 'https://www.wildernessfestival.com', NULL, FALSE,
 'Togather', 'Cornbury Park, Oxfordshire', 'South East', 'August', '2026-08-06',
 '25,000', '£1,000–£3,500', 'manual'),

('All Points East',
 'Music Festival',
 'Victoria Park London festival run by AEG Presents. Urban demographic, very coffee-forward audience.',
 'https://www.allpointseastfestival.com', NULL, FALSE,
 'Kerb', 'Victoria Park, London', 'London', 'May', '2026-05-22',
 '50,000+', '£1,800–£6,000', 'manual'),

('Field Day',
 'Music Festival',
 'Alternative music festival in London. Broadwick Live event with curated food offering. Niche but loyal audience.',
 'https://fielddayfestivals.com', NULL, FALSE,
 'Broadwick Live', 'Tobacco Dock, London', 'London', 'June', NULL,
 '15,000', '£800–£2,500', 'manual'),

('Victorious Festival',
 'Music Festival',
 'Portsmouth seafront festival. 50,000+ over the weekend, growing rapidly. Apply through Togather.',
 'https://www.victoriousfestival.co.uk', NULL, FALSE,
 'Togather', 'Southsea, Portsmouth', 'South East', 'August', '2026-08-22',
 '50,000+', '£1,200–£4,000', 'manual'),

('RHS Chelsea Flower Show',
 'Garden and Lifestyle',
 'The world''s most famous flower show. Affluent demographic (avg spend very high). Managed directly by RHS — competitive but profitable for quality operators.',
 'https://www.rhs.org.uk/shows-events/rhs-chelsea-flower-show', NULL, TRUE,
 'RHS Shows', 'Royal Hospital Chelsea, London', 'London', 'May', '2026-05-19',
 '150,000+', '£3,000–£10,000', 'manual'),

('RHS Hampton Court Palace Garden Festival',
 'Garden and Lifestyle',
 'Second largest RHS show. Summer gardens event with affluent audience and premium hospitality. Excellent coffee demand.',
 'https://www.rhs.org.uk/shows-events/rhs-hampton-court-palace-garden-festival', NULL, TRUE,
 'RHS Shows', 'Hampton Court Palace, Surrey', 'London', 'July', '2026-07-01',
 '120,000+', '£2,500–£8,000', 'manual'),

('RHS Tatton Park',
 'Garden and Lifestyle',
 'North West''s flagship garden show. Three-day event at the stunning Tatton Park estate.',
 'https://www.rhs.org.uk/shows-events/rhs-tatton-park-flower-show', NULL, FALSE,
 'RHS Shows', 'Tatton Park, Cheshire', 'North West', 'July', '2026-07-22',
 '80,000+', '£1,500–£5,500', 'manual'),

('Goodwood Festival of Speed',
 'Motorsport',
 'World''s greatest motorsport garden party. 200,000+ over 4 days, very high average spend. Managed by RB Vernon / independent application.',
 'https://www.goodwood.com/motorsport/festival-of-speed', NULL, TRUE,
 'RB Vernon', 'Goodwood House, West Sussex', 'South East', 'July', '2026-07-09',
 '200,000+', '£2,500–£10,000', 'manual'),

('Goodwood Revival',
 'Motorsport',
 'Vintage motorsport spectacular. Dress-code 1940s–1960s. Wealthy demographic, very high per-head spend. Premium coffee does well here.',
 'https://www.goodwood.com/motorsport/goodwood-revival', NULL, TRUE,
 'RB Vernon', 'Goodwood Motor Circuit, West Sussex', 'South East', 'September', '2026-09-04',
 '150,000+', '£2,500–£9,000', 'manual'),

('Silverstone Formula 1 British Grand Prix',
 'Motorsport',
 'UK''s biggest motorsport event. 450,000+ across the weekend. Managed by RB Vernon / D&J. Highly competitive pitch allocation.',
 'https://www.silverstone.co.uk', NULL, TRUE,
 'RB Vernon', 'Silverstone Circuit, Northamptonshire', 'Midlands', 'July', '2026-07-03',
 '450,000+', '£4,000–£15,000', 'manual'),

('Cheltenham Festival (Horse Racing)',
 'Equestrian',
 'Four-day National Hunt horse racing festival. Huge crowds, premium spend, excellent for hot drinks in March weather.',
 'https://www.cheltenham.co.uk/racing/cheltenham-festival', NULL, FALSE,
 'RB Vernon', 'Cheltenham Racecourse, Gloucestershire', 'South West', 'March', '2027-03-16',
 '280,000+', '£2,000–£8,000', 'manual'),

('Royal Ascot',
 'Equestrian',
 'Five-day flat racing festival. Some of the most affluent racegoers in the world. Premium branding essential — specialty coffee well suited.',
 'https://www.ascot.co.uk', NULL, FALSE,
 'Independent Application', 'Ascot Racecourse, Berkshire', 'South East', 'June', '2026-06-16',
 '300,000+', '£3,000–£12,000', 'manual'),

('Foodies Festival Edinburgh',
 'Food Festival',
 'One of Scotland''s biggest food festivals at Inverleith Park. Hot drinks are always top sellers.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', TRUE,
 'Foodies Festival', 'Inverleith Park, Edinburgh', 'Scotland', 'August', '2026-08-07',
 '50,000+', '£1,000–£3,500', 'manual'),

('Foodies Festival Brighton',
 'Food Festival',
 'South coast Foodies Festival, strong weekend family audience. Coffee and cold brew do very well here.',
 'https://www.foodiesfestival.com', 'https://www.foodiesfestival.com/trade-stands', FALSE,
 'Foodies Festival', 'Hove Lawns, Brighton', 'South East', 'May', '2026-05-23',
 '35,000+', '£900–£3,000', 'manual'),

('Great British Food Festival at Chatsworth',
 'Food Festival',
 'Flagship GBFF event at the spectacular Chatsworth estate. Top-tier demographic, excellent coffee revenue potential.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', TRUE,
 'Great British Food Festival', 'Chatsworth House, Derbyshire', 'Midlands', 'September', '2026-09-05',
 '30,000+', '£900–£3,000', 'manual'),

('Great British Food Festival at Audley End',
 'Food Festival',
 'GBFF event at the beautiful Audley End House. Two days, affluent audience, strong demand for artisan coffee.',
 'https://www.greatbritishfoodfestival.com', 'https://www.greatbritishfoodfestival.com/apply', FALSE,
 'Great British Food Festival', 'Audley End House, Essex', 'East of England', 'June', '2026-06-27',
 '20,000+', '£800–£2,500', 'manual'),

('BBC Good Food Show Winter',
 'Food Festival',
 'BBC-branded consumer food show at the NEC Birmingham. Indoor show with massive footfall — ideal for specialty coffee.',
 'https://www.bbcgoodfoodshow.com', 'https://www.bbcgoodfoodshow.com/exhibiting', TRUE,
 'Eat & Drink Festivals', 'NEC Birmingham', 'Midlands', 'November', '2026-11-25',
 '120,000+', '£2,000–£7,000', 'manual'),

('Taste of London',
 'Food Festival',
 'Premium food and restaurant festival in Regent''s Park. Very high-end audience, strong spend. Application through Taste Festivals.',
 'https://www.tastefestivals.com', 'https://www.tastefestivals.com/participate', FALSE,
 'Taste Festivals', 'Regent''s Park, London', 'London', 'June', '2026-06-17',
 '45,000+', '£1,500–£5,000', 'manual'),

('Manchester Christmas Markets',
 'Christmas Market',
 'One of the UK''s largest Christmas markets across multiple city centre sites. Hot drink pitch applications managed by Manchester City Council.',
 'https://www.manchesterchristmas.com', 'https://www.manchester.gov.uk/christmas-markets', TRUE,
 'Manchester City Council', 'Manchester City Centre', 'North West', 'November–December', '2026-11-13',
 '500,000+', '£3,000–£12,000', 'manual'),

('Birmingham Frankfurt Christmas Market',
 'Christmas Market',
 'Europe''s largest German Christmas market outside Germany and Austria. Coffee concession applications through Birmingham Events.',
 'https://www.thinkbirmingham.com/christmas', NULL, TRUE,
 'Birmingham City Council', 'Birmingham City Centre', 'Midlands', 'November–December', '2026-11-05',
 '5,500,000+', '£4,000–£15,000', 'manual'),

('Winchester Christmas Market',
 'Christmas Market',
 'Charming Christmas market in the grounds of Winchester Cathedral. Premium demographic, strong hot drink sales.',
 'https://www.winchestercathedral.org.uk/christmas', NULL, FALSE,
 'Winchester BID', 'Winchester Cathedral, Hampshire', 'South East', 'November–December', '2026-11-20',
 '250,000+', '£2,000–£8,000', 'manual'),

('Bath Christmas Market',
 'Christmas Market',
 'One of the UK''s most atmospheric Christmas markets, set against Roman and Georgian architecture. Apply direct to Bath BID.',
 'https://www.bathchristmasmarket.co.uk', 'https://www.bathchristmasmarket.co.uk/traders', FALSE,
 'Bath BID', 'Bath City Centre', 'South West', 'Late November–December', '2026-11-26',
 '400,000+', '£2,500–£10,000', 'manual'),

('Kerb Camden Market',
 'Street Food Market',
 'London''s most iconic street food market, operating year-round. Regular weekly trading — excellent for building a loyal customer base.',
 'https://www.camdenmarket.com/food', 'https://www.kerbfood.com/traders', FALSE,
 'Kerb', 'Camden Market, London', 'London', 'Year-round, weekends', NULL,
 '5,000–15,000/day', '£300–£800/day', 'manual'),

('Kerb King''s Cross',
 'Street Food Market',
 'Lunchtime street food market at Granary Square, King''s Cross. Corporate and tourist demographic, excellent coffee take-up.',
 'https://www.kerbfood.com', 'https://www.kerbfood.com/traders', FALSE,
 'Kerb', 'Granary Square, King''s Cross, London', 'London', 'Weekdays year-round', NULL,
 '2,000–5,000/day', '£200–£600/day', 'manual'),

('Portobello Road Market',
 'Street Food Market',
 'Famous London antiques and street food market. Weekend trading, strong tourist footfall. Apply to Portobello Road BID.',
 'https://www.portobelloroad.co.uk', NULL, FALSE,
 'Portobello Road BID', 'Portobello Road, Notting Hill, London', 'London', 'Saturdays year-round', NULL,
 '3,000–10,000/day', '£150–£500/day', 'manual'),

('Digbeth Dining Club',
 'Street Food Market',
 'Birmingham''s best street food market in the creative district. Apply direct. Strong demographic for specialty coffee.',
 'https://www.digbethdiningclub.com', 'https://www.digbethdiningclub.com/apply', FALSE,
 'Digbeth Dining Club Ltd', 'Digbeth, Birmingham', 'Midlands', 'Weekends year-round', NULL,
 '2,000–6,000/day', '£200–£600/day', 'manual'),

('British Street Food Awards',
 'Food Festival',
 'Regional heats and national final celebrating the best of UK street food. Apply to compete and trade at regional heats — excellent profile building.',
 'https://www.britishstreetfood.co.uk', 'https://www.britishstreetfood.co.uk/enter', FALSE,
 'British Street Food Awards', 'Various UK cities', 'National', 'May–September', NULL,
 '5,000–20,000', '£300–£1,200', 'manual')

ON CONFLICT (name) DO UPDATE SET
  description       = EXCLUDED.description,
  website           = EXCLUDED.website,
  application_url   = EXCLUDED.application_url,
  organiser         = EXCLUDED.organiser,
  location          = EXCLUDED.location,
  region            = EXCLUDED.region,
  typical_dates     = EXCLUDED.typical_dates,
  next_date         = EXCLUDED.next_date,
  estimated_footfall = EXCLUDED.estimated_footfall,
  pitch_fee_range   = EXCLUDED.pitch_fee_range,
  featured          = EXCLUDED.featured,
  updated_at        = NOW();
