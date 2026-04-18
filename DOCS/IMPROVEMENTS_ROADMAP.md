# mollyClinic/DOCS/IMPROVEMENTS_ROADMAP.md

# ClinicCR — Improvements Roadmap

> **What this document covers:** 5 new features that transform ClinicCR from an invoicing tool into a complete clinic management platform.
>
> **Current state:** 44 endpoints across 9 modules (auth, settings, patients, products, CABYS, Hacienda, invoices)
> **After improvements:** 64 endpoints across 13 modules

---

## Why These 5 Improvements?

Today, ClinicCR solves one problem well: generating electronic invoices for Hacienda. But a clinic's daily workflow involves much more — logging in quickly, managing appointments, recording what happened during a patient visit, and sending receipts. These 5 features close the gap between "invoicing software" and "the one app the clinic uses all day."

```
Current ClinicCR:
  Register → Configure → Add Patients → Add Products → Create Invoice → Send to Hacienda ✅

After Improvements:
  Login with Google → See today's appointments (Calendar) → Open patient → Record consultation
  → Create invoice → Send PDF receipt via WhatsApp → Done ✅
```

---

## Improvement 1: Google OAuth Login

### What is it?

Allow users to register and log in using their Gmail account — with one click, instead of filling out a registration form and remembering another password.

### Why does this matter?

Because clinic staff already use Google for email, calendar, and documents. Requiring a separate email/password creates friction:

- **Forgotten passwords** generate support tickets. A dental receptionist who resets her password every Monday morning is losing 5 minutes/week — that's 4+ hours/year.
- **Security risk.** Staff reuse passwords. If they use the same password for ClinicCR and their personal email, a breach anywhere compromises the clinic.
- **Onboarding speed.** A new staff member should be working in under 60 seconds, not filling out forms.

### How does it work?

**The flow from the user's perspective:**

```
Step 1: User clicks "Continue with Google" on the login page
Step 2: Google's consent screen appears: "ClinicCR wants to access your email and profile"
Step 3: User clicks "Allow"
Step 4: User is logged in. If it's their first time, an account + clinic are auto-created.
```

**What happens on the backend:**

```
Step 1: Frontend opens GET /api/auth/google
  → Backend redirects to Google's OAuth consent screen
  → Google asks for scopes: email, profile, calendar

Step 2: User approves → Google redirects to GET /api/auth/google/callback
  → Google sends: { googleId, email, firstName, lastName, refreshToken }

Step 3: Backend checks: does a user with this googleId or email already exist?
  → YES (same email, existing account): Link the Google account to the existing user
    Example: María registered with maria@gmail.com via email/password last month.
    Now she clicks "Continue with Google" with the same email.
    → Her account is linked. She can now use either method to log in.

  → NO (new user): Create a new user + clinic (same as regular registration)
    Example: Pedro clicks "Continue with Google" for the first time.
    → User created: { firstName: "Pedro", email: "pedro@gmail.com", authProvider: "google", password: null }
    → ClinicSettings created with defaults
    → JWT issued

Step 4: Backend redirects to frontend: FRONTEND_URL/auth/callback?token=<jwt>
  → Frontend stores the token, user is logged in
```

**What changes in the existing system:**

| Change | Why |
|--------|-----|
| User schema gets `googleId`, `authProvider`, `googleRefreshToken` fields | Because we need to identify Google users and store their tokens for Calendar sync later |
| `password` becomes optional on User schema | Because Google users don't have a password — they authenticate through Google |
| Login rejects password attempts for Google-only users | Because there's no password to check. Show: "This account uses Google login" |
| Existing email/password flow stays unchanged | Because current users shouldn't be affected. Both methods coexist |

### Expected Outcomes

| Scenario | Result |
|----------|--------|
| New user clicks "Continue with Google" | Account + clinic created, JWT returned, redirected to frontend |
| Existing user (same email) clicks "Continue with Google" | Accounts linked, JWT returned |
| Google user tries to login with email/password | `400: "This account uses Google login. Please use the 'Continue with Google' button."` |
| Google login with invalid/expired token | `401: "Google authentication failed"` |
| Google consent denied by user | Redirect back to login page with error |

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/auth/google` | No | Initiates Google OAuth redirect |
| GET | `/api/auth/google/callback` | No | Handles Google callback, issues JWT |

### New Environment Variables

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
```

### Objectives

- [ ] User can register/login with one-click Google OAuth
- [ ] Existing email/password users can link their Google account
- [ ] Google-only users cannot attempt password login (clear error message)
- [ ] Google refresh token is stored encrypted (for Calendar sync)
- [ ] Existing registration and login flows are unaffected

---

## Improvement 2: Google Calendar Sync

### What is it?

Display the user's Google Calendar inside ClinicCR and allow creating events (appointments) that sync back to Google Calendar.

### Why does this matter?

Because most Costa Rican clinics manage appointments in one of three ways:

1. **Paper notebook** — works until someone erases an entry or the book gets lost
2. **Google Calendar** — already used by many clinics, but disconnected from the invoicing flow
3. **Expensive scheduling software** — a separate app that doesn't talk to the invoicing system

By syncing Google Calendar into ClinicCR, the receptionist sees today's appointments right next to the patient list and invoice button. She doesn't switch tabs. The flow becomes:

```
Open ClinicCR → See today's appointments → Click patient name → Create invoice → Done
```

### How does it work?

**Prerequisites:** The user must have logged in with Google (Improvement 1) and granted calendar permission during the consent screen.

**Example: Viewing today's appointments**

```
Step 1: Frontend loads the calendar page
Step 2: Frontend calls GET /api/calendar/events?timeMin=2026-04-04T00:00:00&timeMax=2026-04-04T23:59:59

Step 3: Backend flow:
  → Looks up the current user's stored Google refresh token (encrypted in DB)
  → Decrypts it using EncryptionUtil (same encryption used for Hacienda credentials)
  → Creates a Google OAuth2 client with the refresh token
  → Calls google.calendar.events.list() for the requested date range
  → Returns the events

Step 4: Frontend displays:
  09:00 - Carlos Rodríguez — Consulta dental
  10:30 - Ana López — Limpieza dental
  14:00 - Pedro Mora — Control de ortodoncia
```

**Example: Creating an appointment**

```
Step 1: Receptionist clicks "New Appointment"
Step 2: Fills in: Patient → Carlos Rodríguez, Date → April 5, Time → 09:00-10:00

Step 3: Frontend calls POST /api/calendar/events
  { "summary": "Carlos Rodríguez — Consulta dental",
    "description": "Patient ID: pat_xyz789",
    "startDateTime": "2026-04-05T09:00:00-06:00",
    "endDateTime": "2026-04-05T10:00:00-06:00" }

Step 4: Backend creates the event in Google Calendar via googleapis
  → Event appears in both ClinicCR and the user's Google Calendar app/phone
```

**Why per-user (not per-clinic):** Because Google Calendar belongs to a person, not a business. If María (the owner) and Ana (the receptionist) both link their Google accounts, they each see their own calendar. This is correct — the owner might have personal events she doesn't want staff to see. For a shared clinic calendar, the clinic can create a shared Google Calendar and have everyone add it.

### Expected Outcomes

| Scenario | Result |
|----------|--------|
| User with Google Calendar linked requests events | Returns Google Calendar events for the date range |
| User without Google login tries calendar endpoint | `400: "Google Calendar not connected. Please log in with Google first."` |
| Google token has been revoked by user | `401: "Google Calendar access revoked. Please reconnect via Settings."` |
| Create event with valid data | Event created in Google Calendar, returns event ID |
| Delete event by ID | Event removed from Google Calendar |

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/calendar/events` | JWT | List events (query: timeMin, timeMax, maxResults) |
| POST | `/api/calendar/events` | JWT | Create a calendar event |
| DELETE | `/api/calendar/events/:eventId` | JWT | Delete a calendar event |
| GET | `/api/calendar/status` | JWT | Check if Google Calendar is connected |

### Objectives

- [ ] User can view their Google Calendar events within a date range
- [ ] User can create events that appear in their Google Calendar
- [ ] User can delete events from within ClinicCR
- [ ] Clear error messages when Calendar is not connected
- [ ] Refresh tokens are encrypted at rest (same as Hacienda credentials)
- [ ] Token refresh is handled automatically (no manual re-login needed)

---

## Improvement 3: Medical Records & Consultations

### What is it?

Add the ability to create detailed medical records for each patient (chronic conditions, allergies, medications, surgical history) and log individual medical consultations (diagnosis, treatment, prescriptions, vitals).

### Why does this matter?

Because a clinic is more than an invoicing machine — it's a healthcare provider. Right now, ClinicCR stores patients as billing entities: name, cédula, phone. But when a patient sits in the chair, the doctor needs to know:

- **What are their allergies?** — prescribing penicillin to someone allergic to it is life-threatening
- **What medications are they on?** — drug interactions must be checked
- **What happened in their last visit?** — continuity of care requires history
- **What are their vitals today?** — blood pressure, heart rate, temperature

Without medical records in the system, clinics keep this information in:
1. Paper folders (lost, illegible, can't search)
2. Separate EHR software (expensive, disconnected from billing)
3. The doctor's memory (unreliable, doesn't transfer when staff changes)

By adding medical records to ClinicCR, the doctor opens a patient's profile and sees everything: billing history (invoices) AND medical history (records + consultations) — in one place.

### How does it work?

**Two data structures, because medical data has two distinct patterns:**

**Medical Record (one per patient)** — the patient's ongoing medical profile:

```
Think of it as the patient's "medical ID card." It changes slowly over time.

Example for Carlos Rodríguez:
{
  "chronicConditions": ["Hipertensión arterial", "Diabetes tipo 2"],
  "allergies": ["Penicilina", "Ibuprofeno"],
  "currentMedications": [
    { "name": "Metformina", "dosage": "500mg", "frequency": "2x/día", "startDate": "2024-01-15" },
    { "name": "Losartán", "dosage": "50mg", "frequency": "1x/día", "startDate": "2023-06-01" }
  ],
  "surgicalHistory": [
    { "procedure": "Extracción de muela del juicio", "date": "2022-03-10", "notes": "Sin complicaciones" }
  ],
  "familyHistory": "Padre con diabetes, madre con hipertensión",
  "bloodType": "O+",
  "notes": "Paciente colaborador, asiste puntualmente a citas"
}
```

**Consultation (many per patient)** — what happened in a specific visit:

```
Think of it as an entry in the patient's diary. A new one is created each visit.

Example — Carlos's visit on April 4, 2026:
{
  "date": "2026-04-04T09:00:00",
  "chiefComplaint": "Dolor en muela inferior derecha desde hace 3 días",
  "diagnosis": "Caries profunda en pieza #46",
  "treatment": "Restauración con resina compuesta",
  "vitals": {
    "bloodPressure": "130/85",
    "heartRate": 72,
    "temperature": 36.5,
    "weight": 78,
    "height": 175,
    "oxygenSaturation": 98
  },
  "prescriptions": [
    { "medication": "Acetaminofén", "dosage": "500mg", "frequency": "Cada 8 horas",
      "duration": "3 días", "instructions": "Tomar después de comer" }
  ],
  "followUpDate": "2026-04-18",
  "notes": "Paciente toleró bien el procedimiento. Control en 2 semanas."
}
```

**Why separate collections (not sub-documents on Patient):** Because a patient might have 200+ consultations over years. Embedding them all in the Patient document would make it grow to megabytes, slowing down every patient query (even ones that just need name + cédula for an invoice). Separate collections mean: list patients is fast (no medical data loaded), and medical history is loaded on-demand when the doctor opens the patient profile.

### Expected Outcomes

| Scenario | Result |
|----------|--------|
| Create medical record for a patient | `201` — one record per patient (unique constraint on clinicId + patientId) |
| Create medical record for same patient again | `409 Conflict: "Medical record already exists for this patient"` |
| Get medical record for a patient | Returns the full medical profile |
| Create a consultation | `201` — consultation linked to patient with date and details |
| List consultations for a patient | Paginated list sorted by date (most recent first) |
| Create consultation for non-existent patient | `404: "Patient not found"` |
| Access another clinic's patient records | `404` — clinicId scoping prevents cross-tenant access |

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients/:patientId/medical-record` | JWT | Create medical record |
| GET | `/api/patients/:patientId/medical-record` | JWT | Get medical record |
| PATCH | `/api/patients/:patientId/medical-record` | JWT | Update medical record |
| POST | `/api/patients/:patientId/consultations` | JWT | Create consultation |
| GET | `/api/patients/:patientId/consultations` | JWT | List consultations (paginated) |
| GET | `/api/patients/:patientId/consultations/:id` | JWT | Get single consultation |
| PATCH | `/api/patients/:patientId/consultations/:id` | JWT | Update consultation |
| DELETE | `/api/patients/:patientId/consultations/:id` | JWT | Soft-delete consultation |

### Objectives

- [ ] Each patient can have one medical record with chronic conditions, allergies, medications, surgical history, blood type
- [ ] Multiple consultations can be recorded per patient with date, diagnosis, treatment, vitals, prescriptions
- [ ] Consultations are paginated and sorted by date (most recent first)
- [ ] Medical records are scoped by clinicId — no cross-clinic access
- [ ] Patient existence is verified before creating medical records or consultations
- [ ] Duplicate medical records for the same patient are rejected (409)

---

## Improvement 4: Clinic Logo Upload

### What is it?

Allow the clinic to upload their logo (PNG, JPG, or SVG), which is then displayed in the frontend header and included on invoice PDFs.

### Why does this matter?

Because branding matters — even for a small clinic. When a patient receives a PDF receipt, it should look professional. A logo on the invoice says "this is a real business" and builds trust. Without it, the PDF looks like a generic spreadsheet printout.

It also matters for the frontend — the clinic name "Clínica Dental González" in plain text is forgettable, but their logo in the sidebar makes the app feel like *their* app, not a generic tool.

### How does it work?

**Example: Uploading a logo**

```
Step 1: Clinic owner goes to Settings → clicks "Upload Logo"
Step 2: Selects their logo file: "logo-clinica-gonzalez.png" (150KB)

Step 3: Frontend sends:
  POST /api/clinic-settings/logo
  Content-Type: multipart/form-data
  Body: logo=[file binary]

Step 4: Backend validates:
  ✅ File is under 2MB
  ✅ MIME type is image/png, image/jpeg, or image/svg+xml
  → Stores the file as a Buffer in MongoDB (same pattern as .p12 certificate)
  → Stores the MIME type for correct Content-Type header on retrieval

Step 5: Frontend displays the logo:
  GET /api/clinic-settings/logo
  → Returns the image binary with Content-Type: image/png
  → Frontend shows it in the sidebar and on the settings page
```

**Why store in MongoDB (not a CDN):** Because the logo is small (< 2MB), accessed infrequently (loaded once per session), and scoped to a clinic. A CDN adds complexity (S3 buckets, signed URLs, CORS configuration) that isn't justified for a single image per clinic. If we later need to serve thousands of images (e.g., patient photos), we'd add S3 — but not for one logo.

### Expected Outcomes

| Scenario | Result |
|----------|--------|
| Upload a valid PNG logo (150KB) | `200` — logo stored, returned in settings |
| Upload a 5MB file | `400: "File too large. Maximum size is 2MB."` |
| Upload a .pdf file | `400: "Invalid file type. Allowed: PNG, JPG, SVG."` |
| Get logo when one exists | Returns binary image with correct Content-Type |
| Get logo when none uploaded | `404: "No logo uploaded"` |
| Delete logo | `200` — logo removed from settings |

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/clinic-settings/logo` | JWT | Upload logo (multipart/form-data) |
| GET | `/api/clinic-settings/logo` | JWT | Get logo image |
| DELETE | `/api/clinic-settings/logo` | JWT | Remove logo |

### Objectives

- [ ] Clinic can upload a logo (PNG, JPG, SVG, max 2MB)
- [ ] Logo is served with correct Content-Type header
- [ ] Invalid files are rejected with clear error messages
- [ ] Logo can be deleted
- [ ] Logo is available for PDF generation (Improvement 5)
- [ ] Existing clinic settings are unaffected

---

## Improvement 5: Invoice Receipt Delivery (PDF, Email, WhatsApp)

### What is it?

After creating an invoice, the clinic can:
1. **Download a PDF** of the invoice — a professional receipt with the clinic logo, patient info, line items, taxes, totals, and Hacienda acceptance status
2. **Send the PDF via email** — attached to a formatted HTML email
3. **Send a summary via WhatsApp** — a text message with invoice details and a download link

### Why does this matter?

Because the patient needs a receipt. Right now, ClinicCR creates the invoice and sends it to Hacienda — but the patient has nothing to take home. In Costa Rica:

- **Older patients** prefer a printed or emailed PDF they can show their insurance company
- **Younger patients** prefer a WhatsApp message they can forward to whoever is paying
- **All patients** expect *something* — walking out of a clinic without any proof of payment feels wrong

This is also a competitive advantage. Most Costa Rican invoicing software generates ugly, text-only receipts. A well-designed PDF with the clinic logo, clean typography, and clear formatting makes the clinic look professional.

### How does it work?

#### PDF Generation

```
Step 1: After creating an invoice, user clicks "Download PDF"
Step 2: Frontend calls GET /api/invoices/:id/pdf

Step 3: Backend generates the PDF using pdfkit:
  → Fetches the invoice (line items, totals, receiver, Hacienda status)
  → Fetches clinic settings (logo, business name, address, cédula)
  → Builds a PDF:

  ┌────────────────────────────────────────────────┐
  │  [CLINIC LOGO]     Clínica Dental González S.A │
  │                    Cédula: 3-101-123456         │
  │                    Tel: 2223-4567               │
  │                    info@clinicagonzalez.com     │
  ├────────────────────────────────────────────────┤
  │  FACTURA ELECTRÓNICA                           │
  │  Consecutivo: 001-00001-01-0000000001          │
  │  Clave: 50604042600310112345...                │
  │  Fecha: 04/04/2026                             │
  ├────────────────────────────────────────────────┤
  │  Cliente: Carlos Rodríguez Mora                │
  │  Cédula: 1-1234-0567                           │
  │  Email: carlos@email.com                       │
  ├────────────────────────────────────────────────┤
  │  # │ Descripción              │ Cant │ Total   │
  │  1 │ Consulta Dental General  │ 1    │ ₡50,000 │
  │    │ IVA 13%                  │      │  ₡6,500 │
  ├────────────────────────────────────────────────┤
  │  Subtotal:     ₡50,000                        │
  │  IVA:           ₡6,500                        │
  │  TOTAL:        ₡56,500                        │
  ├────────────────────────────────────────────────┤
  │  Estado Hacienda: ✅ ACEPTADA                  │
  │  Método de pago: Tarjeta                       │
  └────────────────────────────────────────────────┘

Step 4: Returns the PDF as application/pdf
  → Browser downloads it or displays it inline
```

#### Email Delivery

```
Step 1: User clicks "Send via Email" on the invoice detail page
Step 2: Frontend shows a modal:
  → Recipient email (pre-filled with patient's email)
  → Subject (default: "Factura Electrónica — Clínica González")
  → Optional message

Step 3: Frontend calls POST /api/invoices/:id/send-email
  { "recipientEmail": "carlos@email.com",
    "subject": "Factura Electrónica — Clínica González",
    "message": "Estimado Carlos, adjunto encontrará su factura." }

Step 4: Backend:
  → Generates the PDF (reuses InvoicePdfService)
  → Composes an HTML email with invoice summary
  → Attaches the PDF
  → Sends via SMTP (nodemailer)

Step 5: Patient receives:
  Subject: Factura Electrónica — Clínica González
  Body: "Estimado Carlos, adjunto su factura #001-00001-01-0000000001
         Total: ₡56,500 | Estado: Aceptada | Fecha: 04/04/2026"
  Attachment: factura-001-00001-01-0000000001.pdf
```

#### WhatsApp Delivery

```
Step 1: User clicks "Send via WhatsApp" on the invoice detail page
Step 2: Frontend shows a modal:
  → Recipient phone (pre-filled with patient's phone: +506 8888-1234)

Step 3: Frontend calls POST /api/invoices/:id/send-whatsapp
  { "recipientPhone": "+50688881234" }

Step 4: Backend:
  → Builds a text summary of the invoice
  → Sends via Twilio WhatsApp API

Step 5: Patient receives a WhatsApp message:
  "🏥 *Clínica Dental González*
   📋 Factura #001-00001-01-0000000001
   📅 Fecha: 04/04/2026
   💰 Total: ₡56,500
   ✅ Estado: Aceptada por Hacienda

   Detalle:
   • Consulta Dental General — ₡50,000 + IVA ₡6,500

   Gracias por su visita."
```

### Expected Outcomes

| Scenario | Result |
|----------|--------|
| Download PDF for an invoice | Returns `application/pdf` with clinic branding, line items, totals |
| Send email with valid address | Email sent with PDF attachment, returns `200: "Email sent successfully"` |
| Send email with invalid address | `400: "Invalid email address"` |
| Send WhatsApp with valid phone | WhatsApp message sent, returns `200: "WhatsApp message sent"` |
| Send WhatsApp without Twilio configured | `503: "WhatsApp service not configured"` |
| PDF for invoice that doesn't exist | `404: "Invoice not found"` |
| PDF for another clinic's invoice | `404` — clinicId scoping prevents access |

### New Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/invoices/:id/pdf` | JWT | Download invoice as PDF |
| POST | `/api/invoices/:id/send-email` | JWT | Send invoice PDF via email |
| POST | `/api/invoices/:id/send-whatsapp` | JWT | Send invoice summary via WhatsApp |

### New Environment Variables

```env
# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=clinic@gmail.com
SMTP_PASS=app-specific-password
SMTP_FROM=noreply@cliniccr.com

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
```

### Objectives

- [ ] PDF contains: clinic logo, business info, invoice details (clave, consecutivo, date), patient info, line items with taxes, summary totals, Hacienda status
- [ ] PDF is formatted for A4/Letter printing with professional layout
- [ ] Email includes HTML body with invoice summary + PDF attachment
- [ ] Recipient email defaults to the patient's email
- [ ] WhatsApp sends a formatted text summary with key invoice details
- [ ] All delivery methods verify the invoice exists and belongs to the clinic
- [ ] Missing email/WhatsApp configuration returns a clear 503 error
- [ ] Currency formatting follows Costa Rica conventions (₡45.000,00)

---

## Implementation Order

These features must be built in a specific order because of dependencies:

```
Phase 1: Clinic Logo Upload          ← No dependencies (simplest)
    │
    │   Phase 2: Medical Records      ← No dependencies (standalone)
    │       │
Phase 3: Google OAuth Login           ← No dependencies, but needed by Phase 4
    │
Phase 4: Google Calendar Sync         ← Depends on Phase 3 (needs Google tokens)
    │
Phase 5: Invoice Delivery (PDF/Email/WhatsApp)  ← Depends on Phase 1 (needs logo for PDF)
```

**Phases 1, 2, and 3 can be built in parallel** because they have no inter-dependencies.

---

## Summary

| Phase | Feature | New Endpoints | What It Enables |
|-------|---------|--------------|-----------------|
| 1 | Clinic Logo | 3 | Branding in frontend + PDF receipts |
| 2 | Medical Records & Consultations | 8 | Full patient medical history + visit logs |
| 3 | Google OAuth Login | 2 | One-click login, foundation for Calendar |
| 4 | Google Calendar Sync | 4 | View/create appointments from within ClinicCR |
| 5 | Invoice Delivery | 3 | PDF download, email, and WhatsApp receipt delivery |
| **Total** | | **20** | **64 total endpoints (44 existing + 20 new)** |
