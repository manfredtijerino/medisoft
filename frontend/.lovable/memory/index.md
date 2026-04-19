# Memory: index.md
Updated: just now

# Project Memory

## Core
- MediSoft is a clinic management SaaS for Costa Rica (rebranded from MediCR).
- UI in Costa Rican Spanish; code in English.
- NestJS backend with JWT via `api.ts`. All data strictly scoped by `clinicId`.
- Conform to CR standards: physical/legal/DIMEX/NITE IDs, +506 phones, Prov/Canton/Dist addresses.
- Vite config dedupes `react`, `react-dom`, `react-router-dom` to avoid context errors.

## Memories
- [Visual Direction](mem://style/visual-direction) — Deep Blue/Teal, Inter/Plus Jakarta Sans for UI, faded CR map on auth
- [Architecture](mem://tech/architecture) — NestJS backend, JWT api.ts, Demo Mode with María González
- [CR Standards](mem://localization/costa-rica-standards) — Formatting for IDs, currency, phone numbers, and addresses
- [Electronic Invoicing](mem://features/electronic-invoicing) — XML generation, .p12, Hacienda API, ATV credentials, 13-digit CABYS
- [Invoice Creation UX](mem://ux/invoice-creation) — Keyboard nav, categorized catalog, intelligent patient search
- [Design Principles](mem://ux/design-principles) — TabExplainer pattern for Settings, animate-fade-in transitions
- [Google OAuth](mem://auth/google-oauth) — Auth via /auth/callback route
- [Analytics](mem://features/analytics) — Recharts dashboards for revenue, payment methods, performance
- [Invoice Management](mem://features/invoice-management) — Real-time status, download XML/PDF, share WA/Email, credit/debit notes
- [Calendar Integration](mem://features/calendar-integration) — 7am-6pm appointments, 'Pacientes de Hoy', simulated Google Cal
- [React Runtime Safety](mem://tech/react-runtime-safety) — Vite dedupe rules for React
- [Table Navigation](mem://ux/table-navigation) — Standardized pagination (5-10 items) with Anterior/Siguiente
- [Patient Profiles](mem://features/patient-profiles) — Modular architecture with demographic, medical, clinical, billing tabs
- [Clinical Documentation](mem://features/clinical-documentation) — Rich text editor, Informed Consent template, image uploads
- [Installment Plans](mem://features/payment-installment-plans) — 'Varios Pagos' (03) sale condition
- [Billing Summary](mem://features/patient-billing-summary) — Overview of total invoiced, paid, and outstanding balances
- [Medical Integration](mem://features/patient-creation-medical-integration) — Vital signs, surgical, lifestyle, OB-GYN history at registration
- [Patient List Operational View](mem://features/patient-list-operational-view) — Command center table with 'Cobros', next appt, alert levels
- [Notification Templates](mem://features/notification-templates) — 10+ templates for WhatsApp, Email, in-app with dynamic variables
- [Alert Configuration](mem://features/alert-configuration-management) — 9 types of global rules segmented by audience (Doctor, Staff, Patient)
- [Follow-up Reminders](mem://features/patient-follow-up-reminders) — Multi-audience alerts (72h, 48h, 24h, 1h)
- [Notification Delivery](mem://features/notification-delivery-control) — Auto-Send vs Requires Approval workflows
- [Consultation Management](mem://features/clinical-consultation-management) — 'Nueva Consulta' dialog for vitals, diagnosis, plan
- [Frontend Interactivity](mem://ux/frontend-interactivity) — Success toasts, confirmation modals, dynamic inline management
- [Radix Tooltip](mem://tech/dependency-constraints/radix-tooltip-versioning) — Strictly pin @radix-ui/react-tooltip to 1.1.4
- [Team Management RBAC](mem://features/team-management-rbac) — Admin, Doctor, Receptionist, Staff roles. Settings restricted to Admin/Doctor.
