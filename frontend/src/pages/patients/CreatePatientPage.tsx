import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, UserPlus, ShieldCheck, Info, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import MedicalRecordForm from "@/components/patients/MedicalRecordForm";

const ID_TYPES = [
  { value: "01", label: "Cédula Física", placeholder: "112340567", maxLength: 9 },
  { value: "02", label: "Cédula Jurídica", placeholder: "3101123456", maxLength: 10 },
  { value: "03", label: "DIMEX", placeholder: "100400800123", maxLength: 12 },
  { value: "04", label: "NITE", placeholder: "1234567890", maxLength: 10 },
];

const PROVINCES = [
  { value: "1", label: "San José" },
  { value: "2", label: "Alajuela" },
  { value: "3", label: "Cartago" },
  { value: "4", label: "Heredia" },
  { value: "5", label: "Guanacaste" },
  { value: "6", label: "Puntarenas" },
  { value: "7", label: "Limón" },
];


const CreatePatientPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [idType, setIdType] = useState("01");
  const [includeMedical, setIncludeMedical] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState("");
  const [conditionInput, setConditionInput] = useState("");
  const [medicationInput, setMedicationInput] = useState("");

  const selectedIdType = ID_TYPES.find((t) => t.value === idType) || ID_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(includeMedical ? "Paciente y expediente registrados exitosamente" : "Paciente registrado exitosamente");
      navigate("/patients");
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/patients">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Paciente</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Registre los datos del paciente. La información marcada con * es requerida para facturar.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">¿Por qué se necesitan estos datos?</p>
          <p>La cédula, nombre y correo del paciente se incluyen en cada factura electrónica que se envía a Hacienda. Sin estos datos, no es posible generar facturas válidas.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Datos personales */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Datos Personales</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Información básica del paciente para registro y facturación</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input placeholder="Carlos" required />
              </div>
              <div className="space-y-2">
                <Label>Apellidos *</Label>
                <Input placeholder="Rodríguez Mora" required />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Tipo de Identificación *</Label>
                <select value={idType} onChange={(e) => setIdType(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  {ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.value} - {t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Número de Identificación *</Label>
                <div className="flex gap-2">
                  <Input placeholder={selectedIdType.placeholder} maxLength={selectedIdType.maxLength} className="font-mono-code flex-1" required />
                  <Button type="button" variant="outline" size="icon" title="Verificar con Hacienda">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Puede verificar la cédula con Hacienda antes de guardar</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" placeholder="carlos@email.com" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <div className="flex gap-2">
                  <Input defaultValue="+506" className="w-20 font-mono-code text-center" readOnly />
                  <Input placeholder="8888-1234" className="font-mono-code flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Dirección</h2>
            <p className="text-sm text-muted-foreground mt-1">Opcional — se usa para referencia interna, no se envía a Hacienda</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Provincia</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Seleccionar...</option>
                  {PROVINCES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Cantón</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Seleccionar provincia primero</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Distrito</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Seleccionar cantón primero</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Otras Señas</Label>
              <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="200m norte del parque, casa color azul" />
            </div>
          </div>
        </div>

        {/* Medical Record - Collapsible */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Stethoscope className="h-5 w-5 text-secondary" />
                <div>
                  <h2 className="font-semibold text-card-foreground">Expediente Médico</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">Opcional — complete ahora o después desde el perfil del paciente</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-medical"
                  checked={includeMedical}
                  onCheckedChange={(checked) => setIncludeMedical(checked === true)}
                />
                <Label htmlFor="include-medical" className="text-sm cursor-pointer">Agregar ahora</Label>
              </div>
            </div>
          </div>

          {includeMedical && (
            <MedicalRecordForm
              allergies={allergies}
              setAllergies={setAllergies}
              conditions={conditions}
              setConditions={setConditions}
              medications={medications}
              setMedications={setMedications}
              allergyInput={allergyInput}
              setAllergyInput={setAllergyInput}
              conditionInput={conditionInput}
              setConditionInput={setConditionInput}
              medicationInput={medicationInput}
              setMedicationInput={setMedicationInput}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/patients">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar Paciente
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreatePatientPage;
