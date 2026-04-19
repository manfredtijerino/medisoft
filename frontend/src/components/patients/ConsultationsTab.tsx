import { useState } from "react";
import { Plus, Calendar, X, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Consultation {
  id: string;
  date: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  doctor: string;
  vitals: { bp: string; hr: string; temp: string };
  followUp: string | null;
}

export const ConsultationsTab = ({ consultations: initialConsultations }: { consultations: Consultation[] }) => {
  const [consultations, setConsultations] = useState(initialConsultations);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    complaint: "", diagnosis: "", treatment: "", doctor: "Dra. González",
    bp: "", hr: "", temp: "", followUp: "",
  });

  const handleSave = () => {
    if (!form.complaint.trim()) { toast.error("Ingrese el motivo de consulta"); return; }
    const newC: Consultation = {
      id: `c${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      complaint: form.complaint,
      diagnosis: form.diagnosis,
      treatment: form.treatment,
      doctor: form.doctor,
      vitals: { bp: form.bp || "---", hr: form.hr || "---", temp: form.temp || "---" },
      followUp: form.followUp || null,
    };
    setConsultations(prev => [newC, ...prev]);
    setForm({ complaint: "", diagnosis: "", treatment: "", doctor: "Dra. González", bp: "", hr: "", temp: "", followUp: "" });
    setShowForm(false);
    toast.success("Consulta registrada exitosamente");
  };

  const deleteConsultation = (id: string) => {
    setConsultations(prev => prev.filter(c => c.id !== id));
    toast.info("Consulta eliminada");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{consultations.length} consultas registradas</p>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nueva Consulta
        </Button>
      </div>

      {/* New Consultation Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Consulta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Motivo de consulta *</Label>
              <Textarea value={form.complaint} onChange={e => setForm(p => ({ ...p, complaint: e.target.value }))} placeholder="Describa el motivo..." className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label>Diagnóstico</Label>
              <Input value={form.diagnosis} onChange={e => setForm(p => ({ ...p, diagnosis: e.target.value }))} placeholder="Diagnóstico clínico" />
            </div>
            <div className="space-y-2">
              <Label>Tratamiento</Label>
              <Textarea value={form.treatment} onChange={e => setForm(p => ({ ...p, treatment: e.target.value }))} placeholder="Plan de tratamiento..." className="min-h-[60px]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">PA (mmHg)</Label>
                <Input value={form.bp} onChange={e => setForm(p => ({ ...p, bp: e.target.value }))} placeholder="120/80" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">FC (bpm)</Label>
                <Input value={form.hr} onChange={e => setForm(p => ({ ...p, hr: e.target.value }))} placeholder="72" className="text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Temp (°C)</Label>
                <Input value={form.temp} onChange={e => setForm(p => ({ ...p, temp: e.target.value }))} placeholder="36.5" className="text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Seguimiento (fecha)</Label>
              <Input type="date" value={form.followUp} onChange={e => setForm(p => ({ ...p, followUp: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button onClick={handleSave}><Save className="h-4 w-4" /> Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-4">
        {consultations.map((c) => (
          <div key={c.id} className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-card-foreground">{c.date}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{c.doctor}</p>
              </div>
              <div className="flex items-center gap-2">
                {c.followUp && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Seguimiento: {c.followUp}
                  </span>
                )}
                <button onClick={() => deleteConsultation(c.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Motivo</p>
                <p className="text-card-foreground">{c.complaint}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Diagnóstico</p>
                <p className="text-card-foreground">{c.diagnosis}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Tratamiento</p>
                <p className="text-card-foreground">{c.treatment}</p>
              </div>
            </div>

            <div className="flex gap-4 text-xs text-muted-foreground pt-1 border-t border-border">
              <span>PA: {c.vitals.bp}</span>
              <span>FC: {c.vitals.hr} bpm</span>
              <span>Temp: {c.vitals.temp}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
