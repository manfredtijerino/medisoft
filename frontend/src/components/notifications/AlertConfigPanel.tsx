import { useState } from "react";
import { Bell, Calendar, CreditCard, Clock, UserX, Stethoscope, FlaskConical, Pill, FileEdit, MessageCircle, Mail, Monitor, Settings2, Info, ChevronDown, ChevronUp, Users, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AudienceKey = "doctor" | "staff" | "patient";

interface AlertRule {
  id: string;
  type: string;
  label: string;
  description: string;
  why: string;
  because: string;
  example: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  enabled: boolean;
  channels: { in_app: boolean; whatsapp: boolean; email: boolean };
  audiences: Record<AudienceKey, boolean>;
  triggerDays?: number;
  triggerLabel: string;
  category: "automatic" | "manual";
}

const DEFAULT_RULES: AlertRule[] = [
  {
    id: "appt_24h", type: "appointment_reminder", label: "Recordatorio de cita (24h)",
    description: "Notifica 24 horas antes de la cita programada",
    why: "Los pacientes olvidan citas. Un recordatorio reduce inasistencias hasta un 40%.",
    because: "Cada cita perdida cuesta tiempo, dinero y retrasa tratamientos de otros pacientes.",
    example: "Paciente Carlos tiene cita el viernes a las 10am. El jueves a las 10am recibe: 'Hola Carlos, le recordamos su cita mañana a las 10:00 AM en Clínica González.'",
    icon: Calendar, iconColor: "text-blue-600", iconBg: "bg-blue-50",
    enabled: true, channels: { in_app: true, whatsapp: true, email: false },
    audiences: { doctor: true, staff: true, patient: true },
    triggerDays: 1, triggerLabel: "24 horas antes de la cita", category: "automatic",
  },
  {
    id: "appt_1h", type: "appointment_reminder_1h", label: "Recordatorio de cita (1h)",
    description: "Notifica al equipo 1 hora antes de que llegue el paciente",
    why: "El equipo necesita preparar el consultorio, expediente y materiales.",
    because: "Preparar con anticipación reduce tiempo muerto y mejora la experiencia del paciente.",
    example: "A las 9:00 AM, la recepcionista ve: 'Carlos Rodríguez llega en 1 hora. Tratamiento: endodoncia molar #36. Alergia: Penicilina.'",
    icon: Clock, iconColor: "text-blue-500", iconBg: "bg-blue-50",
    enabled: true, channels: { in_app: true, whatsapp: false, email: false },
    audiences: { doctor: true, staff: true, patient: false },
    triggerLabel: "1 hora antes de la cita", category: "automatic",
  },
  {
    id: "payment_3d", type: "payment_overdue", label: "Pago vencido (3 días)",
    description: "Alerta interna cuando una factura tiene 3 días de vencida",
    why: "Mientras más pasa el tiempo, más difícil es cobrar. Actuar rápido mejora la tasa de cobro.",
    because: "Después de 30 días, la probabilidad de cobro baja al 50%. A los 3 días todavía es una conversación fácil.",
    example: "La recepcionista ve: 'Factura #045 de Ana López (₡56,000) tiene 3 días vencida. ¿Desea enviar recordatorio?'",
    icon: CreditCard, iconColor: "text-amber-600", iconBg: "bg-amber-50",
    enabled: true, channels: { in_app: true, whatsapp: false, email: false },
    audiences: { doctor: false, staff: true, patient: false },
    triggerDays: 3, triggerLabel: "3 días después del vencimiento", category: "automatic",
  },
  {
    id: "payment_7d", type: "payment_overdue_7d", label: "Cobro automático (7 días)",
    description: "Envía recordatorio de pago al paciente tras 7 días de vencimiento",
    why: "Un recordatorio cortés al paciente a los 7 días recupera hasta un 60% de facturas vencidas.",
    because: "Muchas veces el paciente simplemente olvidó pagar. Un mensaje amable resuelve el problema sin incomodidad.",
    example: "El paciente recibe por WhatsApp: 'Hola Ana, tiene un saldo pendiente de ₡56,000 (Factura #045). Puede pagar por SINPE al 8888-1234.'",
    icon: CreditCard, iconColor: "text-amber-600", iconBg: "bg-amber-50",
    enabled: true, channels: { in_app: true, whatsapp: true, email: true },
    audiences: { doctor: false, staff: true, patient: true },
    triggerDays: 7, triggerLabel: "7 días después del vencimiento", category: "automatic",
  },
  {
    id: "followup_missing", type: "follow_up_missing", label: "Seguimiento no agendado",
    description: "Alerta cuando una consulta indica seguimiento pero no hay cita",
    why: "Los seguimientos olvidados pueden convertirse en complicaciones clínicas y legales.",
    because: "Si el doctor indicó 'control en 2 semanas' y no se agenda, el paciente puede empeorar. Esto también es un riesgo medicolegal.",
    example: "El doctor ve: 'Consulta de Carlos (2 abril) indica seguimiento en 2 semanas, pero no hay cita programada. ¿Desea agendar ahora?'",
    icon: Stethoscope, iconColor: "text-violet-600", iconBg: "bg-violet-50",
    enabled: true, channels: { in_app: true, whatsapp: false, email: false },
    audiences: { doctor: true, staff: true, patient: false },
    triggerDays: 3, triggerLabel: "3 días después de la consulta", category: "automatic",
  },
  {
    id: "patient_inactive", type: "patient_inactive", label: "Paciente inactivo",
    description: "Sugiere contactar pacientes que no han visitado en cierto tiempo",
    why: "Pacientes inactivos representan ingresos perdidos y posibles problemas de salud no atendidos.",
    because: "Un mensaje de reactivación recupera hasta un 20% de pacientes inactivos. Es más barato retener que adquirir nuevos.",
    example: "El sistema sugiere: '15 pacientes no han visitado en 90+ días. Los 3 con mayor historial de tratamiento: Pedro Mora, Luis Vargas, María Chen.'",
    icon: UserX, iconColor: "text-muted-foreground", iconBg: "bg-muted/50",
    enabled: true, channels: { in_app: true, whatsapp: false, email: false },
    audiences: { doctor: false, staff: true, patient: false },
    triggerDays: 90, triggerLabel: "90 días sin visita", category: "automatic",
  },
  {
    id: "lab_results", type: "lab_results", label: "Resultados de laboratorio",
    description: "Recordar revisar resultados de laboratorio pendientes",
    why: "Los resultados pendientes pueden contener hallazgos críticos que requieren acción inmediata.",
    because: "Un resultado anormal no revisado puede retrasar un diagnóstico. El doctor necesita un recordatorio si no ha actuado en 5 días.",
    example: "El doctor ve: 'Hemograma de Carlos Rodríguez (solicitado 1 abril) aún no ha sido revisado. ¿Desea marcar como revisado?'",
    icon: FlaskConical, iconColor: "text-cyan-600", iconBg: "bg-cyan-50",
    enabled: false, channels: { in_app: true, whatsapp: false, email: false },
    audiences: { doctor: true, staff: false, patient: false },
    triggerDays: 5, triggerLabel: "5 días después de solicitar", category: "manual",
  },
  {
    id: "prescription_renewal", type: "prescription_renewal", label: "Renovación de receta",
    description: "Alertar cuando un medicamento necesita renovación",
    why: "Si un paciente crónico se queda sin medicamento, puede tener una crisis de salud.",
    because: "Pacientes con hipertensión, diabetes u otras condiciones crónicas necesitan continuidad en su medicación.",
    example: "El paciente recibe: 'Hola Carlos, su receta de Losartán 50mg vence en 5 días. ¿Desea agendar cita para renovación?'",
    icon: Pill, iconColor: "text-emerald-600", iconBg: "bg-emerald-50",
    enabled: false, channels: { in_app: true, whatsapp: true, email: false },
    audiences: { doctor: true, staff: true, patient: true },
    triggerDays: 30, triggerLabel: "30 días después de emitir", category: "manual",
  },
  {
    id: "custom_reminder", type: "custom", label: "Recordatorio personalizado",
    description: "Notas y recordatorios libres programados manualmente por paciente",
    why: "No todas las situaciones encajan en una categoría predefinida. A veces necesita un recordatorio específico.",
    because: "Un doctor puede querer recordarse a sí mismo revisar un caso complejo, o el staff puede necesitar coordinar algo especial.",
    example: "El doctor programa: 'Llamar a Carlos en 2 semanas para preguntar si el dolor de muela cedió después de la calza temporal.'",
    icon: FileEdit, iconColor: "text-primary", iconBg: "bg-primary/10",
    enabled: true, channels: { in_app: true, whatsapp: true, email: true },
    audiences: { doctor: true, staff: true, patient: true },
    triggerLabel: "Fecha definida manualmente", category: "manual",
  },
];

const CHANNEL_META = [
  { key: "in_app" as const, label: "App", icon: Monitor },
  { key: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle },
  { key: "email" as const, label: "Email", icon: Mail },
];

const AUDIENCE_META: { key: AudienceKey; label: string; icon: typeof User }[] = [
  { key: "doctor", label: "Doctor", icon: Stethoscope },
  { key: "staff", label: "Personal", icon: Users },
  { key: "patient", label: "Paciente", icon: User },
];

export const AlertConfigPanel = () => {
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const toggleChannel = (id: string, channel: keyof AlertRule["channels"]) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, channels: { ...r.channels, [channel]: !r.channels[channel] } } : r));
  };

  const toggleAudience = (id: string, audience: AudienceKey) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, audiences: { ...r.audiences, [audience]: !r.audiences[audience] } } : r));
  };

  const updateTriggerDays = (id: string, days: number) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, triggerDays: days } : r));
  };

  const autoRules = rules.filter(r => r.category === "automatic");
  const manualRules = rules.filter(r => r.category === "manual");

  const renderRule = (rule: AlertRule) => {
    const Icon = rule.icon;
    const isExpanded = expandedRule === rule.id;
    return (
      <div key={rule.id} className={cn(
        "rounded-xl border transition-all",
        rule.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-70"
      )}>
        <div className="px-5 py-4 flex items-start gap-4">
          <div className={cn(rule.iconBg, "rounded-lg p-2 shrink-0")}>
            <Icon className={cn("h-4 w-4", rule.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{rule.label}</p>
              {rule.enabled && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-600 border-emerald-200">Activa</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>

            {/* Audiences summary */}
            {rule.enabled && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {AUDIENCE_META.filter(a => rule.audiences[a.key]).map(a => {
                  const AIcon = a.icon;
                  return (
                    <Badge key={a.key} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-primary/5 text-primary border-primary/20">
                      <AIcon className="h-2.5 w-2.5" />
                      {a.label}
                    </Badge>
                  );
                })}
                {CHANNEL_META.filter(c => rule.channels[c.key]).map(c => {
                  const CIcon = c.icon;
                  return (
                    <Badge key={c.key} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                      <CIcon className="h-2.5 w-2.5" />
                      {c.label}
                    </Badge>
                  );
                })}
              </div>
            )}

            {/* Expand for details */}
            {rule.enabled && (
              <button
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-2"
              >
                {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {isExpanded ? "Ocultar detalles" : "Ver detalles y configurar"}
              </button>
            )}

            {rule.enabled && isExpanded && (
              <div className="mt-3 space-y-4 pt-3 border-t border-border/50">
                {/* Why / Because / Example */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-xs text-muted-foreground">
                  <p><span className="font-semibold text-foreground">¿Por qué?</span> {rule.why}</p>
                  <p><span className="font-semibold text-foreground">Porque:</span> {rule.because}</p>
                  <p><span className="font-semibold text-foreground">Ejemplo:</span> <span className="italic">{rule.example}</span></p>
                </div>

                {/* Trigger timing */}
                {rule.triggerDays !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Disparar a los</span>
                    <Input
                      type="number"
                      value={rule.triggerDays}
                      onChange={e => updateTriggerDays(rule.id, parseInt(e.target.value) || 0)}
                      className="w-14 h-6 text-xs text-center px-1"
                      min={1}
                    />
                    <span className="text-muted-foreground">días</span>
                  </div>
                )}

                {/* Audience toggles */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">¿Quién recibe esta alerta?</p>
                  <div className="flex gap-1.5">
                    {AUDIENCE_META.map(a => {
                      const AIcon = a.icon;
                      const active = rule.audiences[a.key];
                      return (
                        <button
                          key={a.key}
                          onClick={() => toggleAudience(rule.id, a.key)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                            active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                          )}
                        >
                          <AIcon className="h-3 w-3" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Channels */}
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Canales de entrega</p>
                  <div className="flex gap-1.5">
                    {CHANNEL_META.map(ch => {
                      const ChIcon = ch.icon;
                      const active = rule.channels[ch.key];
                      return (
                        <button
                          key={ch.key}
                          onClick={() => toggleChannel(rule.id, ch.key)}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                            active
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                          )}
                        >
                          <ChIcon className="h-3 w-3" />
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
          <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
        </div>
      </div>
    );
  };

  const renderSection = (title: string, description: string, items: AlertRule[]) => (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2">
        {items.map(renderRule)}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Settings2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Configuración de Alertas</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure qué alertas se generan, a quién se envían y por cuáles canales.
        </p>

        {/* Legend */}
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-3 w-3 text-blue-600" />
            <span>Doctor — recibe alertas clínicas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 text-violet-600" />
            <span>Personal — recepción y asistentes</span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-emerald-600" />
            <span>Paciente — recibe comunicación directa</span>
          </div>
        </div>
      </div>

      {renderSection(
        "Alertas Automáticas (Tier 1)",
        "Se generan automáticamente según reglas y cronómetros. Haga clic en 'Ver detalles' para entender por qué cada alerta importa.",
        autoRules
      )}

      {renderSection(
        "Recordatorios Manuales",
        "Se programan individualmente desde el perfil del paciente.",
        manualRules
      )}
    </div>
  );
};
