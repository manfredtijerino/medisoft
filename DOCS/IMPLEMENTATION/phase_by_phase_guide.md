# mollyClinic/DOCS/IMPLEMENTATION/phase_by_phase_guide.md

# ClinicCR — Phase-by-Phase Implementation Guide

> **Goal:** Build, test, and deploy every module incrementally — culminating in a fully working Hacienda electronic invoice integration, verified end-to-end via Postman.
>
> **Stack:** NestJS · MongoDB · Heroku
> **Version:** 1.0 — March 2026

---

## Main Objectives (Definition of Done)

Before any phase is considered complete, these global criteria apply:

1. Every endpoint in the phase has a working Postman request with example body/params.
2. All validation rules return clear error messages (400 responses with field-level detail).
3. Unit tests cover service-layer logic; e2e tests cover the HTTP layer.
4. No phase depends on code that hasn't been built yet — each phase is self-contained and runnable.

---

## Phase 0 — Project Scaffold & Core Infrastructure

### Why this phase exists

Every NestJS project needs a consistent foundation: folder structure, database connection, global pipes/filters/interceptors, and environment config. Skipping this causes inconsistent error formats, duplicated boilerplate, and config drift across modules later.

### What we build

| Item | Purpose |
|---|---|
| NestJS scaffold | `nest new clinic-cr-backend` base project |
| ConfigModule (global) | Centralized `.env` loading via `@nestjs/config` |
| MongooseModule (global) | Single MongoDB connection shared by all modules |
| Global exception filter | Uniform `{ success, message, errors, data }` error shape |
| Global response interceptor | Wraps all successful responses in `{ success: true, data }` |
| MongoId validation pipe | Rejects invalid ObjectId params before they hit the service |
| Pagination DTO | Reusable `page`, `limit`, `search` query params |
| Health-check endpoint | `GET /api/health` — confirms the app is alive and DB is connected |

### Step-by-step

#### Step 0.1 — Scaffold the project

```bash
npm i -g @nestjs/cli
nest new clinic-cr-backend
cd clinic-cr-backend
```

**Why:** The NestJS CLI generates the standard structure (`src/`, `test/`, `tsconfig.json`, `nest-cli.json`) so we don't reinvent it. It also wires up the initial `AppModule` and `main.ts`.

#### Step 0.2 — Install core dependencies

```bash
npm install @nestjs/config @nestjs/mongoose mongoose class-validator class-transformer
```

**Why:**
- `@nestjs/config` — loads `.env` variables and provides them via dependency injection instead of raw `process.env` calls scattered everywhere.
- `@nestjs/mongoose` — NestJS wrapper around Mongoose; gives us decorators (`@Schema`, `@Prop`) and module-level model registration.
- `class-validator` / `class-transformer` — DTO validation. A `POST /api/patients` with a missing `firstName` gets a `400` automatically, no manual `if` checks needed.

#### Step 0.3 — Create the `.env` file

```bash
# .env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/clinic-cr
DEFAULT_CLINIC_ID=665a1b2c3d4e5f6a7b8c9d0e
ENCRYPTION_KEY=a]3Fz9!kL@7mR#2pXwQ$5vBnYcT&8dGh
JWT_SECRET=your-jwt-secret-key-min-32-chars!!
JWT_EXPIRATION=1d
JWT_REFRESH_EXPIRATION=7d
```

**Why the `DEFAULT_CLINIC_ID`:** We have no auth module yet. Every request needs a `clinicId` to scope data. This env var lets us hardcode one for local testing. Later (Phase 1), this comes from the authenticated user's JWT token.

**Why `ENCRYPTION_KEY`:** Hacienda ATV passwords and `.p12` PINs are stored encrypted in MongoDB. This key drives AES-256 encryption at rest. Without it, credentials sit in plaintext — unacceptable even in dev.

**Why `JWT_SECRET`:** Used to sign and verify authentication tokens for the user/auth module we build in Phase 1.

#### Step 0.4 — Wire up global modules in `AppModule`

```typescript
// src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    // Feature modules will be added here phase by phase
  ],
})
export class AppModule {}
```

**Why `forRootAsync`:** The MongoDB URI comes from the environment. `forRootAsync` lets us inject `ConfigService` to read it at runtime instead of hardcoding it. This means the same code works locally (`mongodb://localhost`) and on Heroku (`mongodb+srv://...atlas...`) with zero changes.

#### Step 0.5 — Build global filters, interceptors, and pipes

**Global Exception Filter** (`src/common/filters/http-exception.filter.ts`):

```typescript
// Catches all HttpExceptions and returns:
// { success: false, statusCode: 400, message: "Validation failed", errors: [...] }
```

**Why:** Without this, NestJS returns different error shapes for different exception types. A `NotFoundException` returns `{ statusCode, message }` while a `ValidationPipe` error returns `{ statusCode, message, error }`. The filter normalizes everything so the frontend (or Postman tester) always knows what to expect.

**Global Response Interceptor** (`src/common/interceptors/response.interceptor.ts`):

```typescript
// Wraps all controller returns in:
// { success: true, data: <original return value> }
```

**Why:** Consistent API shape. The consumer never has to guess whether the response is the raw data or wrapped — it's always wrapped.

**MongoId Validation Pipe** (`src/common/pipes/mongo-id-validation.pipe.ts`):

```typescript
// Validates that a route param like :id is a valid MongoDB ObjectId
// Rejects with 400 "Invalid ID format" before the query even runs
```

**Why:** Without this, passing `GET /api/patients/not-an-id` causes a Mongoose `CastError` deep in the service layer. The pipe catches it at the controller boundary with a clear message.

#### Step 0.6 — Health-check endpoint

```typescript
// GET /api/health → { success: true, data: { status: "ok", db: "connected" } }
```

**Why:** Heroku pings this to confirm the dyno is alive. It also validates that the MongoDB connection is working. If this endpoint fails after deployment, you know the problem is infrastructure (DB URI, network) not application logic.

### Phase 0 — Objectives Checklist

- [ ] `nest new` project created and compiles with `npm run build`
- [ ] `.env` loaded; `ConfigService` injectable anywhere
- [ ] MongoDB connects on startup (visible in logs)
- [ ] `GET /api/health` returns `200 { success: true, data: { status: "ok" } }`
- [ ] Hitting an invalid route returns `404` in the standard error shape
- [ ] Passing a bad ObjectId as `:id` returns `400` with "Invalid ID format"

---

## Phase 1 — User Authentication & Clinic Profile

### Why this phase exists

The original architecture document deferred auth ("assume `clinicId` from headers"). But a real system needs user registration, login, password recovery, and a link between users and clinics. **Building this first** means every subsequent phase has a real `clinicId` coming from a JWT token — not a hardcoded env var. It also means we can test multi-tenancy from day one.

### What we build

| Item | Purpose |
|---|---|
| User schema | Stores credentials and profile data |
| Auth module | Register, login, forgot/reset password, JWT issuance |
| Clinic profile auto-creation | When a user registers, a default `ClinicSettings` document is created |
| JWT guard | Protects all subsequent endpoints; extracts `clinicId` from token |
| `@Clinic()` decorator | Param decorator that pulls `clinicId` from the authenticated request |

### MongoDB Schemas

#### User Schema

```typescript
// src/users/schemas/user.schema.ts
{
  _id:              ObjectId,
  firstName:        string,          // "María"
  lastName:         string,          // "González"
  email:            string,          // unique, lowercase, trimmed
  password:         string,          // bcrypt hashed — NEVER stored in plaintext
  clinicId:         ObjectId,        // FK to ClinicSettings — assigned at registration
  role:             string,          // "owner" | "admin" | "staff" (future use)
  isActive:         boolean,         // soft-delete / account suspension
  passwordResetToken:  string,       // hashed token for forgot-password flow
  passwordResetExpires: Date,        // token expiry (1 hour)
  lastLoginAt:      Date,
  createdAt:        Date,
  updatedAt:        Date
}
```

**Why `clinicId` on the User:** Every user belongs to one clinic. When they log in, the JWT payload includes `{ userId, clinicId, email }`. All subsequent API calls use `clinicId` to scope queries — patients, products, invoices are all filtered by it. This is the multi-tenancy key.

**Why `passwordResetToken` is hashed:** If the database is compromised, raw reset tokens would let an attacker take over any account. Hashing them with SHA-256 means the stored value is useless without the original token (which only the user received via email).

### Step-by-step

#### Step 1.1 — Install auth dependencies

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install -D @types/passport-jwt @types/bcrypt
```

**Why these specific packages:**
- `@nestjs/jwt` — signs and verifies JWT tokens. We issue an access token (short-lived, 1 day) and could add a refresh token later.
- `@nestjs/passport` + `passport-jwt` — integrates Passport's JWT strategy with NestJS guards. Any endpoint decorated with `@UseGuards(JwtAuthGuard)` automatically extracts and validates the token.
- `bcrypt` — industry-standard password hashing. It includes a salt automatically, so two users with the same password produce different hashes.

#### Step 1.2 — Create the Users module

```
src/users/
├── users.module.ts
├── users.service.ts
├── schemas/
│   └── user.schema.ts
└── dto/
    └── create-user.dto.ts
```

The `UsersService` handles:
- `findByEmail(email)` — used by login.
- `findById(id)` — used by JWT strategy to validate tokens.
- `create(dto)` — hashes password with bcrypt, creates user + clinic.
- `setResetToken(email)` — generates and stores a hashed reset token.
- `resetPassword(token, newPassword)` — validates token, updates password.

**Why a separate `UsersModule` from `AuthModule`:** Separation of concerns. `UsersModule` manages user CRUD and data access. `AuthModule` handles authentication logic (login, token issuance, password reset flow). This prevents circular dependencies when other modules need to look up users.

#### Step 1.3 — Create the Auth module

```
src/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   └── jwt-auth.guard.ts
├── decorators/
│   └── clinic.decorator.ts
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    ├── forgot-password.dto.ts
    └── reset-password.dto.ts
```

#### Step 1.4 — Registration endpoint

```
POST /api/auth/register
```

**Request body:**

```json
{
  "firstName": "María",
  "lastName": "González Ramírez",
  "email": "maria@clinicaejemplo.com",
  "password": "Secure@Pass123",
  "confirmPassword": "Secure@Pass123"
}
```

**Validation rules (in `register.dto.ts`):**

| Field | Rules | Why |
|---|---|---|
| `firstName` | Required, 2–50 chars | Prevents empty names and excessively long strings |
| `lastName` | Required, 2–50 chars | Same |
| `email` | Required, valid email, unique | Unique because email is the login identifier |
| `password` | Required, min 8 chars, must contain uppercase + lowercase + number + special char | Hacienda credentials will be stored under this account — weak passwords are a liability |
| `confirmPassword` | Must match `password` | Prevents typos that lock users out |

**What happens on the backend:**

1. Validate the DTO (class-validator handles this automatically via `ValidationPipe`).
2. Check if `email` already exists → if yes, return `409 Conflict`.
3. Hash `password` with bcrypt (10 salt rounds).
4. Create a new `ClinicSettings` document with sensible defaults (empty Hacienda config, `consecutives` starting at 0).
5. Create the `User` document with the new `clinicId`.
6. Return `201` with user profile (no password) and a JWT access token.

**Why we create ClinicSettings at registration:** The clinic profile is the tenant container. Every subsequent API call needs a `clinicId`. By creating it at registration, the user can immediately start adding patients, products, and later configure their Hacienda connection. Without this, there'd be a separate "create clinic" step that's easy to forget.

**Success response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "firstName": "María",
      "lastName": "González Ramírez",
      "email": "maria@clinicaejemplo.com",
      "clinicId": "665a1b2c3d4e5f6a7b8c9d0f"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Step 1.5 — Login endpoint

```
POST /api/auth/login
```

**Request body:**

```json
{
  "email": "maria@clinicaejemplo.com",
  "password": "Secure@Pass123"
}
```

**What happens:**

1. Find user by email → if not found, return `401 Unauthorized` (generic message: "Invalid credentials" — never reveal whether the email exists).
2. Compare provided password against stored bcrypt hash → if mismatch, `401`.
3. Check `isActive` → if `false`, `403 Forbidden "Account is deactivated"`.
4. Update `lastLoginAt`.
5. Sign and return a JWT with payload `{ sub: userId, clinicId, email }`.

**Why "Invalid credentials" for both wrong email and wrong password:** This prevents user enumeration attacks. If we said "Email not found" vs "Wrong password," an attacker could harvest valid emails by trying random addresses and observing the error message.

**Success response:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "665a1b2c3d4e5f6a7b8c9d0e",
      "firstName": "María",
      "lastName": "González Ramírez",
      "email": "maria@clinicaejemplo.com",
      "clinicId": "665a1b2c3d4e5f6a7b8c9d0f"
    }
  }
}
```

#### Step 1.6 — Forgot Password endpoint

```
POST /api/auth/forgot-password
```

**Request body:**

```json
{
  "email": "maria@clinicaejemplo.com"
}
```

**What happens:**

1. Find user by email.
2. If not found → **still return 200** with message "If this email exists, a reset link has been sent." (prevents enumeration).
3. If found → generate a random 32-byte hex token.
4. Hash the token with SHA-256 and store it as `passwordResetToken`.
5. Set `passwordResetExpires` to `now + 1 hour`.
6. In production, send the token via email. For now (no email service), **log the raw token to the console** so we can test via Postman.

**Why we hash the reset token before storing it:** The reset token is equivalent to a temporary password. If an attacker gains read access to the database (SQL injection, backup leak, etc.), raw tokens let them reset any account. Hashing them makes the stored value useless — the attacker would need the original token, which only went to the user's email.

**Why 1-hour expiry:** Balances usability (user has time to check email) with security (limits the attack window if a token is intercepted).

**Response (always the same, regardless of whether the email exists):**

```json
{
  "success": true,
  "data": {
    "message": "If an account with that email exists, a password reset link has been sent."
  }
}
```

#### Step 1.7 — Reset Password endpoint

```
POST /api/auth/reset-password
```

**Request body:**

```json
{
  "token": "a1b2c3d4e5f6...",
  "newPassword": "NewSecure@Pass456",
  "confirmNewPassword": "NewSecure@Pass456"
}
```

**What happens:**

1. Hash the incoming `token` with SHA-256.
2. Find a user where `passwordResetToken` matches the hash AND `passwordResetExpires > now`.
3. If not found → `400 "Invalid or expired reset token"`.
4. Hash `newPassword` with bcrypt.
5. Update user's `password`, clear `passwordResetToken` and `passwordResetExpires`.
6. Return `200` with success message.

**Why we clear the token after use:** A reset token should be single-use. If we didn't clear it, someone who intercepted the token could use it again within the 1-hour window even after the user already reset their password.

#### Step 1.8 — JWT Strategy & Guard

```typescript
// src/auth/strategies/jwt.strategy.ts
// Extracts JWT from Authorization: Bearer <token>
// Validates expiry
// Attaches { userId, clinicId, email } to request.user
```

```typescript
// src/auth/guards/jwt-auth.guard.ts
// Apply to any controller/route: @UseGuards(JwtAuthGuard)
// Returns 401 if token is missing, expired, or invalid
```

**Why Passport JWT strategy:** It handles token extraction (from `Authorization` header), signature verification (via `JWT_SECRET`), and expiry checking automatically. We just define what to do with the decoded payload (attach it to `request.user`).

#### Step 1.9 — @Clinic() Param Decorator

```typescript
// src/auth/decorators/clinic.decorator.ts
export const Clinic = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user.clinicId;
  },
);
```

**Usage in any controller:**

```typescript
@Get()
@UseGuards(JwtAuthGuard)
findAll(@Clinic() clinicId: string) {
  return this.patientsService.findAll(clinicId);
}
```

**Why a decorator instead of `req.user.clinicId` everywhere:** Cleaner code, single responsibility. If we later change where `clinicId` comes from (e.g., a header for admin impersonation), we update the decorator — not every controller.

#### Step 1.10 — Get User Profile endpoint

```
GET /api/auth/profile
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "665a1b2c3d4e5f6a7b8c9d0e",
    "firstName": "María",
    "lastName": "González Ramírez",
    "email": "maria@clinicaejemplo.com",
    "clinicId": "665a1b2c3d4e5f6a7b8c9d0f",
    "lastLoginAt": "2026-03-16T08:30:00Z",
    "createdAt": "2026-03-15T10:00:00Z"
  }
}
```

**Why:** Lets the client fetch the currently authenticated user's profile data after login. Also serves as a quick way to verify the JWT is valid.

### Auth Endpoints Summary

| # | Method | Endpoint | Auth Required | Description |
|---|---|---|---|---|
| 1 | `POST` | `/api/auth/register` | No | Create user + clinic |
| 2 | `POST` | `/api/auth/login` | No | Authenticate, get JWT |
| 3 | `POST` | `/api/auth/forgot-password` | No | Request password reset |
| 4 | `POST` | `/api/auth/reset-password` | No | Reset password with token |
| 5 | `GET` | `/api/auth/profile` | Yes | Get current user profile |

### Phase 1 — Objectives Checklist

- [ ] User can register with first name, last name, email, password, confirm password
- [ ] Registration creates both a User and a ClinicSettings document
- [ ] Duplicate email registration returns `409 Conflict`
- [ ] User can log in and receives a JWT
- [ ] Invalid credentials return `401` with a generic message (no email enumeration)
- [ ] JWT protects `GET /api/auth/profile` — returns `401` without token, `200` with valid token
- [ ] Forgot-password generates a token (logged to console for testing)
- [ ] Reset-password with valid token changes the password; user can login with new password
- [ ] Reset-password with expired/invalid token returns `400`
- [ ] Used reset token cannot be reused
- [ ] All passwords are bcrypt-hashed in the database (verify via MongoDB Compass)
- [ ] `@Clinic()` decorator correctly extracts `clinicId` from JWT on protected routes

---

## Phase 2 — Clinic Settings Module

### Why this phase exists

Before a clinic can create invoices, it needs a configured profile: business name, cédula, location, and Hacienda credentials. This module is the **tenant configuration layer** — everything else reads from it. Building it now means we have real clinic data for the patient and product modules.

### What we build

| Item | Purpose |
|---|---|
| ClinicSettings schema | One document per clinic — business info + Hacienda credentials + consecutives |
| CRUD endpoints | Get, update clinic settings |
| Hacienda link/unlink | Upload `.p12` key and ATV credentials |
| Hacienda test | Verify credentials by fetching an OAuth token |
| AES encryption helpers | Encrypt/decrypt ATV password and `.p12` PIN at rest |

### Step-by-step

#### Step 2.1 — Create the ClinicSettings module

```
src/clinic-settings/
├── clinic-settings.module.ts
├── clinic-settings.controller.ts
├── clinic-settings.service.ts
├── schemas/
│   └── clinic-settings.schema.ts
└── dto/
    └── update-clinic-settings.dto.ts
```

**Why a separate module (not part of Auth):** ClinicSettings has its own lifecycle — it's updated by the clinic owner to configure business details and Hacienda credentials. Auth handles identity; ClinicSettings handles tenant configuration. Keeping them separate means we can import `ClinicSettingsModule` into `HaciendaModule` and `InvoicesModule` without dragging in authentication logic.

#### Step 2.2 — Implement the schema

The schema matches section 3.1 of the main architecture doc. Key implementation detail:

```typescript
// The hacienda.atvPassword and hacienda.cryptoKeyPin fields
// are encrypted before save and decrypted on read using
// AES-256-CBC with the ENCRYPTION_KEY env var.
```

**Why AES-256-CBC:** If the MongoDB instance is compromised, encrypted fields are unreadable without the `ENCRYPTION_KEY`. We use CBC mode with a random IV per encryption — so encrypting the same password twice produces different ciphertext, defeating frequency analysis.

**Why not bcrypt for these:** Unlike user passwords (which we only need to *verify*), ATV passwords and PINs must be *sent* to Hacienda's API in plaintext. So we need reversible encryption (AES), not one-way hashing (bcrypt).

#### Step 2.3 — Encryption utility

```typescript
// src/common/utils/encryption.util.ts
export class EncryptionUtil {
  static encrypt(text: string, key: string): string { /* AES-256-CBC */ }
  static decrypt(encrypted: string, key: string): string { /* AES-256-CBC */ }
}
```

**Example:**

```typescript
const encrypted = EncryptionUtil.encrypt('myAtvPassword', process.env.ENCRYPTION_KEY);
// → "iv:ciphertext" format, e.g. "a1b2c3...:x9y8z7..."

const decrypted = EncryptionUtil.decrypt(encrypted, process.env.ENCRYPTION_KEY);
// → "myAtvPassword"
```

#### Step 2.4 — Hacienda link endpoint

```
POST /api/clinic-settings/hacienda/link
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

**Form fields:**

| Field | Type | Description |
|---|---|---|
| `atvUsername` | string | ATV portal username |
| `atvPassword` | string | ATV portal password (will be encrypted) |
| `cryptoKeyP12` | file | `.p12` certificate file (binary upload) |
| `cryptoKeyPin` | string | PIN for the `.p12` file (will be encrypted) |
| `environment` | string | `"staging"` or `"production"` |
| `callbackUrl` | string | Webhook URL for Hacienda responses |

**What happens:**

1. Validate all fields are present.
2. Read the `.p12` file as a `Buffer`.
3. Attempt to open the `.p12` with the provided PIN (using `node-forge`) → if it fails, return `400 "Invalid .p12 file or PIN"`.
4. Encrypt `atvPassword` and `cryptoKeyPin` with AES-256.
5. Store everything in the clinic's `hacienda` subdocument.
6. Set `isLinked: true`.

**Why we validate the `.p12` immediately:** Catching a wrong PIN now saves the user from discovering it when they try to send their first invoice — possibly under time pressure with a patient waiting.

#### Step 2.5 — Hacienda test connection endpoint

```
POST /api/clinic-settings/hacienda/test
Authorization: Bearer <token>
```

**What happens:**

1. Read the clinic's stored ATV credentials (decrypt password).
2. Call Hacienda's IDP token endpoint with `grant_type=password`.
3. If a token is returned → `200 { success: true, data: { message: "Connected", environment: "staging" } }`.
4. If it fails → `400 { message: "Hacienda authentication failed", error: <detail> }`.

**Why a dedicated test endpoint:** The OAuth call to Hacienda can fail for many reasons (wrong username format, wrong password, .p12 issues, Hacienda downtime). A test endpoint lets the user verify connectivity without creating a real invoice.

### Phase 2 — Endpoints Summary

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `GET` | `/api/clinic-settings` | Get current clinic configuration |
| 2 | `PATCH` | `/api/clinic-settings` | Update business info (name, location, etc.) |
| 3 | `POST` | `/api/clinic-settings/hacienda/link` | Upload .p12 + ATV credentials |
| 4 | `POST` | `/api/clinic-settings/hacienda/test` | Test Hacienda OAuth connection |
| 5 | `POST` | `/api/clinic-settings/hacienda/unlink` | Remove Hacienda credentials |

### Phase 2 — Objectives Checklist

- [ ] `GET /api/clinic-settings` returns the clinic config (created during registration in Phase 1)
- [ ] `PATCH /api/clinic-settings` updates business name, cédula, location, email, phone
- [ ] Hacienda link accepts a `.p12` file upload and stores it as binary in MongoDB
- [ ] ATV password and `.p12` PIN are encrypted in the database (verify raw document in Compass — fields are ciphertext, not plaintext)
- [ ] Invalid `.p12` or wrong PIN returns a clear `400` error during link
- [ ] Hacienda test endpoint successfully obtains an OAuth token from staging IDP
- [ ] Hacienda unlink clears all credentials and sets `isLinked: false`
- [ ] All endpoints require a valid JWT (`401` without it)

---

## Phase 3 — Patient Profiles (Dynamic Forms)

### Why this phase exists

Patients are the "who" in every invoice. Before we can generate a Factura Electrónica, we need a patient record with a valid cédula, identification type, and contact info. The dynamic-forms layer lets each clinic customize their intake forms without schema changes.

### What we build

| Item | Purpose |
|---|---|
| PatientFormTemplate schema + CRUD | Clinic defines custom fields (blood type, allergies, etc.) |
| Patient schema + CRUD | Patient records with core identity + dynamic `customFields` |
| Custom-field validation | Service validates `customFields` against the linked template |
| Search endpoint | Find patients by cédula, name, or email |
| Hacienda validation | Cross-check patient cédula against Hacienda's public API |

### Step-by-step

#### Step 3.1 — Form Template module

```
src/patients/
├── patients.module.ts
├── patients.controller.ts
├── patients.service.ts
├── form-templates.controller.ts
├── form-templates.service.ts
├── schemas/
│   ├── patient.schema.ts
│   └── patient-form-template.schema.ts
└── dto/
    ├── create-patient.dto.ts
    ├── update-patient.dto.ts
    ├── create-form-template.dto.ts
    └── update-form-template.dto.ts
```

**Why form templates live inside the `patients/` module (not a separate module):** Form templates are only meaningful in the context of patients. They don't stand alone. Co-locating them reduces module boilerplate and makes the dependency graph simpler. The `PatientsModule` exports nothing — it's a leaf module.

#### Step 3.2 — Form template validation logic

When a clinic creates a template, we validate the template itself:

```typescript
// Each field must have:
// - Unique fieldKey within the template (no duplicates)
// - fieldType from the allowed list: text, number, date, select, multiselect, boolean, textarea, email, phone
// - If fieldType is "select" or "multiselect", options array must be non-empty
// - order values must be unique (no two fields with the same display order)
```

**Why validate the template rigorously:** A broken template (e.g., a `select` field with no options) causes confusing errors later when a staff member tries to fill in a patient form. Catching it at template creation prevents downstream pain.

#### Step 3.3 — Patient custom-field validation

When creating/updating a patient with `customFields`, the service:

1. Fetches the `formTemplateId` from the database.
2. Checks every `required: true` field has a value in `customFields`.
3. Validates type compatibility:
   - `text` / `textarea` → value must be a string.
   - `number` → value must be a number.
   - `date` → value must be a valid ISO 8601 date string.
   - `select` → value must be one of `options`.
   - `multiselect` → value must be an array where every element is in `options`.
   - `boolean` → value must be `true` or `false`.
   - `email` → value must match email regex.
   - `phone` → value must be a string of digits (7–15 chars).
4. Applies `validationRegex` if the template field defines one.
5. Rejects any key in `customFields` that doesn't exist in the template.

**Example error response:**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Custom field validation failed",
  "errors": [
    { "field": "blood_type", "message": "Value 'X+' is not a valid option. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-" },
    { "field": "allergies", "message": "Field is required" }
  ]
}
```

**Why reject unknown keys:** Prevents data drift. If a clinic removes a field from their template but old API calls still send it, silently storing orphaned data creates confusion. Better to fail explicitly.

#### Step 3.4 — Patient search

```
GET /api/patients/search?q=112340567
```

Searches across `identificationNumber`, `firstName`, `lastName`, and `email` using a case-insensitive regex. Results are paginated.

**Why a dedicated search endpoint (vs query params on the list endpoint):** The search hits multiple fields with OR logic and may use text indexes. Separating it from the standard list (which uses AND filters) keeps both endpoints focused and easier to optimize.

#### Step 3.5 — Hacienda cédula validation

```
GET /api/patients/:id/validate-hacienda
```

Calls `https://api.hacienda.go.cr/fe/ae?identificacion=<cedula>` and returns:
- Taxpayer name, identification type, regime, economic activities.
- A comparison with the stored patient data (mismatches flagged).

**Why:** Prevents invoice rejections. If a patient's cédula doesn't match Hacienda's records, the invoice will be rejected. Better to catch this when registering the patient.

### Phase 3 — Endpoints Summary

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `POST` | `/api/form-templates` | Create form template |
| 2 | `GET` | `/api/form-templates` | List clinic's templates |
| 3 | `GET` | `/api/form-templates/:id` | Get single template |
| 4 | `PATCH` | `/api/form-templates/:id` | Update template |
| 5 | `DELETE` | `/api/form-templates/:id` | Soft-delete template |
| 6 | `PATCH` | `/api/form-templates/:id/default` | Set as default |
| 7 | `POST` | `/api/patients` | Create patient |
| 8 | `GET` | `/api/patients` | List patients (paginated) |
| 9 | `GET` | `/api/patients/:id` | Get patient |
| 10 | `PATCH` | `/api/patients/:id` | Update patient |
| 11 | `DELETE` | `/api/patients/:id` | Soft-delete |
| 12 | `GET` | `/api/patients/search` | Search by cédula/name/email |
| 13 | `GET` | `/api/patients/:id/validate-hacienda` | Validate cédula with Hacienda |

### Phase 3 — Objectives Checklist

- [ ] Clinic can create a form template with multiple field types
- [ ] Template validation rejects duplicate `fieldKey`s, `select` fields without options
- [ ] Setting a template as default un-defaults the previous default
- [ ] Patient creation validates `customFields` against the linked template
- [ ] Required custom fields trigger `400` when missing
- [ ] Type mismatches (e.g., string for a `number` field) are caught
- [ ] Unknown keys in `customFields` are rejected
- [ ] Patient search returns results across cédula, name, and email
- [ ] Hacienda cédula validation calls the real API and returns taxpayer info
- [ ] Soft-deleted patients are excluded from list/search but retrievable by direct ID
- [ ] All endpoints scoped by `clinicId` — clinic A cannot see clinic B's patients

---

## Phase 4 — Products & Services Catalog

### Why this phase exists

Products are the "what" in every invoice line item. Each line needs a CABYS code, price, tax configuration, and unit of measure. Building the catalog now means the invoice module can look up products by ID and auto-populate all required fields.

### What we build

| Item | Purpose |
|---|---|
| Product schema + CRUD | Products with CABYS codes, prices, taxes |
| CABYS search proxy | Proxies Hacienda's CABYS API with local caching |
| CABYS cache | MongoDB collection with 30-day TTL |

### Step-by-step

#### Step 4.1 — CABYS module

```
src/cabys/
├── cabys.module.ts
├── cabys.controller.ts
├── cabys.service.ts
└── schemas/
    └── cabys-cache.schema.ts
```

**Why build CABYS first (before products):** Products reference CABYS codes. When creating a product, the service validates that the provided `cabysCode` exists by querying the CABYS module. Building CABYS first means this validation works from day one.

#### Step 4.2 — CABYS caching strategy

```typescript
// cabys-cache.schema.ts
{
  _id:          ObjectId,
  code:         string,         // 13-digit CABYS code
  description:  string,         // "Servicios de consulta médica general"
  taxRate:      number,         // IVA rate associated with this code
  category:     string,         // Hierarchical category
  fetchedAt:    Date,           // When we fetched from Hacienda
  expiresAt:    Date            // TTL index — MongoDB auto-deletes after 30 days
}
```

**Why 30-day TTL:** CABYS codes change infrequently (last update: April 2025). Caching for 30 days reduces Hacienda API calls dramatically. The TTL index lets MongoDB auto-clean expired entries — no cron job needed.

**Why not cache forever:** Codes do get updated. A 30-day window ensures we pick up changes within a month without manual intervention.

#### Step 4.3 — CABYS search flow

```
GET /api/cabys/search?q=consulta medica&top=10
```

1. Check MongoDB cache for documents matching the query (text search).
2. If cache has enough results → return them.
3. If cache miss → call `https://api.hacienda.go.cr/fe/cabys?q=...&top=...`.
4. Store results in cache (upsert by code).
5. Return results.

**Why a proxy instead of direct Hacienda calls from the client:** Rate limits. Hacienda blocks your IP for 10 minutes if you exceed 20 req/sec. A server-side proxy with caching ensures we stay well under the limit, even if 50 clinic staff members search simultaneously.

#### Step 4.4 — Product CRUD

The product schema matches section 3.4 of the architecture doc. Key validation on creation:

```typescript
// create-product.dto.ts
{
  name:           IsString, IsNotEmpty,
  cabysCode:      IsString, Length(13, 13),    // Exactly 13 digits
  price:          IsNumber, Min(0),
  currency:       IsIn(['CRC', 'USD', 'EUR']),
  tax: {
    code:         IsString, IsIn(['01','02','03','04','05','06','07','08','12','99']),
    rateCode:     IsString,
    rate:         IsNumber, Min(0), Max(100)
  },
  unitOfMeasure:  IsIn(['Sp','Unid','m','kg','s','L','cm','Os']),
  type:           IsIn(['service', 'product'])
}
```

**Why validate `cabysCode` length:** Hacienda requires exactly 13 digits. A 12-digit code causes invoice rejection. Catching it at product creation prevents a frustrating debugging session during invoice submission.

#### Step 4.5 — CABYS code validation on product creation

When a product is created or its CABYS code is updated, the service:

1. Calls `CabysService.findByCode(cabysCode)`.
2. If the code doesn't exist in cache → fetches from Hacienda API.
3. If Hacienda returns no results → `400 "Invalid CABYS code: no match found"`.
4. If valid → auto-populates `cabysDescription` from the CABYS catalog.

**Why auto-populate the description:** Users shouldn't have to manually type "Servicios de consulta médica general" — it's error-prone and the canonical description already exists in the CABYS catalog.

### Phase 4 — Endpoints Summary

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `GET` | `/api/cabys/search` | Search CABYS by description |
| 2 | `GET` | `/api/cabys/:code` | Get CABYS by exact code |
| 3 | `POST` | `/api/products` | Create product |
| 4 | `GET` | `/api/products` | List products (paginated, filterable) |
| 5 | `GET` | `/api/products/:id` | Get single product |
| 6 | `PATCH` | `/api/products/:id` | Update product |
| 7 | `DELETE` | `/api/products/:id` | Soft-delete product |
| 8 | `PATCH` | `/api/products/:id/cabys` | Update CABYS code |

### Phase 4 — Objectives Checklist

- [ ] CABYS search returns results from Hacienda API
- [ ] CABYS results are cached in MongoDB with 30-day TTL
- [ ] Subsequent searches for the same term hit the cache (verify with logs)
- [ ] Product creation validates CABYS code against the catalog
- [ ] Invalid CABYS code returns `400`
- [ ] `cabysDescription` is auto-populated from the CABYS catalog
- [ ] Product CRUD works with proper validation (13-digit CABYS, valid tax codes, etc.)
- [ ] Soft-deleted products are excluded from listings
- [ ] All endpoints scoped by `clinicId`

---

## Phase 5 — Hacienda Integration Core

### Why this phase exists

This is the technical heart of the system. Before we can send invoices, we need four capabilities: OAuth token management, 50-digit key generation, XML document building, and XAdES-EPES digital signing. Each is complex enough to warrant its own service. Building them as an isolated module means we can unit-test each piece independently before wiring them into the invoice flow.

### What we build

| Item | Purpose |
|---|---|
| HaciendaService | OAuth token lifecycle (get, cache, refresh) |
| HaciendaKeyService | Generate the 50-digit Clave Numérica and 20-char Consecutivo |
| HaciendaXmlService | Build XML v4.4 documents from invoice data |
| Hacienda XML signing | XAdES-EPES signature using the clinic's `.p12` key |
| Constants files | Tax codes, document types, payment methods, sale conditions, ID types, discount codes |
| Hacienda callback controller | Webhook for Hacienda response processing |

### Step-by-step

#### Step 5.1 — Constants files

```
src/hacienda/constants/
├── tax-codes.ts          // { '01': 'Impuesto al Valor Agregado', ... }
├── document-types.ts     // { '01': 'Factura Electrónica', '04': 'Tiquete Electrónico', ... }
├── payment-methods.ts    // { '01': 'Efectivo', '02': 'Tarjeta', '07': 'SINPE Móvil', ... }
├── sale-conditions.ts    // { '01': 'Contado', '02': 'Crédito', ... }
├── id-types.ts           // { '01': 'Cédula Física', '02': 'Cédula Jurídica', ... }
└── discount-codes.ts     // 11 new v4.4 discount codes
```

**Why dedicated constant files:** These codes appear in XML generation, validation, and DTOs. Centralizing them means a code change (like Hacienda adding a new payment method) requires editing one file, not hunting through services, DTOs, and validators.

#### Step 5.2 — HaciendaKeyService

```typescript
// src/hacienda/hacienda-key.service.ts
generateClave(params: {
  date: Date,
  issuerCedula: string,
  consecutivo: string,
  situation: '1' | '2' | '3'
}): string
// Returns the 50-digit key per section 7.5 of the architecture doc

generateConsecutivo(params: {
  headquarters: string,     // "001"
  pointOfSale: string,      // "00001"
  documentType: string,     // "01"
  sequentialNumber: number  // auto-incremented
}): string
// Returns the 20-char consecutive per section 7.6
```

**Example output:**

```
Clave:        50616032600310199999900100001010000000001123456789
              ^^^ ^^ ^^ ^^ ^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^ ^ ^^^^^^^^
              506 16 03 26 003101999999 00100001010000000001  1 23456789
              CR  DD MM YY Cédula(12)   Consecutivo(20)      S Security
```

**Why the security code is random:** It prevents sequential key guessing. Even if an attacker knows a clinic's cédula and approximate invoice date, they can't predict the full key because the last 8 digits are random.

**Important implementation detail — atomic consecutives:**

```typescript
// Use MongoDB's $inc operator for atomicity:
const updated = await this.clinicSettingsModel.findOneAndUpdate(
  { clinicId },
  { $inc: { 'consecutives.lastInvoice': 1 } },
  { new: true }
);
const nextNumber = updated.consecutives.lastInvoice;
```

**Why `$inc` instead of read-then-increment:** Two concurrent invoice requests could read the same `lastInvoice` value, both increment to the same number, and produce duplicate consecutivos. `$inc` is atomic at the database level — MongoDB guarantees no two requests get the same number.

#### Step 5.3 — HaciendaXmlService

```typescript
// src/hacienda/hacienda-xml.service.ts
buildInvoiceXml(invoice: Invoice, clinicSettings: ClinicSettings): string
// Returns the unsigned XML string in v4.4 format

buildCreditNoteXml(invoice: Invoice, reference: Reference, clinicSettings: ClinicSettings): string
buildDebitNoteXml(invoice: Invoice, reference: Reference, clinicSettings: ClinicSettings): string
```

**Why `xmlbuilder2`:** It provides a fluent, type-safe API for building XML:

```typescript
const doc = create({ version: '1.0', encoding: 'utf-8' })
  .ele('FacturaElectronica', {
    xmlns: 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica',
  })
    .ele('Clave').txt(invoice.clave).up()
    .ele('CodigoActividad').txt(clinicSettings.economicActivityCode).up()
    .ele('NumeroConsecutivo').txt(invoice.consecutivo).up()
    .ele('FechaEmision').txt(formatDate(invoice.createdAt)).up()
    // ... etc
```

**Why we build XML in a dedicated service (not inline in the invoice service):** The XML structure is complex (~100+ elements for a full invoice). Isolating it makes it testable — we can unit-test XML generation with fixture data without needing a real database or Hacienda connection.

#### Step 5.4 — XML Signing (XAdES-EPES)

```typescript
// Within hacienda-xml.service.ts or a dedicated signing utility
signXml(xml: string, p12Buffer: Buffer, p12Pin: string): string
// Returns the signed XML with an enveloped <ds:Signature> element
```

**Process:**

1. Load the `.p12` file with `node-forge.pkcs12.pkcs12FromAsn1(p12Der, p12Pin)`.
2. Extract the private key and X.509 certificate chain.
3. Create an enveloped XAdES-EPES signature using `xadesjs` or `xml-crypto`.
4. The signature covers the entire document (canonicalized with Exclusive C14N).
5. Include the signing certificate in `<ds:KeyInfo>`.

**Why XAdES-EPES specifically:** Hacienda requires this specific signature format. A plain XML-DSig signature will be rejected. XAdES adds signed properties (signing time, certificate digest, signature policy) that Hacienda validates.

**This is the hardest part of the entire project.** Plan extra time here. Common pitfalls:
- Wrong canonicalization method (must be Exclusive C14N, not Inclusive).
- Missing `SignedProperties` reference in the signature.
- Incorrect namespace handling in the signed document.
- Certificate chain issues (intermediate certs missing from `.p12`).

#### Step 5.5 — HaciendaService (OAuth + Send + Status)

```typescript
// src/hacienda/hacienda.service.ts

// OAuth token management
async getToken(clinicId: string): Promise<string>
// Checks cached token → if expired, requests new one → caches it

// Send document
async sendDocument(clinicId: string, invoice: Invoice): Promise<void>
// POSTs signed XML (Base64) to Hacienda recepción API

// Check status
async checkStatus(clinicId: string, clave: string): Promise<HaciendaResponse>
// GETs /recepcion/{clave} and returns the current status
```

**Token caching strategy:**

```typescript
async getToken(clinicId: string): Promise<string> {
  const settings = await this.clinicSettingsService.findByClinicId(clinicId);

  // If token exists and won't expire in the next 60 seconds, reuse it
  if (settings.hacienda.cachedToken && settings.hacienda.tokenExpiresAt > new Date(Date.now() + 60000)) {
    return settings.hacienda.cachedToken;
  }

  // Otherwise, fetch a new token
  const token = await this.fetchNewToken(settings);
  await this.clinicSettingsService.updateToken(clinicId, token, expiresAt);
  return token.access_token;
}
```

**Why refresh 60 seconds early:** If we wait until exactly the 300-second mark, a slow network request could fail mid-flight because the token expired during transit. Refreshing 60 seconds early provides a safety buffer.

#### Step 5.6 — Hacienda callback controller

```typescript
// src/hacienda/hacienda-callback.controller.ts
@Post('webhook')
async handleCallback(@Body() body: HaciendaCallbackDto) {
  // 1. Extract clave from callback
  // 2. Find the invoice by clave
  // 3. Update haciendaStatus: accepted | rejected
  // 4. Store the response XML
  // 5. Return 200 to Hacienda (must respond quickly)
}
```

**Why respond quickly:** Hacienda has a timeout on callbacks. If our endpoint takes too long (e.g., doing heavy processing), Hacienda marks the delivery as failed and may retry. We accept the payload, acknowledge it with `200`, and process asynchronously if needed.

### Phase 5 — Objectives Checklist

- [ ] All Hacienda constant files are created and export typed objects
- [ ] `generateClave()` produces a valid 50-digit key (verify structure manually)
- [ ] `generateConsecutivo()` produces a valid 20-char string
- [ ] Consecutive numbers use `$inc` for atomicity (verify with concurrent test)
- [ ] `buildInvoiceXml()` produces valid XML matching the v4.4 XSD structure
- [ ] XML signing produces a document with a `<ds:Signature>` element
- [ ] Signed XML can be verified (round-trip test: sign → extract cert → verify signature)
- [ ] `getToken()` successfully authenticates against Hacienda staging IDP
- [ ] Token caching works — second call within 5 minutes reuses the cached token
- [ ] Token refresh works — call after expiry fetches a new token automatically
- [ ] Webhook endpoint accepts a simulated Hacienda callback and updates invoice status
- [ ] Unit tests cover key generation, consecutive generation, and XML building

---

## Phase 6 — Invoice Generator

### Why this phase exists

This is where everything converges. The invoice module orchestrates patients (receiver), products (line items), clinic settings (issuer + credentials), and the Hacienda module (key generation, XML, signing, sending). It's the final feature module and the most complex.

### What we build

| Item | Purpose |
|---|---|
| Invoice schema | Full Hacienda-compliant invoice document |
| Invoice creation flow | Validate → calculate → generate key → build XML → sign → send |
| Invoice CRUD + queries | List, filter, status check |
| Credit/debit notes | Reference an existing invoice |
| Polling job | Cron job to check status of stuck invoices |
| Exchange rate helper | Fetch USD/EUR rates from Hacienda for foreign-currency invoices |

### Step-by-step

#### Step 6.1 — Invoice creation flow (the 10-step process)

```
POST /api/invoices
```

**Request body:**

```json
{
  "documentType": "01",
  "patientId": "665a1b2c3d4e5f6a7b8c9d0e",
  "saleCondition": "01",
  "paymentMethods": [
    { "code": "02", "amount": 50850 }
  ],
  "items": [
    {
      "productId": "665b2c3d4e5f6a7b8c9d0f1a",
      "quantity": 1,
      "discounts": []
    }
  ],
  "currency": "CRC",
  "notes": "Paciente regular",
  "sendToHacienda": true
}
```

**What happens — step by step:**

**Step 1: Validate the request body** (DTO + custom validation)
- `documentType` must be one of `01, 02, 03, 04, 08, 09`.
- `patientId` must exist and be active.
- Each `productId` must exist and be active.
- `paymentMethods` total must equal the invoice total (validated after calculation).
- If `saleCondition` is `"02"` (credit), `creditTermDays` is required.

**Why validate before calculating:** If the patient or product doesn't exist, there's no point in running the full calculation pipeline. Fail fast.

**Step 2: Look up patient data** → populate the `receiver` block.

```typescript
const patient = await this.patientsService.findOne(clinicId, dto.patientId);
const receiver = {
  name: `${patient.firstName} ${patient.lastName}`.toUpperCase(),
  identificationType: patient.identificationType,
  identificationNumber: patient.identificationNumber,
  email: patient.email,
  phone: patient.phone,
};
```

**Why snapshot the patient data:** The patient might update their name or email later. The invoice must reflect the data at the time of issuance — tax law requires this.

**Step 3: Look up each product** → populate line items with CABYS code, price, tax.

```typescript
for (const item of dto.items) {
  const product = await this.productsService.findOne(clinicId, item.productId);
  lineItems.push({
    lineNumber: index + 1,
    productId: product._id,
    cabysCode: product.cabysCode,
    productCode: product.productCode,
    description: product.name,
    quantity: item.quantity,
    unitOfMeasure: product.unitOfMeasure,
    unitPrice: product.price,
    subtotal: product.price * item.quantity,
    // ... discounts, tax, lineTotal calculated below
  });
}
```

**Step 4: Calculate taxes and totals** for each line item.

```typescript
// For each line:
const subtotal = unitPrice * quantity;
const discountTotal = discounts.reduce((sum, d) => sum + d.amount, 0);
const netTotal = subtotal - discountTotal;
const taxAmount = netTotal * (tax.rate / 100);
const lineTotal = netTotal + taxAmount;
```

**Step 5: Calculate invoice summary totals.**

```typescript
const summary = {
  totalTaxableServices: /* sum of netTotal for taxable service lines */,
  totalExemptServices:  /* sum of netTotal for exempt service lines */,
  totalTaxableGoods:    /* sum of netTotal for taxable product lines */,
  totalExemptGoods:     /* sum of netTotal for exempt product lines */,
  totalTax:             /* sum of all taxAmount values */,
  totalDiscount:        /* sum of all discount amounts */,
  totalNetSale:         /* totalTaxable + totalExempt */,
  totalVoucher:         /* totalNetSale + totalTax (grand total) */,
};
```

**Why separate services vs goods, taxable vs exempt:** Hacienda's XML schema requires these four separate totals in the `<ResumenFactura>` section. Getting them wrong causes rejection.

**Step 6: Validate payment totals.**

```typescript
const paymentTotal = dto.paymentMethods.reduce((sum, pm) => sum + pm.amount, 0);
if (Math.abs(paymentTotal - summary.totalVoucher) > 0.01) {
  throw new BadRequestException(
    `Payment total (${paymentTotal}) does not match invoice total (${summary.totalVoucher})`
  );
}
```

**Why `0.01` tolerance:** Floating-point arithmetic. `45000 * 0.13 = 5849.999999...` in some cases. A one-centavo tolerance avoids false rejections from rounding differences.

**Step 7: Generate the Clave and Consecutivo.**

```typescript
const consecutivo = await this.haciendaKeyService.generateConsecutivo(clinicId, documentType);
const clave = this.haciendaKeyService.generateClave({
  date: new Date(),
  issuerCedula: clinicSettings.identificationNumber,
  consecutivo,
  situation: '1', // Normal
});
```

**Step 8: Build the XML v4.4 document.**

```typescript
const xml = this.haciendaXmlService.buildInvoiceXml(invoice, clinicSettings);
```

**Step 9: Sign the XML.**

```typescript
const p12Pin = EncryptionUtil.decrypt(clinicSettings.hacienda.cryptoKeyPin, encryptionKey);
const signedXml = this.haciendaXmlService.signXml(xml, clinicSettings.hacienda.cryptoKeyP12, p12Pin);
```

**Step 10: Send to Hacienda (if `sendToHacienda: true`).**

```typescript
if (dto.sendToHacienda) {
  await this.haciendaService.sendDocument(clinicId, savedInvoice);
  savedInvoice.haciendaStatus = 'sent';
  savedInvoice.sentAt = new Date();
  await savedInvoice.save();
}
```

#### Step 6.2 — Credit and debit notes

```
POST /api/invoices/:id/credit-note
```

```json
{
  "referenceCode": "01",
  "reason": "Paciente no recibió el servicio completo",
  "items": [
    {
      "productId": "665b2c3d4e5f6a7b8c9d0f1a",
      "quantity": 1,
      "discounts": []
    }
  ]
}
```

**What happens:**

1. Load the original invoice by `:id`.
2. Verify it's in `accepted` status (can't credit-note a rejected invoice).
3. Create a new invoice with `documentType: "03"` (Nota de Crédito).
4. Set `references` array with the original invoice's `documentType`, `clave`, `date`, and the `referenceCode` + `reason`.
5. Follow the same steps 3–10 from the invoice creation flow.

**Why reference codes matter:**
- `01` = Anula documento de referencia (full cancellation)
- `02` = Corrige texto del documento de referencia
- `04` = Referencia a otro documento
- `05` = Sustituye comprobante provisional
- `99` = Otros

**Why you can only credit-note an accepted invoice:** An invoice that Hacienda rejected doesn't exist in their system. Issuing a credit note for it would create an orphaned reference that Hacienda can't resolve — causing a second rejection.

#### Step 6.3 — Polling job for stuck invoices

```typescript
// src/invoices/invoices.service.ts
@Cron(CronExpression.EVERY_5_MINUTES)
async pollStuckInvoices() {
  const stuckInvoices = await this.invoiceModel.find({
    haciendaStatus: 'sent',
    sentAt: { $lt: new Date(Date.now() - 5 * 60 * 1000) }, // sent > 5 min ago
  });

  for (const invoice of stuckInvoices) {
    const status = await this.haciendaService.checkStatus(invoice.clinicId, invoice.clave);
    if (status.indEstado !== 'procesando') {
      invoice.haciendaStatus = status.indEstado; // 'aceptado' or 'rechazado'
      invoice.haciendaResponse = { ... };
      await invoice.save();
    }
  }
}
```

**Why polling as a fallback:** Hacienda's webhook callback is unreliable — it may fail if the server is down, the Heroku dyno is sleeping, or there's a network issue. Polling every 5 minutes catches any invoices whose callbacks were missed.

**Why 5-minute delay before polling:** Hacienda typically processes documents in 1–3 minutes. Polling immediately would waste API calls. Waiting 5 minutes gives Hacienda time to process and increases the chance the callback already arrived.

#### Step 6.4 — Exchange rate endpoint

```
GET /api/hacienda/exchange-rate
```

Returns current USD and EUR exchange rates from `https://api.hacienda.go.cr/indicadores/tc`.

**Why:** If a clinic bills in USD but Costa Rica's tax system is in CRC, the invoice must include the exchange rate. This endpoint lets the frontend display rates and the invoice service fetch them automatically.

### Phase 6 — Endpoints Summary

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `POST` | `/api/invoices` | Create invoice (+ optional send to Hacienda) |
| 2 | `GET` | `/api/invoices` | List invoices (paginated, filterable by status/date) |
| 3 | `GET` | `/api/invoices/:id` | Get invoice detail |
| 4 | `POST` | `/api/invoices/:id/send` | Send/resend to Hacienda |
| 5 | `GET` | `/api/invoices/:id/status` | Check Hacienda status |
| 6 | `GET` | `/api/invoices/:id/xml` | Download signed XML |
| 7 | `POST` | `/api/invoices/:id/credit-note` | Generate credit note |
| 8 | `POST` | `/api/invoices/:id/debit-note` | Generate debit note |
| 9 | `POST` | `/api/invoices/webhook` | Hacienda callback |
| 10 | `GET` | `/api/hacienda/exchange-rate` | Current exchange rates |
| 11 | `GET` | `/api/hacienda/taxpayer/:id` | Taxpayer lookup |
| 12 | `GET` | `/api/hacienda/exemption/:auth` | Tax exemption lookup |

### Phase 6 — Objectives Checklist

- [ ] Invoice creation calculates all line totals, taxes, and summary totals correctly
- [ ] Payment methods total must match invoice total (with floating-point tolerance)
- [ ] Clave is 50 digits; Consecutivo is 20 characters — both validated
- [ ] XML output matches Hacienda v4.4 structure (compare with XSD manually)
- [ ] Signed XML contains a valid `<ds:Signature>` element
- [ ] `sendToHacienda: true` successfully sends to the staging API and gets `202 Accepted`
- [ ] Invoice status changes from `pending` → `sent` → `accepted` (via webhook or polling)
- [ ] Credit note creation references the original invoice correctly
- [ ] Polling job picks up stuck invoices and updates their status
- [ ] Exchange rate endpoint returns current USD/EUR rates
- [ ] Taxpayer lookup returns data from Hacienda public API
- [ ] All endpoints scoped by `clinicId`

---

## Phase 7 — End-to-End Testing & Postman Collection

### Why this phase exists

Individual module tests prove each piece works in isolation. E2E tests prove the full flow works together — from registration to invoice acceptance by Hacienda. The Postman collection is the deliverable artifact that makes the API testable by anyone (QA team, client, future developers) without writing code.

### What we build

| Item | Purpose |
|---|---|
| Postman collection | All 43+ endpoints organized by module with example requests |
| E2E test scripts | Automated NestJS e2e tests covering the critical path |
| Hacienda staging test | Full invoice round-trip against the real staging API |

### Step-by-step

#### Step 7.1 — Postman collection structure

```
ClinicCR/
├── 00 - Health
│   └── GET Health Check
├── 01 - Auth
│   ├── POST Register
│   ├── POST Login
│   ├── POST Forgot Password
│   ├── POST Reset Password
│   └── GET Profile
├── 02 - Clinic Settings
│   ├── GET Clinic Settings
│   ├── PATCH Update Clinic Settings
│   ├── POST Link Hacienda
│   ├── POST Test Hacienda Connection
│   └── POST Unlink Hacienda
├── 03 - Form Templates
│   ├── POST Create Template
│   ├── GET List Templates
│   ├── GET Get Template
│   ├── PATCH Update Template
│   ├── DELETE Delete Template
│   └── PATCH Set Default
├── 04 - Patients
│   ├── POST Create Patient
│   ├── GET List Patients
│   ├── GET Get Patient
│   ├── PATCH Update Patient
│   ├── DELETE Delete Patient
│   ├── GET Search Patients
│   └── GET Validate Hacienda
├── 05 - CABYS
│   ├── GET Search CABYS
│   └── GET Get CABYS by Code
├── 06 - Products
│   ├── POST Create Product
│   ├── GET List Products
│   ├── GET Get Product
│   ├── PATCH Update Product
│   ├── DELETE Delete Product
│   └── PATCH Update CABYS Code
├── 07 - Invoices
│   ├── POST Create Invoice
│   ├── GET List Invoices
│   ├── GET Get Invoice
│   ├── POST Send to Hacienda
│   ├── GET Check Status
│   ├── GET Download XML
│   ├── POST Create Credit Note
│   ├── POST Create Debit Note
│   └── POST Webhook (simulate)
└── 08 - Hacienda Utilities
    ├── GET Exchange Rate
    ├── GET Taxpayer Lookup
    └── GET Tax Exemption Lookup
```

#### Step 7.2 — Postman variables

```json
{
  "baseUrl": "http://localhost:3000",
  "accessToken": "",
  "clinicId": "",
  "patientId": "",
  "productId": "",
  "invoiceId": "",
  "templateId": "",
  "resetToken": ""
}
```

**Why variables:** Endpoints reference IDs from previous requests. Using variables with Postman's "Tests" tab (auto-capture) means you can run the full collection in sequence without manually copy-pasting IDs.

**Example test script (in the Register request's Tests tab):**

```javascript
const response = pm.response.json();
pm.environment.set("accessToken", response.data.accessToken);
pm.environment.set("clinicId", response.data.user.clinicId);
```

#### Step 7.3 — The critical E2E test path

This is the golden path that proves the entire system works:

```
1. POST /api/auth/register              → Create user + clinic
2. POST /api/auth/login                 → Get JWT
3. PATCH /api/clinic-settings           → Set business name, cédula, location
4. POST /api/clinic-settings/hacienda/link → Upload .p12 + ATV credentials
5. POST /api/clinic-settings/hacienda/test → Verify Hacienda connection
6. POST /api/form-templates             → Create a dental intake form
7. POST /api/patients                   → Register a patient with custom fields
8. GET /api/cabys/search?q=dental       → Find the correct CABYS code
9. POST /api/products                   → Create a dental service product
10. POST /api/invoices                  → Create and send invoice to Hacienda staging
11. GET /api/invoices/:id/status        → Wait for "aceptado"
12. GET /api/invoices/:id/xml           → Download the signed XML
13. POST /api/invoices/:id/credit-note  → Issue a credit note
14. GET /api/invoices/:creditNoteId/status → Confirm credit note accepted
```

**If step 11 returns `"aceptado"`, the integration is working end-to-end.** This is the definitive test.

#### Step 7.4 — NestJS E2E tests

```typescript
// test/invoices.e2e-spec.ts
describe('Invoice E2E — Hacienda Staging', () => {
  it('should create, send, and get acceptance for an invoice', async () => {
    // 1. Register user
    const registerRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ firstName: 'Test', lastName: 'User', email: 'test@e2e.com', password: 'Test@1234', confirmPassword: 'Test@1234' });

    const token = registerRes.body.data.accessToken;

    // 2. Configure clinic settings + link Hacienda
    // 3. Create patient + product
    // 4. Create invoice with sendToHacienda: true
    // 5. Poll status until accepted (with timeout)
    // 6. Assert haciendaStatus === 'aceptado'
  });
});
```

### Phase 7 — Objectives Checklist

- [ ] Postman collection contains all 43+ endpoints with example request bodies
- [ ] Postman variables auto-capture IDs from responses
- [ ] Running the full Postman collection in sequence (with Postman Runner) passes all requests
- [ ] E2E test covers the full registration → invoice → acceptance flow
- [ ] An invoice sent to Hacienda staging receives `"aceptado"` status
- [ ] Credit note for an accepted invoice also receives `"aceptado"` status
- [ ] Webhook endpoint correctly processes a simulated Hacienda callback
- [ ] Polling job correctly updates status for invoices where the callback was missed
- [ ] Exchange rate endpoint returns live data
- [ ] Forgot-password → reset-password flow works end-to-end

---

## Phase 8 — Heroku Deployment

### Why this phase exists

The project runs locally. Now it needs to run on Heroku with MongoDB Atlas, real environment variables, and a publicly accessible callback URL for Hacienda's webhook.

### What we build

| Item | Purpose |
|---|---|
| Heroku app | Single dyno running `node dist/main.js` |
| MongoDB Atlas | Cloud database (free tier or M0 cluster) |
| Environment variables | All `.env` vars set via `heroku config:set` |
| Procfile | Tells Heroku how to start the app |
| Callback URL | Public URL for Hacienda webhook |

### Step-by-step

#### Step 8.1 — Prepare for Heroku

1. Ensure `Procfile` exists: `web: node dist/main.js`
2. Ensure `package.json` has `engines.node: "20.x"` and `heroku-postbuild: "npm run build"`.
3. Remove any hardcoded `localhost` references.
4. Ensure `main.ts` uses `process.env.PORT` (Heroku assigns it dynamically).

```typescript
// src/main.ts
const port = process.env.PORT || 3000;
await app.listen(port, '0.0.0.0');
```

**Why `'0.0.0.0'`:** Heroku requires the app to bind to `0.0.0.0`, not `127.0.0.1`. Without this, the dyno health check fails and Heroku restarts the app in a loop.

#### Step 8.2 — MongoDB Atlas setup

1. Create a free M0 cluster on `cloud.mongodb.com`.
2. Create a database user with read/write access.
3. Whitelist `0.0.0.0/0` (allows connections from any IP — required because Heroku dynos have dynamic IPs).
4. Get the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/clinic-cr`.
5. Set it as `MONGODB_URI` in Heroku config.

**Why Atlas instead of Heroku add-on:** Heroku's mLab add-on was deprecated. Atlas is the official MongoDB cloud offering. The free M0 tier provides 512MB — plenty for development and initial production.

#### Step 8.3 — Deploy

```bash
heroku create clinic-cr-backend
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="mongodb+srv://..."
heroku config:set ENCRYPTION_KEY="..."
heroku config:set JWT_SECRET="..."
heroku config:set JWT_EXPIRATION="1d"
# ... set all other env vars
git push heroku main
```

#### Step 8.4 — Verify deployment

```bash
curl https://clinic-cr-backend.herokuapp.com/api/health
# → { "success": true, "data": { "status": "ok", "db": "connected" } }
```

#### Step 8.5 — Update Hacienda callback URL

After deployment, update the clinic's `callbackUrl` to point to the Heroku app:

```
PATCH /api/clinic-settings
{
  "hacienda": {
    "callbackUrl": "https://clinic-cr-backend.herokuapp.com/api/invoices/webhook"
  }
}
```

#### Step 8.6 — Production smoke test

Run the critical path (Phase 7, Step 7.3) against the deployed Heroku URL. If step 11 returns `"aceptado"`, the deployment is working.

### Phase 8 — Objectives Checklist

- [ ] Heroku app is live and `GET /api/health` returns `200`
- [ ] MongoDB Atlas is connected (visible in Heroku logs)
- [ ] All environment variables are set
- [ ] Registration, login, and JWT flow work on Heroku
- [ ] `.p12` upload works on Heroku (multipart/form-data)
- [ ] Invoice sent from Heroku to Hacienda staging receives `202 Accepted`
- [ ] Hacienda callback hits the Heroku webhook and updates invoice status
- [ ] Polling job runs on schedule (visible in Heroku logs)
- [ ] No hardcoded `localhost` references remain

---

## Phase Summary Table

| Phase | Name | Depends On | Key Deliverable |
|---|---|---|---|
| 0 | Project Scaffold | — | `GET /api/health` returns 200 |
| 1 | Auth & User Profile | Phase 0 | Register, login, JWT, forgot/reset password |
| 2 | Clinic Settings | Phase 1 | Clinic profile + Hacienda credential storage |
| 3 | Patient Profiles | Phase 2 | Dynamic form templates + patient CRUD |
| 4 | Products & CABYS | Phase 2 | Product catalog + CABYS search proxy |
| 5 | Hacienda Core | Phase 2 | OAuth, key gen, XML build, XAdES signing |
| 6 | Invoice Generator | Phases 3, 4, 5 | Full invoice lifecycle + Hacienda submission |
| 7 | E2E Testing | Phase 6 | Postman collection + staging acceptance test |
| 8 | Heroku Deployment | Phase 7 | Live URL + production smoke test |

> **Phases 3, 4, and 5 can be developed in parallel** since they don't depend on each other — only on Phase 2. This is the optimal path if multiple developers are available.

---

## Total Endpoint Count: 43

| Module | Endpoints |
|---|---|
| Health | 1 |
| Auth | 5 |
| Clinic Settings | 5 |
| Form Templates | 6 |
| Patients | 7 |
| CABYS | 2 |
| Products | 6 |
| Invoices | 9 |
| Hacienda Utilities | 3 |
| **Total** | **44** |
