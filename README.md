<div align="center">

<img src="docs/assets/naviable-logo.png" alt="NaviAble logo" width="380" />

# Naviable — Developer & Architecture Documentation ♿🗺️
### *Community-Driven Urban Accessibility Evidence System for Surabaya*

**Engineering Notes & System Architecture**
Built by **Tim coba-coba (Telkom University Surabaya)** for **GAYATAMA 5 (2026)**
*Theme: "Innovating for a Sustainable Future: Empowering Communities through Web Technology"*

**🌐 Live Demo: [naviable.vercel.app](https://naviable.vercel.app)**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-naviable.vercel.app-7449d1?style=flat&logo=vercel)](https://naviable.vercel.app)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-blue?style=flat&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%205-lightgrey?style=flat&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet%201.9-green?style=flat&logo=leaflet)](https://leafletjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase-336791?style=flat&logo=postgresql)](https://supabase.com/)
[![Vision AI](https://img.shields.io/badge/Vision%20AI-Google%20%7C%20OpenAI%20%7C%20OpenRouter-orange?style=flat)](./backend/README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat)](./LICENSE)

[Why We Built This](#1-problem-statement--why-we-built-naviable-why) • [Key Features](#2-key-features) • [Tech Stack](#3-technology-stack) • [Core Invariants](#4-system-invariants--product-boundaries-warning) • [Architectural Trade-Offs](#5-architectural-decisions--trade-offs-trade-off) • [Contribution & Review Loop](#6-contribution--review-lifecycle) • [Data Model](#7-data-model--schema) • [Dev & Testing](#8-local-development--verification-guide) • [Known Limitations](#9-known-limitations--workarounds-workaround--todo) • [The Team](#10-development-team) • [License](#11-license--acknowledgements)

---

</div>

## 1. Problem Statement & Why We Built Naviable (WHY)

// WHY: Why does this system exist, and why could existing tools not solve this problem?

When analyzing existing map solutions (Google Maps, Wheelmap, and municipal WebGIS datasets):
1. **Binary Tags Hide Failures**: Labeling a facility simply as *"accessible"* or *"inaccessible"* obscures operational reality. A healthcare center (*puskesmas*) might feature a flat entrance ramp, but its accessible toilet may be locked or repurposed as storage. For a wheelchair user, the trip fails entirely at destination.
2. **Missing Concept of the Journey Chain**: Academic research by **Pebriyanti (2020)** (*Denpasar Accessible Map*, Undagi Architecture Journal) demonstrated that physical facilities in Indonesian cities frequently exist in symbolic forms (such as dedicated parking or tactile paving lines on sidewalks), but **functional journey chains collapse** at steep ramps, missing handrails, or sidewalks obstructed by street vendors and parked motorbikes.
3. **Metrological Limits of Computer Vision**: Uncalibrated smartphone photos cannot reliably measure doorway widths (e.g. 90 cm clearances) or ramp gradients (1:12 per Ministry of Public Works Regulation No. 14/2017). Claiming automated legal compliance from single 2D photos is engineering dishonesty.

We designed **Naviable** as a civic evidence platform:
- We replaced single 0–100 scores and binary checkboxes with the **8-Element Chain (E1–E8)** and **5 Operational Statuses**.
- We restricted AI Vision to an **assistant role**: it drafts element statuses and pre-screens photos, but every published record is confirmed by a human contributor with photographic proof, and only a human reviewer can mark a venue as team-verified.
- We structured disaggregated data exports via the **Evidence Pack (CSV, `GET /api/evidence.csv`)** to empower disabled advocacy groups, campus researchers, and urban planners (directly supporting SDG targets 11.2, 11.7, 10.2, and 17.18).

---

## 2. Key Features

- **Map + list exploration** — A Leaflet map paired with a synchronized, keyboard-navigable place list. Filter by access need (*Mobilitas*, *Visual*, *Auditori*, *Sensorik*), condition status, category, or popular street corridors.
- **Search that understands Surabaya** — Matches place names, streets (normalizing *Jl./Jln./Jalan*), districts, and category intent (e.g. *"tempat ngopi"* → cafés). Includes **voice search** (Web Speech API) and surfaces public places not yet in Naviable from OpenStreetMap, each with a one-click "add to Naviable" action.
- **Place detail drawer** — The E1–E8 chain with per-element evidence, source and license metadata, data freshness, the **citizen correction history** (who changed which element, when, and the evidence photo), **visitor experience reviews**, and Google Maps walking directions.
- **Add a place / report a change** — New places start with a **Choose Location** step: use the device's location or drop a pin on an inline mini map. The full address is filled in by reverse geocoding, and latitude/longitude are read-only so they always match the pin. Drafts (including the photo) autosave on the device, so contributors can fill the form before signing in.
- **Automatic photo checks** — On upload, the photo is analyzed for element drafts and provenance (AI-generation) signals. On submit, the server checks that the photo actually shows the chosen element; a photo that does not is sent back for revision with an explanation.
- **Reviewer portal (`/reviewer`)** — A queue with statistics, report details, *approve / needs revision / reject* decisions with a checklist and notes, element-status corrections, and an audit history.
- **Contributor profile** — Contributors see the review outcome, reviewer note, and checklist for their own reports (the reviewer's identity is withheld), with a badge for new outcomes.
- **Accessibility Insights (observatory)** — City-level statistics, data completeness (mapped vs. still needing a map point), status distribution, and a district snapshot.
- **Built-in accessibility panel** — Dark mode, high contrast, text zoom (100–200%), reduced motion, a dyslexia-friendly font (OpenDyslexic), grayscale mode, link highlighting, a reading guide, larger touch targets (motor mode), and a voice reader. Preferences persist on the device.
- **Bilingual interface** — Indonesian and English, switchable at any time.

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16.3 (App Router), React 19.2, TypeScript 5, Tailwind CSS 4, Leaflet 1.9 + React Leaflet 5, Lucide icons |
| **Backend API** | Node.js 20, Express 5, Zod 4 (request & image validation), TypeScript 5 |
| **Data, Storage & Auth** | Supabase — PostgreSQL (SQL migrations, RLS, `publish_report` / `review_report` RPCs), private Storage buckets, Supabase Auth (Google OAuth + email/password). A local JSON store for zero-setup development. |
| **Vision AI** | Google Gemini (`@google/genai`), OpenAI, and OpenRouter with configurable failover order and timeouts; Content Provenance checks for AI-generated photos |
| **Maps & Geodata** | OpenStreetMap tiles and data, Nominatim and Photon (forward & reverse geocoding, proxied server-side) |
| **Browser APIs** | Geolocation API (Choose Location), Web Speech API (voice search & voice reader), IndexedDB (draft photos) |
| **Typography** | Poppins (via `next/font`), OpenDyslexic (`@fontsource/opendyslexic`) |
| **Quality & CI** | `node:test` + `tsx`, ESLint 9, PostgreSQL 16 SQL acceptance tests, GitHub Actions (verification pipeline + security & dependency audit) |
| **Hosting** | Vercel (frontend live demo) |

---

## 4. System Invariants & Product Boundaries (WARNING)

// WARNING: These domain boundaries are enforced by code logic and verified by automated tests. Future developers must not relax these constraints:

1. **AI Never Publishes or Approves (`lockedBy: 'kontributor'`)**:
   `/api/analyze` only proposes drafts. The database column `locked_by` strictly accepts `'kontributor'`. The one automated decision the AI may take is to **send a report back** as `NEEDS_REVISION` (recorded under the reviewer label `naviable-ai`), and only when the photo shows **none** of the elements the contributor claimed. A disagreement about an element's *status* is always left to a human reviewer. If the AI provider fails, times out, or has no API key configured, the check is skipped, the report goes to the human queue, and the system **remains 100% operational in manual checklist mode**.
2. **Low-Confidence Detections Degrade to `BELUM_DIKETAHUI`**:
   When a provider's visual detection confidence is `"rendah"` (low), the status must automatically revert to `"BELUM_DIKETAHUI"`. The system must never hallucinate conditions when visual evidence is uncertain.
3. **`BELUM_DIKETAHUI` Is Excluded from the Score Denominator**:
   `BELUM_DIKETAHUI` means insufficient evidence has been collected. It **must not count as 0% (failure)** nor artificially depress a venue's score. Scores are always accompanied by an explanatory sentence (e.g. *"Chain needs attention at accessible toilet; 2 elements unknown"*), never an isolated percentage.
4. **Contributor Reports Never Auto-Flip `verifiedByTeam`**:
   When a contributor publishes to `POST /api/reports`, we lock their element evidence (`lockedBy: 'kontributor'`) but keep `verifiedByTeam: false`. That flag only turns `true` when a signed-in **reviewer** approves the report via `POST /api/reviewer/reports/:id/review`. On approval, the reviewer may correct element statuses; those corrections win over the reported ones (a correction to `BELUM_DIKETAHUI` leaves the element untouched). We never let an unreviewed field submission mark its own venue as team-verified.
5. **Districts Are Never Inferred from Free-Form Addresses**:
   Districts missing from the baseline seed data remain `null` and render as *"Belum diketahui"*. Heuristic guessing from unstructured street addresses is prohibited to prevent geographic misclassification.
6. **Idempotent Mutation Endpoints**:
   `POST /api/reports`, `POST /api/places`, and `POST /api/reviews` accept a UUID `Idempotency-Key` header and store a SHA-256 hash of the payload. Replaying with an identical payload returns a `200 OK` replay; reusing a key with different payload content returns a `409 Conflict`. The web client always sends a key; if a client omits it, the server generates a fresh one, so that request is not replay-protected.
7. **Every Mutation Requires a Signed-In Actor; Reviewing Requires a Reviewer Role**:
   We put all writes (`POST /api/reports`, `/api/places`, `/api/reviews`, `/api/analyze`) behind a Bearer-token guard — anonymous browsing stays open, but publishing does not. The `/api/reviewer/*` routes add a second gate on top of that guard: we re-verify the token and require `app_metadata.role === 'REVIEWER'`, a server-managed claim that users cannot set themselves. A logged-in contributor without that claim gets `403`, so approving reports is never reachable from the public UI.

---

## 5. Architectural Decisions & Trade-Offs (TRADE-OFF)

### TRADE-OFF 1: Dual-Store Architecture (`LocalStore` vs. `SupabaseStore`)
- **Our Decision**: We built two storage adapters implementing a unified `Store` interface:
  1. `LocalStore`: Backed by a local JSON file (`database.json`) with an in-memory sequential promise queue and atomic temporary renaming (`flag: "wx"` + rename). Photos are persisted to `.local/photos/`. It requires zero external cloud dependencies or Docker containers, and seeds demo correction reports and one demo visitor review per place so a fresh checkout has something to review and display.
  2. `SupabaseStore`: Backed by PostgreSQL transactions via the `publish_report` and `review_report` stored procedures and private Supabase Storage buckets with 5-minute signed URLs. It never seeds demo reports or reviews.
- **Why**: Zero-friction local development, instant test suite execution, and clean judge demonstrations without cloud credential dependencies. The backend refuses to boot if `NODE_ENV=production` is paired with `DATA_STORE=local`.

### TRADE-OFF 2: *Directions Hand-Off* vs. *Turn-by-Turn Routing Engine*
- **Our Decision**: We intentionally **did not** build a turn-by-turn routing engine. Claiming safe pedestrian navigation without comprehensive micro-elevation, curb-cut, and sidewalk surface datasets creates serious safety hazards for disabled users.
- **Solution**: The place drawer hands off to Google Maps walking directions and reminds travelers to check the path from the nearest stop to the entrance. The earlier in-app journey planner has been retired; its `GET /api/journey` endpoint (a *Journey Hint* listing obstructed elements between two places) remains available in the API.

### TRADE-OFF 3: Synchronized Dual-View UI (*Map + List*)
- **Our Decision**: Based on web accessibility literature (Höckner et al., 2012), our Leaflet map **must always be accompanied by an equivalent list view** that is fully keyboard-navigable and screen-reader accessible.
- **Accessibility Details**: Markers and cards use shape symbols and explicit text (e.g. `✓`, `!`, `•`, `×`, `?`) rather than relying on color alone (WCAG 1.4.1).

### TRADE-OFF 4: Server-Side Geocoding Proxy vs. Direct Browser Calls
- **Our Decision**: Place search (`/api/geocode`) and address lookup for a picked point (`/api/reverse-geocode`) go through Next.js route handlers instead of calling Nominatim from the browser.
- **Why**: Nominatim's usage policy requires an identifying `User-Agent` and a low request rate. The proxy sends one, caches results (15 minutes for search, 30 minutes for reverse lookups), and falls back to Photon when Nominatim is unavailable. If both fail, the contributor simply types the address.

---

## 6. Contribution & Review Lifecycle

Contributing is a signed-in action. Browsing the map, list, and observatory stays fully public, but every write (`POST /api/reports`, `/api/places`, `/api/reviews`, `/api/analyze`) sits behind a Bearer-token guard. We authenticate people through Supabase Auth (Google OAuth or email/password) and attach the session token to each mutation. Contributors can fill in a draft first; we ask them to sign in only when they publish.

We engineered the submit flow to survive flaky mobile networks and duplicate taps, then hand the report to a human reviewer before a venue is marked team-verified:

```text
0. Contributor signs in (Google OAuth or email/password via Supabase). The frontend
   attaches the session Bearer token to every write; an unauthenticated write is
   rejected with 401. Drafts, including the photo, are kept on the device meanwhile.
   │
1. New place only — "Choose Location":
   ├── Use the device location (Geolocation API), or drop / drag a pin on a mini map.
   ├── The full address is reverse-geocoded from the pin (GET /api/reverse-geocode).
   └── Latitude/longitude are read-only and move with the pin; if location access is
       denied or inaccurate, the contributor picks the point on the map instead.
   │
2. Contributor picks the element shown in the photo (E1–E8) and selects an image
   (JPG, PNG, or WebP; <= 5 MB).
   │
3. The photo is checked automatically on upload (POST /api/analyze):
   ├── We run vision analysis and photo-integrity checks in parallel.
   ├── Google, OpenAI, then OpenRouter are tried in configured failover order.
   ├── Content Provenance and visual-artifact signals are reported separately from
   │   accessibility status; a photo with trusted AI provenance is rejected outright.
   └── If offline / unconfigured: degrades gracefully to manual checklist (503 + fallback).
   │
4. Contributor inspects the image, sets the element status, adds notes, and must check
   the human confirmation checkbox (humanConfirmed: true).
   │
5. Frontend generates a UUID Idempotency-Key and sends the evidence:
   ├── New venue not in the dataset? We POST /api/places instead — the same idempotent
   │   transaction creates the place and its first report atomically.
   ├── Express middleware checks CORS and IP rate limits before parsing the 8 MB body.
   ├── Zod validates the payload and the image's binary MIME signature (magic bytes).
   ├── Backend generates a SHA-256 hash of payload + base64 image.
   ├── Database executes an atomic write:
   │     • Saves the isolated photo.
   │     • Locks place element state (lockedBy: "kontributor").
   │     • Appends the full report audit payload into the reports table.
   │     • Increments photoCount, reportCount, and updatedAt.
   └── Returns 201 Created (or 200 on an idempotent replay) with the place snapshot.
   │
6. Server-side photo-element check (in parallel with the integrity check):
   ├── If the photo shows none of the claimed elements, the report is set to
   │   NEEDS_REVISION by "naviable-ai" with an explanatory note, and skips the
   │   reviewer queue. The contributor sees why on the confirmation screen.
   └── If the check is unavailable, the report goes to the human queue as usual.
   │
7. The report enters the review lifecycle (reviewStatus):
   SUBMITTED → UNDER_REVIEW → { NEEDS_REVISION | REJECTED | APPROVED }.
   ├── A reviewer works through the queue in the reviewer portal (/reviewer), backed by
   │   /api/reviewer/*; NEEDS_REVISION and REJECTED require a written note.
   └── On APPROVED, we record the audit trail, apply any reviewer-corrected element
       statuses, and flip the place's verifiedByTeam to true.
   │
8. The contributor sees the outcome, reviewer note, and checklist in their profile
   (GET /api/me); the reviewer's identity is not exposed.
```

Contributors can also leave a plain-language **experience review** on any venue (`POST /api/reviews`) — short qualitative notes that sit beside the chain, but never feed the element scores.

---

## 7. Data Model & Schema

### 1. The Eight Elements (E1–E8)

```typescript
export const CHAIN_ELEMENTS = [
  "E1_door",          // Main entrance & door clearance
  "E2_ramp",          // Ramp gradient, surface, and handrails
  "E3_toilet",        // Accessible toilet & grab bars
  "E4_lift",          // Elevator with tactile/auditory feedback
  "E5_guiding_block", // Tactile ground surface indicators
  "E6_parking",       // Accessible parking space & proximity
  "E7_signage",       // High-contrast, tactile/braille signage
  "E8_crossing",      // Pelican & pedestrian crossing facilities
] as const;
```

### 2. Five Operational Statuses

| Status | Operational Meaning | Visual Token |
|---|---|---|
| `UTUH` | Element is present, standard-compliant, and usable independently. | Green • Solid (`✓`) |
| `TERHALANG` | Physical element exists, but is currently obstructed by vehicles or stalls. | Orange • Dashed (`!`) |
| `TIDAK_STANDAR` | Element exists but violates safety principles (e.g. ramp too steep, no rails). | Yellow • Dotted (`•`) |
| `TIDAK_ADA` | Element is missing entirely. | Red • Cross (`×`) |
| `BELUM_DIKETAHUI` | Insufficient field evidence (excluded from score denominator). | Grey • Empty (`?`) |

### 3. Dynamic User Profile Weights

Summary scores weight elements according to specific functional needs:
- **Mobilitas (Wheelchair/Motor)**: `E1` (2.0), `E2` (2.0), `E3` (2.0), `E4` (1.5), `E6` (1.0), `E8` (1.5).
- **Visual (Blind/Low Vision)**: `E5` (2.0), `E7` (2.0), `E8` (2.0), `E4` (1.0).
- **Auditori (Deaf/Hard of Hearing)**: `E7` (2.0), `E8` (2.0).
- **Sensorik (Neurodiverse/Cognitive)**: `E7` (2.0), `E1` (1.0).

---

## 8. Local Development & Verification Guide

### Prerequisites
- Node.js `20.x` or higher
- npm `10.x` or higher

### Installation
```bash
# Clone the repository
git clone https://github.com/bagusardin25/Naviable.git
cd Naviable

# Install dependencies for both projects
npm install --prefix backend
npm install --prefix frontend

# Optional: start from the example environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Running Locally
The app boots out of the box against the local JSON store (`DATA_STORE=local`, the default) — no cloud setup, Docker, or third-party accounts required:

```bash
# Terminal 1 — Start Express Backend (Port 4000)
npm run dev:backend

# Terminal 2 — Start Next.js Frontend (Port 3000)
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Browsing the map, list, and observatory needs zero credentials. Because we gate every write behind sign-in (see Invariant #7), exercising the contribution flow in the UI requires a Supabase project: set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `frontend/.env.local`, and enable Google OAuth and/or email sign-in there. The backend test suites don't need it — they drive the API directly with a local dev token.

To use the reviewer portal (`/reviewer`), grant the role to an existing account (reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `backend/.env`):

```bash
cd backend
node scripts/grant-reviewer.mjs reviewer@example.com   # grant REVIEWER
node scripts/grant-reviewer.mjs --list                 # list current reviewers
```

The optional AI keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`) enable automatic photo checks; without them, contributors use the manual checklist.

### Quality Assurance & Automated Tests
Our verification suite tests all layers from TypeScript compilation to SQL transactions and live HTTP loops:

```bash
# 1. Typecheck TypeScript in backend and frontend
npm run typecheck

# 2. Run frontend ESLint rules
npm --prefix frontend run lint

# 3. Run backend + frontend unit & domain tests (node:test)
npm test

# 4. Test SQL migrations & RLS policies on isolated temporary Postgres 16 cluster
npm run test:sql

# 5. Run end-to-end HTTP smoke test loop against active backend
npm --prefix backend run test:smoke

# 6. Build full production bundles (backend tsc + frontend next build)
npm run build:all
```

GitHub Actions runs the same pipeline on pushes and pull requests to the main development branches (typecheck, tests, SQL acceptance tests, smoke loop, lint, and production builds), plus a security workflow that checks for tracked secrets and runs an npm dependency audit.

---

## 9. Known Limitations & Workarounds (WORKAROUND & TODO)

// WORKAROUND & TODO: Deliberate technical boundaries for the competition milestone:

- **WORKAROUND (Photo Streaming)**: The Next.js Image component uses the `unoptimized` property for local media URLs to avoid hardcoding localhost domain whitelists across developer environments.
- **WORKAROUND (CSV Formula Injection)**: Values beginning with `=`, `+`, `-`, or `@` are prefixed with a single quote (`'`) during Evidence Pack CSV generation.
- **WORKAROUND (Public Geocoding Services)**: Search suggestions and automatic addresses depend on the public Nominatim and Photon services. We cache and rate-limit through our proxy; when both are unavailable, contributors type the address themselves.
- **WORKAROUND (Device Location Accuracy)**: The Geolocation API only works on HTTPS (or `localhost`), and accuracy varies by device. We warn when accuracy is worse than ±100 m and keep the map pin adjustable.
- **TODO (Cloud Concurrency Benchmarking)**: SQL migrations, PostGIS spatial indexing, and RPC transactions are verified on local PostgreSQL 16 (`npm run test:sql`), but large-scale concurrent write stress-testing on production managed Supabase remains to be performed.
- **TODO (Field Hardware Screen-Reader Audit)**: Interface accessibility has passed full keyboard navigation and color contrast simulations; physical testing with screen reader hardware (NVDA / TalkBack) alongside local disability advocacy panels is planned for subsequent field iterations.

---

## 10. Development Team

Designed and developed by:

**Tim coba-coba**
*Undergraduate Students — Telkom University Surabaya*

- **Bagus Ardin**
- **Ida Bagus**
- **Hartita**
- **Muthe**

*Submitted for GAYATAMA 5 International Web Technology Competition (2026).*

---

## 11. License & Acknowledgements

- Source code is licensed under the [MIT License](./LICENSE).
- Academic methodology is grounded in Pebriyanti (2020), *Peta Aksesibilitas (Denpasar Accessible Map) Bagi Penyandang Disabilitas di Ruang Publik Kota: Menuju Kota Denpasar Ramah Disabilitas*, Undagi: Jurnal Ilmiah Arsitektur Universitas Warmadewa.

### Third-Party Data, Services & Libraries

| Resource | Used for | License / Terms |
|---|---|---|
| [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors | Surabaya baseline facility data, map tiles | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/); [Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) |
| [Nominatim](https://nominatim.org/) | Place search & reverse geocoding | [Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) |
| [Photon](https://photon.komoot.io/) by Komoot | Geocoding fallback | Apache-2.0 (software); OSM data under ODbL |
| [Leaflet](https://leafletjs.com/) | Interactive maps | BSD-2-Clause |
| [React Leaflet](https://react-leaflet.js.org/) | React bindings for Leaflet | Hippocratic License 2.1 |
| [Lucide](https://lucide.dev/) | Icons | ISC |
| [OpenDyslexic](https://opendyslexic.org/) via Fontsource | Dyslexia-friendly font | SIL Open Font License 1.1 |
| [Poppins](https://fonts.google.com/specimen/Poppins) via Google Fonts | Interface typeface | SIL Open Font License 1.1 |
| [Next.js](https://nextjs.org/), [React](https://react.dev/), [Express](https://expressjs.com/), [Zod](https://zod.dev/), [Supabase JS](https://supabase.com/) | Application frameworks & SDKs | MIT |
| [Google Gen AI SDK](https://github.com/googleapis/js-genai) | Gemini vision analysis | Apache-2.0 |
| Google Gemini, OpenAI, OpenRouter APIs | Photo analysis (assistant only) | Each provider's API terms of service |
