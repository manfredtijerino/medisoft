# ClinicCR — Local Testing Guide

> Test every endpoint in the right order using `curl`. Each step builds on the previous — **follow the sequence**.

---

## 1. Start the Backend

```bash
cd clinic-cr-backend
npm install
npm run start:dev
```

Verify it's running:

```bash
curl http://localhost:3000/api/health
```

**Expected output:**
```json
{ "success": true, "data": { "status": "ok", "db": "connected", "timestamp": "2026-04-04T..." } }
```

**If `db: "disconnected"`:** MongoDB isn't running. Start it with `mongod` or `brew services start mongodb-community`, then restart the server.

---

## 2. Auth — Register & Login

**Why first:** Every endpoint after this requires a JWT token. No token = `401 Unauthorized`.

### 2.1 Register

```bash
curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "María",
    "lastName": "González",
    "email": "maria@test.com",
    "password": "Secure@Pass123",
    "confirmPassword": "Secure@Pass123"
  }'
```

**Expected output:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "firstName": "María",
      "lastName": "González",
      "email": "maria@test.com",
      "clinicId": "...",
      "role": "owner"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### 2.2 Login & Capture Token

```bash
# Login and save the token to a variable
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@test.com","password":"Secure@Pass123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

echo $TOKEN
```

**Why save the token:** Every command below uses `$TOKEN`. Run this once and the rest of the guide works with copy-paste.

### 2.3 Get Profile

```bash
curl -s http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Your user profile with `id`, `firstName`, `clinicId`, etc.

### 2.4 Forgot Password

```bash
curl -s -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@test.com"}'
```

**Expected:** `{ "success": true, "data": { "message": "If an account with that email exists..." } }`

**Check the server terminal** — the reset token is printed to the console:
```
[DEV] Password reset token for maria@test.com: a1b2c3d4e5f6...
```

### 2.5 Reset Password

```bash
# Replace with the token from the server console
curl -s -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "PASTE_TOKEN_FROM_CONSOLE_HERE",
    "newPassword": "NewSecure@Pass456",
    "confirmNewPassword": "NewSecure@Pass456"
  }'
```

**Expected:** `{ "success": true, "data": { "message": "Password has been reset successfully" } }`

---

## 3. Clinic Settings — Configure Business Profile

**Why next:** Invoice generation requires a complete clinic profile (name, cédula, address). Without it, XML generation fails because there's no issuer data.

### 3.1 Get Settings (initially empty)

```bash
curl -s http://localhost:3000/api/clinic-settings \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** A settings document with default empty values.

### 3.2 Update Business Info

```bash
curl -s -X PATCH http://localhost:3000/api/clinic-settings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Clínica Dental González S.A.",
    "commercialName": "Clínica González",
    "identificationType": "02",
    "identificationNumber": "3101123456",
    "economicActivityCode": "862010",
    "email": "info@clinicagonzalez.com",
    "phone": { "countryCode": "506", "number": "22234567" },
    "location": {
      "province": "1",
      "canton": "01",
      "district": "01",
      "neighborhood": "Barrio Escalante",
      "otherSigns": "200m norte del parque"
    }
  }'
```

**Expected:** The updated settings document with all fields populated.

### 3.3 Link Hacienda (requires real .p12 file)

```bash
# Only run this if you have a real .p12 certificate
curl -s -X POST http://localhost:3000/api/clinic-settings/hacienda/link \
  -H "Authorization: Bearer $TOKEN" \
  -F "atvUsername=cpf-02-3101-123456" \
  -F "atvPassword=your-atv-password" \
  -F "cryptoKeyPin=1234" \
  -F "environment=staging" \
  -F "callbackUrl=http://localhost:3000/api/invoices/webhook" \
  -F "cryptoKeyP12=@/path/to/your/certificate.p12"
```

**Expected:** Settings with `hacienda.isLinked: true`.

**If you don't have a .p12:** Skip steps 3.3-3.5. You can still test everything except sending invoices to Hacienda.

### 3.4 Test Hacienda Connection

```bash
curl -s -X POST http://localhost:3000/api/clinic-settings/hacienda/test \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (if linked):** `{ "message": "Hacienda connection successful", "environment": "staging", "tokenObtained": true }`

### 3.5 Unlink Hacienda

```bash
curl -s -X POST http://localhost:3000/api/clinic-settings/hacienda/unlink \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Settings with all `hacienda` fields cleared and `isLinked: false`.

---

## 4. Form Templates — Define Custom Patient Fields

**Why before patients:** Patients can reference a form template for custom fields. Creating the template first lets us test the full patient flow.

### 4.1 Create Template

```bash
TEMPLATE=$(curl -s -X POST http://localhost:3000/api/form-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dental Intake Form",
    "description": "Standard dental patient intake",
    "fields": [
      { "fieldKey": "blood_type", "label": "Blood Type", "fieldType": "select", "options": ["A+","A-","B+","B-","AB+","AB-","O+","O-"], "required": true, "order": 1 },
      { "fieldKey": "allergies", "label": "Allergies", "fieldType": "textarea", "required": false, "order": 2 },
      { "fieldKey": "emergency_phone", "label": "Emergency Contact", "fieldType": "phone", "required": true, "order": 3 }
    ]
  }')

echo $TEMPLATE

# Save the template ID
TEMPLATE_ID=$(echo $TEMPLATE | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Template ID: $TEMPLATE_ID"
```

**Expected:** A template document with 3 fields.

### 4.2 List Templates

```bash
curl -s http://localhost:3000/api/form-templates \
  -H "Authorization: Bearer $TOKEN"
```

### 4.3 Set as Default

```bash
curl -s -X PATCH http://localhost:3000/api/form-templates/$TEMPLATE_ID/default \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Template with `isDefault: true`.

---

## 5. Patients — Register Who You Serve

**Why before products:** Invoices need both a patient (receiver) and products (line items). Patients are simpler, so we test them first.

### 5.1 Create Patient (with custom fields)

```bash
PATIENT=$(curl -s -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Carlos",
    "lastName": "Rodríguez Mora",
    "identificationType": "01",
    "identificationNumber": "112340567",
    "email": "carlos@email.com",
    "phone": { "countryCode": "506", "number": "88881234" },
    "address": {
      "province": "San José",
      "canton": "Central",
      "district": "Carmen",
      "otherSigns": "Frente al parque"
    },
    "formTemplateId": "'"$TEMPLATE_ID"'",
    "customFields": {
      "blood_type": "O+",
      "allergies": "Penicillin",
      "emergency_phone": "88889999"
    }
  }')

echo $PATIENT

PATIENT_ID=$(echo $PATIENT | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Patient ID: $PATIENT_ID"
```

**Expected:** A patient with both core fields and `customFields` populated.

### 5.2 Test Validation — Missing Required Custom Field

```bash
curl -s -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ana",
    "lastName": "López",
    "identificationType": "01",
    "identificationNumber": "998877665",
    "formTemplateId": "'"$TEMPLATE_ID"'",
    "customFields": {
      "allergies": "None"
    }
  }'
```

**Expected:** `400` error because `blood_type` and `emergency_phone` are required by the template.

### 5.3 List Patients

```bash
curl -s "http://localhost:3000/api/patients?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Paginated result with `data`, `total`, `page`, `limit`, `totalPages`.

### 5.4 Search Patients

```bash
curl -s "http://localhost:3000/api/patients/search?q=carlos" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Array containing Carlos Rodríguez.

### 5.5 Get Patient by ID

```bash
curl -s http://localhost:3000/api/patients/$PATIENT_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 5.6 Validate Cédula with Hacienda

```bash
curl -s http://localhost:3000/api/patients/$PATIENT_ID/validate-hacienda \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Taxpayer data from Hacienda's public API (name, activities) — or an error if the cédula doesn't exist in their system.

---

## 6. CABYS — Search the Government Product Catalog

**Why before products:** Products require a 13-digit CABYS code. This endpoint lets you find the right code.

### 6.1 Search CABYS

```bash
curl -s "http://localhost:3000/api/cabys/search?q=consulta%20dental&top=5" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Array of CABYS results with `codigo` (13 digits) and `descripcion`.

**Note:** This calls Hacienda's API directly. If it's slow or fails, Hacienda might be down (common during off-hours). The result gets cached in MongoDB for 30 days.

### 6.2 Get CABYS by Code

```bash
curl -s http://localhost:3000/api/cabys/8621001000100 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 7. Products — Define What You Charge For

**Why before invoices:** Each invoice line item references a product. You need at least one product to create an invoice.

### 7.1 Create Product

```bash
PRODUCT=$(curl -s -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Consulta Dental General",
    "description": "Consulta y evaluación dental",
    "cabysCode": "8621001000100",
    "price": 45000,
    "currency": "CRC",
    "tax": { "code": "01", "rateCode": "08", "rate": 13 },
    "unitOfMeasure": "Sp",
    "type": "service"
  }')

echo $PRODUCT

PRODUCT_ID=$(echo $PRODUCT | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Product ID: $PRODUCT_ID"
```

**Expected:** Product document with `cabysDescription` auto-populated from the CABYS catalog.

### 7.2 Test Validation — Invalid CABYS Code

```bash
curl -s -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Bad Product",
    "cabysCode": "123",
    "price": 1000,
    "tax": { "code": "01", "rateCode": "08", "rate": 13 },
    "unitOfMeasure": "Unid",
    "type": "product"
  }'
```

**Expected:** `400` error — CABYS code must be exactly 13 characters.

### 7.3 List Products

```bash
curl -s "http://localhost:3000/api/products?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 7.4 Update Product Price

```bash
curl -s -X PATCH http://localhost:3000/api/products/$PRODUCT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "price": 50000 }'
```

**Expected:** Product with updated price `50000`.

---

## 8. Invoices — The Main Event

**Why this order matters:** Invoices reference patients (receiver) and products (line items). Both must exist first. Also, clinic settings must have business info (issuer data for the XML).

### 8.1 Create Invoice (without sending to Hacienda)

```bash
INVOICE=$(curl -s -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "01",
    "patientId": "'"$PATIENT_ID"'",
    "saleCondition": "01",
    "paymentMethods": [
      { "code": "02", "amount": 56500 }
    ],
    "items": [
      {
        "productId": "'"$PRODUCT_ID"'",
        "quantity": 1,
        "discounts": []
      }
    ],
    "currency": "CRC",
    "notes": "Paciente regular",
    "sendToHacienda": false
  }')

echo $INVOICE

INVOICE_ID=$(echo $INVOICE | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Invoice ID: $INVOICE_ID"
```

**Expected output (key fields):**
```json
{
  "success": true,
  "data": {
    "clave": "50604042600310112345600100001010000000001...",
    "consecutivo": "00100001010000000001",
    "documentType": "01",
    "haciendaStatus": "pending",
    "items": [{
      "description": "Consulta Dental General",
      "quantity": 1,
      "unitPrice": 50000,
      "subtotal": 50000,
      "netTotal": 50000,
      "tax": { "code": "01", "rate": 13, "amount": 6500 },
      "lineTotal": 56500
    }],
    "summary": {
      "totalTaxableServices": 50000,
      "totalTax": 6500,
      "totalVoucher": 56500
    },
    "signedXml": "PD94bWwgdm..."
  }
}
```

**Why `sendToHacienda: false`:** Lets you test invoice creation, XML generation, and signing without needing real Hacienda credentials. The invoice is saved with status `pending`.

**How the payment amount was calculated:**
- 1 × ₡50,000 = ₡50,000 (subtotal)
- IVA 13% = ₡6,500
- Total = ₡56,500
- Payment method amount must match this total exactly

### 8.2 Test Validation — Payment Mismatch

```bash
curl -s -X POST http://localhost:3000/api/invoices \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "documentType": "01",
    "patientId": "'"$PATIENT_ID"'",
    "saleCondition": "01",
    "paymentMethods": [{ "code": "01", "amount": 99999 }],
    "items": [{ "productId": "'"$PRODUCT_ID"'", "quantity": 1, "discounts": [] }]
  }'
```

**Expected:** `400` error — payment total doesn't match invoice total.

### 8.3 List Invoices

```bash
curl -s "http://localhost:3000/api/invoices?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.4 Filter by Status

```bash
curl -s "http://localhost:3000/api/invoices?status=pending" \
  -H "Authorization: Bearer $TOKEN"
```

### 8.5 Get Invoice Detail

```bash
curl -s http://localhost:3000/api/invoices/$INVOICE_ID \
  -H "Authorization: Bearer $TOKEN"
```

### 8.6 Download Signed XML

```bash
curl -s http://localhost:3000/api/invoices/$INVOICE_ID/xml \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** The signed XML document (or Base64-encoded string).

### 8.7 Send to Hacienda (requires linked Hacienda credentials)

```bash
curl -s -X POST http://localhost:3000/api/invoices/$INVOICE_ID/send \
  -H "Authorization: Bearer $TOKEN"
```

**Expected (if Hacienda linked):** Status changes to `sent`. Check status with:

```bash
curl -s http://localhost:3000/api/invoices/$INVOICE_ID/status \
  -H "Authorization: Bearer $TOKEN"
```

### 8.8 Create Credit Note (requires accepted invoice)

```bash
# Only works if the invoice has haciendaStatus: "accepted"
curl -s -X POST http://localhost:3000/api/invoices/$INVOICE_ID/credit-note \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "referenceCode": "01",
    "reason": "Paciente no recibió el servicio",
    "items": [
      { "productId": "'"$PRODUCT_ID"'", "quantity": 1, "discounts": [] }
    ],
    "sendToHacienda": false
  }'
```

**Expected (if invoice accepted):** New invoice with `documentType: "03"` and a `references` array pointing to the original.

**Expected (if invoice not accepted):** `400` error — can only issue credit notes for accepted invoices.

---

## 9. Hacienda Utilities

### 9.1 Exchange Rate

```bash
curl -s http://localhost:3000/api/hacienda/exchange-rate \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Current USD/EUR exchange rates from Hacienda (or error if their API is down).

### 9.2 Taxpayer Lookup

```bash
curl -s http://localhost:3000/api/hacienda/taxpayer/3101123456 \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Taxpayer name, identification type, economic activities.

### 9.3 Tax Exemption Lookup

```bash
curl -s http://localhost:3000/api/hacienda/exemption/AL-0001-2026 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Quick Reference — Copy-Paste Block

Run this entire block to set up all variables at once (after steps 1-2):

```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"maria@test.com","password":"Secure@Pass123"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# Create template
TEMPLATE_ID=$(curl -s -X POST http://localhost:3000/api/form-templates \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Quick Template","fields":[{"fieldKey":"notes","label":"Notes","fieldType":"text","required":false,"order":1}]}' \
  | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create patient
PATIENT_ID=$(curl -s -X POST http://localhost:3000/api/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"Patient","identificationType":"01","identificationNumber":"112340567"}' \
  | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

# Create product
PRODUCT_ID=$(curl -s -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Service","cabysCode":"8621001000100","price":10000,"tax":{"code":"01","rateCode":"08","rate":13},"unitOfMeasure":"Sp","type":"service"}' \
  | grep -o '"_id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "TOKEN: $TOKEN"
echo "TEMPLATE_ID: $TEMPLATE_ID"
echo "PATIENT_ID: $PATIENT_ID"
echo "PRODUCT_ID: $PRODUCT_ID"
```

---

## Testing Flow Diagram

```
Health Check ──→ Register ──→ Login ($TOKEN)
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              Clinic Settings   Form Templates  CABYS Search
                    │             │              │
                    ▼             ▼              ▼
              Hacienda Link    Patients       Products
                    │             │              │
                    └─────────────┼──────────────┘
                                  ▼
                           Create Invoice
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
              Send to Hacienda  Get XML    Credit/Debit Note
                    │
                    ▼
              Check Status (accepted/rejected)
```
