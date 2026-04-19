import { useState } from "react";
import { X, Save, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "./RichTextEditor";
import { toast } from "sonner";

interface ConsentTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (doc: { title: string; content: string; type: "consentimiento" }) => void;
  patientName?: string;
}

const DEFAULT_CONSENT_TEMPLATE = `<h1 style="text-align: center;">Consentimiento Informado</h1>
<p style="text-align: center;"><strong>Clínica Dental MediSoft</strong></p>
<br/>
<p>Yo, <strong>[NOMBRE DEL PACIENTE]</strong>, con cédula de identidad <strong>[NÚMERO DE CÉDULA]</strong>, declaro que:</p>
<br/>
<ol>
<li>He sido informado/a de manera clara y comprensible sobre el diagnóstico de mi condición actual.</li>
<li>Se me ha explicado el procedimiento de <strong>[NOMBRE DEL PROCEDIMIENTO]</strong>, incluyendo sus objetivos, beneficios esperados y posibles alternativas de tratamiento.</li>
<li>Comprendo los riesgos y posibles complicaciones asociados al procedimiento, que incluyen pero no se limitan a: <strong>[LISTAR RIESGOS]</strong>.</li>
<li>He tenido la oportunidad de realizar preguntas y todas han sido respondidas a mi satisfacción.</li>
<li>Entiendo que tengo derecho a revocar este consentimiento en cualquier momento antes del procedimiento.</li>
</ol>
<br/>
<p>Por lo tanto, <strong>autorizo voluntariamente</strong> al Dr./Dra. <strong>[NOMBRE DEL DOCTOR]</strong> y al equipo médico a realizar el procedimiento descrito anteriormente.</p>
<br/>
<p>Firmado en _________________, el día _____ de ______________ de 20_____.</p>
<br/>
<br/>
<p>____________________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;____________________________</p>
<p><strong>Firma del Paciente</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<strong>Firma del Profesional</strong></p>
<p>Cédula: ____________________&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Código: ____________________</p>`;

export const ConsentTemplateModal = ({ open, onClose, onSave, patientName }: ConsentTemplateModalProps) => {
  const [title, setTitle] = useState("Consentimiento Informado");
  const [content, setContent] = useState(
    patientName
      ? DEFAULT_CONSENT_TEMPLATE.replace("[NOMBRE DEL PACIENTE]", patientName)
      : DEFAULT_CONSENT_TEMPLATE
  );

  if (!open) return null;

  const handleSave = () => {
    if (!title.trim()) { toast.error("Ingrese un título"); return; }
    onSave({ title, content, type: "consentimiento" });
    toast.success("Consentimiento guardado");
    onClose();
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>${title}</title>
        <style>body{font-family:system-ui,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;font-size:14px;line-height:1.6;color:#222}h1{font-size:20px}h2{font-size:16px}strong{font-weight:600}</style>
        </head><body>${content}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-card-foreground">Plantilla de Consentimiento</h3>
              <p className="text-xs text-muted-foreground">Edite y personalice el documento</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Título del documento</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Contenido del consentimiento</Label>
            <RichTextEditor value={content} onChange={setContent} minHeight="350px" placeholder="Escriba el consentimiento..." />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}><Save className="h-4 w-4" /> Guardar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
