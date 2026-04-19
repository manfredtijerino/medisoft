import { useState } from "react";
import { Activity, AlertTriangle, Heart, Pill, Edit, Plus, Save, X, StickyNote, Droplets, Syringe, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MedicalRecord {
  bloodType: string;
  allergies: string[];
  chronicConditions: string[];
  medications: { name: string; dose: string; frequency: string }[];
  surgicalHistory: string[];
  familyHistory: string;
  notes: string;
}

interface Props {
  medical: MedicalRecord;
}

type SubTab = "general" | "allergies" | "medications" | "history" | "notes";

const SUB_TABS: { key: SubTab; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "General", icon: Droplets },
  { key: "allergies", label: "Alergias", icon: AlertTriangle },
  { key: "medications", label: "Medicamentos", icon: Pill },
  { key: "history", label: "Historial", icon: Syringe },
  { key: "notes", label: "Notas", icon: StickyNote },
];

interface ClinicalNote {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  category: "general" | "seguimiento" | "urgente";
}

const INITIAL_NOTES: ClinicalNote[] = [
  { id: "n1", text: "Paciente cooperador, revisión dental cada 6 meses. Se recomienda monitoreo continuo de presión arterial.", author: "Dra. González", createdAt: "2026-04-02", category: "general" },
  { id: "n2", text: "Recordar verificar interacción medicamentosa antes de anestesia local por uso de Losartán.", author: "Dra. González", createdAt: "2026-03-20", category: "urgente" },
];

const NOTE_CATEGORIES = [
  { value: "general", label: "General", color: "bg-primary/10 text-primary" },
  { value: "seguimiento", label: "Seguimiento", color: "bg-secondary/10 text-secondary" },
  { value: "urgente", label: "Urgente", color: "bg-destructive/10 text-destructive" },
] as const;

export const MedicalHistoryTab = ({ medical: initialMedical }: Props) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("general");
  const [medical, setMedical] = useState(initialMedical);
  const [notes, setNotes] = useState<ClinicalNote[]>(INITIAL_NOTES);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [newNote, setNewNote] = useState({ text: "", category: "general" as ClinicalNote["category"] });
  const [showAllergyInput, setShowAllergyInput] = useState(false);
  const [newAllergy, setNewAllergy] = useState("");
  const [showMedInput, setShowMedInput] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", dose: "", frequency: "" });

  const handleAddNote = () => {
    if (!newNote.text.trim()) { toast.error("Escriba el contenido de la nota"); return; }
    const note: ClinicalNote = {
      id: `n${Date.now()}`,
      text: newNote.text,
      author: "Dra. González",
      createdAt: new Date().toISOString().split("T")[0],
      category: newNote.category,
    };
    setNotes((prev) => [note, ...prev]);
    setNewNote({ text: "", category: "general" });
    setShowNoteForm(false);
    toast.success("Nota agregada");
  };

  const addAllergy = () => {
    if (!newAllergy.trim()) { toast.error("Ingrese el nombre de la alergia"); return; }
    setMedical(prev => ({ ...prev, allergies: [...prev.allergies, newAllergy.trim()] }));
    setNewAllergy("");
    setShowAllergyInput(false);
    toast.success("Alergia agregada");
  };

  const removeAllergy = (idx: number) => {
    setMedical(prev => ({ ...prev, allergies: prev.allergies.filter((_, i) => i !== idx) }));
    toast.info("Alergia eliminada");
  };

  const addMedication = () => {
    if (!newMed.name.trim()) { toast.error("Ingrese el nombre del medicamento"); return; }
    setMedical(prev => ({ ...prev, medications: [...prev.medications, newMed] }));
    setNewMed({ name: "", dose: "", frequency: "" });
    setShowMedInput(false);
    toast.success("Medicamento agregado");
  };

  const removeMedication = (idx: number) => {
    setMedical(prev => ({ ...prev, medications: prev.medications.filter((_, i) => i !== idx) }));
    toast.info("Medicamento eliminado");
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    toast.info("Nota eliminada");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sub-tab navigation */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md transition-all flex-1 justify-center",
              activeSubTab === tab.key
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {tab.key === "allergies" && medical.allergies.length > 0 && (
              <span className="ml-1 text-[10px] bg-destructive/20 text-destructive rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {medical.allergies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* General */}
      {activeSubTab === "general" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Activity className="h-4 w-4 text-primary" /> Datos Generales
            </div>
            <div className="space-y-3">
              {[
                { label: "Tipo de sangre", value: medical.bloodType },
                { label: "Alergias", value: medical.allergies.length > 0 ? medical.allergies.join(", ") : "Ninguna registrada" },
                { label: "Condiciones crónicas", value: medical.chronicConditions.length > 0 ? medical.chronicConditions.join(", ") : "Ninguna" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-medium text-card-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Users className="h-4 w-4 text-primary" /> Antecedentes Familiares
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{medical.familyHistory}</p>
          </div>

          {/* Quick summary cards */}
          <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Alergias", count: medical.allergies.length, color: "text-destructive", bg: "bg-destructive/5" },
              { label: "Condiciones", count: medical.chronicConditions.length, color: "text-warning", bg: "bg-warning/5" },
              { label: "Medicamentos", count: medical.medications.length, color: "text-secondary", bg: "bg-secondary/5" },
              { label: "Cirugías", count: medical.surgicalHistory.length, color: "text-primary", bg: "bg-primary/5" },
            ].map((s, i) => (
              <div key={i} className={cn("rounded-xl p-4 text-center", s.bg)}>
                <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      {activeSubTab === "allergies" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
                <AlertTriangle className="h-4 w-4" /> Alergias Registradas
              </div>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowAllergyInput(!showAllergyInput)}>
                <Plus className="h-3 w-3" /> Agregar
              </Button>
            </div>
            {showAllergyInput && (
              <div className="flex gap-2">
                <Input
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAllergy(); } }}
                  placeholder="Ej: Penicilina, Látex..."
                  className="flex-1"
                />
                <Button size="sm" onClick={addAllergy}>Agregar</Button>
              </div>
            )}
            {medical.allergies.length > 0 ? (
              <div className="space-y-2">
                {medical.allergies.map((a, i) => (
                  <div key={i} className="flex items-center justify-between bg-card rounded-lg p-3 border border-destructive/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-card-foreground">{a}</p>
                        <p className="text-xs text-muted-foreground">Severidad: Moderada</p>
                      </div>
                    </div>
                    <button onClick={() => removeAllergy(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No se han registrado alergias</p>
            )}
          </div>

          <div className="bg-card rounded-xl border border-border p-5">
            <p className="text-xs text-muted-foreground">
              ⚠ Las alergias se muestran de forma prominente en el encabezado del paciente para alertar al personal médico.
            </p>
          </div>
        </div>
      )}

      {/* Medications */}
      {activeSubTab === "medications" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{medical.medications.length} medicamentos activos</p>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowMedInput(!showMedInput)}>
              <Plus className="h-3 w-3" /> Agregar Medicamento
            </Button>
          </div>
          {showMedInput && (
            <div className="bg-card rounded-xl border-2 border-primary/20 p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input value={newMed.name} onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))} placeholder="Nombre" />
                <Input value={newMed.dose} onChange={e => setNewMed(p => ({ ...p, dose: e.target.value }))} placeholder="Dosis (ej: 50mg)" />
                <Input value={newMed.frequency} onChange={e => setNewMed(p => ({ ...p, frequency: e.target.value }))} placeholder="Frecuencia" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowMedInput(false)}>Cancelar</Button>
                <Button size="sm" onClick={addMedication}>Agregar</Button>
              </div>
            </div>
          )}
          {medical.medications.map((m, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                  <Pill className="h-5 w-5 text-secondary" />
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-semibold text-card-foreground">{m.name}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Dosis: <strong className="text-card-foreground">{m.dose}</strong></span>
                    <span>Frecuencia: <strong className="text-card-foreground">{m.frequency}</strong></span>
                  </div>
                </div>
                <button onClick={() => removeMedication(i)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Heart className="h-4 w-4 text-warning" /> Condiciones Crónicas
            </div>
            <div className="flex flex-wrap gap-2">
              {medical.chronicConditions.map((c, i) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-warning/10 text-warning font-medium">{c}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* History */}
      {activeSubTab === "history" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card rounded-xl border border-border p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Syringe className="h-4 w-4 text-primary" /> Historial Quirúrgico
            </div>
            {medical.surgicalHistory.map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <p className="text-sm text-card-foreground">{s}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-5 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground">
              <Users className="h-4 w-4 text-primary" /> Antecedentes Familiares
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{medical.familyHistory}</p>
          </div>
        </div>
      )}

      {/* Notes */}
      {activeSubTab === "notes" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{notes.length} notas clínicas</p>
            <Button size="sm" onClick={() => setShowNoteForm(!showNoteForm)}>
              {showNoteForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showNoteForm ? "Cancelar" : "Nueva Nota"}
            </Button>
          </div>

          {showNoteForm && (
            <div className="bg-card rounded-xl border-2 border-primary/20 p-5 space-y-4">
              <h4 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-primary" /> Nueva Nota Clínica
              </h4>
              <div className="space-y-2">
                <Label className="text-xs">Categoría</Label>
                <div className="flex gap-2">
                  {NOTE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setNewNote((p) => ({ ...p, category: cat.value }))}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-full font-medium transition-all border",
                        newNote.category === cat.value
                          ? `${cat.color} border-current ring-2 ring-current/20`
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Contenido</Label>
                <Textarea
                  placeholder="Escriba la nota clínica..."
                  value={newNote.text}
                  onChange={(e) => setNewNote((p) => ({ ...p, text: e.target.value }))}
                  className="min-h-[100px] resize-y"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNoteForm(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddNote}><Save className="h-3 w-3" /> Guardar</Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {notes.map((note) => {
              const cat = NOTE_CATEGORIES.find((c) => c.value === note.category) || NOTE_CATEGORIES[0];
              return (
                <div key={note.id} className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide", cat.color)}>
                          {cat.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{note.createdAt}</span>
                        <span className="text-xs text-muted-foreground">· {note.author}</span>
                      </div>
                      <p className="text-sm text-card-foreground leading-relaxed">{note.text}</p>
                    </div>
                    <button onClick={() => deleteNote(note.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
