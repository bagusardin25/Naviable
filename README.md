<div align="center">

# Naviable — Developer & Architecture Documentation ♿🗺️
### *Community-Driven Urban Accessibility Evidence System for Surabaya*

**Engineering Notes & System Architecture**
Built by **Tim coba-coba (Telkom University Surabaya)** for **GAYATAMA 5 (2026)**
*Theme: "Innovating for a Sustainable Future: Empowering Communities through Web Technology"*

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/UI-React%2019-blue?style=flat&logo=react)](https://react.dev/)
[![Express](https://img.shields.io/badge/Backend-Express%205-lightgrey?style=flat&logo=express)](https://expressjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript%205-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Leaflet](https://img.shields.io/badge/Map-Leaflet%201.9-green?style=flat&logo=leaflet)](https://leafletjs.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20Supabase-336791?style=flat&logo=postgresql)](https://supabase.com/)
[![Vision AI](https://img.shields.io/badge/Vision%20AI-Google%20%7C%20OpenAI%20%7C%20OpenRouter-orange?style=flat)](./backend/README.md)

[Why We Built This](#1-problem-statement--why-we-built-naviable-why) • [Core Invariants](#2-system-invariants--product-boundaries-warning) • [Architectural Trade-Offs](#3-architectural-decisions--trade-offs-trade-off) • [Contribution & Review Loop](#4-contribution--review-lifecycle) • [Data Model](#5-data-model--schema) • [Dev & Testing](#6-local-development--verification-guide) • [Known Limitations](#7-known-limitations--workarounds-workaround--todo) • [The Team](#8-development-team)

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
- We restricted AI Vision strictly to an **assistant drafting tool**, ensuring that all published records are confirmed and locked by human contributors with photographic proof.
- We structured disaggregated data exports via the **Evidence Pack (CSV)** to empower disabled advocacy groups, campus researchers, and urban planners (directly supporting SDG targets 11.2, 11.7, 10.2, and 17.18).

---

## 2. System Invariants & Product Boundaries (WARNING)

// WARNING: These domain boundaries are enforced by code logic and verified by automated tests. Future developers must not relax these constraints:

1. **AI Never Publishes Directly (`lockedBy: 'kontributor'`)**:
   `/api/analyze` only proposes drafts. The database column `locked_by` strictly accepts `'kontributor'`. If the AI provider fails, times out, or has no API key configured, the system **remains 100% operational in manual checklist mode**.
2. **Low-Confidence Detections Degrade to `BELUM_DIKETAHUI`**:
   When a provider's visual detection confidence is `"rendah"` (low), the status must automatically revert to `"BELUM_DIKETAHUI"`. The system must never hallucinate conditions when visual evidence is uncertain.
3. **`BELUM_DIKETAHUI` Is Excluded from the Score Denominator**:
   `BELUM_DIKETAHUI` means insufficient evidence has been collected. It **must not count as 0% (failure)** nor artificially depress a venue's score. Scores are always accompanied by an explanatory sentence (e.g. *"Chain needs attention at accessible toilet; 2 elements unknown"*), never an isolated percentage.
4. **Contributor Reports Never Auto-Flip `verifiedByTeam`**:
   When a contributor publishes to `POST /api/reports`, we lock their element evidence (`lockedBy: 'kontributor'`) but keep `verifiedByTeam: false`. That flag only turns `true` when a signed-in **reviewer** approves the report via `POST /api/reviewer/reports/:id/review`. We never let an unreviewed field submission mark its own venue as team-verified.
5. **Districts Are Never Inferred from Free-Form Addresses**:
   Districts missing from the baseline seed data remain `null` and render as *"Belum diketahui"*. Heuristic guessing from unstructured street addresses is prohibited to prevent geographic misclassification.
6. **Strict Idempotency on All Mutation Endpoints**:
   Every submission to `POST /api/reports` requires a UUID `Idempotency-Key` header and a SHA-256 payload hash. Replaying with identical payloads returns a `200 OK` replay; reusing a key with different payload content returns a `409 Conflict`.
7. **Every Mutation Requires a Signed-In Actor; Reviewing Requires an OAuth Role**:
   We put all writes (`POST /api/reports`, `/api/places`, `/api/reviews`, `/api/analyze`) behind a Bearer-token guard — anonymous browsing stays open, but publishing does not. The `/api/reviewer/*` routes add a second gate on top of that guard: we re-verify the token and require `app_metadata.role === 'REVIEWER'`. A logged-in contributor without that claim gets `403`, so approving reports is never reachable from the public UI.

---

## 3. Architectural Decisions & Trade-Offs (TRADE-OFF)

### TRADE-OFF 1: Dual-Store Architecture (`LocalStore` vs. `SupabaseStore`)
- **Our Decision**: We built two storage adapters implementing a unified `Store` interface:
  1. `LocalStore`: Backed by a local JSON file (`database.json`) with an in-memory sequential promise queue and atomic temporary renaming (`flag: "wx"` + rename). Photos are persisted to `.local/photos/`. It requires zero external cloud dependencies or Docker containers.
  2. `SupabaseStore`: Backed by PostgreSQL transactions via a `publish_report` stored procedure and private Supabase Storage buckets with 5-minute signed URLs.
- **Why**: Zero-friction local development, instant test suite execution, and clean judge demonstrations without cloud credential dependencies. The backend refuses to boot if `NODE_ENV=production` is paired with `DATA_STORE=local`.

### TRADE-OFF 2: *Journey Hint* vs. *Turn-by-Turn Routing Engine*
- **Our Decision**: We intentionally **did not** build a turn-by-turn routing engine. Claiming safe pedestrian navigation without comprehensive micro-elevation, curb-cut, and sidewalk surface datasets creates serious safety hazards for disabled users.
- **Solution**: The `/api/journey` endpoint calculates a **Journey Hint**: it identifies relevant transit stops between origin and destination, highlighting which elements in that chain are obstructed or broken.

### TRADE-OFF 3: Synchronized Dual-View UI (*Map + List*)
- **Our Decision**: Based on web accessibility literature (Höckner et al., 2012), our Leaflet map **must always be accompanied by an equivalent list view** that is fully keyboard-navigable and screen-reader accessible.
- **Accessibility Details**: Markers and cards use shape symbols and explicit text (e.g. `✓`, `!`, `•`, `×`, `?`) rather than relying on color alone (WCAG 1.4.1).

---

## 4. Contribution & Review Lifecycle

Contributing is a signed-in action. Browsing the map, list, and observatory stays fully public, but every write (`POST /api/reports`, `/api/places`, `/api/reviews`, `/api/analyze`) sits behind a Bearer-token guard. We authenticate people through Supabase (Google OAuth) and attach the session token to each mutation.

We engineered the submit flow to survive flaky mobile networks and duplicate taps, then hand the report to a human reviewer before a venue is marked team-verified:

```text
0. Contributor signs in with Google (Supabase). The frontend attaches the session
   Bearer token to every write; an unauthenticated write is rejected with 401.
   │
1. Contributor selects an image (JPG, PNG, or WebP; <= 5 MB).
   │
2. [Optional] "Help draft with AI" calls POST /api/analyze:
   ├── We run vision analysis and photo-integrity checks in parallel.
   ├── Google, OpenAI, then OpenRouter are tried in configured failover order.
   ├── Content Provenance and visual-artifact signals are reported separately from
   │   accessibility status; a photo with trusted AI provenance is rejected outright.
   └── If offline / unconfigured: degrades gracefully to manual checklist (503 + fallback).
   │
3. Contributor inspects the image, selects element statuses (E1–E8), inputs notes,
   and must check the human confirmation checkbox (humanConfirmed: true).
   │
4. Frontend generates a UUID Idempotency-Key and sends the evidence:
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
5. The report enters the review lifecycle (reviewStatus):
   SUBMITTED → UNDER_REVIEW → { NEEDS_REVISION | REJECTED | APPROVED }.
   ├── A reviewer opens it via /api/reviewer/reports/:id and records a decision;
   │   NEEDS_REVISION and REJECTED require a written note.
   └── On APPROVED, we record the audit trail and flip the place's verifiedByTeam to
       true — the element states were already locked at publish in step 4.
```

Contributors can also leave a plain-language **experience review** on any venue (`POST /api/reviews`) — short qualitative notes that sit beside the chain, but never feed the element scores.

---

## 5. Data Model & Schema

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

## 6. Local Development & Verification Guide

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
```

### Running Locally
The app boots out of the box against the local JSON store — no cloud setup, Docker, or third-party accounts required:

```bash
# Terminal 1 — Start Express Backend (Port 4000)
npm run dev:backend

# Terminal 2 — Start Next.js Frontend (Port 3000)
npm run dev:frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

Browsing the map, list, and observatory needs zero credentials. Because we now gate every write behind sign-in (see Invariant #7), exercising the contribution and reviewer flows in the UI requires Supabase Google OAuth configured in `frontend/.env.local`. The backend test suites don't need it — they drive the API directly with a local dev token.

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

---

## 7. Known Limitations & Workarounds (WORKAROUND & TODO)

// WORKAROUND & TODO: Deliberate technical boundaries for the competition milestone:

- **WORKAROUND (Photo Streaming)**: The Next.js Image component uses the `unoptimized` property for local media URLs to avoid hardcoding localhost domain whitelists across developer environments.
- **WORKAROUND (CSV Formula Injection)**: Values beginning with `=`, `+`, `-`, or `@` are prefixed with a single quote (`'`) during Evidence Pack CSV generation.
- **TODO (Cloud Concurrency Benchmarking)**: SQL migrations, PostGIS spatial indexing, and RPC transactions are verified on local PostgreSQL 16 (`npm run test:sql`), but large-scale concurrent write stress-testing on production managed Supabase remains to be performed.
- **TODO (Field Hardware Screen-Reader Audit)**: Interface accessibility has passed full keyboard navigation and color contrast simulations; physical testing with screen reader hardware (NVDA / TalkBack) alongside local disability advocacy panels is planned for subsequent field iterations.

---

## 8. Development Team

Designed and developed by:

**Tim coba-coba**
*Undergraduate Students — Telkom University Surabaya*

- **Bagus Ardin**
- **Ida Bagus**
- **Hartita**
- **Muthe**

*Submitted for GAYATAMA 5 International Web Technology Competition (2026).*

---

## 9. License & Data Attribution

- Source code is licensed under the [MIT License](./LICENSE).
- Surabaya public facility baseline data is derived from OpenStreetMap contributors under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- Academic methodology is grounded in Pebriyanti (2020), *Peta Aksesibilitas (Denpasar Accessible Map) Bagi Penyandang Disabilitas di Ruang Publik Kota: Menuju Kota Denpasar Ramah Disabilitas*, Undagi: Jurnal Ilmiah Arsitektur Universitas Warmadewa.

