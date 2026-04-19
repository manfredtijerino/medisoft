import { useState, useRef } from "react";
import { Plus, FileText, Image, Trash2, Eye, X, Upload, Clock, FileSignature } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RichTextEditor } from "./RichTextEditor";
import { ConsentTemplateModal } from "./ConsentTemplateModal";

interface ClinicalDocument {
  id: string;
  title: string;
  content: string;
  type: "nota" | "receta" | "informe" | "consentimiento" | "otro";
  images: { name: string; url: string }[];
  createdAt: string;
  author: string;
}

const DOC_TYPES = [
  { value: "nota", label: "Nota Clínica", color: "bg-primary/10 text-primary" },
  { value: "receta", label: "Receta", color: "bg-secondary/10 text-secondary" },
  { value: "informe", label: "Informe", color: "bg-warning/10 text-warning" },
  { value: "consentimiento", label: "Consentimiento", color: "bg-accent text-accent-foreground" },
  { value: "otro", label: "Otro", color: "bg-muted text-muted-foreground" },
] as const;

const MOCK_DOCUMENTS: ClinicalDocument[] = [
  {
    id: "d1",
    title: "Nota Clínica — Evaluación inicial",
    content: "<p>Paciente se presenta con dolor en molar inferior derecho (pieza 46). Se observa caries profunda con posible compromiso pulpar. Se recomienda endodoncia.</p><p>Se toma radiografía periapical que confirma lesión periapical. Paciente acepta plan de tratamiento propuesto.</p>",
    type: "nota",
    images: [],
    createdAt: "2026-04-02",
    author: "Dra. González",
  },
  {
    id: "d2",
    title: "Consentimiento Informado — Endodoncia",
    content: "<p>El paciente <strong>Carlos Rodríguez Mora</strong>, cédula 112340567, ha sido informado sobre el procedimiento de endodoncia en pieza 46, incluyendo riesgos, alternativas y cuidados postoperatorios. Acepta voluntariamente el tratamiento.</p>",
    type: "consentimiento",
    images: [],
    createdAt: "2026-04-02",
    author: "Dra. González",
  },
  {
    id: "d3",
    title: "Radiografía panorámica — Primer visita",
    content: "<p>Se adjunta radiografía panorámica tomada durante la primera visita. Se observa buen estado general con excepción de pieza 46.</p>",
    type: "informe",
    images: [{ name: "radiografia_panoramica.jpg", url: "/placeholder.svg" }],
    createdAt: "2026-03-01",
    author: "Dra. González",
  },
];

export const DocumentsTab = () => {
  const [documents, setDocuments] = useState<ClinicalDocument[]>(MOCK_DOCUMENTS);
  const [showForm, setShowForm] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [newDoc, setNewDoc] = useState({ title: "", content: "", type: "nota" as ClinicalDocument["type"] });
  const [uploadedImages, setUploadedImages] = useState<{ name: string; url: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) { toast.error(`"${file.name}" no es una imagen válida`); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error(`"${file.name}" excede 10MB`); return; }
      const url = URL.createObjectURL(file);
      setUploadedImages((prev) => [...prev, { name: file.name, url }]);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => setUploadedImages((prev) => prev.filter((_, i) => i !== index));

  const handleSave = () => {
    if (!newDoc.title.trim() || !newDoc.content.trim()) { toast.error("Complete el título y contenido"); return; }
    const doc: ClinicalDocument = {
      id: `d${Date.now()}`,
      title: newDoc.title,
      content: newDoc.content,
      type: newDoc.type,
      images: uploadedImages,
      createdAt: new Date().toISOString().split("T")[0],
      author: "Dra. González",
    };
    setDocuments((prev) => [doc, ...prev]);
    setNewDoc({ title: "", content: "", type: "nota" });
    setUploadedImages([]);
    setShowForm(false);
    toast.success("Documento guardado correctamente");
  };

  const handleConsentSave = (consent: { title: string; content: string; type: "consentimiento" }) => {
    const doc: ClinicalDocument = {
      id: `d${Date.now()}`,
      title: consent.title,
      content: consent.content,
      type: consent.type,
      images: [],
      createdAt: new Date().toISOString().split("T")[0],
      author: "Dra. González",
    };
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDelete = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    toast.info("Documento eliminado");
  };

  const typeInfo = (type: ClinicalDocument["type"]) => DOC_TYPES.find((t) => t.value === type) || DOC_TYPES[4];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{documents.length} documentos clínicos</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConsentModal(true)}>
            <FileSignature className="h-4 w-4" /> Consentimiento
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? "Cancelar" : "Nuevo Documento"}
          </Button>
        </div>
      </div>

      {/* New Document Form */}
      {showForm && (
        <div className="bg-card rounded-xl border-2 border-primary/20 shadow-sm p-6 space-y-4">
          <h3 className="text-sm font-semibold text-card-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Nuevo Documento Clínico
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Título del documento</Label>
              <Input
                placeholder="Ej: Nota Clínica — Seguimiento"
                value={newDoc.title}
                onChange={(e) => setNewDoc((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tipo de documento</Label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setNewDoc((p) => ({ ...p, type: t.value }))}
                    className={cn(
                      "text-xs px-3 py-1.5 rounded-full font-medium transition-all border",
                      newDoc.type === t.value
                        ? `${t.color} border-current ring-2 ring-current/20`
                        : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Contenido</Label>
            <RichTextEditor
              value={newDoc.content}
              onChange={(html) => setNewDoc((p) => ({ ...p, content: html }))}
              placeholder="Escriba el contenido del documento clínico aquí..."
              minHeight="180px"
            />
          </div>

          {/* Image Upload */}
          <div className="space-y-3">
            <Label className="text-xs">Imágenes adjuntas</Label>
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Haga clic o arrastre imágenes aquí</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG o WEBP · Máx 10MB por imagen</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />

            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {uploadedImages.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                    <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
                    <div className="absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button onClick={() => setPreviewImage(img.url)} className="p-1.5 bg-background/90 rounded-full">
                        <Eye className="h-3.5 w-3.5 text-foreground" />
                      </button>
                      <button onClick={() => removeImage(i)} className="p-1.5 bg-destructive/90 rounded-full">
                        <Trash2 className="h-3.5 w-3.5 text-destructive-foreground" />
                      </button>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate px-2 py-1">{img.name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave}>Guardar Documento</Button>
          </div>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {documents.map((doc) => {
          const ti = typeInfo(doc.type);
          return (
            <div key={doc.id} className="bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide", ti.color)}>{ti.label}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> {doc.createdAt}</span>
                      <span className="text-xs text-muted-foreground">· {doc.author}</span>
                    </div>
                    <h4 className="text-sm font-semibold text-card-foreground">{doc.title}</h4>
                  </div>
                  <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div
                  className="text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_strong]:text-card-foreground"
                  dangerouslySetInnerHTML={{ __html: doc.content }}
                />

                {doc.images.length > 0 && (
                  <div className="flex gap-3 pt-1">
                    {doc.images.map((img, i) => (
                      <div
                        key={i}
                        className="relative group rounded-lg overflow-hidden border border-border cursor-pointer w-20 h-20 shrink-0"
                        onClick={() => setPreviewImage(img.url)}
                      >
                        <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="h-4 w-4 text-background" />
                        </div>
                      </div>
                    ))}
                    <span className="text-xs text-muted-foreground self-end flex items-center gap-1">
                      <Image className="h-3 w-3" /> {doc.images.length} imagen{doc.images.length > 1 ? "es" : ""}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-foreground/80 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <div className="relative max-w-3xl max-h-[85vh]">
            <button className="absolute -top-3 -right-3 bg-background rounded-full p-1.5 shadow-lg" onClick={() => setPreviewImage(null)}>
              <X className="h-4 w-4" />
            </button>
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-xl object-contain" />
          </div>
        </div>
      )}

      {/* Consent Template Modal */}
      <ConsentTemplateModal
        open={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onSave={handleConsentSave}
        patientName="Carlos Rodríguez Mora"
      />
    </div>
  );
};
