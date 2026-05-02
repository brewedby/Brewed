# Brewed — Privacy Policy

**Effective date:** [INSERT EFFECTIVE DATE — e.g. 1 June 2026]
**Last updated:** [INSERT LAST UPDATED DATE]
**Controller:** Brewed by Boon Ltd, a company registered in [INSERT JURISDICTION] (company no. [INSERT NUMBER]), of [INSERT REGISTERED ADDRESS].
**Contact:** [INSERT SUPPORT EMAIL — e.g. support@brewedbyboon.com]

This privacy policy explains what personal information Brewed by Boon Ltd ("**we**", "**us**", "**Brewed**") collects when you use the Brewed mobile app and connected services, why we collect it, how it is stored, who else (if anyone) sees it, and the rights you have over it. It is written for traders who use the app to manage their own catering / mobile food and beverage business, and is intended to be read in plain English.

If you only have a minute, the short version is in the app: open **Settings → Privacy summary**.

---

## 1. Quick summary

| Question | Answer |
|---|---|
| Is the app free? | No. Brewed Pro is **£9 per month**, billed by Apple. |
| Who handles the payment? | Apple (App Store). We never see your card or billing address. |
| Can the developer see my financial data (sales, costs, margins)? | The data is held in our cloud database. We technically have administrative access to that database, but we do not analyse, sell, share, advertise from, or otherwise use your financial data. See section 6 for the full position and the option to use end-to-end encryption (planned). |
| Do you use ads or analytics? | No advertising, no third-party analytics, no crash trackers, no tracking SDKs at all. |
| Where is my data stored? | Supabase, hosted in the European Union. |
| Can I export or delete my data? | Yes — see section 11. |

---

## 2. The data we collect

We only collect the data we need to run Brewed for you.

### 2.1 Account data
- Email address (used to sign you in and to send you password-reset emails)
- A password (stored hashed by Supabase Auth — we never see the plaintext)
- Business name (shown on your dashboard and reports)
- Business type (e.g. "Coffee", "Street Food") — used to set sensible defaults

### 2.2 Operational data you enter
This is the body of what you put into the app:
- **Events** you apply to or run (name, date, location, status, notes, application URL)
- **Concessions companies** you work with (name, contacts, website, notes)
- **Financials per event**: gross sales, cost of goods, pitch fee, travel, equipment, staffing, commissions, VAT split, milk litres, miles driven, etc.
- **Daily takings** entries
- **Staffing entries** (staff names, hours, hourly rate)
- **Infrastructure items** (cost line items per event)
- **Fleet / units** (vehicle name, registration, MOT/tax/service dates, dimensions)
- **Product catalogue** (item names, selling price, unit cost)
- **Sales reports** uploaded by you (CSV / PDF)
- **Documents** you attach to events (insurance certificates, risk assessments, etc.)

### 2.3 Subscription data
- Your subscription status ("active", "expired", etc.)
- The Apple original transaction ID for your subscription
- The expiry date of the current period
- Whether auto-renew is on
- Whether the subscription is in Sandbox or Production environment

### 2.4 Device data
- Push notification token (only if you grant notification permission), used to remind you about MOT/tax expiries and similar
- A securely stored Supabase session token (so you stay signed in)
- A securely stored Apple-issued refresh token if you enable Face ID / Touch ID sign-in

### 2.5 What we do not collect
- We do **not** collect advertising identifiers (IDFA / IDFV).
- We do **not** collect device location.
- We do **not** use third-party analytics (Google Analytics, Firebase, Mixpanel, etc.) or crash reporters (Sentry, Bugsnag, etc.).
- We do **not** read or use your contacts, photos, microphone, or calendar except where you actively pick a file or photo to attach to an event document.

---

## 3. Lawful bases for processing (UK GDPR / EU GDPR)

We process your personal data on the following bases:

| Purpose | Lawful basis |
|---|---|
| Creating and operating your account; storing the data you enter into Brewed | **Contract** — necessary to provide the service you have signed up to. |
| Processing your subscription | **Contract** + **Legal obligation** (Apple receipts and tax records). |
| Sending you operational emails (password reset, important service notices) | **Contract** + **Legitimate interests** in keeping the service safe and reliable. |
| Sending you push notifications about MOT/tax expiries, applications, etc. | **Consent** (you can disable in iOS Settings at any time). |
| Detecting and preventing fraud or abuse of the service | **Legitimate interests** in keeping the platform secure for all users. |

---

## 4. How and where data is stored

- We use **Supabase** (Supabase Inc., 970 Toa Payoh North #07-04, Singapore 318992 — operating EU-region infrastructure on AWS) as our backend database, authentication and edge function provider.
- Your data is stored in Supabase's **EU (Frankfurt)** region.
- Database access is restricted by **Row-Level Security (RLS)**. RLS is a PostgreSQL feature that enforces, at the database level, the rule "a user can only see and modify their own rows". This applies to every table in Brewed: events, financials, sales, fleet, documents, etc.
- Files (event documents and uploaded sales PDFs) are stored in Supabase Storage with the same per-user access policies.
- Connections between the app and Supabase are encrypted in transit (TLS 1.2+).

---

## 5. Payments

- Brewed Pro is sold as an auto-renewable subscription through the Apple App Store at the price displayed in the app (£9 per month, or the equivalent local price).
- **Apple processes all payments**. Brewed does not receive your card number, expiry date, CVC, billing address, full name as it appears on the card, or any other payment-card data.
- The only payment-related data we receive is an Apple-signed receipt that we verify with Apple to confirm whether your subscription is active. From that we store: the original transaction ID, the current expiry date, whether auto-renew is on, and the environment (Sandbox / Production).
- See Apple's privacy policy at <https://www.apple.com/legal/privacy/> for how Apple handles your payment information.
- Your statutory rights to a refund are between you and Apple. To request a refund, use Apple's "Report a Problem": <https://reportaproblem.apple.com>.

---

## 6. Your financial data — important

Brewed is a tool for tracking the money side of running a mobile catering business. As a result, you will enter commercially sensitive figures (gross sales, margins, supplier costs, staff rates) into the app.

**Our position on your financial data is:**

1. We do **not** sell, share, rent, lease or otherwise disclose your financial data to any third party for any purpose.
2. We do **not** use your financial data to build advertising profiles or to recommend products to you.
3. We do **not** include your financial data in any analytics, metrics, dashboards, support tools, or aggregated reports that we (or anyone else) can view.
4. We do **not** transmit your financial data to any third-party processor other than Supabase, our hosting provider (which acts as a data processor under our written instructions and does not access your data for its own purposes).
5. Our staff do **not** routinely view individual user financial data. Administrative database access is restricted to a small number of named individuals, gated by multi-factor authentication, and logged.

**A note on technical access (please read):** Because Brewed currently stores your financial entries in a database that we operate, our administrators have the technical ability to read that data if they were to choose to (for example, by querying the database directly using an administrative key). We have policies and access controls to ensure this does not happen in normal operation. We are also actively planning an **end-to-end encryption** option whereby data would be encrypted on your device before being stored, with a key that we cannot decrypt — meaning we would lose the technical ability to see your figures even if we wanted to. We will update this policy when that option is available.

If end-to-end encryption is essential for you today, please contact us before subscribing — we may be able to arrange a local-only configuration on a case-by-case basis.

---

## 7. Third-party services

| Service | Purpose | What data is sent to them | Privacy policy |
|---|---|---|---|
| **Apple App Store** | Subscription billing, receipt validation | Your Apple ID and payment details — handled by Apple, not us. We send your subscription receipt to Apple's verification endpoint. | <https://www.apple.com/legal/privacy/> |
| **Supabase Inc.** | Database, authentication, storage, edge functions | Everything you enter into Brewed (per section 2). Acts as our processor under a Data Processing Agreement. | <https://supabase.com/privacy> |
| **Brave Search API** (via "Discover" tab) | Finds publicly listed UK festivals and concessions companies for the UK Events Directory | Generic, non-personal search queries (e.g. "UK street food market 2025 apply"). **Your name, email, financial figures, location and identity are never sent to Brave.** Search runs server-side in our edge function so your IP address is not exposed to Brave either. | <https://search.brave.com/help/privacy-policy> |
| **Open-Meteo + 7Timer + Nominatim** (weather widget) | Forecast for the upcoming event date | The event location string (e.g. "Hyde Park, London") and a date. No identity, no account, no financial data. These are public, free APIs that do not require keys. | Their respective sites |
| **Apple Push Notification Service** | Delivering push reminders | A push token issued by iOS. No content of notifications is stored on Apple's servers beyond delivery. | <https://www.apple.com/legal/privacy/> |

We do **not** use Google services, Facebook services, Firebase, Mixpanel, Amplitude, Segment, PostHog, Sentry, Bugsnag, or any advertising or analytics SDK.

---

## 8. International transfers

Your data is stored in the European Union (Supabase EU region). When Apple processes your subscription payment, your data may be transferred to the United States under Apple's standard contractual clauses (see Apple's privacy policy). Brave Search may process search queries in the United States; however, **no personal data is sent to Brave**, only generic search queries we generate server-side.

---

## 9. Data retention

- Account data and the data you enter into Brewed are retained for as long as your account is active.
- If you delete your account, we delete all of your data (account, events, financials, sales reports, documents, fleet, companies, etc.) within **30 days**.
- Subscription receipts are retained for 6 years to comply with UK tax law.
- Server logs (which do not contain your financial data) are retained for 14 days for security and incident investigation.
- Backups are retained for 30 days and then permanently deleted.

---

## 10. Security

- All connections between the app and Supabase use TLS 1.2 or higher.
- Supabase encrypts all data at rest using AES-256.
- Authentication uses industry-standard JWT tokens that auto-rotate hourly.
- The Supabase service role key is stored only on our server-side edge functions, never in the app.
- Subscription state can only be written by our server-side receipt verification function — the app cannot forge entitlement.
- We do not log financial data anywhere — not in the app, not in our edge functions, not in our error reports.
- Refresh tokens used by Face ID / Touch ID sign-in are stored in iOS Keychain (a hardware-backed secure store).

No system is perfectly secure. If you become aware of a security issue, please email [INSERT SECURITY EMAIL — e.g. security@brewedbyboon.com] and we will respond promptly.

---

## 11. Your rights

Under UK GDPR and EU GDPR you have the right to:

- **Access** the personal data we hold about you. The app already shows you everything you have entered. For a machine-readable export of your event financials, use **Reports → Export CSV**. For a wider export, email us.
- **Rectify** inaccurate data. You can edit any record in the app yourself.
- **Erase** your data ("right to be forgotten"). Email us from the address registered on your account, and we will delete your account and all associated data within 30 days.
- **Restrict** or **object to** certain processing.
- **Port** your data to another service (CSV export covers most of this).
- **Withdraw consent** for push notifications by disabling them in iOS Settings.
- **Lodge a complaint** with your supervisory authority. In the UK that is the Information Commissioner's Office (ICO): <https://ico.org.uk>.

To exercise any of these rights, email us at [INSERT SUPPORT EMAIL].

---

## 12. Children's privacy

Brewed is a business tool intended for use by adults who run a catering business. We do not knowingly collect personal data from anyone under the age of 16. If we discover we have collected data from a minor, we will delete it promptly.

---

## 13. Changes to this policy

We may update this policy from time to time. When we do, we will:

1. Update the "Last updated" date at the top.
2. For material changes, give you in-app or email notice at least 14 days before the change takes effect.
3. Continue to honour the version of the policy that was in effect when you signed up, where required by law.

---

## 14. Contact

[Brewed by Boon Ltd]
[INSERT REGISTERED ADDRESS]
Email: [INSERT SUPPORT EMAIL]
Apple developer team: TN2433BJWJ

For privacy-specific enquiries please put "Privacy" in the subject line.

---

## Appendix A — Apple App Store privacy labels

For the App Store privacy nutrition label, the data types we declare are:

| Data type | Linked to user? | Used for tracking? |
|---|---|---|
| Email address | Yes | No |
| Name (business name) | Yes | No |
| User content (events, financials, fleet, documents) | Yes | No |
| Purchases (subscription status) | Yes | No |
| Identifiers (account ID) | Yes | No |

We do **not** collect: Health & Fitness, Financial Info (we do not collect your card details — Apple does), Location, Sensitive Info, Contacts, Browsing History, Search History, Audio Data, Gameplay Content, Customer Support data, Diagnostics, Other Data Types.
