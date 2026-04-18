# projects/mollyClinic/DOCS/FRONTEND_GUIDE.md

# ClinicCR — Frontend Implementation Guide for Lovable

> **Purpose:** This document gives you everything you need to build a world-class frontend for ClinicCR — a clinic management SaaS for Costa Rica.
>
> **Backend API:** `http://localhost:3000/api` (NestJS, ~87 REST endpoints)
> **Target Users:** Clinic owners, receptionists, and administrative staff in Costa Rica
> **Language:** Spanish UI (Costa Rican Spanish), English code

---

## What Is ClinicCR?

ClinicCR is a web application that lets medical and dental clinics in Costa Rica manage their daily operations and comply with the country's electronic invoicing law — all from one place.

**Think of it like this:** A clinic receptionist opens ClinicCR in the morning. She registers a new patient, records their visit, selects the services performed, and with one click generates a legally valid electronic invoice that's digitally signed and sent to the government (Ministerio de Hacienda) in real time. No paper. No accountant needed for routine invoices. No switching between apps.

### Why does this exist?

Because Costa Rica requires every business to send electronic invoices (Factura Electrónica) to Hacienda through their API. Most clinics currently:

1. Use expensive, clunky software built in the 2000s
2. Manually type invoices into Hacienda's web portal (slow, error-prone)
3. Pay accountants to handle invoicing after the fact

ClinicCR eliminates all three problems. It combines **patient management**, **service catalog**, and **electronic invoicing** into a single, modern, mobile-friendly web app.

### Who uses it?

| Role | What they do | What they care about |
|------|-------------|---------------------|
| **Clinic Owner** | Sets up the clinic, configures Hacienda credentials, reviews revenue | Seeing the big picture: how many invoices, revenue, Hacienda status |
| **Receptionist** | Registers patients, creates invoices daily | Speed. She needs to create an invoice in under 60 seconds while the patient waits |
| **Administrative Staff** | Manages products/services, handles credit notes | Accuracy. Finding the right CABYS code, applying correct taxes |

---

## How Does It Work?

The app has **13 core areas**, each one building on the previous. Here's the flow:

### 1. Authentication → The clinic staff logs in

**What happens:** A user registers with their name, email, and password. Registration automatically creates a clinic profile for them. They log in and get a JWT token that identifies both the user and their clinic.

**Why it works this way:** Because every piece of data in the system belongs to a specific clinic. The JWT token carries the `clinicId`, so the backend automatically scopes all queries — this means a single database serves hundreds of clinics without any data leaking between them. Clinic A never sees Clinic B's patients, products, or invoices.

**Why registration auto-creates a clinic:** Because separating "create account" and "create clinic" into two steps causes drop-off. Most clinic owners would register, see an empty dashboard, and not know what to do next. By creating the clinic profile automatically, the user lands on a settings page that says "Complete your profile" — a clear next step.

**Why JWT (not sessions):** Because the backend is stateless and deployed on Heroku. Sessions require sticky sessions or a Redis store. JWTs are self-contained — the token itself carries `userId`, `clinicId`, and `email`, so the server doesn't need to look anything up on each request.

**Example flow:**
```
María registers with email "maria@test.com"
  → Backend creates a User document AND a ClinicSettings document
  → Backend returns a JWT: { sub: "userId123", clinicId: "clinic456", email: "maria@test.com" }
  → Frontend stores this token in memory

María logs in the next day
  → Backend validates password, returns a fresh JWT
  → Frontend sends "Authorization: Bearer <token>" on every API call
  → Backend extracts clinicId from the token → only returns María's clinic data

Another user (Pedro) registers separately
  → Pedro gets his own clinicId: "clinic789"
  → Pedro can NEVER see María's data, because every database query filters by clinicId
```

**What success looks like:**
```json
POST /api/auth/register → 201
{ "success": true, "data": { "user": { "id": "...", "clinicId": "..." }, "accessToken": "eyJ..." } }
```

**What failure looks like:**
```json
POST /api/auth/register (duplicate email) → 409
{ "success": false, "statusCode": 409, "message": "An account with this email already exists" }

POST /api/auth/login (wrong password) → 401
{ "success": false, "statusCode": 401, "message": "Invalid credentials" }
// Note: same message for wrong email OR wrong password — this is intentional to prevent user enumeration
```

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | Email + password, "Continue with Google" button, link to register and forgot password |
| Register | `/register` | First name, last name, email, password, confirm password + "Continue with Google" button |
| Forgot Password | `/forgot-password` | Enter email, receive reset token |
| Reset Password | `/reset-password?token=xxx` | New password + confirm |
| Google Callback | `/auth/callback` | Receives JWT from Google OAuth redirect, stores token, redirects to dashboard |

**API endpoints used:**
- `POST /api/auth/register` — creates user + clinic
- `POST /api/auth/login` — returns `{ accessToken, user: { id, firstName, lastName, email, clinicId } }`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/profile` — current user info
- `GET /api/auth/google` — **NEW:** initiates Google OAuth redirect (opens Google consent screen)
- `GET /api/auth/google/callback` — **NEW:** handles Google callback, redirects to `FRONTEND_URL/auth/callback?token=<jwt>`

**Google OAuth flow — what the frontend must do:**

```
1. User clicks "Continue with Google" button
2. Frontend opens: window.location.href = 'http://localhost:3000/api/auth/google'
   (NOT a fetch/axios call — this is a full browser redirect)
3. Google shows consent screen → user approves
4. Google redirects to backend → backend creates/links account → issues JWT
5. Backend redirects to: http://localhost:5173/auth/callback?token=eyJhbG...
6. Frontend /auth/callback page:
   → Reads the 'token' query parameter from the URL
   → Stores it in memory (same as regular login)
   → Redirects to /dashboard
```

**Why `window.location.href` instead of `fetch`:** Because Google OAuth uses browser redirects (302), not API calls. The browser must physically navigate to Google's consent page. A `fetch()` call would fail due to CORS.

**UX considerations:**
- After login (either method), store the `accessToken` in memory (not localStorage — it's a JWT)
- Send it as `Authorization: Bearer <token>` on every API call
- If a 401 response comes back, redirect to `/login`
- The login page should have TWO options: email/password form AND a prominent "Continue with Google" button (use Google's official button style with the Google "G" icon)
- The register page should also have "Continue with Google" — because Google OAuth creates the account automatically
- If a Google-only user tries to use the "Forgot Password" flow, the backend returns a generic success message (no user enumeration), but the password reset won't work since there's no password. Consider showing a "Use Google login instead" hint on the login page if the user tries to log in with an email that's Google-only

---

### 2. Clinic Settings → Configure the business profile

**What happens:** After first login, the clinic owner fills in their business details: legal name (razón social), tax ID (cédula), address, phone, and email. Then they connect to Hacienda by uploading their `.p12` digital certificate and ATV credentials.

**Why this is the FIRST thing after registration:** Because every electronic invoice in Costa Rica must include the issuer's (emisor) complete legal information — business name, cédula jurídica, address with province/canton/district codes, phone, and email. If any of these are missing, the XML builder will produce an incomplete document and Hacienda will reject it. The clinic profile IS the invoice header.

**Why Hacienda credentials are separate from business info:** Because a clinic might fill in their business info on day one but not have their .p12 certificate ready yet (it takes days to get one from BCCR — the Central Bank of Costa Rica). Separating these flows means the user can start registering patients and products immediately, and connect to Hacienda later when they have the certificate.

**Why we validate the .p12 file on upload:** Because the most common support ticket in Costa Rica invoicing software is "my invoice won't send." In 80% of cases, the .p12 file is corrupted or the PIN is wrong. By validating it at upload time (opening the certificate with `node-forge` using the provided PIN), we catch this problem BEFORE the user tries to send their first invoice — possibly under pressure with a patient waiting.

**Example flow:**
```
María goes to Settings → Sees her clinic profile is incomplete (0% complete)
She fills in: "Clínica Dental González S.A.", cédula "3-101-123456", San José address
  → PATCH /api/clinic-settings → 200 OK → Profile is now 60% complete

She clicks "Connect to Hacienda" → Uploads her .p12 file, enters ATV credentials
  → POST /api/clinic-settings/hacienda/link (multipart/form-data)
  → Backend validates the .p12 with the PIN using node-forge
  → If valid: encrypts password + PIN with AES-256, stores the .p12 binary in MongoDB
  → Returns settings with hacienda.isLinked: true

She clicks "Test Connection"
  → POST /api/clinic-settings/hacienda/test
  → Backend decrypts stored credentials, calls Hacienda's IDP token endpoint
  → If Hacienda returns an OAuth token: ✅ "Connection successful (staging)"
  → If Hacienda rejects: ❌ "Hacienda authentication failed: invalid_grant"
```

**What success looks like:**
```json
POST /api/clinic-settings/hacienda/link → 200
{ "success": true, "data": { "hacienda": { "isLinked": true, "environment": "staging" } } }

POST /api/clinic-settings/hacienda/test → 200
{ "success": true, "data": { "message": "Hacienda connection successful", "environment": "staging", "tokenObtained": true } }
```

**What failure looks like:**
```json
POST /api/clinic-settings/hacienda/link (wrong PIN) → 400
{ "success": false, "statusCode": 400, "message": "Invalid .p12 file or incorrect PIN" }

POST /api/clinic-settings/hacienda/test (wrong ATV password) → 400
{ "success": false, "statusCode": 400, "message": "Hacienda authentication failed: invalid_grant" }

POST /api/clinic-settings/hacienda/test (not linked yet) → 400
{ "success": false, "statusCode": 400, "message": "Hacienda credentials are not configured. Link your account first." }
```

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Clinic Settings | `/settings` | Business info form + Hacienda connection panel |

**This page has two distinct sections:**

#### Section A: Business Information
A form with these fields:

| Field | Type | Example | Required |
|-------|------|---------|----------|
| Business Name (Razón Social) | text | "Clínica Dental González S.A." | Yes |
| Commercial Name (Nombre Comercial) | text | "Clínica González" | No |
| ID Type (Tipo de Identificación) | select | "02 - Cédula Jurídica" | Yes |
| ID Number (Número de Identificación) | text | "3101123456" | Yes |
| Economic Activity Code | text | "862010" | Yes |
| Email | email | "info@clinicagonzalez.com" | Yes |
| Phone Country Code | text (prefilled "506") | "506" | Yes |
| Phone Number | text | "22234567" | Yes |
| Province (Provincia) | select | "1 - San José" | Yes |
| Canton (Cantón) | select (depends on province) | "01 - Central" | Yes |
| District (Distrito) | select (depends on canton) | "01 - Carmen" | Yes |
| Other Address Details (Otras Señas) | textarea | "200m norte del parque España" | No |
| Default Currency | select | "CRC" / "USD" / "EUR" | Yes |

**UX detail — Cascading location selects:** Costa Rica has 7 provinces → each has cantons → each has districts. Use dependent dropdowns. When the user picks "San José", load its cantons. When they pick "Central", load its districts. This is a standard Costa Rica address pattern — hardcode the data or fetch it from a JSON file. This is critical because Hacienda validates these codes on invoices.

#### Section B: Hacienda Connection
A card/panel with connection status and credentials:

| State | What the user sees |
|-------|-------------------|
| Not connected | Gray card: "Connect to Hacienda to start sending electronic invoices" with a "Connect" button |
| Connected (staging) | Green card: "Connected to Hacienda (Staging)" with "Test Connection" and "Disconnect" buttons |
| Connected (production) | Green card: "Connected to Hacienda (Production)" |

**The "Connect" flow opens a modal or expanded form:**

| Field | Type | Notes |
|-------|------|-------|
| ATV Username | text | Format: `cpf-01-1234-0567` |
| ATV Password | password | Will be encrypted on server |
| .p12 Certificate | file upload | Accept only `.p12` files |
| .p12 PIN | password | Usually 4-8 digits |
| Environment | radio | "Staging (pruebas)" / "Production" |
| Callback URL | text (prefilled) | Auto-fill with `{appUrl}/api/invoices/webhook` |

#### Section C: Clinic Logo
A card showing the current logo (or a placeholder) with upload/remove buttons:

| State | What the user sees |
|-------|-------------------|
| No logo | Gray placeholder icon: "Upload your clinic logo" with an "Upload" button |
| Logo uploaded | The logo image displayed at ~150px width, with "Change" and "Remove" buttons |

**Upload flow:**
1. User clicks "Upload" → file picker opens (accept PNG, JPG, SVG only)
2. Frontend sends `POST /api/clinic-settings/logo` as `multipart/form-data` with field name `logo`
3. Backend validates: max 2MB, valid image type
4. On success: logo is stored. Refresh the displayed image
5. On failure: `400 "Logo file must be 2MB or smaller"` or `400 "Logo must be a PNG, JPEG, or SVG image"`

**Displaying the logo:**
```
GET /api/clinic-settings/logo
→ Returns binary image with Content-Type: image/png (or jpeg/svg)
→ Use as <img src="/api/clinic-settings/logo" /> with auth header
→ Or fetch as blob and create object URL
```

The logo appears in three places:
1. **Settings page** — preview with upload/remove controls
2. **Sidebar/header** — clinic branding throughout the app
3. **Invoice PDF** — top-left corner of generated receipts

**API endpoints used:**
- `GET /api/clinic-settings` — load current settings
- `PATCH /api/clinic-settings` — update business info
- `POST /api/clinic-settings/logo` — **NEW:** upload logo (multipart/form-data, field: `logo`)
- `GET /api/clinic-settings/logo` — **NEW:** get logo image (returns binary with Content-Type)
- `DELETE /api/clinic-settings/logo` — **NEW:** remove logo
- `POST /api/clinic-settings/hacienda/link` — upload .p12 + credentials (multipart/form-data)
- `POST /api/clinic-settings/hacienda/test` — test connection
- `POST /api/clinic-settings/hacienda/unlink` — disconnect

**UX considerations:**
- Show a **completion percentage** or checklist at the top ("Profile 60% complete — add your address to continue")
- The Hacienda connection panel should feel separate from the business info — use a card with a distinct background
- After successful "Test Connection", show a celebratory message. This is a big milestone for the user — it means they can start invoicing
- If the .p12 file or PIN is wrong, the server returns `400 "Invalid .p12 file or incorrect PIN"` — show this clearly, because users often confuse their .p12 PIN with their ATV password

---

### 3. Patients → Register and manage who you serve

**What happens:** The receptionist registers patients with their legal information (needed for invoices) and optional custom fields defined by the clinic (like blood type, allergies, emergency contact).

**Why patients exist as a separate module (not just typed into invoices):** Because in Costa Rica, the same patient visits the same clinic repeatedly. If the receptionist had to type the patient's name, cédula, email, and phone on every invoice, she'd waste 2 minutes per invoice and introduce typos — a typo in the cédula means Hacienda rejects the invoice. By registering patients once and selecting them from a dropdown during invoicing, we eliminate both problems.

**Why patients need a cédula and identification type:** Because Hacienda requires the "receptor" (receiver) block in every Factura Electrónica (document type 01). This block must contain the patient's exact name, identification type (Cédula Física, Cédula Jurídica, DIMEX, or NITE), and identification number — matching what's registered in Hacienda's database. If it doesn't match, the invoice is rejected.

**Why two layers (templates + patients):** Because a dental clinic needs fields like "last dental visit" and "orthodontic history," while a dermatologist needs "skin type" and "allergy history." Hardcoding fields means the software only works for one type of clinic. By letting the clinic owner define a Form Template with custom fields, the same software works for any specialty — dental, general, pediatric, dermatology — without code changes. The receptionist sees a clean form that looks custom-built; under the hood, custom fields are stored as flexible key-value pairs.

**Why validate custom fields against the template:** Because without validation, a select field for "Blood Type" could receive the value "banana." The backend checks every custom field against its template definition — selects must be one of the predefined options, required fields must be present, numbers must be numbers. This prevents corrupted data that would confuse reports and invoices later.

**Example flow:**
```
STEP 1 — Clinic owner creates a form template:
  POST /api/form-templates
  { "name": "Dental Intake", "fields": [
    { "fieldKey": "blood_type", "label": "Tipo de Sangre", "fieldType": "select",
      "options": ["A+","A-","B+","B-","AB+","AB-","O+","O-"], "required": true, "order": 1 },
    { "fieldKey": "allergies", "label": "Alergias", "fieldType": "textarea", "required": false, "order": 2 }
  ]}
  → 201 Created. Template ID: "tmpl_abc123"

STEP 2 — Receptionist registers a patient:
  POST /api/patients
  { "firstName": "Carlos", "lastName": "Rodríguez", "identificationType": "01",
    "identificationNumber": "112340567", "formTemplateId": "tmpl_abc123",
    "customFields": { "blood_type": "O+", "allergies": "Penicilina" } }
  → 201 Created. Patient ID: "pat_xyz789"

STEP 3 — Receptionist searches for the patient later:
  GET /api/patients/search?q=112340567
  → Returns Carlos Rodríguez instantly (searched across cédula, name, and email)

STEP 4 — Receptionist verifies the cédula with Hacienda:
  GET /api/patients/pat_xyz789/validate-hacienda
  → Calls Hacienda public API with the patient's cédula
  → If valid: { "nombre": "RODRIGUEZ MORA CARLOS", "tipoIdentificacion": "01" }
  → If invalid: Error — this cédula doesn't exist in Hacienda's records
```

**What success looks like:**
```json
POST /api/patients → 201
{ "success": true, "data": { "_id": "...", "firstName": "Carlos", "customFields": { "blood_type": "O+" } } }
```

**What failure looks like:**
```json
POST /api/patients (missing required custom field) → 400
{ "success": false, "statusCode": 400, "message": "Custom field validation failed",
  "errors": [{ "field": "blood_type", "message": "Field is required" }] }

POST /api/patients (invalid select value) → 400
{ "success": false, "message": "Custom field validation failed",
  "errors": [{ "field": "blood_type", "message": "Value 'X+' is not a valid option. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-" }] }
```

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Patient List | `/patients` | Searchable, paginated table of all patients |
| Create Patient | `/patients/new` | Registration form (core + custom fields) |
| Patient Detail | `/patients/:id` | View/edit patient info |
| Form Templates | `/settings/form-templates` | Manage custom field templates |
| Create/Edit Template | `/settings/form-templates/:id` | Drag-and-drop field builder |

#### Patient List Page
- **Search bar** at the top — searches across name, cédula, and email simultaneously
- **Table columns:** Name, Cédula, Email, Phone, Last Visit, Actions
- **Pagination** with page size selector (10, 20, 50)
- **"Add Patient" button** prominently placed (top right)
- Clicking a row opens the patient detail page

#### Create Patient Form
The form is split into two parts:

**Part 1: Core Fields (always present)**

| Field | Type | Validation | Example |
|-------|------|-----------|---------|
| First Name | text | Required, 2-50 chars | "Carlos" |
| Last Name | text | Required, 2-50 chars | "Rodríguez Mora" |
| ID Type | select | Required: Cédula Física / Cédula Jurídica / DIMEX / NITE | "01" |
| ID Number | text | Required | "112340567" |
| Email | email | Optional | "carlos@email.com" |
| Phone Code | text | Default "506" | "506" |
| Phone Number | text | Optional | "88881234" |
| Province | select | Optional | "San José" |
| Canton | select | Optional, depends on province | "Central" |
| District | select | Optional, depends on canton | "Carmen" |
| Address Details | textarea | Optional | "Frente al parque" |

**Part 2: Custom Fields (from selected form template)**
If the clinic has form templates, show a template selector dropdown. When selected, render each field dynamically based on its type:

| Field Type | Renders As |
|-----------|-----------|
| `text` | Text input |
| `number` | Number input |
| `date` | Date picker |
| `select` | Dropdown with predefined options |
| `multiselect` | Multi-select checkboxes or tag input |
| `boolean` | Toggle switch |
| `textarea` | Multi-line text area |
| `email` | Email input |
| `phone` | Phone input |

**Why this is powerful:** The receptionist doesn't know or care that these fields are "dynamic." She sees a clean form that looks like it was custom-built for her clinic. Under the hood, the data is stored as flexible key-value pairs.

#### Form Template Builder
This is an admin page where the clinic owner defines what custom fields appear on patient forms.

- **Drag-and-drop interface** for reordering fields
- Each field has: Label, Key (auto-generated from label), Type (dropdown), Required toggle, Options (for select/multiselect)
- Preview panel showing how the form will look
- "Set as Default" button to make this the auto-selected template

**API endpoints used:**
- `GET /api/patients?page=1&limit=20` — paginated list
- `GET /api/patients/search?q=carlos` — search
- `POST /api/patients` — create
- `GET /api/patients/:id` — detail
- `PATCH /api/patients/:id` — update
- `DELETE /api/patients/:id` — soft-delete
- `GET /api/patients/:id/validate-hacienda` — verify cédula with Hacienda
- `POST /api/form-templates` — create template
- `GET /api/form-templates` — list templates
- `GET /api/form-templates/:id` — get template
- `PATCH /api/form-templates/:id` — update
- `DELETE /api/form-templates/:id` — soft-delete
- `PATCH /api/form-templates/:id/default` — set as default

**UX considerations:**
- On the patient detail page, add a "Verify with Hacienda" button that calls `validate-hacienda`. This cross-checks the patient's cédula against Hacienda's database. Show a green checkmark if valid, red alert if not — because an invalid cédula means invoices for this patient will be rejected
- When the user types a cédula, consider auto-formatting it (e.g., `1-1234-0567` for physical cédulas)
- Show "last visit" by checking the most recent invoice for that patient

---

### 4. Products & Services → Define what you charge for

**What happens:** The clinic creates a catalog of services and products, each with a CABYS code (government classification), price, and tax configuration. When creating an invoice, items are selected from this catalog.

**Why products exist as a catalog (not typed into each invoice):** Because a clinic performs the same services daily — "Consulta General," "Limpieza Dental," "Extracción." Each service has a specific CABYS code, tax rate, and price. Typing this information manually on every invoice would be slow and error-prone. By creating the catalog once, the receptionist simply searches "dental," clicks, and all fields auto-fill on the invoice. This is what makes invoice creation take 30 seconds instead of 5 minutes.

**Why CABYS codes matter:** Because Costa Rica law requires every line item on an electronic invoice to have a 13-digit CABYS code (Catálogo de Bienes y Servicios). CABYS classifies what's being sold — "8621001000100" means "Servicios de consulta médica dental general." Hacienda uses this to verify that the correct tax rate is applied. If a clinic uses the wrong code (e.g., a tax-exempt code for a taxable service), Hacienda detects the mismatch and **rejects the invoice**. Getting the CABYS code right at product creation prevents rejections at invoice time.

**Why CABYS search is a proxy (not direct API calls from frontend):** Because Hacienda's CABYS API has rate limits — they block your IP for 10 minutes if you exceed 20 requests/second. With 50 clinic staff members searching simultaneously, the frontend would get blocked instantly. Our backend proxies the search, caches results in MongoDB for 30 days, and serves cached results first. This means the first search for "dental" takes 500ms (Hacienda API), but every subsequent search takes 20ms (local cache).

**Why we auto-populate cabysDescription:** Because nobody should manually type "Servicios de consulta médica dental general" — it's error-prone and the canonical description already exists in the CABYS catalog. When the user selects a CABYS code, the description auto-fills from the government catalog.

**Example flow:**
```
STEP 1 — Staff searches for a CABYS code:
  GET /api/cabys/search?q=consulta%20dental&top=5
  → Returns: [
      { "codigo": "8621001000100", "descripcion": "Servicios de consulta médica dental general" },
      { "codigo": "8621002000100", "descripcion": "Servicios de consulta médica dental especializada" }
    ]

STEP 2 — Staff creates the product using the CABYS code:
  POST /api/products
  { "name": "Consulta Dental General", "cabysCode": "8621001000100",
    "price": 45000, "currency": "CRC",
    "tax": { "code": "01", "rateCode": "08", "rate": 13 },
    "unitOfMeasure": "Sp", "type": "service" }
  → Backend calls CabysService.findByCode("8621001000100")
  → Auto-populates cabysDescription: "Servicios de consulta médica dental general"
  → 201 Created

STEP 3 — During invoice creation, receptionist searches products:
  GET /api/products?search=dental
  → Returns the product with all fields ready to insert into an invoice line
```

**What success looks like:**
```json
POST /api/products → 201
{ "success": true, "data": { "_id": "...", "name": "Consulta Dental General",
  "cabysCode": "8621001000100", "cabysDescription": "Servicios de consulta médica dental general",
  "price": 45000, "tax": { "code": "01", "rateCode": "08", "rate": 13 } } }
```

**What failure looks like:**
```json
POST /api/products (CABYS code too short) → 400
{ "success": false, "statusCode": 400, "message": "Validation failed",
  "errors": [{ "field": "cabysCode", "message": "cabysCode must be exactly 13 characters" }] }

POST /api/products (invalid CABYS code) → 400
{ "success": false, "statusCode": 400, "message": "Invalid CABYS code: no match found" }
```

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Product List | `/products` | Searchable table of all products/services |
| Create Product | `/products/new` | New product form with CABYS search |
| Product Detail | `/products/:id` | View/edit product |

#### Product Form

| Field | Type | Notes |
|-------|------|-------|
| Name | text | Required. e.g., "Limpieza Dental" |
| Description | textarea | Optional. Longer description |
| Internal Code | text | Optional. Clinic's own code system |
| **CABYS Code** | **search + select** | **Required. See CABYS search below** |
| CABYS Description | text (readonly) | Auto-filled from CABYS catalog |
| Price | currency input | Required. Formatted as ₡45,000.00 |
| Currency | select | CRC / USD / EUR |
| Tax Code | select | IVA, ISC, etc. (see constants) |
| Tax Rate Code | select | Depends on tax code |
| Tax Rate (%) | number | e.g., 13 |
| Unit of Measure | select | Servicio profesional (Sp), Unidad (Unid), Kilogramo (kg), etc. |
| Type | radio | Service / Product |

#### CABYS Search Component (Reusable)
This is one of the most important UI components. Build it as a **searchable dropdown/autocomplete**:

1. User types at least 3 characters (e.g., "dental")
2. Frontend calls `GET /api/cabys/search?q=dental&top=10`
3. Results appear in a dropdown: `"8621001000100 — Servicios de consulta médica dental general"`
4. User clicks one → CABYS code and description auto-fill in the form

**Why this component is critical:** CABYS has over 29,000 codes. Nobody memorizes them. The search must be fast, forgiving (partial matches), and show clear descriptions. If this component is bad, users will dread creating products.

**API endpoints used:**
- `GET /api/cabys/search?q=term&top=10` — search CABYS catalog
- `GET /api/cabys/:code` — get specific code details
- `POST /api/products` — create product
- `GET /api/products?page=1&limit=20` — paginated list
- `GET /api/products/:id` — detail
- `PATCH /api/products/:id` — update
- `DELETE /api/products/:id` — soft-delete
- `PATCH /api/products/:id/cabys` — update CABYS code

**UX considerations:**
- Format prices with the Costa Rica convention: `₡45.000,00` (period for thousands, comma for decimals) for CRC, or `$45,000.00` for USD
- Show the tax rate as a calculated preview: "Price: ₡45,000 + IVA 13% = **₡50,850**"
- Color-code services vs products in the list (e.g., blue icon for services, green for products)

---

### 5. Invoices → The main event

**What happens:** The receptionist creates an invoice by selecting a patient, adding products/services, choosing a payment method, and clicking "Create." The system calculates taxes, generates a 50-digit unique key, builds an XML document, digitally signs it with the clinic's certificate, and sends it to Hacienda — all in seconds.

**Why this is the core of the app:** Because everything before this was setup. Patients, products, settings — they all exist to feed into this one flow. Invoices are why the app exists. A clinic might create 20-50 invoices per day, so this flow must be **fast, intuitive, and error-proof.**

**Why the backend does all calculations (not the frontend):** Because prices and tax rates come from the product catalog. If the frontend calculated totals, a savvy user could tamper with the amounts via browser dev tools. The backend always looks up the real price from the database, calculates taxes server-side, and validates that payment totals match. The frontend shows real-time previews, but the backend is the source of truth.

**Why `sendToHacienda` is optional:** Because sometimes a clinic wants to create a "draft" invoice — to verify the amounts before sending it to the government. Once sent, an invoice becomes a legal document. Making it optional gives the user a safety net: create, review, then send.

**Example flow:**
```
Receptionist clicks "New Invoice"
  → Selects document type: "Factura Electrónica" (01)
  → Selects patient: types "Carlos" → autocomplete finds "Carlos Rodríguez (1-1234-0567)"
  → Adds service: types "dental" → finds "Consulta Dental General - ₡50,000"
  → Quantity: 1
  → System auto-calculates: Subtotal ₡50,000 + IVA 13% ₡6,500 = Total ₡56,500
  → Payment method: "Tarjeta" (02) → Amount: ₡56,500 ✅ (matches total)
  → Checks "Send to Hacienda" ✅
  → Clicks "Create Invoice"
  → Backend: Validate → Calculate → Generate Key → Build XML → Sign → Send
  → Redirect to invoice detail page
  → Status: 🔵 "Enviada" → polls every 5s → 🟢 "Aceptada" (1-3 min later)
```

**What success looks like:**
```json
POST /api/invoices → 201
{ "success": true, "data": {
    "_id": "inv_abc123",
    "clave": "50604042600310112345600100001010000000001123456789",
    "consecutivo": "00100001010000000001",
    "haciendaStatus": "sent",
    "items": [{ "description": "Consulta Dental General", "lineTotal": 56500 }],
    "summary": { "totalVoucher": 56500 }
  }
}
```

**What failure looks like:**
```json
POST /api/invoices (payment mismatch) → 400
{ "success": false, "statusCode": 400,
  "message": "Payment total (99999) does not match invoice total (56500)" }

POST /api/invoices (no items) → 400
{ "success": false, "statusCode": 400,
  "message": "Validation failed", "errors": [{ "field": "items", "message": "items must contain at least 1 elements" }] }

POST /api/invoices/:id/credit-note (invoice not accepted) → 400
{ "success": false, "statusCode": 400,
  "message": "Can only create credit notes for accepted invoices" }
```

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Invoice List | `/invoices` | Searchable, filterable table of all invoices |
| Create Invoice | `/invoices/new` | The main invoice creation form |
| Invoice Detail | `/invoices/:id` | View invoice, check status, download XML, issue credit/debit notes |

#### Invoice List Page
- **Filter bar:** Status (All / Pending / Sent / Accepted / Rejected), Date range, Search
- **Table columns:** #Consecutive, Date, Patient, Total, Status, Actions
- **Status badges** with colors:
  - `pending` → Gray badge: "Pendiente"
  - `sent` → Blue badge: "Enviada"
  - `accepted` → Green badge: "Aceptada"
  - `rejected` → Red badge: "Rechazada"
- Quick actions: View, Resend, Download XML

#### Create Invoice Page — THE MOST IMPORTANT PAGE

This page must be **fast and keyboard-navigable**. Design it as a single-page form with these sections:

**Section 1: Document Type & Patient**

| Field | Type | Notes |
|-------|------|-------|
| Document Type | select | "Factura Electrónica" (01), "Tiquete Electrónico" (04), etc. |
| Patient | **autocomplete search** | Search by name or cédula. Shows: "Carlos Rodríguez (1-1234-0567)" |

**Why document type matters:** A "Factura Electrónica" (01) requires a patient (receiver). A "Tiquete Electrónico" (04) does not — it's for anonymous sales under ₡50,000. The UI should **hide the patient field** when Tiquete is selected.

**Section 2: Line Items**
A dynamic table where each row is a product/service:

| Column | Type | Notes |
|--------|------|-------|
| Product/Service | autocomplete search | Search by name. Auto-fills price, tax, unit |
| Quantity | number input | Default: 1 |
| Unit Price | currency (readonly) | From product catalog |
| Discount | expandable | Optional: amount + reason code |
| Subtotal | calculated | Qty × Price |
| Tax | calculated | Shows rate and amount |
| Line Total | calculated | Subtotal - Discount + Tax |

- "Add Item" button or press Enter on the last row to add a new line
- Each row has a delete (✕) button
- **Running total** shown at the bottom in real-time as items are added

**Section 3: Payment**

| Field | Type | Notes |
|-------|------|-------|
| Sale Condition | select | "Contado" (cash), "Crédito" (credit) |
| Credit Term (days) | number | Only visible if "Crédito" selected |
| Payment Method | select + amount | Can have multiple (e.g., part card + part cash) |

**Why multiple payment methods:** A patient might pay ₡30,000 with their card and ₡20,850 in cash. The total of all payment methods must equal the invoice total. Show a validation error if it doesn't.

**Section 4: Summary & Actions**

```
┌──────────────────────────────────┐
│  Subtotal:           ₡45,000.00 │
│  Discount:              ₡0.00   │
│  Net Sale:           ₡45,000.00 │
│  IVA (13%):           ₡5,850.00 │
│  ────────────────────────────── │
│  TOTAL:             ₡50,850.00  │
│                                  │
│  [ ] Send to Hacienda            │
│                                  │
│  [Create Invoice]  [Cancel]      │
└──────────────────────────────────┘
```

- The "Send to Hacienda" checkbox should be checked by default if Hacienda is connected
- The "Create Invoice" button should show a loading spinner during processing (XML generation + signing + sending takes 2-5 seconds)
- On success, navigate to the invoice detail page with a success toast

#### Invoice Detail Page

| Section | Content |
|---------|---------|
| Header | Invoice number, date, status badge, patient name |
| Hacienda Status | Live status with refresh button. If rejected, show the error message from Hacienda |
| Line Items | Read-only table of products, quantities, prices, taxes |
| Summary | Same totals as creation, but readonly |
| Actions | "Resend to Hacienda" (if failed), "Download XML", "Create Credit Note", "Create Debit Note" |
| Timeline | Status history: Created → Sent → Accepted (with timestamps) |

**API endpoints used:**
- `POST /api/invoices` — create (with optional `sendToHacienda: true`)
- `GET /api/invoices?page=1&limit=20&status=accepted` — filtered list
- `GET /api/invoices/:id` — detail
- `POST /api/invoices/:id/send` — send/resend
- `GET /api/invoices/:id/status` — check Hacienda status
- `GET /api/invoices/:id/xml` — download signed XML
- `POST /api/invoices/:id/credit-note` — issue credit note
- `POST /api/invoices/:id/debit-note` — issue debit note

**UX considerations:**
- **Speed is everything.** The receptionist creates invoices all day. Optimize for keyboard navigation: Tab between fields, Enter to add items, Ctrl+Enter to submit
- Auto-calculate totals in real-time as items are added. Never make the user do math
- After creating an invoice, show the Hacienda status updating in real-time (poll every 5 seconds until accepted/rejected)
- For credit notes: show a clear "Why?" — because issuing a credit note is often stressful (something went wrong). Guide the user with predefined reason codes: "Full cancellation", "Text correction", etc.

---

### 6. Hacienda Utilities → Helper tools

**What happens:** Utility endpoints for looking up taxpayer information, exchange rates, and tax exemptions.

**Where these appear:** These aren't standalone pages. They're integrated into other pages:

| Utility | Where it appears | How it's used |
|---------|-----------------|---------------|
| Exchange Rate | Invoice creation | If currency is USD, show current exchange rate to CRC |
| Taxpayer Lookup | Patient form | "Verify with Hacienda" button to validate a cédula |
| Tax Exemption | Invoice creation | If patient has a tax exemption, validate the authorization number |

**API endpoints used:**
- `GET /api/hacienda/exchange-rate` — current USD/EUR rates
- `GET /api/hacienda/taxpayer/:identification` — taxpayer info
- `GET /api/hacienda/exemption/:authorization` — tax exemption info

---

### 7. Medical Records & Consultations → What happened during each visit

**What happens:** On the patient detail page, the doctor can view and edit the patient's medical record (chronic conditions, allergies, medications, surgical history) and create consultation entries for each visit (diagnosis, treatment, vitals, prescriptions).

**Why this exists alongside patient data:** Because patient registration data (name, cédula, phone) is for **billing**. Medical records are for **healthcare**. A receptionist registers the patient; a doctor records the clinical data. They serve different roles and change at different rates — a patient's phone changes occasionally, but their consultation history grows with every visit.

**Why medical records are separate from consultations:** Because they represent two patterns:
- **Medical Record** = a single evolving document (like a Wikipedia article). Updated over time. One per patient.
- **Consultation** = a timestamped event (like a diary entry). Created each visit. Many per patient.

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Patient Detail (enhanced) | `/patients/:id` | Now includes medical record tab and consultations timeline |
| Medical Record | `/patients/:id/medical-record` | View/edit chronic conditions, allergies, medications |
| New Consultation | `/patients/:id/consultations/new` | Record a visit: diagnosis, treatment, vitals, prescriptions |
| Consultation Detail | `/patients/:id/consultations/:consultationId` | View/edit a past consultation |

#### Medical Record Tab (on Patient Detail page)

Display as a card or tab with editable sections:

| Section | Fields | UI Pattern |
|---------|--------|------------|
| Chronic Conditions | List of strings (e.g., "Hipertensión", "Diabetes tipo 2") | Tag/chip input — type and press Enter |
| Allergies | List of strings (e.g., "Penicilina", "Ibuprofeno") | Tag/chip input with red color |
| Current Medications | Table: Name, Dosage, Frequency, Start Date | Editable table with add/remove rows |
| Surgical History | Table: Procedure, Date, Notes | Editable table |
| Family History | Free text | Textarea |
| Blood Type | Select: A+, A-, B+, B-, AB+, AB-, O+, O- | Dropdown |
| Notes | Free text | Textarea |

**Important:** Show allergies prominently (red banner at the top of the patient page) because this is safety-critical information.

#### Consultations Timeline (on Patient Detail page)

Below the medical record, show a **timeline** of consultations sorted by date (most recent first):

```
📋 April 4, 2026 — Caries profunda en pieza #46
   Diagnosis: Caries profunda
   Treatment: Restauración con resina compuesta
   Follow-up: April 18, 2026
   [View Details]

📋 March 15, 2026 — Control de rutina
   Diagnosis: Paciente sano
   [View Details]
```

Each entry is clickable → opens the full consultation with vitals, prescriptions, etc.

#### New Consultation Form

| Section | Fields | UI Pattern |
|---------|--------|------------|
| Date | Date + time picker (default: now) | DateTime picker |
| Chief Complaint | "Dolor en muela inferior derecha" | Text input |
| Diagnosis | "Caries profunda en pieza #46" | Textarea |
| Treatment | "Restauración con resina compuesta" | Textarea |
| Vitals | Blood Pressure, Heart Rate, Temperature, Weight, Height, O₂ Saturation | 6 small inputs in a grid |
| Prescriptions | Table: Medication, Dosage, Frequency, Duration, Instructions | Dynamic table with add/remove |
| Follow-up Date | Date picker | Date input |
| Notes | Free text | Textarea |

**Example flow:**
```
Doctor opens patient Carlos Rodríguez → sees allergy banner: "��️ Alérgico a Penicilina"
→ Clicks "New Consultation"
→ Fills in: complaint, diagnosis, treatment, vitals (BP: 130/85, HR: 72)
→ Adds prescription: "Acetaminofén 500mg cada 8h por 3 días" (NOT penicillin — the allergy reminder helped!)
→ Sets follow-up: April 18
→ Saves → consultation appears in timeline
```

**API endpoints used:**
- `POST /api/patients/:patientId/medical-record` — create medical record
- `GET /api/patients/:patientId/medical-record` — get medical record
- `PATCH /api/patients/:patientId/medical-record` — update medical record
- `POST /api/patients/:patientId/consultations` — create consultation
- `GET /api/patients/:patientId/consultations?page=1&limit=10` — list consultations (paginated)
- `GET /api/patients/:patientId/consultations/:id` — get single consultation
- `PATCH /api/patients/:patientId/consultations/:id` — update consultation
- `DELETE /api/patients/:patientId/consultations/:id` — soft-delete consultation

**Expected outcomes:**
```json
POST /api/patients/:patientId/medical-record → 201
{ "success": true, "data": { "chronicConditions": ["Hipertensión"], "allergies": ["Penicilina"], "bloodType": "O+" } }

POST /api/patients/:patientId/medical-record (already exists) → 409
{ "success": false, "statusCode": 409, "message": "Medical record already exists for this patient" }

POST /api/patients/:patientId/consultations → 201
{ "success": true, "data": { "date": "2026-04-04T09:00:00Z", "diagnosis": "Caries profunda", "vitals": { "bloodPressure": "130/85" } } }
```

---

### 8. Google Calendar → See today's appointments

**What happens:** If the user logged in with Google, they can see their Google Calendar events inside ClinicCR — no tab switching. They can also create appointments that sync back to their Google Calendar.

**Why this is in the app:** Because the receptionist's workflow is: check who's coming today → prepare their file → call them in → create invoice. If the appointment list is in a separate app (Google Calendar on the phone), she's constantly switching contexts. By embedding it in ClinicCR, the flow becomes seamless.

**Why this is per-user (not per-clinic):** Because Google Calendar belongs to a person, not a business. María (the owner) might have personal events mixed in with clinic appointments. If ClinicCR showed everyone's calendar, María's personal events would be visible to staff. Each user sees only their own Google Calendar.

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Calendar | `/calendar` | Day/week view of Google Calendar events |

#### Calendar Page

Display a calendar view (day or week) showing events from Google Calendar:

```
┌──────────────────────────────────────────────┐
│  ← April 4, 2026 →    [Day] [Week]  [+New]  │
├──────────────────────────────────────────────┤
│  08:00                                        │
│  09:00  ┌─────────────────────┐              │
│         │ Carlos Rodríguez    │              │
│         │ Consulta dental     │              │
│  10:00  └─────────────────────┘              │
│  10:30  ┌─────────────────────┐              │
│         │ Ana López           │              │
│         │ Limpieza dental     │              │
│  11:30  └─────────────────────┘              │
│  ...                                          │
└──────────────────────────────────────────────┘
```

**If Google Calendar is not connected:** Show a card: "Connect your Google Calendar to see appointments here. Log in with Google to enable this feature." with a "Connect Google" button that triggers `GET /api/auth/google`.

**Creating an appointment:**
1. User clicks "+New" or clicks on a time slot
2. Modal opens with: Title, Date/Time, Duration, Description, Patient (optional autocomplete)
3. Frontend calls `POST /api/calendar/events`
4. Event appears in both ClinicCR and the user's Google Calendar app/phone

**API endpoints used:**
- `GET /api/calendar/status` — check if Google Calendar is connected (`{ connected: true/false }`)
- `GET /api/calendar/events?timeMin=...&timeMax=...&maxResults=20` — list events for date range
- `POST /api/calendar/events` — create event (`{ summary, startDateTime, endDateTime, description }`)
- `DELETE /api/calendar/events/:eventId` — delete event

**Expected outcomes:**
```json
GET /api/calendar/status → 200
{ "success": true, "data": { "connected": true, "authProvider": "google" } }

GET /api/calendar/status (not connected) → 200
{ "success": true, "data": { "connected": false, "authProvider": "local" } }

GET /api/calendar/events → 200
{ "success": true, "data": [
  { "id": "abc123", "summary": "Carlos Rodríguez — Consulta dental",
    "start": { "dateTime": "2026-04-04T09:00:00-06:00" },
    "end": { "dateTime": "2026-04-04T10:00:00-06:00" } }
] }

GET /api/calendar/events (not connected) → 400
{ "success": false, "statusCode": 400, "message": "Google Calendar not connected. Please log in with Google first." }
```

---

### 9. Invoice Delivery → Give the patient a receipt

**What happens:** After an invoice is created (and optionally accepted by Hacienda), the clinic can: download a professional PDF, send it by email with the PDF attached, or send a WhatsApp summary to the patient's phone.

**Why this matters:** Because the patient needs proof of payment. Walking out of a clinic without a receipt feels wrong. Different patients prefer different formats:
- **Older patients** want a printed PDF or email for their insurance company
- **Younger patients** want a WhatsApp message they can forward
- **All patients** expect something — a professional receipt builds trust

**Where this appears:** On the **Invoice Detail page** (`/invoices/:id`), add a "Send Receipt" section:

```
┌─────────────────────────────────────────────┐
│  📄 Send Receipt                            │
│                                             │
│  [📥 Download PDF]  [📧 Send Email]  [💬 WhatsApp] │
└─────────────────────────────────────────────┘
```

#### Download PDF

```
1. User clicks "Download PDF"
2. Frontend calls: GET /api/invoices/:id/pdf
   (with Authorization header)
3. Backend generates PDF with pdfkit:
   → Clinic logo (top-left)
   → Business name, cédula, phone, email (top-right)
   → Document type: "FACTURA ELECTRÓNICA"
   → Invoice details: consecutivo, clave, date
   → Patient info: name, cédula
   → Line items table: description, quantity, price, tax, total
   → Summary: subtotal, discount, tax, TOTAL
   → Hacienda status: ✅ ACEPTADA
4. Browser downloads: "factura-001-00001-01-0000000001.pdf"
```

**How to trigger the download:**
```javascript
// Option A: Direct link (simple)
<a href="/api/invoices/:id/pdf" target="_blank">Download PDF</a>
// But this doesn't send the auth header!

// Option B: Fetch + blob (correct)
const response = await fetch(`/api/invoices/${id}/pdf`, {
  headers: { Authorization: `Bearer ${token}` }
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `factura-${invoice.consecutivo}.pdf`;
a.click();
```

#### Send Email

```
1. User clicks "Send Email"
2. Modal opens:
   → Recipient email (pre-filled with patient's email)
   → Subject (default: "Factura Electrónica — Clínica González")
   → Message (optional: "Estimado Carlos, adjunto su factura.")
3. Frontend calls: POST /api/invoices/:id/send-email
   { "recipientEmail": "carlos@email.com", "subject": "...", "message": "..." }
4. Backend generates PDF, attaches it to an HTML email, sends via SMTP
5. Response: { "message": "Email sent successfully" }
```

#### Send WhatsApp

```
1. User clicks "WhatsApp"
2. Modal opens:
   → Recipient phone (pre-filled with patient's phone: +506 8888-1234)
3. Frontend calls: POST /api/invoices/:id/send-whatsapp
   { "recipientPhone": "+50688881234" }
4. Backend sends a formatted text message via Twilio:
   "🏥 Clínica Dental González
    📋 Factura #001-00001-01-0000000001
    📅 Fecha: 04/04/2026
    💰 Total: ₡56,500
    ✅ Estado: Aceptada por Hacienda"
5. Response: { "message": "WhatsApp message sent successfully" }
```

**API endpoints used:**
- `GET /api/invoices/:id/pdf` — download invoice as PDF (returns `application/pdf`)
- `POST /api/invoices/:id/send-email` ��� send PDF via email (`{ recipientEmail, subject?, message? }`)
- `POST /api/invoices/:id/send-whatsapp` — send summary via WhatsApp (`{ recipientPhone }`)

**Expected outcomes:**
```json
GET /api/invoices/:id/pdf → 200 (binary PDF with Content-Type: application/pdf)

POST /api/invoices/:id/send-email → 200
{ "success": true, "data": { "message": "Email sent successfully" } }

POST /api/invoices/:id/send-email (SMTP not configured) → 503
{ "success": false, "statusCode": 503, "message": "Email service not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables." }

POST /api/invoices/:id/send-whatsapp → 200
{ "success": true, "data": { "message": "WhatsApp message sent successfully" } }

POST /api/invoices/:id/send-whatsapp (Twilio not configured) → 503
{ "success": false, "statusCode": 503, "message": "WhatsApp service not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables." }
```

**UX considerations:**
- Pre-fill the recipient email and phone from the patient's profile
- After successful send, show a green toast: "📧 Email enviado a carlos@email.com"
- If SMTP or Twilio is not configured, show a clear setup message instead of the button: "Configure email in Settings to enable this feature"
- The PDF download should work even without email/WhatsApp being configured — it's pure backend generation

---

### 10. Safe Delete & Update Behavior → What the frontend must know

**What is it?** The backend has strict rules about what can be deleted or updated. The frontend must handle these rules gracefully — showing confirmation dialogs, blocking buttons, and offering alternatives.

**Why this matters:** Because deleting a patient who has invoices would orphan legal documents. Deleting a product used in past invoices would break the audit trail. And invoices themselves are immutable legal records that can never be deleted or edited (corrections are made through credit/debit notes).

#### Delete Protection Rules

| Entity | Can Delete? | Frontend Behavior |
|--------|------------|-------------------|
| **Patient with 0 invoices** | Yes (soft-delete) | Normal delete button, confirmation dialog |
| **Patient with invoices** | **Blocked** — must deactivate instead | Show: "This patient has 3 invoices. Would you like to deactivate them instead?" with a "Deactivate" button |
| **Product never used in invoices** | Yes (soft-delete) | Normal delete button |
| **Product used in invoices** | **Blocked** — must deactivate instead | Show: "This product appears in 47 invoices. Would you like to deactivate it instead?" |
| **Invoice** | **Never** | No delete button. Show archive button instead |

**Example — deleting a patient:**
```
User clicks "Delete" on Carlos Rodríguez
  → Frontend calls DELETE /api/patients/:id

CASE A: No invoices
  → 200 OK → Patient disappears from list → toast "Patient deleted"

CASE B: Has invoices
  → 400 "Cannot delete patient with existing invoices. This patient has 3 invoice(s). Deactivate the patient instead."
  → Frontend shows a modal: "Carlos has 3 invoices and cannot be deleted.
     [Deactivate Instead] [Cancel]"
  → User clicks "Deactivate" → PATCH /api/patients/:id/deactivate
  → 200 OK → Patient hidden from lists, medical records cascade-deactivated
```

#### Invoice Rules

| Action | Allowed? | Endpoint | Notes |
|--------|---------|----------|-------|
| Edit invoice content | **Never** | — | Invoices are digitally signed; editing invalidates the signature |
| Edit notes only | **Yes** | `PATCH /invoices/:id/notes` | Only the `notes` field can be updated |
| Archive (hide from list) | **Yes** | `PATCH /invoices/:id/archive` | Hidden from default list, accessible via filter |
| Unarchive | **Yes** | `PATCH /invoices/:id/unarchive` | Restores to default list |
| Delete | **Never** | — | No delete button. Use credit notes for corrections |

**Invoice list should have an "Archived" filter** — a toggle or dropdown that shows `All / Active / Archived` invoices.

#### Deactivate vs Delete

| Concept | What it means | UX |
|---------|--------------|-----|
| **Delete** (soft) | `isActive: false`, record hidden from lists, can't be used in new operations | Red "Delete" button |
| **Deactivate** | Same as delete, but cascades (patient → medical records → consultations) | Orange "Deactivate" button, used when delete is blocked |
| **Reactivate** | `isActive: true`, restores the record + cascaded children | Green "Reactivate" button on a "Deactivated" filter view |

**API endpoints:**
- `PATCH /api/patients/:id/deactivate` — cascade deactivate patient + records
- `PATCH /api/patients/:id/reactivate` — cascade reactivate
- `PATCH /api/invoices/:id/notes` — update only notes
- `PATCH /api/invoices/:id/archive` — hide from list
- `PATCH /api/invoices/:id/unarchive` — show in list again
- `DELETE /api/patients/:patientId/medical-record` — soft-delete medical record

---

### 11. Analytics Dashboard → How is the clinic doing?

**What is it?** A dedicated analytics page that shows business intelligence — total sales, patient counts, top products, and most active patients — across configurable time ranges.

**Why this matters:** Because the clinic owner asks "How much did we make this month?" and currently has to add up invoices in a spreadsheet. Analytics turns raw data into actionable insights with one click.

**Pages needed:**

| Page | Route | Purpose |
|------|-------|---------|
| Analytics | `/analytics` | Full analytics dashboard with charts and metrics |

#### Time Range Selector (reusable component)

Every analytics widget should have a time range dropdown:

```
[Today] [This Week] [Last Week] [Last 30 Days] [3 Months] [6 Months] [12 Months] [Custom ▼]
```

When "Custom" is selected, show a date range picker (start date → end date).

The backend accepts: `?range=last30days` or `?range=custom&startDate=2026-01-01&endDate=2026-03-31`

#### Analytics Widgets

**Widget 1: Sales Overview**
```
┌────────────────────────────────────────┐
│  💰 Sales — Last 30 Days              │
│                                        │
│  Total Revenue:  ₡4,250,000           │
│  Invoices:       87                    │
│  Average:        ₡48,850              │
│  Tax Collected:  ₡552,500             │
│                                        │
│  [Line chart: daily revenue trend]     │
│                                        │
│  Payment Methods:                      │
│  ██████████ Tarjeta   ₡2,800,000 (66%)│
│  █████     Efectivo   ₡950,000   (22%)│
│  ███       SINPE      ₡500,000   (12%)│
└────────────────────────────────────────┘
```

**Widget 2: Patient Growth**
```
┌────────────────────────────────────────┐
│  👥 Patients — Last 30 Days           │
│                                        │
│  Total: 342  |  New: 28  |  Return: 59│
│                                        │
│  [Bar chart: new vs returning by month]│
└────────────────────────────────────────┘
```

**Widget 3: Top Products**
```
┌────────────────────────────────────────┐
│  📦 Top Products — Last 30 Days       │
│                                        │
│  # │ Product             │ Revenue    │
│  1 │ Consulta Dental     │ ₡1,800,000│
│  2 │ Limpieza Dental     │ ₡1,200,000│
│  3 │ Extracción Simple   │ ₡750,000  │
│                                        │
│  [Toggle: By Revenue / By Quantity]    │
└────────────────────────────────────────┘
```

**Widget 4: Top Patients**
```
┌────────────────────────────────────────┐
│  🏆 Top Patients — Last 30 Days       │
│                                        │
│  # │ Patient              │ Visits │ $ │
│  1 │ Carlos Rodríguez     │ 12    │₡540k│
│  2 │ Ana López            │ 8     │₡320k│
│                                        │
│  [Toggle: By Visits / By Spending]     │
└────────────────────────────────────────┘
```

**API endpoints used:**
- `GET /api/analytics/sales?range=last30days`
- `GET /api/analytics/patients?range=last30days`
- `GET /api/analytics/top-products?range=last30days&limit=10`
- `GET /api/analytics/top-patients?range=last30days&limit=10`
- `GET /api/analytics/summary?range=last30days` — combined (use for dashboard widget)

---

### 12. Scheduled Patients → Who's coming today and tomorrow?

**What is it?** A view on the dashboard and a dedicated page showing today's and tomorrow's appointments — pulled from Google Calendar and enriched with patient data and pending payment status.

**Why this matters:** Because the receptionist's first action every morning is: "Who's coming today?" This widget answers that question with context — not just the name, but whether the patient has pending payments, when they last visited, and quick-action buttons.

**Where this appears:** Two places:

**1. Dashboard widget (compact):**
```
┌─────────────────────────────────────────────────────┐
│  📅 Today — April 4 (3 appointments)                │
│                                                      │
│  09:00  Carlos Rodríguez — Consulta dental           │
│         ⚠️ Pending ₡56,500  [Open] [Invoice]        │
│                                                      │
│  10:30  Ana López — Limpieza dental                  │
│         ✅ No pending  [Open] [Invoice]              │
│                                                      │
│  14:00  Pedro Mora — Control                         │
│         🆕 New patient  [Open] [Invoice]             │
├─────────────────────────────────────────────────────┤
│  📅 Tomorrow — April 5 (3 appointments)              │
│  09:00 María Fernández  |  11:00 Luis Vargas  | ... │
└─────────────────────────────────────────────────────┘
```

**2. Dedicated schedule page (`/schedule`):**
Full day view with expanded appointment cards showing:
- Patient photo/avatar, name, cédula
- Appointment time and description
- Last visit date
- Pending payment (amount + days overdue) with "Send Reminder" button
- Quick action buttons: "Open Profile", "Create Invoice", "New Consultation"

**If Google Calendar not connected:** Show: "Connect Google Calendar to see scheduled patients. [Connect with Google]"

**If event can't be matched to a patient:** Show the event summary only, without patient details. Add a "Link to Patient" button that opens a patient search.

**API endpoints used:**
- `GET /api/schedule/today` — today's appointments with patient enrichment
- `GET /api/schedule/tomorrow` — tomorrow's appointments
- `GET /api/schedule/date/2026-04-10` — any specific date

**Expected response:**
```json
{
  "date": "2026-04-04",
  "appointments": [
    {
      "calendarEventId": "abc123",
      "summary": "Carlos Rodríguez — Consulta dental",
      "startTime": "2026-04-04T09:00:00-06:00",
      "endTime": "2026-04-04T10:00:00-06:00",
      "patient": {
        "id": "pat_xyz",
        "name": "Carlos Rodríguez",
        "phone": "+50688881234",
        "lastVisit": "2026-03-15",
        "pendingPayment": { "hasPending": true, "amount": 56500, "dueDate": "2026-03-30" }
      },
      "matched": true
    }
  ]
}
```

---

### 13. Pending Payments & Alerts → Follow up on overdue invoices

**What is it?** A system that identifies patients with overdue payments, lets staff send reminders via email or WhatsApp, and creates alerts (notifications) for doctors and receptionists — with the ability to mark as paid, dismiss, or escalate.

**Why this matters:** Because clinics commonly offer credit (pay in 15 or 30 days). Without tracking, the clinic forgets who owes money. A ₡56,500 unpaid invoice from March becomes invisible by May. A simple WhatsApp reminder would recover 80% of overdue payments — but nobody remembers to send it.

**Pages/components needed:**

| Component | Location | Purpose |
|-----------|----------|---------|
| Alerts bell + dropdown | Top bar (always visible) | Red badge with count, dropdown showing alerts |
| Pending Payments page | `/payments` | Full list of overdue invoices with actions |
| Alert detail on invoice | `/invoices/:id` | Payment status badge + reminder buttons |

#### Alerts Bell (Top Bar)

The notification bell in the top bar shows unread alert count:

```
🔔 (3)  ← red badge with count from GET /api/alerts/count
```

Clicking it opens a dropdown:

```
┌───────────────────────────────────────────────┐
│  🔔 Alerts                    [Mark all read] │
│                                                │
│  🔴 Carlos Rodríguez — ₡56,500 overdue (8d)   │
│     [Send Reminder] [Mark Paid] [Dismiss]      │
│                                                │
│  🟠 Ana López — ₡32,000 overdue (3d)          │
│     [Send Reminder] [Mark Paid] [Dismiss]      │
│                                                │
│  🟡 Pedro Mora — ₡45,000 due in 3 days        │
│     [Dismiss]                                  │
│                                                │
│  [View all payments →]                         │
└───────────────────────────────────────────────┘
```

**Severity colors:**
- 🟡 Info (yellow) — payment due in 3 days
- 🟠 Warning (orange) — overdue 1-7 days
- 🔴 Critical (red) — overdue 7+ days

**Alert actions:**
- "Send Reminder" → opens modal to choose email or WhatsApp
- "Mark Paid" → `PATCH /api/payments/:invoiceId/mark-paid` → badge count decreases
- "Dismiss" → `PATCH /api/alerts/:id/dismiss` → alert disappears for this user

**Alerts are auto-created** by a daily cron job at 8:00 AM — no manual creation needed.

#### Pending Payments Page (`/payments`)

Full table view of all overdue invoices:

```
┌────────────────────────────────────────────────────────────────────┐
│  💳 Pending Payments                    Total Overdue: ₡187,500   │
├────────────────────────────────────────────────────────────────────┤
│  Patient          │ Invoice    │ Amount   │ Due Date │ Overdue │   │
│  Carlos Rodríguez │ #001-001.. │ ₡56,500  │ Apr 3    │ 1 day   │ ⋮│
│  Ana López        │ #001-002.. │ ₡32,000  │ Apr 1    │ 3 days  │ ⋮│
│  Pedro Mora       │ #001-003.. │ ₡45,000  │ Mar 28   │ 7 days  │ ⋮│
│  Luis Vargas      │ #001-004.. │ ₡54,000  │ Mar 20   │ 15 days │ ⋮│
└────────────────────────────────────────────────────────────────────┘
```

Each row's "⋮" menu has:
- "Send Email Reminder" → calls `POST /api/payments/:invoiceId/remind-email`
- "Send WhatsApp Reminder" → calls `POST /api/payments/:invoiceId/remind-whatsapp`
- "Mark as Paid" → calls `PATCH /api/payments/:invoiceId/mark-paid`
- "View Invoice" → navigates to `/invoices/:id`

**Reminder tracking:** Each row shows "Reminders sent: 2 | Last: Apr 2" — so the receptionist knows if a reminder was already sent recently. Disable the "Send Reminder" button if one was sent in the last 3 days.

#### Invoice Detail Enhancement

On the invoice detail page (`/invoices/:id`), add a **payment status section** for credit invoices:

```
┌────────────────────────────────────────┐
│  💳 Payment Status: ⚠️ OVERDUE        │
│                                        │
│  Due date: April 3, 2026 (1 day ago)   │
│  Reminders sent: 0                     │
│                                        │
│  [📧 Email Reminder] [💬 WhatsApp]     │
│  [✅ Mark as Paid]                      │
└────────────────────────────────────────┘
```

**API endpoints used:**
- `GET /api/alerts` — list active alerts
- `GET /api/alerts/count` — unread count (poll every 60 seconds for badge)
- `PATCH /api/alerts/:id/read` — mark as read
- `PATCH /api/alerts/:id/dismiss` — dismiss alert
- `DELETE /api/alerts/:id` — delete permanently
- `GET /api/payments/pending?page=1&limit=20` — overdue invoices
- `POST /api/payments/:invoiceId/remind-email` — send email reminder
- `POST /api/payments/:invoiceId/remind-whatsapp` — send WhatsApp reminder
- `PATCH /api/payments/:invoiceId/mark-paid` — mark invoice as paid

---

## How the Hacienda Integration Actually Works (Step by Step)

This is the most important section of this document. Understanding this flow is essential because the entire app exists to make this process seamless. Every module — patients, products, settings — feeds into this pipeline.

### The Big Picture

When a receptionist clicks "Create Invoice & Send to Hacienda," here's what happens in **10 steps over 3-5 seconds**:

```
User clicks "Create" → Validate → Calculate → Generate Key → Build XML → Sign XML → Send to Hacienda → Wait → Accepted ✅ or Rejected ❌
```

### Prerequisites (what must exist BEFORE an invoice can be created)

| Prerequisite | Why | What happens if missing |
|-------------|-----|----------------------|
| Clinic business info (name, cédula, address) | Because this becomes the `<Emisor>` (issuer) block in the XML | XML builder fails — incomplete issuer data |
| Hacienda credentials (.p12 + ATV) | Because the XML must be digitally signed, and sending requires an OAuth token | Invoice saves locally but can't be signed or sent |
| At least one product with CABYS code | Because every `<LineaDetalle>` requires a 13-digit CABYS code | No line items = no invoice |
| A patient (for Factura Electrónica) | Because document type 01 requires a `<Receptor>` block | Validation fails for type 01. Type 04 (Tiquete) doesn't need one |

### Step-by-Step: The Invoice Creation Flow

#### Step 1: Validate the Request

**What happens:** The backend checks that all required data exists and is consistent.

**Why this step exists:** Because catching errors here (in 10ms) prevents a failed Hacienda submission later (which takes 3-5 seconds and leaves the user confused). Fail fast.

**Validations performed:**
- Document type must be one of: 01 (Factura), 02 (Nota Débito), 03 (Nota Crédito), 04 (Tiquete), 08 (Compra), 09 (Exportación)
- If document type is 01 (Factura), `patientId` is required
- Each `productId` must exist and be active
- At least one line item is required
- Sale condition must be valid (01-09, 99)
- If sale condition is 02 (Crédito), `creditTermDays` is required

**Expected outcome (success):** Validation passes silently, flow continues to Step 2.

**Expected outcome (failure):**
```json
{ "success": false, "statusCode": 400, "message": "Validation failed",
  "errors": [{ "field": "patientId", "message": "Patient is required for Factura Electrónica" }] }
```

#### Step 2: Look Up Patient Data → Build Receiver

**What happens:** The backend fetches the patient's full record and snapshots it into the invoice.

**Why we snapshot (copy) the data instead of referencing it:** Because Costa Rica tax law requires the invoice to reflect the patient's information **at the time of issuance**. If Carlos changes his email next week, the invoice from today must still show his old email. A reference (`patientId`) would show the updated data, which is legally incorrect.

**What the backend builds:**
```json
{
  "receiver": {
    "name": "RODRÍGUEZ MORA CARLOS",
    "identificationType": "01",
    "identificationNumber": "112340567",
    "email": "carlos@email.com",
    "phone": { "countryCode": "506", "number": "88881234" }
  }
}
```

**Expected outcome (success):** Receiver block is populated.

**Expected outcome (failure):**
```json
{ "success": false, "statusCode": 404, "message": "Patient not found" }
```

#### Step 3: Look Up Products → Build Line Items

**What happens:** For each item in the request, the backend fetches the product and calculates the line totals.

**Why we look up the product instead of trusting the frontend:** Because the price, tax rate, and CABYS code are stored in the product catalog. If the frontend sent a tampered price (e.g., changing ₡45,000 to ₡1), the invoice would be wrong. The backend always uses the canonical product data.

**Calculation per line:**
```
Line: "Consulta Dental General" × 1
  unitPrice:    ₡50,000.00
  subtotal:     ₡50,000.00  (quantity × unitPrice)
  discountTotal: ₡0.00      (sum of discounts)
  netTotal:     ₡50,000.00  (subtotal - discountTotal)
  taxAmount:    ₡6,500.00   (netTotal × 13 / 100)
  lineTotal:    ₡56,500.00  (netTotal + taxAmount)
```

#### Step 4: Calculate Invoice Summary

**What happens:** The backend categorizes all line totals into the four buckets Hacienda requires.

**Why four separate buckets:** Because Hacienda's XML schema requires these exact elements in `<ResumenFactura>`. Getting them wrong causes rejection. The four buckets are:

| Bucket | Condition | Example |
|--------|-----------|---------|
| `TotalServGravados` (Taxable Services) | type === 'service' AND tax.rate > 0 | A dental consultation with 13% IVA |
| `TotalServExentos` (Exempt Services) | type === 'service' AND tax.rate === 0 | A medical consultation exempt from tax |
| `TotalMercanciasGravadas` (Taxable Goods) | type === 'product' AND tax.rate > 0 | A toothbrush with 13% IVA |
| `TotalMercanciasExentas` (Exempt Goods) | type === 'product' AND tax.rate === 0 | A prescription medicine (exempt) |

**Example summary:**
```json
{
  "totalTaxableServices": 50000,
  "totalExemptServices": 0,
  "totalTaxableGoods": 0,
  "totalExemptGoods": 0,
  "totalTax": 6500,
  "totalDiscount": 0,
  "totalNetSale": 50000,
  "totalVoucher": 56500
}
```

#### Step 5: Validate Payment Totals

**What happens:** The backend checks that the sum of all payment method amounts equals `totalVoucher`.

**Why this validation exists:** Because in Costa Rica, the invoice must account for every colón. If the patient pays ₡30,000 by card and ₡26,500 in cash, that's ₡56,500 — matching the total. If the amounts don't match, the invoice is inconsistent and Hacienda will reject it.

**Why 0.01 tolerance:** Because floating-point math. `45000 × 0.13 = 5849.999999...` in some edge cases. A one-centavo tolerance prevents false rejections from rounding.

**Expected outcome (success):** Passes silently.

**Expected outcome (failure):**
```json
{ "success": false, "statusCode": 400,
  "message": "Payment total (99999) does not match invoice total (56500)" }
```

#### Step 6: Generate the Consecutivo (20 characters) & Clave (50 digits)

**What happens:** The backend generates two unique identifiers for this invoice.

**The Consecutivo** is a 20-character number that identifies this specific invoice within the clinic:
```
001   00001   01   0000000001
^^^   ^^^^^   ^^   ^^^^^^^^^^
HQ    Point   Doc  Sequential
      of Sale Type Number
```

**Why atomic $inc:** Because two invoices created simultaneously could get the same sequential number. MongoDB's `$inc` operator is atomic — it guarantees each request gets a unique number, even under concurrent load.

**The Clave** is a 50-digit unique key that identifies this invoice nationally:
```
506  04  04  26  003101123456  00100001010000000001  1  23456789
^^^  ^^  ^^  ^^  ^^^^^^^^^^^^  ^^^^^^^^^^^^^^^^^^^^  ^  ^^^^^^^^
CR   DD  MM  YY  Cédula(12)   Consecutivo(20)       S  Random(8)
```

**Why the 8-digit random security code:** Because it prevents key guessing. Even if someone knows a clinic's cédula and approximate invoice date, they can't predict the full clave.

**Expected outcome:** Two strings: `consecutivo = "00100001010000000001"`, `clave = "50604042600310112345600100001010000000001123456789"`

#### Step 7: Build the XML v4.4 Document

**What happens:** The backend uses `xmlbuilder2` to construct an XML document following Hacienda's v4.4 schema exactly.

**Why XML (not JSON):** Because Hacienda's API only accepts XML. This is defined by Costa Rica law (Resolución DGT-R-033-2019). The XML must follow a specific XSD schema with exact element names in Spanish.

**What the XML looks like (simplified):**
```xml
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica">
  <Clave>50604042600310112345600100001010000000001123456789</Clave>
  <NumeroConsecutivo>00100001010000000001</NumeroConsecutivo>
  <FechaEmision>2026-04-04T10:30:00.000Z</FechaEmision>
  <Emisor>
    <Nombre>Clínica Dental González S.A.</Nombre>
    <Identificacion><Tipo>02</Tipo><Numero>3101123456</Numero></Identificacion>
    ...
  </Emisor>
  <Receptor>
    <Nombre>RODRÍGUEZ MORA CARLOS</Nombre>
    <Identificacion><Tipo>01</Tipo><Numero>112340567</Numero></Identificacion>
    ...
  </Receptor>
  <DetalleServicio>
    <LineaDetalle>
      <CodigoCabys>8621001000100</CodigoCabys>
      <Cantidad>1.00000</Cantidad>
      <Detalle>Consulta Dental General</Detalle>
      <PrecioUnitario>50000.00000</PrecioUnitario>
      <Impuesto><Codigo>01</Codigo><Tarifa>13.00000</Tarifa><Monto>6500.00000</Monto></Impuesto>
      <MontoTotalLinea>56500.00000</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>
  <ResumenFactura>
    <TotalServGravados>50000.00000</TotalServGravados>
    <TotalImpuesto>6500.00000</TotalImpuesto>
    <TotalComprobante>56500.00000</TotalComprobante>
  </ResumenFactura>
</FacturaElectronica>
```

#### Step 8: Sign the XML with XAdES-EPES

**What happens:** The backend loads the clinic's .p12 certificate (decrypting the PIN from the database), extracts the private key and X.509 certificate, and creates a digital signature that's embedded inside the XML.

**Why XAdES-EPES specifically (not basic XML-DSig):** Because Hacienda mandates this specific signature format. XAdES adds signed properties (signing time, certificate digest) that Hacienda validates. A plain XML-DSig signature is rejected.

**Why this is the hardest part:** Common failures include:
- Wrong canonicalization method (must be Exclusive C14N)
- Missing certificate chain in KeyInfo
- Corrupted .p12 file
- Expired certificate (they're valid for 2 years)

**Expected outcome (success):** The XML now contains a `<ds:Signature>` element at the bottom, and the entire document is saved as Base64 in the invoice's `signedXml` field.

**Expected outcome (failure):**
```json
{ "success": false, "statusCode": 500,
  "message": "Could not extract private key from .p12 file" }
```

#### Step 9: Send to Hacienda's API

**What happens:** The backend obtains an OAuth token from Hacienda's IDP (or uses a cached one), then POSTs the signed document to the reception endpoint.

**The OAuth flow:**
```
POST https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
  grant_type=password
  client_id=api-stag
  username=cpf-02-3101-123456    (from stored credentials)
  password=atv-password           (decrypted from database)
→ Returns: { "access_token": "eyJ...", "expires_in": 300 }
```

**The submission:**
```
POST https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion
  Authorization: Bearer eyJ...
  Content-Type: application/json
  {
    "clave": "50604042600310112345600100001010000000001123456789",
    "fecha": "2026-04-04T10:30:00-06:00",
    "emisor": { "tipoIdentificacion": "02", "numeroIdentificacion": "3101123456" },
    "receptor": { "tipoIdentificacion": "01", "numeroIdentificacion": "112340567" },
    "comprobanteXml": "PD94bWwg..."  (Base64 of signed XML)
  }
```

**Expected outcome (success):** Hacienda returns `202 Accepted` — this means **received, not approved.** The invoice status changes from `pending` to `sent`.

**Expected outcome (failure):**
```
400 Bad Request — malformed document (wrong XML structure, missing fields)
401 Unauthorized — OAuth token expired or invalid
403 Forbidden — clinic not authorized for this environment
500 Internal Server Error — Hacienda is down (this happens)
```

#### Step 10: Wait for Hacienda's Response → Accepted or Rejected

**What happens:** Hacienda processes the document asynchronously. They respond in one of two ways:

**Way 1: Webhook callback (fast, 1-3 minutes)**
Hacienda POSTs to our callback URL:
```
POST /api/invoices/webhook
{ "clave": "506040426003...", "ind-estado": "aceptado", "respuesta-xml": "base64..." }
```
Our backend finds the invoice by `clave`, updates `haciendaStatus` to `accepted`, and stores the response.

**Way 2: Polling (fallback, if webhook fails)**
A cron job runs every 5 minutes, finds invoices with status `sent` that were sent more than 5 minutes ago, and calls:
```
GET https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1/recepcion/{clave}
→ Returns: { "ind-estado": "aceptado" | "rechazado", "respuesta-xml": "..." }
```

**Why both methods:** Because Hacienda's webhook is unreliable — it may fail if the server is down, the Heroku dyno is sleeping, or there's a network issue. Polling catches anything the webhook missed.

**Expected outcome (ACCEPTED):**
```json
GET /api/invoices/:id → 200
{ "haciendaStatus": "accepted", "haciendaResponse": { "ind-estado": "aceptado" } }
```
**What this means:** The invoice is legally valid. The government accepted it. The clinic can give the patient a receipt.

**Expected outcome (REJECTED):**
```json
GET /api/invoices/:id → 200
{ "haciendaStatus": "rejected", "haciendaResponse": {
  "ind-estado": "rechazado",
  "detailMessage": "El receptor no está registrado como contribuyente"
} }
```
**What this means:** Something was wrong. Common rejection reasons:

| Rejection Reason | Why It Happens | How to Fix |
|-----------------|----------------|-----------|
| "Receptor no registrado" | Patient's cédula doesn't exist in Hacienda's database | Verify the cédula with `/patients/:id/validate-hacienda` before invoicing |
| "Clave duplicada" | The 50-digit key was already used | This shouldn't happen (keys include random digits). If it does, it's a bug |
| "XML mal formado" | Missing required XML elements | Check that clinic settings are complete (address, cédula, etc.) |
| "Firma digital inválida" | .p12 certificate is expired or corrupted | Re-upload the .p12 in Settings → Hacienda |
| "Código CABYS inválido" | The 13-digit code doesn't exist | Update the product's CABYS code |
| "Totales no cuadran" | Summary totals don't match line item totals | This is a backend calculation bug — report it |

### What the Frontend Should Show During This Flow

```
[User clicks "Create & Send"]
  → Button shows spinner: "Creando factura..."     (Steps 1-6: ~200ms)
  → Button shows spinner: "Firmando XML..."        (Steps 7-8: ~500ms)
  → Button shows spinner: "Enviando a Hacienda..." (Step 9: ~1-3s)
  → Redirect to invoice detail page
  → Status badge: 🔵 "Enviada" (sent)

[Invoice detail page polls every 5 seconds]
  → GET /api/invoices/:id/status
  → After 1-3 minutes, status changes:
    → 🟢 "Aceptada" — show confetti/success animation
    → 🔴 "Rechazada" — show error message + "View Details" link

[If rejected, show actions:]
  → "Fix and Resend" — edit the issue and POST /api/invoices/:id/send
  → "Create Credit Note" — if partially wrong, issue a correction
```

### Credit Notes & Debit Notes

**Why credit notes exist:** Because mistakes happen. A patient was charged for a service they didn't receive, or the wrong price was applied. In Costa Rica, you can't "delete" an accepted invoice — it's a legal document. Instead, you issue a Nota de Crédito (credit note) that references the original invoice and reverses it.

**Why only accepted invoices can have credit notes:** Because if Hacienda rejected the original invoice, it doesn't exist in their system. Issuing a credit note for a non-existent document creates an orphan reference — Hacienda would reject the credit note too.

**Example:**
```
Original invoice #001 for ₡56,500 → Accepted by Hacienda ✅
Patient complains — service was incomplete
Staff creates credit note:
  POST /api/invoices/{invoice001_id}/credit-note
  { "referenceCode": "01", "reason": "Servicio no completado",
    "items": [{ "productId": "...", "quantity": 1 }], "sendToHacienda": true }
  → New invoice #002 with documentType "03" (Nota de Crédito)
  → References: [{ "documentType": "01", "clave": "506...(original clave)", "code": "01" }]
  → Sent to Hacienda → Accepted ✅ → Patient refunded
```

---

## App Layout & Navigation

### Recommended Layout Structure

```
┌──────────────────────────────────────────────────────────┐
│  [Clinic Logo]  Search...        🔔(3) Alerts  👤 User  │  ← Top bar (bell shows alert count)
├──────────┬───────────────────────────────────────────────┤
│          │                                               │
│  📊 Dashboard  │                                         │
│  📅 Schedule   │         Main Content Area               │
│  👥 Patients   │                                         │
│  📦 Products   │         (changes per page)              │
│  🧾 Invoices   │                                         │
│  💳 Payments   │                                         │
│  📈 Analytics  │                                         │
│  ⚙️ Settings   │                                         │
│          │                                               │
└──────────┴───────────────────────────────────────────────┘
     ↑ Sidebar (collapsible on mobile)
```

### Navigation Structure

```
/login                                ← Email/password + "Continue with Google"
/register                             ← Registration + "Continue with Google"
/auth/callback                        ← Google OAuth callback (receives token)
/dashboard                            ← Overview: schedule, alerts, analytics summary, quick actions
/schedule                             ← Today + tomorrow appointments with patient context
/schedule/:date                       ← Specific date schedule
/patients                             ← Patient list (with deactivate/reactivate controls)
/patients/new                         ← Create patient
/patients/:id                         ← Patient detail (medical record tab + consultations timeline)
/patients/:id/medical-record          ← View/edit medical record
/patients/:id/consultations/new       ← New consultation form
/patients/:id/consultations/:cid      ← Consultation detail
/products                             ← Product/service list (with deactivate controls)
/products/new                         ← Create product
/products/:id                         ← Product detail/edit
/invoices                             ← Invoice list (filter: active/archived, status)
/invoices/new                         ← Create invoice ⭐ (most used page)
/invoices/:id                         ← Invoice detail (delivery + payment status + archive)
/payments                             ← Pending payments list with reminder actions
/analytics                            ← Business analytics with time range selector
/settings                             ← Clinic settings + logo + Hacienda connection
/settings/form-templates              ← Form template management
/settings/form-templates/:id          ← Template builder
```

### Dashboard Page (`/dashboard`)

The first thing the user sees after login. It should answer: **"How is my clinic doing today?"**

| Widget | Content | API Endpoint | Why |
|--------|---------|-------------|-----|
| Today's Schedule | Today + tomorrow appointments with patient context, pending payments | `GET /api/schedule/today`, `GET /api/schedule/tomorrow` | The receptionist's first question: "Who's coming today?" |
| Alerts | Overdue payment alerts with severity badges + actions | `GET /api/alerts`, `GET /api/alerts/count` | Things that need immediate attention |
| Analytics Summary | Revenue, invoice count, new patients this period | `GET /api/analytics/summary?range=last30days` | Quick business pulse |
| Revenue Chart | Line chart: daily revenue trend | `GET /api/analytics/sales?range=last30days` | Visual trend |
| Pending Payments | Count + total overdue amount with "View All" link | `GET /api/payments/pending` | Money that needs collecting |
| Recent Invoices | Last 5 invoices with status badges + delivery icons | `GET /api/invoices?limit=5` | Quick access to recent work |
| Quick Actions | Big buttons: "New Invoice", "New Patient", "New Consultation" | — | Shortcut to most common tasks |

**If Google Calendar is not connected:** Replace the schedule widget with a "Connect Google Calendar" card.

**The alerts bell** in the top bar should poll `GET /api/alerts/count` every 60 seconds to keep the badge count fresh.

---

## Design System & Visual Guidelines

### Color Palette

| Purpose | Color | Why |
|---------|-------|-----|
| Primary | Deep Blue (#1E40AF) | Trust, professionalism — this is a medical + financial app |
| Secondary | Teal (#0D9488) | Health, freshness — contrasts with blue for CTAs |
| Success | Green (#16A34A) | Hacienda accepted, valid cédula, connected |
| Warning | Amber (#D97706) | Pending status, incomplete profile |
| Danger | Red (#DC2626) | Rejected invoice, invalid data, errors |
| Background | Light Gray (#F8FAFC) | Clean, easy on the eyes for all-day use |
| Surface | White (#FFFFFF) | Cards, forms, modals |
| Text Primary | Dark Gray (#1E293B) | High contrast for readability |
| Text Secondary | Medium Gray (#64748B) | Labels, helper text |

### Typography
- Use **Inter** or **Plus Jakarta Sans** — clean, modern, excellent for data-heavy interfaces
- Body text: 14px because the app shows lots of data (tables, forms)
- Headings: 18-24px, semibold
- Monospace for codes: CABYS codes, cédulas, invoice numbers — use `JetBrains Mono` or `Fira Code`

### Component Patterns

**Cards:** Use cards with subtle shadows for distinct sections (clinic info, Hacienda connection, invoice summary)

**Tables:** Use zebra-striping for long lists. Always include: sort by clicking column headers, row hover highlight, pagination at bottom

**Forms:** Use floating labels or top-aligned labels (not side-by-side — forms are used on mobile too). Group related fields with section headers.

**Status Badges:** Rounded pills with background color. Always include both color AND text (not just color — for accessibility).

**Toast Notifications:** Bottom-right, auto-dismiss after 5 seconds. Use for: "Invoice created", "Settings saved", "Connection successful".

**Loading States:** Skeleton loaders for pages, spinners for buttons. Never show a blank page while loading.

**Empty States:** When a table has no data, show an illustration + helpful message + CTA. Example: "No patients yet. Register your first patient to get started." with a "Add Patient" button.

---

## API Integration Reference

### Authentication
Every API call (except login/register) needs the JWT token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Response Format
All successful responses:
```json
{
  "success": true,
  "data": { ... }
}
```

All error responses:
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be a valid email" }
  ]
}
```

### Paginated Responses
List endpoints return:
```json
{
  "success": true,
  "data": {
    "data": [ ... ],
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### File Upload (Hacienda Link)
The `.p12` upload uses `multipart/form-data`, not JSON:
```
POST /api/clinic-settings/hacienda/link
Content-Type: multipart/form-data

atvUsername: cpf-01-1234-0567
atvPassword: secret
cryptoKeyP12: [file]
cryptoKeyPin: 1234
environment: staging
```

---

## Complete API Endpoint Reference (~87 endpoints)

### Health (1)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | App + DB status |

### Auth (7)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Create user + clinic |
| POST | `/api/auth/login` | No | Get JWT token |
| POST | `/api/auth/forgot-password` | No | Request password reset |
| POST | `/api/auth/reset-password` | No | Reset with token |
| GET | `/api/auth/profile` | Yes | Current user info |
| GET | `/api/auth/google` | No | Initiate Google OAuth redirect |
| GET | `/api/auth/google/callback` | No | Google callback → JWT → redirect to frontend |

### Clinic Settings (8)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/clinic-settings` | Yes | Get clinic config |
| PATCH | `/api/clinic-settings` | Yes | Update business info |
| POST | `/api/clinic-settings/logo` | Yes | Upload clinic logo (multipart, max 2MB) |
| GET | `/api/clinic-settings/logo` | Yes | Get logo image (binary with Content-Type) |
| DELETE | `/api/clinic-settings/logo` | Yes | Remove logo |
| POST | `/api/clinic-settings/hacienda/link` | Yes | Upload .p12 + credentials |
| POST | `/api/clinic-settings/hacienda/test` | Yes | Test Hacienda connection |
| POST | `/api/clinic-settings/hacienda/unlink` | Yes | Disconnect |

### Form Templates (6)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/form-templates` | Yes | Create template |
| GET | `/api/form-templates` | Yes | List templates |
| GET | `/api/form-templates/:id` | Yes | Get template |
| PATCH | `/api/form-templates/:id` | Yes | Update template |
| DELETE | `/api/form-templates/:id` | Yes | Soft-delete |
| PATCH | `/api/form-templates/:id/default` | Yes | Set as default |

### Patients (9)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients` | Yes | Create patient |
| GET | `/api/patients` | Yes | List (paginated) |
| GET | `/api/patients/search?q=` | Yes | Search by name/cédula/email |
| GET | `/api/patients/:id` | Yes | Get patient |
| PATCH | `/api/patients/:id` | Yes | Update patient |
| DELETE | `/api/patients/:id` | Yes | Soft-delete (blocked if has invoices) |
| PATCH | `/api/patients/:id/deactivate` | Yes | **Cascade deactivate patient + records** |
| PATCH | `/api/patients/:id/reactivate` | Yes | **Cascade reactivate patient + records** |
| GET | `/api/patients/:id/validate-hacienda` | Yes | Verify cédula |

### Medical Records (4)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients/:patientId/medical-record` | Yes | Create medical record |
| GET | `/api/patients/:patientId/medical-record` | Yes | Get medical record |
| PATCH | `/api/patients/:patientId/medical-record` | Yes | Update medical record |
| DELETE | `/api/patients/:patientId/medical-record` | Yes | **Soft-delete medical record** |

### Consultations (5)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/patients/:patientId/consultations` | Yes | Create consultation |
| GET | `/api/patients/:patientId/consultations` | Yes | List consultations (paginated) |
| GET | `/api/patients/:patientId/consultations/:id` | Yes | Get consultation |
| PATCH | `/api/patients/:patientId/consultations/:id` | Yes | Update consultation |
| DELETE | `/api/patients/:patientId/consultations/:id` | Yes | Soft-delete consultation |

### CABYS (2)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cabys/search?q=&top=10` | Yes | Search CABYS catalog |
| GET | `/api/cabys/:code` | Yes | Get by exact code |

### Products (6)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/products` | Yes | Create product |
| GET | `/api/products` | Yes | List (paginated) |
| GET | `/api/products/:id` | Yes | Get product |
| PATCH | `/api/products/:id` | Yes | Update product |
| DELETE | `/api/products/:id` | Yes | Soft-delete (blocked if used in invoices) |
| PATCH | `/api/products/:id/cabys` | Yes | Update CABYS code |

### Invoices (15)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/invoices` | Yes | Create invoice |
| GET | `/api/invoices` | Yes | List (paginated, filterable, excludes archived) |
| GET | `/api/invoices/:id` | Yes | Get invoice |
| PATCH | `/api/invoices/:id/notes` | Yes | **Update notes only (immutable otherwise)** |
| PATCH | `/api/invoices/:id/archive` | Yes | **Archive invoice (hide from list)** |
| PATCH | `/api/invoices/:id/unarchive` | Yes | **Unarchive invoice** |
| POST | `/api/invoices/:id/send` | Yes | Send/resend to Hacienda |
| GET | `/api/invoices/:id/status` | Yes | Check Hacienda status |
| GET | `/api/invoices/:id/xml` | Yes | Download signed XML |
| GET | `/api/invoices/:id/pdf` | Yes | Download invoice as PDF |
| POST | `/api/invoices/:id/send-email` | Yes | Send PDF via email |
| POST | `/api/invoices/:id/send-whatsapp` | Yes | Send summary via WhatsApp |
| POST | `/api/invoices/:id/credit-note` | Yes | Issue credit note |
| POST | `/api/invoices/:id/debit-note` | Yes | Issue debit note |
| POST | `/api/invoices/webhook` | No | Hacienda callback |

### Hacienda Utilities (3)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/hacienda/exchange-rate` | Yes | Current USD/EUR rates |
| GET | `/api/hacienda/taxpayer/:id` | Yes | Taxpayer lookup |
| GET | `/api/hacienda/exemption/:auth` | Yes | Tax exemption lookup |

### Google Calendar (4)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/calendar/events` | Yes | List Google Calendar events |
| POST | `/api/calendar/events` | Yes | Create calendar event |
| DELETE | `/api/calendar/events/:eventId` | Yes | Delete calendar event |
| GET | `/api/calendar/status` | Yes | Check if Google Calendar connected |

### Analytics (5)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/analytics/sales?range=last30days` | Yes | **Sales totals, daily breakdown, payment methods** |
| GET | `/api/analytics/patients?range=last30days` | Yes | **Patient counts, new vs returning** |
| GET | `/api/analytics/top-products?range=last30days&limit=10` | Yes | **Best-selling products** |
| GET | `/api/analytics/top-patients?range=last30days&limit=10` | Yes | **Most active patients** |
| GET | `/api/analytics/summary?range=last30days` | Yes | **Combined dashboard summary** |

### Schedule (3)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/schedule/today` | Yes | **Today's appointments with patient context** |
| GET | `/api/schedule/tomorrow` | Yes | **Tomorrow's appointments** |
| GET | `/api/schedule/date/:date` | Yes | **Specific date schedule (YYYY-MM-DD)** |

### Payments (4)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/payments/pending?page=1&limit=20` | Yes | **List overdue invoices with patient info** |
| POST | `/api/payments/:invoiceId/remind-email` | Yes | **Send payment reminder via email** |
| POST | `/api/payments/:invoiceId/remind-whatsapp` | Yes | **Send payment reminder via WhatsApp** |
| PATCH | `/api/payments/:invoiceId/mark-paid` | Yes | **Mark invoice as paid** |

### Alerts (5)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/alerts` | Yes | **List active alerts** |
| GET | `/api/alerts/count` | Yes | **Unread alert count (for bell badge)** |
| PATCH | `/api/alerts/:id/read` | Yes | **Mark alert as read** |
| PATCH | `/api/alerts/:id/dismiss` | Yes | **Dismiss alert** |
| DELETE | `/api/alerts/:id` | Yes | **Delete alert permanently** |

---

## Costa Rica-Specific UX Details

These details make the difference between a generic app and one that feels built for Costa Rica:

### Cédula Formatting
- **Cédula Física (01):** 9 digits, display as `1-1234-0567`
- **Cédula Jurídica (02):** 10 digits, display as `3-101-123456`
- **DIMEX (03):** 11-12 digits, display as-is
- **NITE (04):** 10 digits, display as-is

### Currency Formatting
- CRC (Colones): `₡45.000,00` — period for thousands, comma for decimals
- USD: `$45,000.00` — standard US format
- Always show the currency symbol

### Phone Numbers
- Always prefix with `+506` for Costa Rica
- Format: `8888-1234` (mobile) or `2223-4567` (landline)
- Mobile starts with 5, 6, 7, or 8. Landline starts with 2

### Province/Canton/District
Costa Rica's administrative division (used in addresses):
- 7 provinces: San José, Alajuela, Cartago, Heredia, Guanacaste, Puntarenas, Limón
- Each has cantons and districts — use cascading selects
- These codes go directly into invoices, so they must be correct

### Hacienda Status Language
- "Aceptada" (Accepted) — the government approved the invoice
- "Rechazada" (Rejected) — the government found an error
- "Procesando" (Processing) — still being reviewed
- "Enviada" (Sent) — submitted, waiting for response

---

## Priority Order for Building

Build these pages in this order (each depends on the previous):

1. **Login / Register + Google OAuth** — because nothing works without auth. Include "Continue with Google" button and `/auth/callback` page
2. **Dashboard** (skeleton) — landing page with quick actions, placeholder widgets
3. **Clinic Settings + Logo Upload** — Hacienda connection needed for invoices, logo needed for branding + PDFs
4. **Products** — because invoices reference products (simpler than patients)
5. **Patients** (with deactivate/reactivate) — because invoices reference patients. Handle delete-protection UX from the start
6. **Medical Records & Consultations** — doctor needs this on patient detail page. Allergy banner, consultation timeline
7. **Create Invoice** ⭐ — the core feature, most complex page
8. **Invoice List + Detail** — viewing, managing, archiving, and delivering invoices (PDF/email/WhatsApp). Include payment status section for credit invoices
9. **Pending Payments page** — overdue invoices list with reminder actions (email/WhatsApp)
10. **Alerts system** — notification bell in top bar, alert dropdown, read/dismiss actions. Poll count every 60s
11. **Google Calendar + Schedule page** — calendar view, today/tomorrow schedule with patient context + pending payment indicators
12. **Analytics page** — sales, patients, top products, top patients with time range selector and charts
13. **Dashboard** (fully wired) — connect all widgets: schedule, alerts, analytics summary, pending payments count, recent invoices
14. **Form Templates** — enhancement for patient customization
15. **Polish** — empty states, loading skeletons, error handling, mobile responsiveness, confirmation dialogs for delete/deactivate
