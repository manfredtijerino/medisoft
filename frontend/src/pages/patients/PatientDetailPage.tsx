import { useState } from "react";
import { useParams } from "react-router-dom";
import { User, Heart, Stethoscope, FileText, AlertTriangle, Receipt, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { PatientHeader } from "@/components/patients/PatientHeader";
import { PatientInfoTab } from "@/components/patients/PatientInfoTab";
import { MedicalHistoryTab } from "@/components/patients/MedicalHistoryTab";
import { ConsultationsTab } from "@/components/patients/ConsultationsTab";
import { DocumentsTab } from "@/components/patients/DocumentsTab";
import { BillingTab } from "@/components/patients/BillingTab";
import { PatientReminders } from "@/components/patients/PatientReminders";

const MOCK_PATIENT = {
  id: "1",
  firstName: "Carlos",
  lastName: "Rodríguez Mora",
  identificationType: "01",
  identificationNumber: "112340567",
  email: "carlos@email.com",
  phone: "88881234",
  province: "San José",
  createdAt: "2026-03-15",
  invoiceCount: 3,
  isActive: true,
};

const MOCK_MEDICAL_RECORD = {
  bloodType: "O+",
  allergies: ["Penicilina", "Ibuprofeno"],
  chronicConditions: ["Hipertensión"],
  medications: [{ name: "Losartán", dose: "50mg", frequency: "1 vez al día" }],
  surgicalHistory: ["Apendicectomía (2018)"],
  familyHistory: "Diabetes tipo 2 (padre)",
  notes: "Paciente cooperador, revisión dental cada 6 meses",
};

const MOCK_CONSULTATIONS = [
  { id: "c1", date: "2026-04-02", complaint: "Dolor molar inferior derecho", diagnosis: "Caries profunda", treatment: "Calza temporal, programar endodoncia", doctor: "Dra. González", vitals: { bp: "130/85", hr: "72", temp: "36.5°C" }, followUp: "2026-04-18" },
  { id: "c2", date: "2026-03-20", complaint: "Limpieza programada", diagnosis: "Acumulación de sarro leve", treatment: "Limpieza ultrasónica", doctor: "Dra. González", vitals: { bp: "125/80", hr: "68", temp: "36.4°C" }, followUp: null },
  { id: "c3", date: "2026-03-01", complaint: "Consulta inicial", diagnosis: "Evaluación general — buen estado dental", treatment: "Radiografía panorámica, plan de tratamiento", doctor: "Dra. González", vitals: { bp: "120/78", hr: "70", temp: "36.6°C" }, followUp: "2026-03-20" },
];

type Tab = "info" | "medical" | "consultations" | "documents" | "billing" | "reminders";

const PatientDetailPage = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("info");

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "info", label: "Información", icon: User },
    { key: "medical", label: "Historial Médico", icon: Heart },
    { key: "consultations", label: "Consultas", icon: Stethoscope },
    { key: "documents", label: "Documentos", icon: FileText },
    { key: "billing", label: "Facturación", icon: Receipt },
    { key: "reminders", label: "Recordatorios", icon: Bell },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <PatientHeader patient={MOCK_PATIENT} />

      {MOCK_MEDICAL_RECORD.allergies.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
          <div>
            <p className="text-sm font-semibold text-destructive">⚠ Alergias</p>
            <p className="text-sm text-card-foreground">{MOCK_MEDICAL_RECORD.allergies.join(", ")}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "info" && <PatientInfoTab patient={MOCK_PATIENT} />}
      {activeTab === "medical" && <MedicalHistoryTab medical={MOCK_MEDICAL_RECORD} />}
      {activeTab === "consultations" && <ConsultationsTab consultations={MOCK_CONSULTATIONS} />}
      {activeTab === "documents" && <DocumentsTab />}
      {activeTab === "billing" && <BillingTab />}
      {activeTab === "reminders" && <PatientReminders patientName={`${MOCK_PATIENT.firstName} ${MOCK_PATIENT.lastName}`} />}
    </div>
  );
};

export default PatientDetailPage;
