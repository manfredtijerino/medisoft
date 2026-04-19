import { useState } from "react";
import {
  Plus, X, Edit, Save, Trash2, Copy, MessageCircle, Mail, Monitor,
  Stethoscope, Users, User, Calendar, CreditCard, Clock, UserX, Pill, FlaskConical, FileEdit,
  CheckCircle2, Shield, Sparkles, Eye, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type TemplateAudience = "patient" | "doctor" | "staff";
type TemplateChannel = "whatsapp" | "email" | "in_app";
type TemplateCategory = "appointment" | "payment" | "follow_up" | "inactive" | "lab" | "prescription" | "custom";

interface AlertTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  audience: TemplateAudience;
  channels: TemplateChannel[];
  subject: string;
  body: string;
  autoSend: boolean;
  requiresApproval: boolean;
  enabled: boolean;
  variables: string[];
  createdAt: string;
}

const CATEGORY_CONFIG: Record<TemplateCategory, { label: string; icon: typeof Calendar; color: string; bg: string }> = {
  appointment: { label: "Cita", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50" },
  payment: { label: "Cobro", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
  follow_up: { label: "Seguimiento", icon: Clock, color: "text-violet-600", bg: "bg-violet-50" },
  inactive: { label: "Reactivación", icon: UserX, color: "text-muted-foreground", bg: "bg-muted/50" },
  lab: { label: "Laboratorio", icon: FlaskConical, color: "text-cyan-600", bg: "bg-cyan-50" },
  prescription: { label: "Receta", icon: Pill, color: "text-emerald-600", bg: "bg-emerald-50" },
  custom: { label: "Personalizado", icon: FileEdit, color: "text-primary", bg: "bg-primary/10" },
};

const AUDIENCE_CONFIG: Record<TemplateAudience, { label: string; icon: typeof User; color: string }> = {
  patient: { label: "Paciente", icon: User, color: "text-emerald-600" },
  doctor: { label: "Doctor", icon: Stethoscope, color: "text-blue-600" },
  staff: { label: "Personal", icon: Users, color: "text-violet-600" },
};

const CHANNEL_CONFIG: Record<TemplateChannel, { label: string; icon: typeof Monitor }> = {
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  email: { label: "Email", icon: Mail },
  in_app: { label: "App", icon: Monitor },
};

const AVAILABLE_VARIABLES = [
  { key: "{nombre_paciente}", label: "Nombre del paciente" },
  { key: "{fecha_cita}", label: "Fecha de la cita" },
  { key: "{hora_cita}", label: "Hora de la cita" },
  { key: "{nombre_doctor}", label: "Nombre del doctor" },
  { key: "{nombre_clinica}", label: "Nombre de la clínica" },
  { key: "{telefono_clinica}", label: "Teléfono de la clínica" },
  { key: "{monto_pendiente}", label: "Monto pendiente" },
  { key: "{numero_factura}", label: "Número de factura" },
  { key: "{medicamento}", label: "Nombre del medicamento" },
  { key: "{dias_vencimiento}", label: "Días de vencimiento" },
];

const DEFAULT_TEMPLATES: AlertTemplate[] = [
  {
    id: "t1", name: "Recordatorio de cita — 24h", category: "appointment", audience: "patient",
    channels: ["whatsapp"], subject: "Recordatorio de cita",
    body: "Hola {nombre_paciente} 👋\n\nLe recordamos su cita mañana {fecha_cita} a las {hora_cita} en {nombre_clinica}.\n\nConfirme respondiendo SÍ.\nSi necesita reagendar, llámenos al {telefono_clinica}.",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}", "{fecha_cita}", "{hora_cita}", "{nombre_clinica}", "{telefono_clinica}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t2", name: "Preparación de paciente — 1h", category: "appointment", audience: "doctor",
    channels: ["in_app"], subject: "Paciente llega en 1 hora",
    body: "📋 {nombre_paciente} llega en 1 hora.\n\nCita: {hora_cita}\nVerifique expediente y alergias antes de atender.",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}", "{hora_cita}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t3", name: "Preparar consultorio — 1h", category: "appointment", audience: "staff",
    channels: ["in_app"], subject: "Preparar consultorio",
    body: "🏥 {nombre_paciente} llega en 1 hora para su cita de las {hora_cita}.\n\nPrepare consultorio y expediente.",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}", "{hora_cita}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t4", name: "Cobro amigable — 3 días", category: "payment", audience: "patient",
    channels: ["whatsapp"], subject: "Recordatorio de pago",
    body: "Hola {nombre_paciente},\n\nLe recordamos que tiene un saldo pendiente de {monto_pendiente} (Factura {numero_factura}).\n\nPuede pagar por SINPE Móvil o en nuestra clínica.\n\n¿Tiene alguna consulta? Estamos para ayudarle.",
    autoSend: false, requiresApproval: true, enabled: true,
    variables: ["{nombre_paciente}", "{monto_pendiente}", "{numero_factura}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t5", name: "Cobro formal — 7 días", category: "payment", audience: "patient",
    channels: ["email"], subject: "Aviso de saldo pendiente — {numero_factura}",
    body: "Estimado/a {nombre_paciente},\n\nLe informamos que su factura {numero_factura} por {monto_pendiente} se encuentra pendiente de pago desde hace {dias_vencimiento} días.\n\nAgradecemos su pronta atención.\n\nAtentamente,\n{nombre_clinica}",
    autoSend: false, requiresApproval: true, enabled: true,
    variables: ["{nombre_paciente}", "{monto_pendiente}", "{numero_factura}", "{dias_vencimiento}", "{nombre_clinica}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t6", name: "Alerta cobro interno — 3 días", category: "payment", audience: "staff",
    channels: ["in_app"], subject: "Factura vencida",
    body: "💰 Factura {numero_factura} de {nombre_paciente} tiene {dias_vencimiento} días vencida.\nMonto: {monto_pendiente}\n\n¿Desea enviar recordatorio al paciente?",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}", "{monto_pendiente}", "{numero_factura}", "{dias_vencimiento}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t7", name: "Seguimiento clínico pendiente", category: "follow_up", audience: "doctor",
    channels: ["in_app"], subject: "Seguimiento no agendado",
    body: "⚠ {nombre_paciente} — la consulta indicaba seguimiento pero no hay cita programada.\n\n¿Desea agendar ahora?",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t8", name: "Coordinar seguimiento", category: "follow_up", audience: "staff",
    channels: ["in_app"], subject: "Agendar seguimiento",
    body: "📞 Contactar a {nombre_paciente} para agendar cita de seguimiento.\nDoctor tratante: {nombre_doctor}",
    autoSend: true, requiresApproval: false, enabled: true,
    variables: ["{nombre_paciente}", "{nombre_doctor}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t9", name: "Reactivación de paciente", category: "inactive", audience: "patient",
    channels: ["whatsapp"], subject: "¡Le extrañamos!",
    body: "Hola {nombre_paciente} 😊\n\nHace tiempo que no nos visita en {nombre_clinica}. Nos gustaría saber cómo se encuentra.\n\n¿Le gustaría agendar una revisión? Llámenos al {telefono_clinica} o responda este mensaje.",
    autoSend: false, requiresApproval: true, enabled: true,
    variables: ["{nombre_paciente}", "{nombre_clinica}", "{telefono_clinica}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t10", name: "Renovación de receta", category: "prescription", audience: "patient",
    channels: ["whatsapp", "email"], subject: "Renovación de receta — {medicamento}",
    body: "Hola {nombre_paciente},\n\nSu receta de {medicamento} vence pronto. Le recomendamos agendar una cita para renovación.\n\nLlámenos al {telefono_clinica} o responda este mensaje.",
    autoSend: false, requiresApproval: true, enabled: false,
    variables: ["{nombre_paciente}", "{medicamento}", "{telefono_clinica}"],
    createdAt: "2026-04-01",
  },
  {
    id: "t11", name: "Resultados de laboratorio", category: "lab", audience: "doctor",
    channels: ["in_app"], subject: "Resultados pendientes de revisión",
    body: "🧪 Resultados de laboratorio de {nombre_paciente} pendientes de revisión.\n\n¿Desea marcar como revisados?",
    autoSend: true, requiresApproval: false, enabled: false,
    variables: ["{nombre_paciente}"],
    createdAt: "2026-04-01",
  },
];

export const AlertTemplateManager = () => {
  const [templates, setTemplates] = useState<AlertTemplate[]>(DEFAULT_TEMPLATES);
  const [editingTemplate, setEditingTemplate] = useState<AlertTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [filterAudience, setFilterAudience] = useState<TemplateAudience | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filterAudience === "all"
    ? templates
    : templates.filter(t => t.audience === filterAudience);

  const openEditor = (template?: AlertTemplate) => {
    if (template) {
      setEditingTemplate({ ...template });
      setIsCreating(false);
    } else {
      setEditingTemplate({
        id: `t${Date.now()}`,
        name: "",
        category: "custom",
        audience: "patient",
        channels: ["whatsapp"],
        subject: "",
        body: "",
        autoSend: false,
        requiresApproval: true,
        enabled: true,
        variables: [],
        createdAt: new Date().toISOString().split("T")[0],
      });
      setIsCreating(true);
    }
  };

  const saveTemplate = () => {
    if (!editingTemplate) return;
    if (!editingTemplate.name.trim()) { toast.error("Ingrese un nombre para la plantilla"); return; }
    if (!editingTemplate.body.trim()) { toast.error("Ingrese el contenido del mensaje"); return; }

    if (isCreating) {
      setTemplates(prev => [...prev, editingTemplate]);
      toast.success("Plantilla creada exitosamente");
    } else {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? editingTemplate : t));
      toast.success("Plantilla actualizada");
    }
    setEditingTemplate(null);
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast.info("Plantilla eliminada");
  };

  const duplicateTemplate = (template: AlertTemplate) => {
    const copy = { ...template, id: `t${Date.now()}`, name: `${template.name} (copia)` };
    setTemplates(prev => [...prev, copy]);
    toast.success("Plantilla duplicada");
  };

  const toggleEnabled = (id: string) => {
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, enabled: !t.enabled } : t));
  };

  const toggleChannel = (channel: TemplateChannel) => {
    if (!editingTemplate) return;
    const channels = editingTemplate.channels.includes(channel)
      ? editingTemplate.channels.filter(c => c !== channel)
      : [...editingTemplate.channels, channel];
    setEditingTemplate({ ...editingTemplate, channels });
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    setEditingTemplate({
      ...editingTemplate,
      body: editingTemplate.body + variable,
      variables: editingTemplate.variables.includes(variable)
        ? editingTemplate.variables
        : [...editingTemplate.variables, variable],
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Plantillas de Mensajes</h3>
          <p className="text-xs text-muted-foreground">{templates.length} plantillas · Filtre por audiencia para ver las específicas</p>
        </div>
        <Button size="sm" className="gap-1" onClick={() => openEditor()}>
          <Plus className="h-3.5 w-3.5" /> Nueva Plantilla
        </Button>
      </div>

      {/* Audience filter */}
      <div className="flex gap-1.5">
        {[
          { key: "all" as const, label: "Todas", count: templates.length },
          { key: "patient" as const, label: "Paciente", count: templates.filter(t => t.audience === "patient").length },
          { key: "doctor" as const, label: "Doctor", count: templates.filter(t => t.audience === "doctor").length },
          { key: "staff" as const, label: "Personal", count: templates.filter(t => t.audience === "staff").length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilterAudience(tab.key)}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filterAudience === tab.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/30"
            )}
          >
            {tab.label}
            <span className={cn(
              "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
              filterAudience === tab.key ? "bg-primary-foreground/20" : "bg-muted"
            )}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Template list */}
      <div className="space-y-2">
        {filtered.map((template) => {
          const catConfig = CATEGORY_CONFIG[template.category];
          const audConfig = AUDIENCE_CONFIG[template.audience];
          const CatIcon = catConfig.icon;
          const AudIcon = audConfig.icon;
          const isExpanded = expandedId === template.id;

          return (
            <div key={template.id} className={cn(
              "rounded-xl border transition-all",
              template.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
            )}>
              <div className="px-4 py-3 flex items-start gap-3">
                <div className={cn(catConfig.bg, "rounded-lg p-2 shrink-0")}>
                  <CatIcon className={cn("h-4 w-4", catConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{template.name}</p>
                    {template.autoSend && !template.requiresApproval && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-50 text-emerald-600 border-emerald-200">
                        <Sparkles className="h-2.5 w-2.5" /> Auto
                      </Badge>
                    )}
                    {template.requiresApproval && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-amber-50 text-amber-600 border-amber-200">
                        <Shield className="h-2.5 w-2.5" /> Requiere aprobación
                      </Badge>
                    )}
                    {!template.enabled && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">Desactivada</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 gap-0.5", `bg-${audConfig.color.replace("text-", "")}/5`)}>
                      <AudIcon className="h-2.5 w-2.5" /> {audConfig.label}
                    </Badge>
                    {template.channels.map(ch => {
                      const ChConfig = CHANNEL_CONFIG[ch];
                      const ChIcon = ChConfig.icon;
                      return (
                        <Badge key={ch} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                          <ChIcon className="h-2.5 w-2.5" /> {ChConfig.label}
                        </Badge>
                      );
                    })}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                      {catConfig.label}
                    </Badge>
                  </div>

                  {/* Expand preview */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                    className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-2"
                  >
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {isExpanded ? "Ocultar" : "Vista previa"}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {template.subject && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">Asunto:</span> {template.subject}</p>
                      )}
                      <div className="bg-muted/40 rounded-lg p-3 text-xs text-foreground border border-border">
                        <p className="whitespace-pre-wrap leading-relaxed">{template.body}</p>
                      </div>
                      {template.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {template.variables.map(v => (
                            <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/5 text-primary font-mono">{v}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-1.5 pt-1">
                        <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1" onClick={() => openEditor(template)}>
                          <Edit className="h-3 w-3" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-6 text-[11px] gap-1" onClick={() => duplicateTemplate(template)}>
                          <Copy className="h-3 w-3" /> Duplicar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 text-destructive hover:text-destructive" onClick={() => deleteTemplate(template.id)}>
                          <Trash2 className="h-3 w-3" /> Eliminar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <Switch checked={template.enabled} onCheckedChange={() => toggleEnabled(template.id)} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "Nueva Plantilla" : "Editar Plantilla"}</DialogTitle>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-5 mt-2">
              {/* Name */}
              <div className="space-y-2">
                <Label>Nombre de la plantilla *</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                  placeholder="Ej: Recordatorio de cita — 24h"
                />
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(Object.entries(CATEGORY_CONFIG) as [TemplateCategory, typeof CATEGORY_CONFIG.appointment][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, category: key })}
                        className={cn(
                          "flex items-center gap-1.5 p-2 rounded-lg border text-xs font-medium transition-all",
                          editingTemplate.category === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audience */}
              <div className="space-y-2">
                <Label>¿A quién va dirigida?</Label>
                <div className="flex gap-2">
                  {(Object.entries(AUDIENCE_CONFIG) as [TemplateAudience, typeof AUDIENCE_CONFIG.patient][]).map(([key, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditingTemplate({ ...editingTemplate, audience: key })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-1",
                          editingTemplate.audience === key
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Channels */}
              <div className="space-y-2">
                <Label>Canal de envío</Label>
                <div className="flex gap-2">
                  {(Object.entries(CHANNEL_CONFIG) as [TemplateChannel, typeof CHANNEL_CONFIG.whatsapp][]).map(([key, config]) => {
                    const Icon = config.icon;
                    const active = editingTemplate.channels.includes(key);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleChannel(key)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all flex-1",
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border hover:border-primary/30"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-send vs Approval */}
              <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border">
                <p className="text-xs font-semibold text-foreground">Modo de envío</p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setEditingTemplate({ ...editingTemplate, autoSend: true, requiresApproval: false })}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      editingTemplate.autoSend && !editingTemplate.requiresApproval
                        ? "border-emerald-300 bg-emerald-50/50"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Sparkles className={cn("h-4 w-4 mt-0.5 shrink-0", editingTemplate.autoSend && !editingTemplate.requiresApproval ? "text-emerald-600" : "text-muted-foreground")} />
                    <div>
                      <p className="text-xs font-medium text-foreground">Envío automático</p>
                      <p className="text-[11px] text-muted-foreground">Se envía automáticamente cuando se cumple la condición. Ideal para alertas internas al equipo.</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTemplate({ ...editingTemplate, autoSend: false, requiresApproval: true })}
                    className={cn(
                      "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                      editingTemplate.requiresApproval
                        ? "border-amber-300 bg-amber-50/50"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <Shield className={cn("h-4 w-4 mt-0.5 shrink-0", editingTemplate.requiresApproval ? "text-amber-600" : "text-muted-foreground")} />
                    <div>
                      <p className="text-xs font-medium text-foreground">Requiere aprobación</p>
                      <p className="text-[11px] text-muted-foreground">La IA genera el mensaje, pero un admin debe aprobarlo antes de enviarse. Recomendado para mensajes al paciente.</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>Asunto (para email)</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Ej: Recordatorio de cita"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>Cuerpo del mensaje *</Label>
                <Textarea
                  value={editingTemplate.body}
                  onChange={e => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  placeholder="Escriba el contenido del mensaje aquí..."
                  className="min-h-[150px] font-mono text-xs"
                />
              </div>

              {/* Variables */}
              <div className="space-y-2">
                <Label className="text-xs">Variables disponibles <span className="text-muted-foreground font-normal">— click para insertar</span></Label>
                <div className="flex flex-wrap gap-1.5">
                  {AVAILABLE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="text-[10px] px-2 py-1 rounded-md bg-primary/5 text-primary border border-primary/20 hover:bg-primary/10 transition-colors font-mono"
                      title={v.label}
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {editingTemplate.body && (
                <div className="space-y-2">
                  <Label className="text-xs flex items-center gap-1"><Eye className="h-3 w-3" /> Vista previa</Label>
                  <div className="bg-muted/40 rounded-lg p-4 text-xs border border-border">
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {editingTemplate.body
                        .replace("{nombre_paciente}", "Carlos Rodríguez")
                        .replace("{fecha_cita}", "8 Abr 2026")
                        .replace("{hora_cita}", "9:00 AM")
                        .replace("{nombre_doctor}", "Dra. González")
                        .replace("{nombre_clinica}", "Clínica González")
                        .replace("{telefono_clinica}", "2223-4567")
                        .replace("{monto_pendiente}", "₡56,000")
                        .replace("{numero_factura}", "FE-001-0042")
                        .replace("{medicamento}", "Losartán 50mg")
                        .replace("{dias_vencimiento}", "7")
                      }
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                <Button onClick={saveTemplate}>
                  <Save className="h-4 w-4" /> {isCreating ? "Crear Plantilla" : "Guardar Cambios"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
