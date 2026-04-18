# mollyClinic/DOCS/IMPROVEMENTS_PHASE_2.md

# ClinicCR — Improvements Phase 2

> **What this document covers:** 4 improvements that make ClinicCR operationally complete — safe data management, business analytics, patient scheduling, and payment follow-ups.
>
> **Current state:** 64 endpoints across 13 modules
> **After improvements:** ~80+ endpoints across 15 modules

---

## Improvement 1: Safe Delete & Update Rules

### What is it?

Define clear rules for what can be updated, what can be deleted, and what should be protected — because right now, the system has gaps that could lead to data corruption, orphaned records, or legal violations.

### Why does this matter?

Because a receptionist will eventually click "Delete" on a patient who has 15 invoices. If the system lets her do it without warning, those invoices now reference a ghost patient. The doctor searches for "Carlos Rodríguez" — nothing shows up, but his invoices still exist in Hacienda's system. This is a compliance and operational nightmare.

The system also has a **bug**: `findOne()` methods across all modules don't check `isActive`, meaning soft-deleted patients, products, and consultations can still be fetched by ID — and worse, a deleted patient can still be used to create new invoices.

### Current State (what's broken)

| Entity | Can Update? | Can Delete? | Bug |
|--------|------------|------------|-----|
| **Patients** | Yes (PATCH) | Yes (soft-delete) | `findOne()` returns deleted patients. No cascade to consultations/medical records. Can create invoices for deleted patients. |
| **Products** | Yes (PATCH) | Yes (soft-delete) | `findOne()` returns deleted products. Can add deleted products to invoices. |
| **Invoices** | No | No | Cannot fix typos in notes. Cannot archive old invoices. No `isActive` field in schema. |
| **Consultations** | Yes (PATCH) | Yes (soft-delete) | `findOne()` returns deleted consultations. |
| **Medical Records** | Yes (PATCH) | No endpoint | `isActive` field exists but no DELETE endpoint. |

### What I Recommend

#### Rule 1: Invoices are IMMUTABLE — never update, never delete

**Why:** Because once an invoice is created, it gets a unique 50-digit `clave`, a signed XML, and (if sent) is registered in Hacienda's system. Modifying it would invalidate the digital signature and break the legal chain. Costa Rica tax law requires that corrections are made through credit/debit notes, not by editing the original.

**What to do instead:**
- **Wrong amount?** → Issue a Nota de Crédito (credit note) to reverse it, then create a new invoice
- **Wrong patient?** → Same: credit note + new invoice
- **Typo in notes?** → Allow updating ONLY the `notes` field (not Hacienda-submitted fields)
- **Want to hide old invoices?** → Add an `isArchived` flag (not a delete) so they stop showing in the default list but remain accessible for audits

**Example:**
```
Receptionist creates invoice #001 for ₡56,500 → sent to Hacienda → accepted ✅
She realizes the patient should have been "Ana López", not "Carlos Rodríguez"

WRONG approach: Edit the invoice ← breaks signed XML, Hacienda has the old data
RIGHT approach:
  1. Create credit note for invoice #001 → "Anulación: receptor incorrecto"
  2. Create new invoice #002 for Ana López → send to Hacienda
```

**New endpoints needed:**
- `PATCH /api/invoices/:id/notes` — Update ONLY the notes field (not Hacienda fields)
- `PATCH /api/invoices/:id/archive` — Set `isArchived: true` (hides from default list, still accessible)
- `PATCH /api/invoices/:id/unarchive` — Set `isArchived: false`

**Schema change:** Add `isArchived: boolean (default false)` to Invoice schema. Do NOT add `isActive` — because invoices should never be "deleted", even conceptually.

---

#### Rule 2: Patients — protect if they have invoices

**Why:** Because deleting a patient who has invoices creates orphaned records. Hacienda has the patient's cédula on file. If an audit happens and the patient doesn't exist in the system, the clinic can't explain their records.

**What to do:**

```
Receptionist tries to delete patient Carlos Rodríguez:

CASE A: Carlos has 0 invoices
  → Allow soft-delete (isActive: false)
  → Also soft-delete his medical record and consultations (cascade)
  → Response: { "message": "Patient deleted" }

CASE B: Carlos has 3 invoices
  → BLOCK the delete
  → Response: 400 "Cannot delete patient with existing invoices.
    This patient has 3 invoices. Deactivate the patient instead."
  → Offer "Deactivate" instead — patient is hidden from lists but their data persists for audit purposes
```

**Why cascade soft-delete:** Because a deleted patient's consultations and medical records serve no purpose without the patient. Leaving them as orphans wastes space and confuses searches. If the patient is un-deleted (reactivated), their records come back too.

**Bug fix needed:** `findOne()` in patients.service.ts must check `isActive: true`. Same fix needed in products.service.ts and consultations.service.ts. This prevents:
- Creating invoices for deleted patients
- Adding deleted products to invoices
- Viewing deleted consultations

**New endpoints needed:**
- `PATCH /api/patients/:id/deactivate` — Soft-delete patient + cascade to medical record + consultations
- `PATCH /api/patients/:id/reactivate` — Un-delete patient + cascade reactivation
- Existing `DELETE /api/patients/:id` — Should now check for linked invoices before allowing

---

#### Rule 3: Products — protect if used in invoices

**Why:** Because deleting a product that appears on past invoices breaks the audit trail. The invoice says "Consulta Dental General — CABYS 8621001000100" but the product no longer exists in the catalog.

**What to do:**

```
Staff tries to delete "Consulta Dental General":

CASE A: Product has never been used in an invoice
  → Allow soft-delete
  → Response: { "message": "Product deleted" }

CASE B: Product appears in 47 invoices
  → BLOCK the delete
  → Response: 400 "Cannot delete product used in existing invoices.
    This product appears in 47 invoices. Deactivate it instead."
  → Deactivated products don't appear in the product picker during invoice creation,
    but remain visible in historical invoices
```

**Bug fix needed:** `findOne()` in products.service.ts must check `isActive: true`.

---

#### Rule 4: Medical Records — add delete endpoint

**Why:** Because the `isActive` field exists on the schema but there's no endpoint to use it. A doctor should be able to delete a medical record if it was created by mistake (e.g., wrong patient).

**New endpoint:**
- `DELETE /api/patients/:patientId/medical-record` — Soft-delete the medical record

---

### Summary of Changes for Improvement 1

| Change | Type | Files Affected |
|--------|------|---------------|
| Fix `findOne()` to check `isActive` | Bug fix | patients.service, products.service, consultations.service |
| Add `isArchived` to Invoice schema | Schema change | invoice.schema.ts |
| Add `PATCH /invoices/:id/notes` | New endpoint | invoices.controller, invoices.service |
| Add `PATCH /invoices/:id/archive` | New endpoint | invoices.controller, invoices.service |
| Add `PATCH /invoices/:id/unarchive` | New endpoint | invoices.controller, invoices.service |
| Add invoice-check before patient delete | Logic change | patients.service |
| Add cascade soft-delete for patient | Logic change | patients.service |
| Add `PATCH /patients/:id/deactivate` | New endpoint | patients.controller, patients.service |
| Add `PATCH /patients/:id/reactivate` | New endpoint | patients.controller, patients.service |
| Add invoice-check before product delete | Logic change | products.service |
| Add `DELETE /medical-record` endpoint | New endpoint | medical-records.controller, medical-records.service |

### Objectives

- [ ] Invoices are immutable — no update or delete of Hacienda-submitted fields
- [ ] Invoice `notes` field can be updated independently
- [ ] Invoices can be archived/unarchived (hidden from default list, accessible for audits)
- [ ] Patients with invoices cannot be deleted — must be deactivated instead
- [ ] Patient soft-delete cascades to medical records and consultations
- [ ] Patients can be reactivated (un-deleted) with their records
- [ ] Products used in invoices cannot be deleted — must be deactivated instead
- [ ] `findOne()` across all modules checks `isActive: true` (bug fix)
- [ ] Medical records can be soft-deleted via API
- [ ] Deactivated patients/products don't appear in search/list results but remain in historical data

---

## Improvement 2: Analytics Module (Analítica)

### What is it?

A dedicated analytics module that provides business intelligence — total sales, patient counts, top products, most active patients — across configurable time ranges: today, this week, last week, last 30 days, last 3 months, last 6 months, last 12 months, or a custom date range.

### Why does this matter?

Because a clinic owner asks these questions every week:
- "How much did we make this month?" → She opens a spreadsheet and adds up invoices manually
- "Which service brings in the most revenue?" → She guesses, or asks the receptionist
- "Are we seeing more patients than last month?" → She has no idea
- "Who are our most loyal patients?" → She relies on memory

Without analytics, the clinic owner is flying blind. She makes decisions (hire staff? raise prices? add a new service?) based on gut feeling instead of data. ClinicCR has all the data — invoices, patients, products — it just doesn't surface it.

### How does it work?

**Every analytics endpoint accepts a time range:**

```
GET /api/analytics/sales?range=last30days
GET /api/analytics/sales?range=custom&startDate=2026-01-01&endDate=2026-03-31
```

**Supported ranges:**

| Range Parameter | Meaning | Example |
|----------------|---------|---------|
| `today` | Current day (00:00 to now) | April 4, 2026 |
| `thisWeek` | Monday to today | March 30 – April 4, 2026 |
| `lastWeek` | Previous Monday to Sunday | March 23 – March 29, 2026 |
| `last30days` | Past 30 days | March 5 – April 4, 2026 |
| `last3months` | Past 90 days | January 4 – April 4, 2026 |
| `last6months` | Past 180 days | October 4, 2025 – April 4, 2026 |
| `last12months` | Past 365 days | April 4, 2025 – April 4, 2026 |
| `custom` | Custom range (requires `startDate` + `endDate`) | Any range |

### Endpoints & What They Return

#### 1. `GET /api/analytics/sales`
**Why:** Because "how much did we make?" is the #1 question every business owner asks.

**Returns:**
```json
{
  "totalSales": 4250000,
  "totalInvoices": 87,
  "totalTax": 552500,
  "averageInvoiceAmount": 48850.57,
  "salesByDay": [
    { "date": "2026-04-01", "total": 156500, "count": 3 },
    { "date": "2026-04-02", "total": 203000, "count": 5 },
    { "date": "2026-04-03", "total": 178000, "count": 4 }
  ],
  "salesByPaymentMethod": [
    { "method": "02", "label": "Tarjeta", "total": 2800000, "count": 58 },
    { "method": "01", "label": "Efectivo", "total": 950000, "count": 22 },
    { "method": "07", "label": "SINPE Móvil", "total": 500000, "count": 7 }
  ],
  "haciendaStatusBreakdown": {
    "accepted": 82,
    "rejected": 3,
    "pending": 1,
    "sent": 1
  }
}
```

**How it's calculated:** MongoDB aggregation pipeline on the `invoices` collection, filtered by `clinicId` and `createdAt` within the date range. Groups by day and payment method. Only counts invoices with `haciendaStatus !== 'rejected'` for totals (rejected invoices shouldn't count as revenue).

#### 2. `GET /api/analytics/patients`
**Why:** Because patient growth tells you if the clinic is thriving or stagnating.

**Returns:**
```json
{
  "totalPatients": 342,
  "newPatients": 28,
  "returningPatients": 59,
  "patientsByMonth": [
    { "month": "2026-01", "new": 12, "returning": 45 },
    { "month": "2026-02", "new": 15, "returning": 52 },
    { "month": "2026-03", "new": 18, "returning": 61 }
  ]
}
```

**How "new" vs "returning" works:**
- **New patient** = `createdAt` is within the date range (they were registered during this period)
- **Returning patient** = appears in an invoice during the date range BUT was created before the range started

**Example:**
```
Carlos registered on January 15 (before the range)
Carlos had an invoice on March 20 (within "last30days")
→ Carlos is a "returning" patient for this range

Ana registered on March 25 (within the range)
Ana had an invoice on March 25 (within the range)
→ Ana is a "new" patient
```

#### 3. `GET /api/analytics/top-products`
**Why:** Because knowing which service generates the most revenue tells the owner what to invest in — hire another dentist for cleanings, or buy new equipment for the most popular procedure.

**Returns:**
```json
{
  "topByRevenue": [
    { "productId": "...", "name": "Consulta Dental General", "totalRevenue": 1800000, "quantitySold": 36 },
    { "productId": "...", "name": "Limpieza Dental", "totalRevenue": 1200000, "quantitySold": 40 },
    { "productId": "...", "name": "Extracción Simple", "totalRevenue": 750000, "quantitySold": 15 }
  ],
  "topByQuantity": [
    { "productId": "...", "name": "Limpieza Dental", "quantitySold": 40, "totalRevenue": 1200000 },
    { "productId": "...", "name": "Consulta Dental General", "quantitySold": 36, "totalRevenue": 1800000 },
    { "productId": "...", "name": "Extracción Simple", "quantitySold": 15, "totalRevenue": 750000 }
  ]
}
```

**How it's calculated:** Unwind invoice `items` array, group by `productId`, sum `lineTotal` for revenue and `quantity` for count. Sort by total descending. Limit to top 10.

#### 4. `GET /api/analytics/top-patients`
**Why:** Because loyal patients deserve recognition — and the clinic should know who its best customers are (for loyalty discounts, priority scheduling, or simply a "thank you").

**Returns:**
```json
{
  "byVisits": [
    { "patientId": "...", "name": "Carlos Rodríguez", "visitCount": 12, "totalSpent": 540000 },
    { "patientId": "...", "name": "Ana López", "visitCount": 8, "totalSpent": 320000 }
  ],
  "bySpending": [
    { "patientId": "...", "name": "Carlos Rodríguez", "totalSpent": 540000, "visitCount": 12 },
    { "patientId": "...", "name": "Pedro Mora", "totalSpent": 480000, "visitCount": 6 }
  ]
}
```

**How it's calculated:** Group invoices by receiver `identificationNumber` (cédula), count distinct invoice dates for visits, sum `totalVoucher` for spending. Limit to top 10.

#### 5. `GET /api/analytics/summary`
**Why:** Because the dashboard needs a single endpoint that gives the big picture at a glance — one call instead of four.

**Returns:** Combined summary of all the above in a single response (sales total, patient count, top 3 products, top 3 patients).

### New Endpoints (all JWT protected, scoped by clinicId)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/sales?range=last30days` | Sales totals, daily breakdown, payment methods |
| GET | `/api/analytics/patients?range=last30days` | Patient counts, new vs returning |
| GET | `/api/analytics/top-products?range=last30days&limit=10` | Best-selling products by revenue and quantity |
| GET | `/api/analytics/top-patients?range=last30days&limit=10` | Most active patients by visits and spending |
| GET | `/api/analytics/summary?range=last30days` | Combined dashboard summary |

### Implementation Notes

- Use **MongoDB aggregation pipelines** (not loading all documents into memory) because a clinic with 12 months of invoices could have thousands of records
- All queries filter by `clinicId` (multi-tenant) and `haciendaStatus !== 'rejected'` (rejected invoices aren't real revenue)
- Cache results for `today` range with a 5-minute TTL (the dashboard is loaded frequently)
- The `custom` range must validate that `startDate < endDate` and the range doesn't exceed 2 years

### Objectives

- [ ] Each analytics endpoint accepts a configurable time range (today, thisWeek, lastWeek, last30days, last3months, last6months, last12months, custom)
- [ ] Sales analytics includes: total, invoice count, tax, average, daily breakdown, payment method breakdown, Hacienda status
- [ ] Patient analytics distinguishes "new" vs "returning" patients
- [ ] Top products ranked by both revenue and quantity sold
- [ ] Top patients ranked by both visits and total spending
- [ ] Summary endpoint combines all metrics for the dashboard
- [ ] All aggregations use MongoDB pipelines (not in-memory)
- [ ] All data scoped by clinicId

---

## Improvement 3: Today & Tomorrow Scheduled Patients

### What is it?

A dedicated view showing which patients have appointments today and tomorrow — pulled from Google Calendar events that reference patient names or IDs.

### Why does this matter?

Because the receptionist's first task every morning is: **"Who's coming in today?"** Right now, she has to open Google Calendar separately, scan through events, and mentally match names to patient files. This improvement puts that information directly in ClinicCR, connected to the patient records.

**Why tomorrow too:** Because the receptionist's second task is preparing for the next day — printing forms, confirming appointments via phone, checking if patients have pending payments. Seeing tomorrow's schedule at the end of the workday is essential.

### How does it work?

**This builds on the existing Google Calendar integration (Improvement Phase 1, Feature 2).**

**Example: Receptionist opens the dashboard at 8:00 AM**

```
┌──────────────────────────────────────────────────────────────┐
│  📅 Today — April 4, 2026                                    │
│                                                              │
│  09:00  Carlos Rodríguez — Consulta dental                   │
│         📋 Last visit: March 15 │ ⚠️ Pending payment: ₡56,500│
│         [Open Profile] [Create Invoice]                      │
│                                                              │
│  10:30  Ana López — Limpieza dental                          │
│         📋 Last visit: February 28 │ ✅ No pending payments   │
│         [Open Profile] [Create Invoice]                      │
│                                                              │
│  14:00  Pedro Mora — Control de ortodoncia                   │
│         📋 New patient (no previous visits)                   │
│         [Open Profile] [Create Invoice]                      │
├──────────────────────────────────────────────────────────────┤
│  📅 Tomorrow — April 5, 2026                                 │
│                                                              │
│  09:00  María Fernández — Extracción                         │
│  11:00  Luis Vargas — Consulta general                       │
│  15:00  Carmen Solís — Control post-operatorio               │
└──────────────────────────────────────────────────────────────┘
```

**Why show "last visit" and "pending payments":** Because when the receptionist sees "Carlos has a pending ₡56,500 payment," she can call him before the appointment to remind him — or prepare the payment terminal. This turns a passive schedule into an actionable worklist.

**How patient matching works:**

When a calendar event is created in ClinicCR, the `description` field includes the patient ID:
```json
{ "summary": "Carlos Rodríguez — Consulta dental", "description": "patientId:pat_xyz789" }
```

The backend parses the `description` to extract the `patientId`, then looks up the patient's last invoice, pending payments, and visit history.

**For events created outside ClinicCR (directly in Google Calendar):** The system matches by patient name (fuzzy match against `firstName + lastName`). If no match is found, the event is displayed without patient details.

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/schedule/today` | Today's appointments with patient details + payment status |
| GET | `/api/schedule/tomorrow` | Tomorrow's appointments with patient details |
| GET | `/api/schedule/date/:date` | Any specific date's appointments (format: YYYY-MM-DD) |

**What each endpoint returns:**
```json
{
  "date": "2026-04-04",
  "appointments": [
    {
      "calendarEventId": "abc123",
      "summary": "Carlos Rodríguez — Consulta dental",
      "startTime": "09:00",
      "endTime": "10:00",
      "patient": {
        "id": "pat_xyz789",
        "name": "Carlos Rodríguez",
        "identificationType": "01",
        "identificationNumber": "112340567",
        "phone": "+50688881234",
        "lastVisit": "2026-03-15",
        "pendingPayment": {
          "hasPending": true,
          "amount": 56500,
          "invoiceId": "inv_abc123",
          "dueDate": "2026-03-30"
        }
      },
      "matched": true
    }
  ]
}
```

**If Google Calendar is not connected:** Return `400: "Google Calendar not connected. Log in with Google to see scheduled patients."`

### Implementation Notes

- This module combines data from Google Calendar (events) and the local database (patient records, invoices)
- "Pending payment" = an invoice with `saleCondition: '02'` (credit) where `creditTermDays` has passed and `haciendaStatus: 'accepted'`
- Patient matching: first check `description` for `patientId:`, then fuzzy-match by name
- Cache today's schedule for 2 minutes (calendar events don't change every second)

### Objectives

- [ ] Dashboard shows today's and tomorrow's appointments with patient details
- [ ] Each appointment shows: patient name, last visit date, pending payment status
- [ ] Events are matched to patients by ID (from description) or by name (fuzzy match)
- [ ] Unmatched events (created directly in Google Calendar) display without patient data
- [ ] Works for any specific date via `/schedule/date/:date`
- [ ] Returns clear error when Google Calendar is not connected

---

## Improvement 4: Pending Payments — Reminders & Alerts

### What is it?

A system to identify patients with overdue payments, send them reminders (via email or WhatsApp), and create alerts for the doctor/receptionist to follow up — with the ability to close or dismiss alerts once resolved.

### Why does this matter?

Because clinics in Costa Rica commonly offer credit (`saleCondition: '02'`) — the patient receives the service today and pays within 15 or 30 days. Without a tracking system:

- **The clinic forgets** who owes money. After 30 days, the receptionist can't remember which patients haven't paid.
- **The patient forgets** they owe money. A friendly reminder via WhatsApp ("Hola Carlos, tienes un saldo pendiente de ₡56,500") would solve it immediately.
- **The doctor doesn't know** the patient has unpaid bills. Carlos walks in for his follow-up appointment, and nobody mentions the pending payment. The bill grows.

This improvement creates a complete payment follow-up workflow:

```
Invoice created on credit (30 days) → Day 30: system flags as overdue
→ Receptionist sees alert: "Carlos Rodríguez — ₡56,500 overdue"
→ She clicks "Send Reminder" → patient receives WhatsApp/email
→ Patient pays → receptionist marks alert as "Resolved" → alert disappears
```

### How does it work?

#### Part A: Pending Payments List

**What makes a payment "pending"?**

```
An invoice is considered "pending payment" when ALL of these are true:
  1. saleCondition === '02' (credit)
  2. haciendaStatus === 'accepted' (the invoice is legally valid)
  3. The credit term has passed: createdAt + creditTermDays < today
  4. No payment has been recorded (the invoice hasn't been marked as paid)
```

**Why we need a `paymentStatus` field on invoices:** Because currently, the invoice only tracks `haciendaStatus` (whether Hacienda accepted it), not whether the patient actually paid. A new field `paymentStatus` with values `paid`, `pending`, `overdue` closes this gap.

**New endpoint:**

```
GET /api/payments/pending?page=1&limit=20
```

**Returns:**
```json
{
  "data": [
    {
      "invoiceId": "inv_abc123",
      "consecutivo": "001-00001-01-0000000001",
      "patient": {
        "id": "pat_xyz789",
        "name": "Carlos Rodríguez",
        "phone": "+50688881234",
        "email": "carlos@email.com"
      },
      "amount": 56500,
      "invoiceDate": "2026-03-04",
      "dueDate": "2026-04-03",
      "daysOverdue": 1,
      "remindersSent": 0,
      "lastReminderAt": null
    }
  ],
  "total": 5,
  "totalOverdueAmount": 187500
}
```

#### Part B: Send Payment Reminders

**Via Email:**
```
POST /api/payments/:invoiceId/remind-email
{ "message": "Estimado Carlos, le recordamos su saldo pendiente." }
```

**Sends:**
```
Subject: Recordatorio de pago — Clínica Dental González
Body:
  "Estimado Carlos Rodríguez,

   Le recordamos que tiene un saldo pendiente:
   📋 Factura: 001-00001-01-0000000001
   📅 Fecha: 04/03/2026
   💰 Monto: ₡56,500
   ⏰ Vencimiento: 03/04/2026

   Por favor, comuníquese con nosotros para coordinar su pago.

   Clínica Dental González
   Tel: 2223-4567"
```

**Via WhatsApp:**
```
POST /api/payments/:invoiceId/remind-whatsapp
```

**Sends:**
```
🏥 Clínica Dental González
📋 Recordatorio de pago

Estimado Carlos, le recordamos su saldo pendiente:
💰 Monto: ₡56,500
📅 Vencimiento: 03/04/2026

Por favor contáctenos al 2223-4567 para coordinar su pago. ¡Gracias!
```

**Why track `remindersSent` and `lastReminderAt`:** Because sending 5 reminders in one day is harassment. The system should show how many reminders have been sent and when the last one was. The frontend can use this to disable the "Send Reminder" button if one was sent recently (e.g., within the last 3 days).

#### Part C: Doctor/Staff Alerts

**What is an alert?** A notification that appears in the app for a specific user (or all users in the clinic) about something that needs attention — in this case, overdue payments.

**Alert schema:**
```
Alert {
  clinicId: ObjectId (required)
  type: 'payment_overdue' | 'payment_reminder' | 'general'
  title: "Pago pendiente — Carlos Rodríguez"
  message: "₡56,500 vencido desde hace 1 día"
  referenceType: 'invoice' | 'patient'
  referenceId: ObjectId (the invoice or patient ID)
  severity: 'info' | 'warning' | 'critical'
  isRead: boolean (default false)
  isDismissed: boolean (default false)
  createdAt: Date
}
```

**Why severity levels:**
- `info` → payment due in 3 days (yellow)
- `warning` → payment overdue 1-7 days (orange)
- `critical` → payment overdue 7+ days (red)

**How alerts are created:**
- A **cron job** runs daily (e.g., at 8:00 AM) and scans for:
  - Invoices on credit where due date is in 3 days → create `info` alert
  - Invoices where due date has passed → create `warning` alert (if <= 7 days) or `critical` alert (if > 7 days)
- Alerts are NOT duplicated — if an alert for this invoice already exists and is not dismissed, update it instead

**How alerts are displayed:**

```
┌───────────────────────────────────────────────────────┐
│  🔔 Alerts (3)                                         │
│                                                        │
│  🔴 Carlos Rodríguez — ₡56,500 overdue (1 day)        │
│     [Send Reminder] [Mark as Paid] [Dismiss]           │
│                                                        │
│  🟠 Ana López — ₡32,000 overdue (3 days)              │
│     [Send Reminder] [Mark as Paid] [Dismiss]           │
│                                                        │
│  🟡 Pedro Mora — ₡45,000 due in 3 days               │
│     [Send Reminder] [Dismiss]                          │
└───────────────────────────────────────────────────────┘
```

**"Mark as Paid"** → Updates the invoice's `paymentStatus` to `paid` and auto-dismisses the alert.

**"Dismiss"** → Hides the alert for the current user (doesn't affect other staff in the same clinic). Used when the doctor sees the alert, acknowledges it, and wants it gone.

### New Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments/pending` | List overdue invoices with patient info |
| POST | `/api/payments/:invoiceId/remind-email` | Send payment reminder via email |
| POST | `/api/payments/:invoiceId/remind-whatsapp` | Send payment reminder via WhatsApp |
| PATCH | `/api/payments/:invoiceId/mark-paid` | Mark invoice as paid |
| GET | `/api/alerts` | List active alerts for current clinic |
| GET | `/api/alerts/count` | Get unread alert count (for badge on bell icon) |
| PATCH | `/api/alerts/:id/read` | Mark alert as read |
| PATCH | `/api/alerts/:id/dismiss` | Dismiss alert |
| DELETE | `/api/alerts/:id` | Delete alert permanently |

### Implementation Notes

- **Invoice schema change:** Add `paymentStatus: 'paid' | 'pending' | 'overdue'` (default `'paid'` for cash invoices, `'pending'` for credit invoices)
- **Invoice schema change:** Add `remindersSent: number` (default 0) and `lastReminderAt: Date`
- **New schema:** `Alert` with clinicId, type, title, message, referenceType, referenceId, severity, isRead, isDismissed
- **Cron job:** `@Cron('0 8 * * *')` — runs daily at 8:00 AM to scan overdue invoices and create/update alerts
- Reuse existing `InvoiceEmailService` and `InvoiceWhatsappService` for sending reminders (same SMTP/Twilio config)

### Objectives

- [ ] Pending payments list shows all overdue invoices with patient info, amount, days overdue
- [ ] Payment reminders can be sent via email or WhatsApp with professional templates
- [ ] `remindersSent` and `lastReminderAt` tracked per invoice to prevent over-reminding
- [ ] Invoices can be marked as "paid" which updates `paymentStatus` and dismisses related alerts
- [ ] Alert system shows overdue payments with severity levels (info/warning/critical)
- [ ] Alerts can be read, dismissed, or deleted by staff
- [ ] Cron job creates/updates alerts daily at 8:00 AM
- [ ] Unread alert count available for notification badge
- [ ] All data scoped by clinicId

---

## Implementation Order

```
Phase 1: Safe Delete & Update Rules       ← Bug fixes + foundational changes (FIRST)
    │
Phase 2: Analytics Module                  ← Depends on clean invoice data from Phase 1
    │
Phase 3: Pending Payments & Alerts         ← Depends on paymentStatus from Phase 1
    │
Phase 4: Scheduled Patients                ← Depends on pending payment data from Phase 3
```

**Phase 1 must go first** because it fixes the `findOne()` bug and adds `isArchived`/`paymentStatus` to invoices — both of which are needed by Phases 2, 3, and 4.

---

## Summary

| Phase | Feature | New Endpoints | What It Enables |
|-------|---------|--------------|-----------------|
| 1 | Safe Delete & Update Rules | ~6 | Data integrity, audit compliance, cascade soft-delete |
| 2 | Analytics Module | 5 | Business intelligence, revenue tracking, patient growth |
| 3 | Scheduled Patients | 3 | "Who's coming today/tomorrow?" with patient context |
| 4 | Pending Payments & Alerts | 9 | Payment tracking, reminders, doctor notifications |
| **Total** | | **~23** | **~87 total endpoints** |
