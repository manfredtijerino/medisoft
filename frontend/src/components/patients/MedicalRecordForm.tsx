import { useState } from "react";
import { Plus, X, Heart, Brain, Eye, Bone, Baby, Pill, Syringe, Activity, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MEDICAL_TEMPLATES = [
  { value: "general", label: "Consulta General" },
  { value: "dental", label: "Odontología" },
  { value: "derma", label: "Dermatología" },
  { value: "fisio", label: "Fisioterapia" },
  { value: "custom", label: "Personalizado" },
];

const FAMILY_RELATIONS = ["Padre", "Madre", "Hermano/a", "Abuelo/a", "Tío/a"];

const LIFESTYLE_OPTIONS = {
  smoking: ["No fuma", "Ex-fumador", "Ocasional", "Diario"],
  alcohol: ["No bebe", "Ocasional", "Moderado", "Frecuente"],
  exercise: ["Sedentario", "Ligero (1-2x/sem)", "Moderado (3-4x/sem)", "Activo (5+/sem)"],
  diet: ["Regular", "Vegetariana", "Vegana", "Keto", "Sin gluten", "Otra"],
};

interface MedicalRecordFormProps {
  allergies: string[];
  setAllergies: (v: string[]) => void;
  conditions: string[];
  setConditions: (v: string[]) => void;
  medications: string[];
  setMedications: (v: string[]) => void;
  allergyInput: string;
  setAllergyInput: (v: string) => void;
  conditionInput: string;
  setConditionInput: (v: string) => void;
  medicationInput: string;
  setMedicationInput: (v: string) => void;
}

const MedicalRecordForm = ({
  allergies, setAllergies, conditions, setConditions, medications, setMedications,
  allergyInput, setAllergyInput, conditionInput, setConditionInput, medicationInput, setMedicationInput,
}: MedicalRecordFormProps) => {
  const [surgeries, setSurgeries] = useState<string[]>([]);
  const [surgeryInput, setSurgeryInput] = useState("");
  const [vaccines, setVaccines] = useState<string[]>([]);
  const [vaccineInput, setVaccineInput] = useState("");
  const [familyHistory, setFamilyHistory] = useState<{ relation: string; condition: string }[]>([]);
  const [familyRelation, setFamilyRelation] = useState("Padre");
  const [familyCondition, setFamilyCondition] = useState("");

  const addTag = (list: string[], setList: (v: string[]) => void, input: string, setInput: (v: string) => void) => {
    const val = input.trim();
    if (val && !list.includes(val)) setList([...list, val]);
    setInput("");
  };

  const removeTag = (list: string[], setList: (v: string[]) => void, idx: number) => {
    setList(list.filter((_, i) => i !== idx));
  };

  const addFamilyHistory = () => {
    if (familyCondition.trim()) {
      setFamilyHistory([...familyHistory, { relation: familyRelation, condition: familyCondition.trim() }]);
      setFamilyCondition("");
    }
  };

  const TagInput = ({ label, tags, setTags, input, setInput, placeholder, icon: Icon }: {
    label: string; tags: string[]; setTags: (v: string[]) => void;
    input: string; setInput: (v: string) => void; placeholder: string;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {label}
      </Label>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tags, setTags, input, setInput); } }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button type="button" variant="outline" size="icon" onClick={() => addTag(tags, setTags, input, setInput)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              {tag}
              <button type="button" onClick={() => removeTag(tags, setTags, i)} className="hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Plantilla y datos básicos */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          Datos Generales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Plantilla de Expediente</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {MEDICAL_TEMPLATES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de Sangre</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Seleccionar...</option>
              {BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>{bt}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Signos vitales / medidas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-destructive" />
          Signos Vitales y Medidas
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Peso (kg)</Label>
            <Input type="number" placeholder="70" min={0} max={500} />
          </div>
          <div className="space-y-2">
            <Label>Estatura (cm)</Label>
            <Input type="number" placeholder="170" min={0} max={300} />
          </div>
          <div className="space-y-2">
            <Label>Presión Arterial</Label>
            <Input placeholder="120/80" />
          </div>
          <div className="space-y-2">
            <Label>Frec. Cardíaca</Label>
            <Input type="number" placeholder="72" />
          </div>
          <div className="space-y-2">
            <Label>Temperatura (°C)</Label>
            <Input type="number" placeholder="36.5" step={0.1} />
          </div>
          <div className="space-y-2">
            <Label>Saturación O₂ (%)</Label>
            <Input type="number" placeholder="98" min={0} max={100} />
          </div>
          <div className="space-y-2">
            <Label>Glucosa (mg/dL)</Label>
            <Input type="number" placeholder="90" />
          </div>
          <div className="space-y-2">
            <Label>IMC</Label>
            <Input placeholder="Auto" readOnly className="bg-muted/50" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Alergias, condiciones, medicamentos */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Alergias, Condiciones y Medicamentos
        </h3>
        <div className="space-y-5">
          <TagInput label="Alergias" icon={AlertTriangle} tags={allergies} setTags={setAllergies} input={allergyInput} setInput={setAllergyInput} placeholder="Ej: Penicilina, Látex, Mariscos..." />
          <TagInput label="Condiciones Crónicas" icon={Brain} tags={conditions} setTags={setConditions} input={conditionInput} setInput={setConditionInput} placeholder="Ej: Diabetes, Hipertensión, Asma..." />
          <TagInput label="Medicamentos Actuales" icon={Pill} tags={medications} setTags={setMedications} input={medicationInput} setInput={setMedicationInput} placeholder="Ej: Metformina 500mg, Losartán 50mg..." />
        </div>
      </div>

      <Separator />

      {/* Antecedentes quirúrgicos y vacunas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Bone className="h-4 w-4 text-secondary" />
          Antecedentes Quirúrgicos y Vacunas
        </h3>
        <div className="space-y-5">
          <TagInput label="Cirugías Previas" icon={Bone} tags={surgeries} setTags={setSurgeries} input={surgeryInput} setInput={setSurgeryInput} placeholder="Ej: Apendicectomía (2019), Artroscopia rodilla..." />
          <TagInput label="Vacunas Aplicadas" icon={Syringe} tags={vaccines} setTags={setVaccines} input={vaccineInput} setInput={setVaccineInput} placeholder="Ej: COVID-19 (Pfizer), Influenza 2024..." />
        </div>
      </div>

      <Separator />

      {/* Antecedentes familiares */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Baby className="h-4 w-4 text-primary" />
          Antecedentes Heredofamiliares
        </h3>
        <div className="flex gap-2">
          <select
            className="w-36 h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={familyRelation}
            onChange={(e) => setFamilyRelation(e.target.value)}
          >
            {FAMILY_RELATIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <Input
            value={familyCondition}
            onChange={(e) => setFamilyCondition(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFamilyHistory(); } }}
            placeholder="Ej: Diabetes tipo 2, Cáncer de colon..."
            className="flex-1"
          />
          <Button type="button" variant="outline" size="icon" onClick={addFamilyHistory}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {familyHistory.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {familyHistory.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary border border-secondary/20">
                {item.relation}: {item.condition}
                <button type="button" onClick={() => setFamilyHistory(familyHistory.filter((_, idx) => idx !== i))} className="hover:text-destructive transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Estilo de vida */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Eye className="h-4 w-4 text-primary" />
          Estilo de Vida
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>Tabaquismo</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {LIFESTYLE_OPTIONS.smoking.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Consumo de Alcohol</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {LIFESTYLE_OPTIONS.alcohol.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Actividad Física</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {LIFESTYLE_OPTIONS.exercise.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Dieta</Label>
            <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              {LIFESTYLE_OPTIONS.diet.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
          <div className="space-y-2">
            <Label>Horas de sueño promedio</Label>
            <Input type="number" placeholder="7" min={0} max={24} />
          </div>
          <div className="space-y-2">
            <Label>Ocupación</Label>
            <Input placeholder="Ej: Ingeniero, Docente, Ama de casa..." />
          </div>
        </div>
      </div>

      <Separator />

      {/* Ginecológicos (opcional) */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Baby className="h-4 w-4 text-pink-500" />
          Antecedentes Gineco-Obstétricos
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground ml-1">Opcional</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Gestas</Label>
            <Input type="number" placeholder="0" min={0} />
          </div>
          <div className="space-y-2">
            <Label>Partos</Label>
            <Input type="number" placeholder="0" min={0} />
          </div>
          <div className="space-y-2">
            <Label>Cesáreas</Label>
            <Input type="number" placeholder="0" min={0} />
          </div>
          <div className="space-y-2">
            <Label>Abortos</Label>
            <Input type="number" placeholder="0" min={0} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
          <div className="space-y-2">
            <Label>Última Menstruación (FUM)</Label>
            <Input type="date" />
          </div>
          <div className="space-y-2">
            <Label>Método Anticonceptivo</Label>
            <Input placeholder="Ej: DIU, Pastillas, Ninguno..." />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contacto de emergencia */}
      <div>
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
          <Heart className="h-4 w-4 text-destructive" />
          Contacto de Emergencia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>Nombre Completo</Label>
            <Input placeholder="Ana María Mora" />
          </div>
          <div className="space-y-2">
            <Label>Parentesco</Label>
            <Input placeholder="Ej: Esposa, Madre, Hijo..." />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input placeholder="8888-0000" className="font-mono-code" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Notas adicionales */}
      <div className="space-y-2">
        <Label>Notas Adicionales del Expediente</Label>
        <textarea
          className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          placeholder="Observaciones relevantes: preferencias del paciente, consideraciones especiales, información importante para el equipo clínico..."
        />
      </div>
    </div>
  );
};

export default MedicalRecordForm;
