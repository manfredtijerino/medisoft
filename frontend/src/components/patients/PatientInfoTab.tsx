interface PatientInfoProps {
  patient: {
    firstName: string;
    lastName: string;
    identificationNumber: string;
    email: string;
    phone: string;
    province: string;
    createdAt: string;
  };
}

export const PatientInfoTab = ({ patient }: PatientInfoProps) => (
  <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-5 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {[
        { label: "Nombre completo", value: `${patient.firstName} ${patient.lastName}` },
        { label: "Tipo y número de ID", value: `Cédula Física · ${patient.identificationNumber}`, mono: true },
        { label: "Correo electrónico", value: patient.email },
        { label: "Teléfono", value: `+506 ${patient.phone}`, mono: true },
        { label: "Provincia", value: patient.province },
        { label: "Fecha de registro", value: patient.createdAt },
      ].map((field) => (
        <div key={field.label} className="space-y-1">
          <p className="text-xs text-muted-foreground">{field.label}</p>
          <p className={`text-sm font-medium text-card-foreground ${field.mono ? "font-mono" : ""}`}>{field.value}</p>
        </div>
      ))}
    </div>
  </div>
);
