# ClinicCR Backend

Costa Rica clinic management SaaS — patients, medical records, products, electronic invoicing (Hacienda), Google Calendar, and receipt delivery.

## Stack

- **Runtime:** Node.js 20.x, NestJS 11.x, TypeScript 5.7
- **Database:** MongoDB via Mongoose 9.x
- **Auth:** Passport JWT + bcrypt + Google OAuth 2.0
- **Hacienda:** OAuth token, XML v4.4, XAdES-EPES signing
- **Integrations:** Google Calendar (googleapis), PDF (pdfkit), Email (nodemailer), WhatsApp (twilio)
- **Deploy:** Heroku

## Quick Start

```bash
cd clinic-cr-backend
npm install
# Ensure MongoDB is running on localhost:27017
npm run start:dev       # Dev mode with watch
```

## Build & Test

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript (`npx nest build`) |
| `npm run start:dev` | Dev server with hot reload |
| `npm run start:prod` | Production (`node dist/server`) |
| `npm test` | Unit tests (Jest) |
| `npm run test:e2e` | End-to-end tests |
| `npm run lint` | ESLint + fix |

Always run `npx nest build` after changes to verify compilation.

## Project Structure

```
clinic-cr-backend/
  server.ts                    # Entry point (port 3000)
  src/
    app.module.ts              # Root module (13 feature modules)
    database/                  # MongoDB connection module
    auth/                      # JWT + Google OAuth, register, login, password reset
    users/                     # User schema (email/password + Google accounts)
    clinic-settings/           # Clinic config, Hacienda credentials, logo upload
    patients/                  # Form templates + patient CRUD + search
    medical-records/           # Medical records (per patient) + consultations
    cabys/                     # CABYS code search proxy with 30-day cache
    products/                  # Product catalog with CABYS validation
    hacienda/                  # OAuth, key gen, XML builder, signing, constants
    invoices/                  # Invoice lifecycle, credit/debit notes, PDF, email, WhatsApp
    google-calendar/           # Google Calendar sync (list, create, delete events)
    routes/                    # Postman collection (api-endpoints.json)
    common/                    # Shared filters, interceptors, pipes, DTOs, utils
```

## Module Architecture

All modules follow NestJS conventions: `module.ts`, `controller.ts`, `service.ts`, `schemas/`, `dto/`.

- **Multi-tenant:** Every query is scoped by `clinicId` from the JWT
- **Auth pattern:** `@UseGuards(JwtAuthGuard)` + `@Clinic() clinicId: string`
- **Google OAuth:** `GET /auth/google` → Google consent → callback → JWT → redirect to frontend
- **Validation:** class-validator DTOs with `ValidationPipe` (whitelist + forbidNonWhitelisted)
- **Response format:** `{ success: true, data }` for success, `{ success: false, statusCode, message, errors }` for errors
- **ID validation:** Use `MongoIdValidationPipe` for all `:id` route params
- **File uploads:** Use `FileInterceptor` from `@nestjs/platform-express` (logo, .p12)

## API Endpoints (64 total)

All prefixed with `/api`. See `src/routes/api-endpoints.json` for the Postman collection.

| Module | Count | Prefix |
|--------|-------|--------|
| Health | 1 | `/health` |
| Auth | 7 | `/auth` (includes Google OAuth) |
| Clinic Settings | 8 | `/clinic-settings` (includes logo) |
| Form Templates | 6 | `/form-templates` |
| Patients | 7 | `/patients` |
| Medical Records | 3 | `/patients/:patientId/medical-record` |
| Consultations | 5 | `/patients/:patientId/consultations` |
| CABYS | 2 | `/cabys` |
| Products | 6 | `/products` |
| Invoices | 12 | `/invoices` (includes PDF, email, WhatsApp) |
| Hacienda Utilities | 3 | `/hacienda` |
| Google Calendar | 4 | `/calendar` |

## Coding Conventions

- 2-space indentation, single quotes, trailing commas (Prettier)
- Schemas use `@nestjs/mongoose` decorators (`@Schema`, `@Prop`)
- DTOs use `class-validator` + `class-transformer`
- Soft-delete pattern: set `isActive: false`, filter by `isActive: true`
- Atomic counters: use MongoDB `$inc` for invoice consecutivos
- Sensitive data: AES-256 encryption via `EncryptionUtil` for Hacienda creds AND Google refresh tokens
- `.p12` validation: always verify with `node-forge` before storing
- File uploads: max 2MB for logo (PNG/JPG/SVG), validated MIME types

## Environment Variables

Defined in `.env` (see `.env.example`). Key vars:

- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` / `JWT_EXPIRATION` — Auth tokens
- `ENCRYPTION_KEY` — AES key for encrypting Hacienda creds + Google tokens
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — Google OAuth
- `FRONTEND_URL` — Frontend URL for Google OAuth redirect
- `HACIENDA_API_STAGING` / `HACIENDA_API_PRODUCTION` — Hacienda endpoints
- `HACIENDA_IDP_STAGING` / `HACIENDA_IDP_PRODUCTION` — OAuth token endpoints
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` — Email
- `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_WHATSAPP_FROM` — WhatsApp

## Adding a New Module

1. Create folder under `src/` with module, controller, service, schema, DTOs
2. Register schemas in module via `MongooseModule.forFeature()`
3. Add module to `app.module.ts` imports
4. Scope all queries by `clinicId`
5. Protect endpoints with `@UseGuards(JwtAuthGuard)`
6. Add endpoints to the Postman collection at `src/routes/api-endpoints.json`

## Key Integration Notes

### Hacienda (Electronic Invoicing)
- **Staging vs Production:** Controlled per-clinic via `hacienda.environment` field
- **Token caching:** OAuth tokens cached in ClinicSettings, refreshed 5 min before expiry
- **Invoice flow:** Validate → Calculate → Generate Key (50-digit) → Build XML v4.4 → Sign XAdES-EPES → Submit
- **Webhook:** `POST /api/invoices/webhook` (no JWT) — Hacienda sends acceptance/rejection
- **Polling:** Cron job every 5 min checks stuck invoices (status `sent` for >5 min)

### Google OAuth & Calendar
- **Dual auth:** Users can login via email/password OR Google OAuth (both produce the same JWT)
- **Account linking:** If a Google user's email matches an existing account, they're linked automatically
- **Calendar scopes:** Requested at login time (`calendar.events`), refresh token stored encrypted on User
- **Calendar is per-user:** Each staff member sees their own Google Calendar, not the clinic's

### Invoice Delivery
- **PDF:** Generated with `pdfkit`, includes clinic logo, line items table, totals, Hacienda status
- **Email:** Sent via `nodemailer` with PDF attachment + HTML summary
- **WhatsApp:** Sent via Twilio with formatted text summary
- **Graceful degradation:** If SMTP/Twilio not configured, returns `503 Service Unavailable`

## Documentation

- `DOCS/IMPLEMENTATION/main_implementation.md` — Full architecture spec
- `DOCS/IMPLEMENTATION/phase_by_phase_guide.md` — Phase-by-phase implementation guide
- `DOCS/FRONTEND_GUIDE.md` — Frontend implementation guide for Lovable
- `DOCS/LOCAL_TESTING_GUIDE.md` — Step-by-step endpoint testing with curl
- `DOCS/IMPROVEMENTS_ROADMAP.md` — 5-feature improvements roadmap
