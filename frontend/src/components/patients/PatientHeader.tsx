import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PatientHeaderProps {
  patient: {
    firstName: string;
    lastName: string;
    identificationNumber: string;
    invoiceCount: number;
    isActive: boolean;
  };
}

export const PatientHeader = ({ patient }: PatientHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-center gap-3">
      <Link to="/patients">
        <Button variant="ghost" size="icon" className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </Link>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">{patient.firstName} {patient.lastName}</h1>
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            patient.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          )}>
            {patient.isActive ? "Activo" : "Inactivo"}
          </span>
        </div>
        <p className="text-muted-foreground text-sm mt-0.5 font-mono">
          Cédula: {patient.identificationNumber} · {patient.invoiceCount} facturas
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <Link to="/invoices/new">
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4" /> Facturar
        </Button>
      </Link>
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4" /> Editar
      </Button>
    </div>
  </div>
);
