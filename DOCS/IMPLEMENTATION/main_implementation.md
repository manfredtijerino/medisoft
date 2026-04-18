# mollyClinic/DOCS/IMPLEMENTATION/main_implementation.md

# ClinicCR — Backend Research & Architecture Document

> **SaaS for Clinics in Costa Rica**
> Patient Management · Product Catalog · Invoice Generation with Hacienda Integration
>
> **Stack:** NestJS · MongoDB · Heroku
> **Version:** 1.0 — March 2026

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Project Folder Structure](#2-project-folder-structure)
3. [MongoDB Schema Design](#3-mongodb-schema-design)
4. [Module 1 — Patient Profiles (Dynamic Forms)](#4-module-1--patient-profiles-dynamic-forms)
5. [Module 2 — Products & Services Catalog](#5-module-2--products--services-catalog)
6. [Module 3 — Invoice Generator & Hacienda Integration](#6-module-3--invoice-generator--hacienda-integration)
7. [Hacienda Costa Rica — Technical Deep Dive](#7-hacienda-costa-rica--technical-deep-dive)
8. [API Endpoints Summary (Postman Collection)](#8-api-endpoints-summary-postman-collection)
9. [Environment Variables](#9-environment-variables)
10. [Heroku Deployment Notes](#10-heroku-deployment-notes)
11. [Dependencies](#11-dependencies)
12. [References & Official Sources](#12-references--official-sources)

---

## 1. Project Overview

ClinicCR is a multi-tenant SaaS backend for clinics in Costa Rica. Each clinic (tenant) can:

- Manage **patient profiles** with fully customizable form fields.
- Maintain a **product/service catalog** with custom attributes, prices, and CABYS codes.
- Generate **electronic invoices** (Factura Electrónica) that are digitally signed and submitted automatically to the Ministerio de Hacienda via their official API.

### Key Constraints

- **No frontend** — backend only, testable via Postman.
- **No auth module** — assume a `clinicId` and `userId` are available from headers/middleware (can be hardcoded for local testing).
- **MongoDB** — all data stored in MongoDB (Atlas or local).
- **Heroku** — deployed as a single Heroku dyno with environment variables.
- **Hacienda v4.4** — mandatory since September 1, 2025 (the only version Hacienda now accepts).

---

## 2. Project Folder Structure

```
clinic-cr-backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   └── clinic.decorator.ts          # @Clinic() param decorator
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── response.interceptor.ts       # Standard API response wrapper
│   │   ├── pipes/
│   │   │   └── mongo-id-validation.pipe.ts
│   │   ├── dto/
│   │   │   └── pagination.dto.ts
│   │   └── interfaces/
│   │       └── api-response.interface.ts
│   │
│   ├── config/
│   │   ├── config.module.ts
│   │   ├── database.config.ts                # Mongoose connection config
│   │   ├── hacienda.config.ts                # Hacienda API URLs & credentials
│   │   └── app.config.ts                     # PORT, NODE_ENV, etc.
│   │
│   ├── patients/
│   │   ├── patients.module.ts
│   │   ├── patients.controller.ts
│   │   ├── patients.service.ts
│   │   ├── schemas/
│   │   │   ├── patient.schema.ts
│   │   │   └── patient-form-template.schema.ts
│   │   └── dto/
│   │       ├── create-patient.dto.ts
│   │       ├── update-patient.dto.ts
│   │       ├── create-form-template.dto.ts
│   │       └── update-form-template.dto.ts
│   │
│   ├── products/
│   │   ├── products.module.ts
│   │   ├── products.controller.ts
│   │   ├── products.service.ts
│   │   ├── schemas/
│   │   │   └── product.schema.ts
│   │   └── dto/
│   │       ├── create-product.dto.ts
│   │       └── update-product.dto.ts
│   │
│   ├── invoices/
│   │   ├── invoices.module.ts
│   │   ├── invoices.controller.ts
│   │   ├── invoices.service.ts
│   │   ├── schemas/
│   │   │   └── invoice.schema.ts
│   │   └── dto/
│   │       ├── create-invoice.dto.ts
│   │       └── query-invoice.dto.ts
│   │
│   ├── hacienda/
│   │   ├── hacienda.module.ts
│   │   ├── hacienda.service.ts               # OAuth token + send XML + check status
│   │   ├── hacienda-xml.service.ts           # Builds XML v4.4, signs it
│   │   ├── hacienda-key.service.ts           # 50-digit key generator
│   │   ├── hacienda-callback.controller.ts   # Webhook for Hacienda responses
│   │   ├── interfaces/
│   │   │   ├── hacienda-token.interface.ts
│   │   │   ├── hacienda-response.interface.ts
│   │   │   └── hacienda-document.interface.ts
│   │   └── constants/
│   │       ├── tax-codes.ts                  # IVA codes (01-08, 12, 99)
│   │       ├── document-types.ts             # 01=FE, 02=ND, 03=NC, 04=TE, 08=FEC, 09=FEE
│   │       ├── payment-methods.ts            # 01-06 + SINPE Móvil, PayPal
│   │       ├── sale-conditions.ts            # 01-15
│   │       ├── id-types.ts                   # 01=Física, 02=Jurídica, 03=DIMEX, 04=NITE
│   │       └── discount-codes.ts             # 11 new v4.4 discount codes
│   │
│   ├── cabys/
│   │   ├── cabys.module.ts
│   │   ├── cabys.service.ts                  # Proxy to Hacienda CABYS API + local cache
│   │   ├── cabys.controller.ts
│   │   └── schemas/
│   │       └── cabys-cache.schema.ts
│   │
│   └── clinic-settings/
│       ├── clinic-settings.module.ts
│       ├── clinic-settings.controller.ts
│       ├── clinic-settings.service.ts
│       ├── schemas/
│       │   └── clinic-settings.schema.ts     # Hacienda credentials, clinic info
│       └── dto/
│           └── update-clinic-settings.dto.ts
│
├── test/
│   ├── patients.e2e-spec.ts
│   ├── products.e2e-spec.ts
│   └── invoices.e2e-spec.ts
│
├── postman/
│   └── ClinicCR.postman_collection.json
│
├── .env.example
├── .env
├── Procfile                                   # Heroku Procfile
├── package.json
├── tsconfig.json
├── nest-cli.json
└── README.md
```

### Module Dependency Graph

```
AppModule
├── ConfigModule (global)
├── MongooseModule (global)
├── PatientsModule
├── ProductsModule
├── CabysModule
├── ClinicSettingsModule
├── HaciendaModule ──→ depends on ClinicSettingsModule, CabysModule
└── InvoicesModule ──→ depends on HaciendaModule, ProductsModule, PatientsModule
```

---

## 3. MongoDB Schema Design

### 3.1 Clinic Settings (one document per clinic)

```typescript
// clinic-settings.schema.ts
{
  clinicId:              ObjectId,        // FK to user/account
  businessName:          string,          // Razón social
  commercialName:        string,          // Nombre comercial (optional)
  identificationType:    string,          // "01"=Física, "02"=Jurídica, "03"=DIMEX, "04"=NITE
  identificationNumber:  string,          // Cédula: 9-12 digits
  economicActivityCode:  string,          // CIIU code
  email:                 string,
  phone:                 { countryCode: string, number: string },
  location: {
    province:    string,                  // 1 digit
    canton:      string,                  // 2 digits
    district:    string,                  // 2 digits
    neighborhood: string,                 // optional
    otherSigns:  string                   // Otras señas (address detail)
  },

  // ── Hacienda credentials ──
  hacienda: {
    atvUsername:          string,          // ATV user
    atvPassword:          string,          // ATV password (encrypted at rest)
    cryptoKeyP12:         Buffer,          // .p12 file binary
    cryptoKeyPin:         string,          // PIN for .p12 (encrypted at rest)
    environment:          string,          // "staging" | "production"
    callbackUrl:          string,          // Your webhook URL for Hacienda responses
    isLinked:             boolean,         // Whether sync is active
    lastTokenAt:          Date,
    cachedToken:          string,          // Current OAuth token
    tokenExpiresAt:       Date
  },

  // ── Invoice numbering ──
  consecutives: {
    headquarters:  string,                // "001" for casa matriz
    pointOfSale:   string,                // "00001" default
    lastInvoice:   number,                // Auto-incremented
    lastCreditNote: number,
    lastDebitNote: number,
    lastTicket:    number,
    lastPurchaseInvoice: number,
    lastExportInvoice: number,
    lastPaymentReceipt: number            // NEW in v4.4 (REP)
  },

  currency:    string,                    // Default: "CRC"
  createdAt:   Date,
  updatedAt:   Date
}
```

### 3.2 Patient Form Template (dynamic field definitions)

```typescript
// patient-form-template.schema.ts
{
  _id:        ObjectId,
  clinicId:   ObjectId,
  name:       string,                     // "General Intake Form"
  fields: [
    {
      fieldKey:      string,              // "blood_type", "allergies", etc.
      label:         string,              // "Blood Type"
      fieldType:     string,              // "text" | "number" | "date" | "select" | "multiselect" | "boolean" | "textarea" | "email" | "phone"
      required:      boolean,
      defaultValue:  Mixed,               // Optional default
      options:       [string],            // For select/multiselect
      order:         number,              // Display order
      section:       string,              // "Personal Info", "Medical History", etc.
      validationRegex: string             // Optional regex validation
    }
  ],
  isDefault:   boolean,                   // Only one default per clinic
  isActive:    boolean,
  createdAt:   Date,
  updatedAt:   Date
}
```

### 3.3 Patient

```typescript
// patient.schema.ts
{
  _id:              ObjectId,
  clinicId:         ObjectId,

  // ── Core identity (always present) ──
  firstName:        string,
  lastName:         string,
  identificationType: string,             // "01"=Física, "02"=Jurídica, "03"=DIMEX, "04"=NITE, "05"=Extranjero
  identificationNumber: string,           // Cédula / DIMEX / passport
  email:            string,
  phone:            string,

  // ── Dynamic fields (populated based on clinic's form template) ──
  formTemplateId:   ObjectId,             // Which template was used
  customFields: {
    [fieldKey: string]: Mixed             // e.g. { "blood_type": "O+", "allergies": ["penicillin"], ... }
  },

  // ── Billing defaults ──
  defaultPaymentMethod: string,           // "01"=Efectivo, "02"=Tarjeta, etc.
  taxExemption: {
    isExempt:        boolean,
    authorizationNumber: string,          // "AL-XXXXXXXX-XX"
    institution:     string,
    percentage:      number
  },

  notes:          string,
  isActive:       boolean,
  createdAt:      Date,
  updatedAt:      Date
}
```

### 3.4 Product / Service

```typescript
// product.schema.ts
{
  _id:              ObjectId,
  clinicId:         ObjectId,

  name:             string,               // "Consulta General", "Limpieza Dental"
  description:      string,
  productCode:      string,               // Internal clinic code
  cabysCode:        string,               // 13-digit CABYS code (MANDATORY)
  cabysDescription: string,               // Cached description from CABYS catalog

  price:            number,               // Base price
  currency:         string,               // "CRC" | "USD" | "EUR"

  // ── Tax configuration ──
  tax: {
    code:           string,               // "01"=IVA, "02"=ISC, etc.
    rateCode:       string,               // "08"=Tarifa general 13%
    rate:           number                // 13.00
  },

  unitOfMeasure:    string,               // "Sp"=Servicio profesional, "Unid"=Unidad, "Os"=Otro
  type:             string,               // "service" | "product"
  isActive:         boolean,

  // ── Custom fields (clinic-defined) ──
  customFields: {
    [key: string]: Mixed                  // e.g. { "brand": "Colgate", "duration_minutes": 30 }
  },

  createdAt:        Date,
  updatedAt:        Date
}
```

### 3.5 Invoice

```typescript
// invoice.schema.ts
{
  _id:                 ObjectId,
  clinicId:            ObjectId,

  // ── Hacienda identifiers ──
  clave:               string,            // 50-digit unique key
  consecutivo:         string,            // 20-char consecutive number
  documentType:        string,            // "01"=FE, "04"=TE, "08"=FEC, "09"=FEE

  // ── Parties ──
  issuer: {
    name:              string,
    identificationType: string,
    identificationNumber: string,
    commercialName:    string,
    email:             string,
    phone:             { countryCode: string, number: string },
    location:          { province, canton, district, neighborhood, otherSigns },
    economicActivityCode: string
  },
  receiver: {                             // Patient data at time of invoice
    name:              string,
    identificationType: string,
    identificationNumber: string,
    email:             string,
    phone:             string
  },

  // ── Sale conditions ──
  saleCondition:       string,            // "01"=Contado, "02"=Crédito, etc.
  creditTermDays:      number,            // If credit, expressed in days (v4.4)
  paymentMethods: [{
    code:              string,            // "01"=Efectivo, "02"=Tarjeta, "04"=Transferencia, "07"=SINPE Móvil, "08"=Plataforma digital
    amount:            number
  }],

  // ── Line items ──
  items: [{
    lineNumber:        number,
    productId:         ObjectId,
    cabysCode:         string,            // 13-digit CABYS code
    productCode:       string,
    description:       string,
    quantity:          number,
    unitOfMeasure:     string,
    unitPrice:         number,
    subtotal:          number,            // quantity * unitPrice
    discounts: [{
      description:     string,
      amount:          number,
      discountCode:    string             // NEW v4.4: 11 specific discount codes
    }],
    netTotal:          number,            // subtotal - discounts
    tax: {
      code:            string,
      rateCode:        string,
      rate:            number,
      amount:          number,            // netTotal * (rate / 100)
      exonerationDoc:  string             // If exonerated
    },
    lineTotal:         number             // netTotal + tax.amount
  }],

  // ── Summary ──
  currency:            string,            // "CRC" | "USD"
  exchangeRate:        number,            // If currency != CRC
  totalTaxableServices:  number,
  totalExemptServices:   number,
  totalTaxableGoods:     number,
  totalExemptGoods:      number,
  totalTax:              number,
  totalDiscount:         number,
  totalNetSale:          number,
  totalVoucher:          number,          // Grand total

  // ── Hacienda status tracking ──
  haciendaStatus:      string,            // "pending" | "sent" | "received" | "accepted" | "rejected" | "error"
  haciendaResponse: {
    date:              Date,
    status:            string,
    detailMessage:     string,
    xmlResponse:       string             // Base64 encoded signed XML from Hacienda
  },
  xmlSigned:           string,            // Base64 of the signed XML sent
  sentAt:              Date,
  acceptedAt:          Date,

  // ── References (for credit/debit notes) ──
  references: [{
    documentType:      string,
    documentNumber:    string,
    date:              Date,
    code:              string,            // "01"=Anula, "02"=Corrige texto, etc.
    reason:            string
  }],

  notes:               string,
  createdAt:           Date,
  updatedAt:           Date
}
```

---

## 4. Module 1 — Patient Profiles (Dynamic Forms)

### 4.1 Concept

Clinics need different intake forms. A dental clinic needs fields like "last dental visit" and "orthodontic history" while a general practitioner needs "blood type" and "chronic conditions." The solution is a two-layer model:

1. **Form Template** — clinic defines which fields exist, their types, and validation rules.
2. **Patient Document** — stores the actual values as a key-value map in `customFields`.

### 4.2 Form Template CRUD

| Endpoint | Method | Description |
|---|---|---|
| `/api/form-templates` | `POST` | Create a new form template |
| `/api/form-templates` | `GET` | List all templates for the clinic |
| `/api/form-templates/:id` | `GET` | Get single template |
| `/api/form-templates/:id` | `PATCH` | Update template (add/remove/reorder fields) |
| `/api/form-templates/:id` | `DELETE` | Soft-delete template |
| `/api/form-templates/:id/default` | `PATCH` | Set as default template |

#### Create Form Template — Request Body

```json
{
  "name": "Dental Intake Form",
  "fields": [
    {
      "fieldKey": "blood_type",
      "label": "Tipo de Sangre",
      "fieldType": "select",
      "required": true,
      "options": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      "order": 1,
      "section": "Información Médica"
    },
    {
      "fieldKey": "allergies",
      "label": "Alergias",
      "fieldType": "textarea",
      "required": false,
      "order": 2,
      "section": "Información Médica"
    },
    {
      "fieldKey": "last_dental_visit",
      "label": "Última visita dental",
      "fieldType": "date",
      "required": false,
      "order": 3,
      "section": "Historial Dental"
    },
    {
      "fieldKey": "has_braces",
      "label": "¿Tiene brackets?",
      "fieldType": "boolean",
      "required": false,
      "defaultValue": false,
      "order": 4,
      "section": "Historial Dental"
    }
  ],
  "isDefault": true
}
```

### 4.3 Patient CRUD

| Endpoint | Method | Description |
|---|---|---|
| `/api/patients` | `POST` | Register a new patient |
| `/api/patients` | `GET` | List patients (paginated, searchable) |
| `/api/patients/:id` | `GET` | Get patient by ID |
| `/api/patients/:id` | `PATCH` | Update patient |
| `/api/patients/:id` | `DELETE` | Soft-delete patient |
| `/api/patients/search` | `GET` | Search by cédula, name, email |
| `/api/patients/:id/validate-hacienda` | `GET` | Validate patient cédula against Hacienda API |

#### Create Patient — Request Body

```json
{
  "firstName": "María",
  "lastName": "González Ramírez",
  "identificationType": "01",
  "identificationNumber": "112340567",
  "email": "maria@example.com",
  "phone": "88887777",
  "formTemplateId": "665a1b2c3d4e5f6a7b8c9d0e",
  "customFields": {
    "blood_type": "O+",
    "allergies": "Penicilina",
    "last_dental_visit": "2025-06-15",
    "has_braces": false
  }
}
```

### 4.4 Validation Logic (Service Layer)

When creating/updating a patient, the service must:

1. Fetch the referenced `formTemplateId`.
2. Iterate template `fields` and validate that every `required: true` field has a value in `customFields`.
3. Validate that `fieldType` matches the provided value type (e.g., `date` fields must be valid ISO dates, `select` values must be in `options` array).
4. Apply `validationRegex` if present.
5. Reject unknown keys not present in the template.

### 4.5 Hacienda Patient Validation

The Hacienda public API can validate a cédula:

```
GET https://api.hacienda.go.cr/fe/ae?identificacion=112340567
```

This returns the taxpayer's name, identification type, regime, tax status, and economic activities. Use this to auto-populate and cross-check patient data. **Important:** cache results locally and respect rate limits (max 20 req/sec burst, 10 req/sec sustained).

---

## 5. Module 2 — Products & Services Catalog

### 5.1 CABYS Requirement

Every product or service line in an electronic invoice **must** include a 13-digit CABYS code (Catálogo de Bienes y Servicios). Without it, Hacienda rejects the invoice. CABYS is maintained by the Banco Central de Costa Rica and groups over 20,000 items into hierarchical categories.

Common CABYS codes for clinics:

| Service | CABYS Code | IVA Rate |
|---|---|---|
| General medical consultation | 9312100000100 | Exempt or 4% (depending on if regulated) |
| Dental services | 9312200000100 | Exempt or 4% |
| Laboratory analysis | 9312300000100 | Varies |
| Prescription medications | 3541000000000 | 2% (reduced) |
| Over-the-counter medications | 3542000000000 | 4% or 13% |
| Medical devices/supplies | Varies | 13% (general) |

> **Note:** Clinics should verify exact codes via the CABYS API or the BCCR website. Codes were updated in April 2025 (CABYS 2025).

### 5.2 CABYS Search Proxy

The app should proxy the Hacienda CABYS API and cache results in MongoDB:

```
GET https://api.hacienda.go.cr/fe/cabys?q=consulta%20medica&top=10
GET https://api.hacienda.go.cr/fe/cabys?codigo=9312100000100
```

| Endpoint | Method | Description |
|---|---|---|
| `/api/cabys/search` | `GET` | Search CABYS by description (`?q=...&top=10`) |
| `/api/cabys/:code` | `GET` | Get CABYS by exact code |

Cache strategy: store results in a `cabys_cache` collection with a TTL of 30 days. On cache miss, call Hacienda API.

### 5.3 Product CRUD

| Endpoint | Method | Description |
|---|---|---|
| `/api/products` | `POST` | Create product/service |
| `/api/products` | `GET` | List products (paginated, filterable by type, active) |
| `/api/products/:id` | `GET` | Get single product |
| `/api/products/:id` | `PATCH` | Update product |
| `/api/products/:id` | `DELETE` | Soft-delete product |
| `/api/products/:id/cabys` | `PATCH` | Update CABYS code specifically |

#### Create Product — Request Body

```json
{
  "name": "Limpieza Dental Profunda",
  "description": "Limpieza dental profesional con ultrasonido",
  "productCode": "SRV-DENT-001",
  "cabysCode": "9312200000100",
  "price": 45000,
  "currency": "CRC",
  "tax": {
    "code": "01",
    "rateCode": "08",
    "rate": 13
  },
  "unitOfMeasure": "Sp",
  "type": "service",
  "customFields": {
    "duration_minutes": 45,
    "requires_appointment": true,
    "category": "dental"
  }
}
```

### 5.4 Custom Fields on Products

Unlike patients, product custom fields are freeform key-value pairs (no template needed). The clinic simply adds whatever keys they want. Validation is minimal: keys must be strings, values can be string/number/boolean/array.

### 5.5 Unit of Measure Codes (Hacienda)

| Code | Description |
|---|---|
| `Sp` | Servicio Profesional |
| `Unid` | Unidad |
| `m` | Metro |
| `kg` | Kilogramo |
| `s` | Segundo |
| `L` | Litro |
| `cm` | Centímetro |
| `Os` | Otro (specify in description) |

---

## 6. Module 3 — Invoice Generator & Hacienda Integration

### 6.1 High-Level Invoice Flow

```
1. Clinic creates invoice via API
       │
2. System validates all fields, CABYS codes, tax calculations
       │
3. System generates the 50-digit Clave Numérica
       │
4. System generates the 20-char Número Consecutivo
       │
5. System builds XML v4.4 document
       │
6. System signs XML with XAdES-EPES using clinic's .p12 key
       │
7. System obtains OAuth token from Hacienda IDP
       │
8. System POSTs signed XML (Base64) to Hacienda recepción API
       │
9. Hacienda processes and responds (webhook or polling)
       │
10. System updates invoice status: accepted / rejected / error
```

### 6.2 Invoice CRUD & Operations

| Endpoint | Method | Description |
|---|---|---|
| `/api/invoices` | `POST` | Create and optionally send invoice |
| `/api/invoices` | `GET` | List invoices (paginated, filterable) |
| `/api/invoices/:id` | `GET` | Get invoice detail |
| `/api/invoices/:id/send` | `POST` | Send (or re-send) to Hacienda |
| `/api/invoices/:id/status` | `GET` | Check current Hacienda status |
| `/api/invoices/:id/xml` | `GET` | Download signed XML |
| `/api/invoices/:id/credit-note` | `POST` | Generate credit note referencing this invoice |
| `/api/invoices/:id/debit-note` | `POST` | Generate debit note referencing this invoice |
| `/api/invoices/webhook` | `POST` | Hacienda callback endpoint |

#### Create Invoice — Request Body

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

The service will:
- Look up the patient to populate the `receiver` block.
- Look up each product to populate `cabysCode`, `price`, `tax`, etc.
- Calculate all line totals, taxes, and the grand total.
- Generate the `clave` and `consecutivo`.
- Build, sign, and send the XML if `sendToHacienda: true`.

### 6.3 Clinic Settings (Hacienda Sync)

Before a clinic can send invoices, they must link their Hacienda account:

| Endpoint | Method | Description |
|---|---|---|
| `/api/clinic-settings` | `GET` | Get clinic settings |
| `/api/clinic-settings` | `PATCH` | Update clinic info |
| `/api/clinic-settings/hacienda/link` | `POST` | Upload .p12 key + ATV credentials |
| `/api/clinic-settings/hacienda/test` | `POST` | Test connection to Hacienda (get token) |
| `/api/clinic-settings/hacienda/unlink` | `POST` | Remove Hacienda credentials |

#### Link Hacienda — Request Body (multipart/form-data)

```
atvUsername:    "cpj-3101999999@stag.comprobanteselectronicos.go.cr"
atvPassword:    "Abc123..."
cryptoKeyP12:   [file upload — .p12 binary]
cryptoKeyPin:   "99999999999999"
environment:    "staging"
callbackUrl:    "https://my-app.herokuapp.com/api/invoices/webhook"
```

---

## 7. Hacienda Costa Rica — Technical Deep Dive

### 7.1 API Environments

| Environment | API Base URL | IDP (Token) URL | Client ID |
|---|---|---|---|
| **Staging (sandbox)** | `https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1` | `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token` | `api-stag` |
| **Production** | `https://api.comprobanteselectronicos.go.cr/recepcion/v1` | `https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token` | `api-prod` |

### 7.2 Authentication — OAuth 2.0 / OpenID Connect

Hacienda uses OIDC over OAuth 2.0. To get a token:

```
POST {IDP_URL}
Content-Type: application/x-www-form-urlencoded

grant_type=password
&client_id=api-stag
&username={ATV_USERNAME}
&password={ATV_PASSWORD}
```

Response:
```json
{
  "access_token": "eyJhbGciOi...",
  "expires_in": 300,
  "refresh_token": "eyJhbGciOi...",
  "token_type": "bearer"
}
```

The token expires in **5 minutes** (300 seconds). Cache it and refresh proactively.

### 7.3 Sending a Document

```
POST {API_BASE_URL}/recepcion
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "clave": "50614032600310199999900100001010000000001199999999",
  "fecha": "2026-03-14T10:30:00-06:00",
  "emisor": {
    "tipoIdentificacion": "02",
    "numeroIdentificacion": "3101999999"
  },
  "receptor": {
    "tipoIdentificacion": "01",
    "numeroIdentificacion": "112340567"
  },
  "callbackUrl": "https://my-app.herokuapp.com/api/invoices/webhook",
  "comprobanteXml": "<base64-encoded-signed-xml>"
}
```

Response: `202 Accepted` (asynchronous processing).

### 7.4 Checking Document Status

```
GET {API_BASE_URL}/recepcion/{clave}
Authorization: Bearer {access_token}
```

Response:
```json
{
  "clave": "506140326003101999999001000010100000000011...",
  "fecha": "2026-03-14T10:30:00-06:00",
  "ind-estado": "aceptado",
  "respuesta-xml": "<base64-xml-response>"
}
```

Possible `ind-estado` values: `recibido` → `procesando` → `aceptado` | `rechazado` | `error`

### 7.5 The 50-Digit Clave Numérica

The `clave` is the unique identifier for every electronic document. Structure:

```
Position:  [1-3]  [4-5] [6-7] [8-9] [10-21]          [22-41]                  [42]  [43-50]
Content:   País   Día   Mes   Año   Cédula Emisor     Consecutivo              Sit.  Seguridad
Example:   506    14    03    26    003101999999       00100001010000000001      1     99999999
```

| Positions | Length | Description |
|---|---|---|
| 1–3 | 3 | Country code: always `506` (Costa Rica) |
| 4–5 | 2 | Day of emission (DD) |
| 6–7 | 2 | Month of emission (MM) |
| 8–9 | 2 | Year of emission (YY — last 2 digits) |
| 10–21 | 12 | Issuer's cédula number (left-padded with zeros to 12 chars) |
| 22–41 | 20 | Número Consecutivo (see below) |
| 42 | 1 | Document situation: `1`=Normal, `2`=Contingencia, `3`=Sin Internet |
| 43–50 | 8 | Security code (unique random per document) |

### 7.6 The 20-Character Número Consecutivo

```
Position:  [1-3]        [4-8]         [9-10]      [11-20]
Content:   Sucursal     Punto Venta   Tipo Doc    Número
Example:   001          00001         01          0000000001
```

| Positions | Length | Description |
|---|---|---|
| 1–3 | 3 | Branch code (`001` = headquarters) |
| 4–8 | 5 | Point of sale code (`00001` = default) |
| 9–10 | 2 | Document type code |
| 11–20 | 10 | Sequential number (zero-padded) |

**Document type codes (positions 9-10):**

| Code | Type |
|---|---|
| `01` | Factura Electrónica |
| `02` | Nota de Débito Electrónica |
| `03` | Nota de Crédito Electrónica |
| `04` | Tiquete Electrónico |
| `05` | Confirmación Aceptación |
| `06` | Confirmación Aceptación Parcial |
| `07` | Confirmación Rechazo |
| `08` | Factura Electrónica de Compra |
| `09` | Factura Electrónica de Exportación |
| `10` | Recibo Electrónico de Pago (NEW in v4.4) |

### 7.7 XML Document Structure (v4.4 — Simplified)

The XML follows the XSD schemas published by Hacienda. Here is a simplified view of a `FacturaElectronica`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.4/facturaElectronica"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xmlns:ds="http://www.w3.org/2000/09/xmldsig#">

  <Clave>506140326003101999999001000010100000000011...</Clave>
  <CodigoActividad>620100</CodigoActividad>
  <NumeroConsecutivo>00100001010000000001</NumeroConsecutivo>
  <FechaEmision>2026-03-14T10:30:00-06:00</FechaEmision>

  <Emisor>
    <Nombre>CLÍNICA DENTAL EJEMPLO S.A.</Nombre>
    <Identificacion>
      <Tipo>02</Tipo>
      <Numero>3101999999</Numero>
    </Identificacion>
    <NombreComercial>Clínica Sonrisa</NombreComercial>
    <Ubicacion>
      <Provincia>1</Provincia>
      <Canton>01</Canton>
      <Distrito>01</Distrito>
      <OtrasSenas>100m norte del parque central</OtrasSenas>
    </Ubicacion>
    <Telefono>
      <CodigoPais>506</CodigoPais>
      <NumTelefono>22223333</NumTelefono>
    </Telefono>
    <CorreoElectronico>info@clinicaejemplo.com</CorreoElectronico>
  </Emisor>

  <Receptor>
    <Nombre>MARÍA GONZÁLEZ RAMÍREZ</Nombre>
    <Identificacion>
      <Tipo>01</Tipo>
      <Numero>112340567</Numero>
    </Identificacion>
    <CorreoElectronico>maria@example.com</CorreoElectronico>
  </Receptor>

  <CondicionVenta>01</CondicionVenta>
  <MedioPago>02</MedioPago>

  <DetalleServicio>
    <LineaDetalle>
      <NumeroLinea>1</NumeroLinea>
      <CodigoComercial>
        <Tipo>04</Tipo>
        <Codigo>SRV-DENT-001</Codigo>
      </CodigoComercial>
      <CodigoCBAYS>9312200000100</CodigoCBAYS>
      <Cantidad>1.00000</Cantidad>
      <UnidadMedida>Sp</UnidadMedida>
      <Detalle>Limpieza Dental Profunda</Detalle>
      <PrecioUnitario>45000.00000</PrecioUnitario>
      <MontoTotal>45000.00000</MontoTotal>
      <SubTotal>45000.00000</SubTotal>
      <Impuesto>
        <Codigo>01</Codigo>
        <CodigoTarifa>08</CodigoTarifa>
        <Tarifa>13.00</Tarifa>
        <Monto>5850.00000</Monto>
      </Impuesto>
      <MontoTotalLinea>50850.00000</MontoTotalLinea>
    </LineaDetalle>
  </DetalleServicio>

  <ResumenFactura>
    <CodigoTipoMoneda>
      <CodigoMoneda>CRC</CodigoMoneda>
      <TipoCambio>1</TipoCambio>
    </CodigoTipoMoneda>
    <TotalServGravados>45000.00000</TotalServGravados>
    <TotalServExentos>0.00000</TotalServExentos>
    <TotalMercanciasGravadas>0.00000</TotalMercanciasGravadas>
    <TotalMercanciasExentas>0.00000</TotalMercanciasExentas>
    <TotalGravado>45000.00000</TotalGravado>
    <TotalExento>0.00000</TotalExento>
    <TotalVenta>45000.00000</TotalVenta>
    <TotalDescuentos>0.00000</TotalDescuentos>
    <TotalVentaNeta>45000.00000</TotalVentaNeta>
    <TotalImpuesto>5850.00000</TotalImpuesto>
    <TotalComprobante>50850.00000</TotalComprobante>
  </ResumenFactura>

  <!-- XAdES-EPES digital signature goes here -->
  <ds:Signature>...</ds:Signature>
</FacturaElectronica>
```

### 7.8 XML Signing (XAdES-EPES)

The XML must be signed using XAdES-EPES with the clinic's `.p12` cryptographic key (obtained from Hacienda's ATV platform). The signing process:

1. Load the `.p12` file with the provided PIN.
2. Extract the private key and X.509 certificate.
3. Create an enveloped XAdES-EPES signature over the entire document.
4. The signature policy identifier references: `https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/Resolucion_Comprobantes_Electronicos_DGT-R-48-2016.pdf`

**Recommended NestJS approach:** Use the `xml-crypto` and `node-forge` npm packages to handle XML digital signatures in Node.js. Alternatively, use `xadesjs` for XAdES-specific compliance.

### 7.9 Key v4.4 Changes (vs 4.3)

| Change | Impact |
|---|---|
| New document type: **Recibo Electrónico de Pago (REP)** | Required for state institution invoices and credit invoices with IVA deferred up to 90 days |
| 11 new **discount codes** | Each discount must specify its type (volume, seasonal, commercial, bonus, royalty, etc.) |
| New **payment methods**: SINPE Móvil (`07`), Digital Platforms (`08`) | Payment method node moved to `ResumenFactura` section |
| **Credit term** now in days (integer, 5 positions) | Was previously text |
| Receiver's **economic activity** optional on FE, mandatory on FEC | New field |
| **CABYS 2025** codes (updated April 2025) | Must use updated codes after June 2025 |
| Line items per FE: max **1,000** | Was 60 in some versions |
| **Factura Electrónica de Compra** expanded | For foreign services/intangibles, extranjero no domiciliado |
| 146+ total technical changes in XSD schema | Full audit recommended |

### 7.10 Hacienda Public API Endpoints (Non-Invoice)

| Endpoint | Description |
|---|---|
| `GET /fe/ae?identificacion=XXX` | Taxpayer info (name, type, regime, activities) |
| `GET /indicadores/tc/dolar` | USD exchange rate (buy/sell) |
| `GET /indicadores/tc/dolar/historico?d=...&h=...` | Historical USD rates |
| `GET /indicadores/tc/euro` | EUR exchange rate |
| `GET /indicadores/tc` | Both USD + EUR rates |
| `GET /fe/ex?autorizacion=AL-XXXXXXXX-XX` | Tax exemption info |
| `GET /fe/cabys?q=...&top=N` | CABYS search by description |
| `GET /fe/cabys?codigo=XXXXXXXXXXXXX` | CABYS lookup by code |
| `GET /fe/agropecuario?identificacion=XXX` | Agricultural producer info |
| `GET /fe/pesca?identificacion=XXX` | Fishing/aquaculture info |

**Rate limits:** 20 req/sec burst (5-sec window), 10 req/sec sustained (120-sec window). Exceeding = IP blocked for 10 minutes. Always use local caching.

---

## 8. API Endpoints Summary (Postman Collection)

Below is the complete list of all endpoints organized for a Postman collection:

### Clinic Settings

| # | Method | Endpoint | Description |
|---|---|---|---|
| 1 | `GET` | `/api/clinic-settings` | Get clinic config |
| 2 | `PATCH` | `/api/clinic-settings` | Update clinic info |
| 3 | `POST` | `/api/clinic-settings/hacienda/link` | Link Hacienda account (upload .p12) |
| 4 | `POST` | `/api/clinic-settings/hacienda/test` | Test Hacienda connection |
| 5 | `POST` | `/api/clinic-settings/hacienda/unlink` | Unlink Hacienda account |

### Form Templates

| # | Method | Endpoint | Description |
|---|---|---|---|
| 6 | `POST` | `/api/form-templates` | Create template |
| 7 | `GET` | `/api/form-templates` | List all templates |
| 8 | `GET` | `/api/form-templates/:id` | Get single template |
| 9 | `PATCH` | `/api/form-templates/:id` | Update template |
| 10 | `DELETE` | `/api/form-templates/:id` | Soft-delete template |
| 11 | `PATCH` | `/api/form-templates/:id/default` | Set as default |

### Patients

| # | Method | Endpoint | Description |
|---|---|---|---|
| 12 | `POST` | `/api/patients` | Create patient |
| 13 | `GET` | `/api/patients` | List patients (`?page=1&limit=20&search=...`) |
| 14 | `GET` | `/api/patients/:id` | Get patient |
| 15 | `PATCH` | `/api/patients/:id` | Update patient |
| 16 | `DELETE` | `/api/patients/:id` | Soft-delete patient |
| 17 | `GET` | `/api/patients/search` | Search by cédula/name/email |
| 18 | `GET` | `/api/patients/:id/validate-hacienda` | Validate cédula with Hacienda |

### Products

| # | Method | Endpoint | Description |
|---|---|---|---|
| 19 | `POST` | `/api/products` | Create product |
| 20 | `GET` | `/api/products` | List products (`?type=service&active=true`) |
| 21 | `GET` | `/api/products/:id` | Get product |
| 22 | `PATCH` | `/api/products/:id` | Update product |
| 23 | `DELETE` | `/api/products/:id` | Soft-delete product |
| 24 | `PATCH` | `/api/products/:id/cabys` | Update CABYS code |

### CABYS

| # | Method | Endpoint | Description |
|---|---|---|---|
| 25 | `GET` | `/api/cabys/search` | Search CABYS (`?q=consulta&top=10`) |
| 26 | `GET` | `/api/cabys/:code` | Get CABYS by code |

### Invoices

| # | Method | Endpoint | Description |
|---|---|---|---|
| 27 | `POST` | `/api/invoices` | Create invoice |
| 28 | `GET` | `/api/invoices` | List invoices (`?status=accepted&from=...&to=...`) |
| 29 | `GET` | `/api/invoices/:id` | Get invoice detail |
| 30 | `POST` | `/api/invoices/:id/send` | Send/resend to Hacienda |
| 31 | `GET` | `/api/invoices/:id/status` | Check Hacienda status |
| 32 | `GET` | `/api/invoices/:id/xml` | Download signed XML |
| 33 | `POST` | `/api/invoices/:id/credit-note` | Generate credit note |
| 34 | `POST` | `/api/invoices/:id/debit-note` | Generate debit note |
| 35 | `POST` | `/api/invoices/webhook` | Hacienda callback |

### Hacienda Utilities

| # | Method | Endpoint | Description |
|---|---|---|---|
| 36 | `GET` | `/api/hacienda/exchange-rate` | Get current USD/EUR rates |
| 37 | `GET` | `/api/hacienda/taxpayer/:id` | Lookup taxpayer info |
| 38 | `GET` | `/api/hacienda/exemption/:auth` | Lookup tax exemption |

---

## 9. Environment Variables

```bash
# ── App ──
NODE_ENV=development
PORT=3000

# ── MongoDB ──
MONGODB_URI=mongodb://localhost:27017/clinic-cr
# For production: mongodb+srv://user:pass@cluster.mongodb.net/clinic-cr

# ── Hacienda API (defaults — overridden per-clinic in DB) ──
HACIENDA_API_STAGING=https://api.comprobanteselectronicos.go.cr/recepcion-sandbox/v1
HACIENDA_API_PRODUCTION=https://api.comprobanteselectronicos.go.cr/recepcion/v1
HACIENDA_IDP_STAGING=https://idp.comprobanteselectronicos.go.cr/auth/realms/rut-stag/protocol/openid-connect/token
HACIENDA_IDP_PRODUCTION=https://idp.comprobanteselectronicos.go.cr/auth/realms/rut/protocol/openid-connect/token
HACIENDA_PUBLIC_API=https://api.hacienda.go.cr

# ── Encryption (for storing ATV passwords and .p12 PINs) ──
ENCRYPTION_KEY=your-32-char-encryption-key-here

# ── Clinic context (for local testing without auth) ──
DEFAULT_CLINIC_ID=665a1b2c3d4e5f6a7b8c9d0e
```

---

## 10. Heroku Deployment Notes

### Procfile

```
web: node dist/main.js
```

### Build Script (package.json)

```json
{
  "scripts": {
    "build": "nest build",
    "start:prod": "node dist/main.js",
    "heroku-postbuild": "npm run build"
  },
  "engines": {
    "node": "20.x"
  }
}
```

### Heroku Config

- Set all environment variables via `heroku config:set`.
- Use **MongoDB Atlas** (free tier available) since Heroku doesn't host MongoDB natively.
- The `.p12` cryptographic key files are stored as binary in MongoDB (per clinic), not on the filesystem.
- Heroku dynos sleep after 30 min of inactivity on free/eco plans — Hacienda's callback webhook may fail if dyno is sleeping. Use Heroku's Basic or Standard plan for production, or implement a polling fallback to check invoice status.

### Important: Hacienda Callback on Heroku

Hacienda sends the response to your `callbackUrl` asynchronously. On Heroku:
- Ensure the dyno is awake (use a ping service or upgrade plan).
- The webhook endpoint (`POST /api/invoices/webhook`) must respond within Hacienda's timeout.
- Implement a **polling job** as a fallback: periodically query `GET /recepcion/{clave}` for invoices stuck in `sent` status longer than 5 minutes.

---

## 11. Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",
    "@nestjs/mongoose": "^10.x",
    "@nestjs/config": "^3.x",
    "@nestjs/schedule": "^4.x",
    "mongoose": "^8.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    "axios": "^1.x",
    "xml2js": "^0.6.x",
    "xmlbuilder2": "^3.x",
    "xml-crypto": "^6.x",
    "node-forge": "^1.x",
    "xadesjs": "^2.x",
    "uuid": "^9.x",
    "crypto-js": "^4.x"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.x",
    "@nestjs/testing": "^10.x",
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^6.x"
  }
}
```

### Key libraries explained

| Package | Purpose |
|---|---|
| `@nestjs/mongoose` | MongoDB ODM integration for NestJS |
| `@nestjs/config` | Environment variable management |
| `@nestjs/schedule` | Cron jobs for polling Hacienda status |
| `xmlbuilder2` | Build XML documents programmatically (for v4.4 structure) |
| `xml-crypto` | XML digital signature (XAdES-EPES signing) |
| `node-forge` | Load .p12 certificates, extract private keys |
| `xadesjs` | XAdES signature compliance layer |
| `axios` | HTTP client for Hacienda API calls |
| `xml2js` | Parse XML responses from Hacienda |
| `crypto-js` | AES encryption for storing sensitive credentials |

---

## 12. References & Official Sources

### Ministerio de Hacienda

| Resource | URL |
|---|---|
| Hacienda Public API Docs | https://api.hacienda.go.cr/docs/ |
| ATV Portal (credentials & keys) | https://www.hacienda.go.cr/ATV/ComprobanteElectronico/ |
| v4.4 Annexes & Structures (XSD schemas) | https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2024/v4.4/ANEXOS%20Y%20ESTRUCTURAS_V4.4.pdf |
| v4.4 Technical Resolution (DGT-RES-0027-2024) | https://www.hacienda.go.cr/docs/DGT-R-000-2024DisposicionesTecnicasDeComprobantesElectronicosCP.pdf |
| Comprobantes Electrónicos API (recepción) | https://atv.hacienda.go.cr/ATV/ComprobanteElectronico/docs/esquemas/2016/v4.3/comprobantes-electronicos-api.html |
| CABYS Catalog (BCCR) | https://www.bccr.fi.cr/indicadores-economicos/cat%C3%A1logo-de-bienes-y-servicios |
| Hacienda Support Email | facturati@hacienda.go.cr |

### Community & Open Source

| Resource | URL |
|---|---|
| CRLibre API Hacienda (PHP, open source) | https://github.com/CRLibre/API_Hacienda |
| CRLibre FE Documentation | https://github.com/CRLibre/fe-hacienda-cr-docs |
| facturacr (Ruby implementation) | https://github.com/apokalipto/facturacr |
| Roy Rojas — Key & Consecutive Guide | https://royrojas.com/numero-consecutivo-y-clave-en-la-factura-electronica-en-costa-rica/ |
| ComprobantesElectronicosCR (third-party API) | https://www.comprobanteselectronicoscr.com/ |

### NestJS

| Resource | URL |
|---|---|
| NestJS Documentation | https://docs.nestjs.com/ |
| NestJS + Mongoose | https://docs.nestjs.com/techniques/mongodb |
| NestJS + Heroku Deployment | https://docs.nestjs.com/faq/serverless |

---

> **Next steps:** Once this research is approved, we proceed to scaffold the NestJS project, implement each module one by one, and build the Postman collection for full local testing.