import { useState } from "react";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { es } from "date-fns/locale";
import { Bell, Calendar as CalendarIcon, Clock, Plus, X, MessageCircle, Mail, Monitor, Stethoscope, Users, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ReminderType = "follow_up" | "payment" | "appointment" | "custom" | "reactivation" | "lab_results" | "prescription";
type ReminderChannel = "in_app" | "whatsapp" | "email";
type ReminderAudience = "doctor" | "staff" | "patient";

interface PreAlert {
  hours: number;
  enabled: boolean;
}

interface Reminder {
  id: string;
  type: ReminderType;
  title: string;
  note: string;
  date: Date;
  audiences: {
    doctor: { enabled: boolean; channels: ReminderChannel[]; preAlerts: PreAlert[] };
    staff: { enabled: boolean; channels: ReminderChannel[]; preAlerts: PreAlert[] };
    patient: { enabled: boolean; channels: ReminderChannel[]; preAlerts: PreAlert[] };
  };
  status: "scheduled" | "sent" | "dismissed";
}

const REMINDER_TYPES: { value: ReminderType; label: string; description: string; icon: string }[] = [
  { value: "follow_up", label: "Seguimiento", description: "Contactar para verificar evolución", icon: "🔄" },
  { value: "payment", label: "Cobro pendiente", description: "Recordar pago de factura", icon: "💰" },
  { value: "appointment", label: "Agendar cita", description: "Recordar próxima cita", icon: "📅" },
  { value: "reactivation", label: "Reactivación", description: "Paciente inactivo", icon: "📞" },
  { value: "lab_results", label: "Resultados lab", description: "Revisar resultados", icon: "🧪" },
  { value: "prescription", label: "Receta", description: "Renovar medicamento", icon: "💊" },
  { value: "custom", label: "Personalizado", description: "Nota libre", icon: "📝" },
];

const QUICK_DATES = [
  { label: "Mañana", fn: () => addDays(new Date(), 1) },
  { label: "3 días", fn: () => addDays(new Date(), 3) },
  { label: "1 semana", fn: () => addWeeks(new Date(), 1) },
  { label: "2 semanas", fn: () => addWeeks(new Date(), 2) },
  { label: "1 mes", fn: () => addMonths(new Date(), 1) },
  { label: "3 meses", fn: () => addMonths(new Date(), 3) },
];

const CHANNEL_CONFIG: Record<ReminderChannel, { label: string; icon: typeof Bell }> = {
  in_app: { label: "App", icon: Monitor },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  email: { label: "Correo", icon: Mail },
};

const AUDIENCE_CONFIG: Record<ReminderAudience, { label: string; description: string; icon: typeof User; color: string; defaultChannels: ReminderChannel[]; defaultPreAlerts: PreAlert[] }> = {
  doctor: {
    label: "Doctor",
    description: "El médico tratante recibe la alerta para prepararse",
    icon: Stethoscope,
    color: "text-blue-600",
    defaultChannels: ["in_app"],
    defaultPreAlerts: [{ hours: 48, enabled: true }, { hours: 24, enabled: true }],
  },
  staff: {
    label: "Personal",
    description: "Recepción y asistentes para coordinar logística",
    icon: Users,
    color: "text-violet-600",
    defaultChannels: ["in_app"],
    defaultPreAlerts: [{ hours: 48, enabled: false }, { hours: 24, enabled: true }],
  },
  patient: {
    label: "Paciente",
    description: "El paciente recibe confirmación o recordatorio",
    icon: User,
    color: "text-emerald-600",
    defaultChannels: ["whatsapp"],
    defaultPreAlerts: [{ hours: 48, enabled: false }, { hours: 24, enabled: true }],
  },
};

const PRE_ALERT_OPTIONS = [
  { hours: 72, label: "72h antes" },
  { hours: 48, label: "48h antes" },
  { hours: 24, label: "24h antes" },
  { hours: 1, label: "1h antes" },
];

interface Props {
  patientName: string;
}

const makeDefaultAudiences = (): Reminder["audiences"] => ({
  doctor: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 48, enabled: true }, { hours: 24, enabled: true }] },
  staff: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
  patient: { enabled: true, channels: ["whatsapp"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
});

const DEMO_REMINDERS: Reminder[] = [
  {
    id: "r1", type: "follow_up", title: "Verificar dolor molar", note: "Revisar si cedió el dolor después de la calza temporal",
    date: addWeeks(new Date(), 2), status: "scheduled",
    audiences: {
      doctor: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 48, enabled: true }, { hours: 24, enabled: true }] },
      staff: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
      patient: { enabled: true, channels: ["whatsapp", "email"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
    },
  },
  {
    id: "r2", type: "appointment", title: "Agendar endodoncia", note: "",
    date: addDays(new Date(), 5), status: "scheduled",
    audiences: {
      doctor: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
      staff: { enabled: true, channels: ["in_app"], preAlerts: [{ hours: 48, enabled: true }, { hours: 24, enabled: true }] },
      patient: { enabled: true, channels: ["whatsapp"], preAlerts: [{ hours: 24, enabled: true }, { hours: 48, enabled: false }] },
    },
  },
];

export const PatientReminders = ({ patientName }: Props) => {
  const [reminders, setReminders] = useState<Reminder[]>(DEMO_REMINDERS);
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ReminderType>("follow_up");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState<Date | undefined>(addWeeks(new Date(), 2));
  const [audiences, setAudiences] = useState<Reminder["audiences"]>(makeDefaultAudiences());

  const resetForm = () => {
    setSelectedType("follow_up");
    setTitle("");
    setNote("");
    setDate(addWeeks(new Date(), 2));
    setAudiences(makeDefaultAudiences());
  };

  const toggleAudience = (key: ReminderAudience) => {
    setAudiences(prev => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }));
  };

  const toggleAudienceChannel = (audience: ReminderAudience, channel: ReminderChannel) => {
    setAudiences(prev => {
      const current = prev[audience].channels;
      const next = current.includes(channel) ? current.filter(c => c !== channel) : [...current, channel];
      return { ...prev, [audience]: { ...prev[audience], channels: next } };
    });
  };

  const togglePreAlert = (audience: ReminderAudience, hours: number) => {
    setAudiences(prev => {
      const preAlerts = prev[audience].preAlerts.map(pa =>
        pa.hours === hours ? { ...pa, enabled: !pa.enabled } : pa
      );
      const exists = preAlerts.find(pa => pa.hours === hours);
      if (!exists) preAlerts.push({ hours, enabled: true });
      return { ...prev, [audience]: { ...prev[audience], preAlerts } };
    });
  };

  const handleSave = () => {
    if (!date) return;
    const typeConfig = REMINDER_TYPES.find(t => t.value === selectedType)!;
    const newReminder: Reminder = {
      id: `r${Date.now()}`,
      type: selectedType,
      title: title || typeConfig.label,
      note,
      date,
      audiences,
      status: "scheduled",
    };
    setReminders(prev => [...prev, newReminder]);
    resetForm();
    setOpen(false);
    toast.success(`Recordatorio "${title || typeConfig.label}" programado`);
  };

  const dismissReminder = (id: string) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    toast.info("Recordatorio eliminado");
  };

  const scheduled = reminders.filter(r => r.status === "scheduled").sort((a, b) => a.date.getTime() - b.date.getTime());

  const getAudienceSummary = (r: Reminder) => {
    const parts: string[] = [];
    if (r.audiences.doctor.enabled) parts.push("Doctor");
    if (r.audiences.staff.enabled) parts.push("Personal");
    if (r.audiences.patient.enabled) parts.push("Paciente");
    return parts;
  };

  const getChannelSummary = (r: Reminder) => {
    const channels = new Set<ReminderChannel>();
    (Object.values(r.audiences) as typeof r.audiences.doctor[]).forEach((a: any) => {
      if (a.enabled) a.channels.forEach((c: ReminderChannel) => channels.add(c));
    });
    return Array.from(channels);
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold text-card-foreground">Recordatorios</h3>
            <p className="text-xs text-muted-foreground">Alertas para doctor, personal y paciente</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-3.5 w-3.5" /> Nuevo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Programar Recordatorio</DialogTitle>
              <p className="text-sm text-muted-foreground">Para {patientName}</p>
            </DialogHeader>
            <div className="space-y-5 mt-2">
              {/* Reminder type */}
              <div className="space-y-2">
                <Label>Tipo de recordatorio</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {REMINDER_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setSelectedType(rt.value)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all text-sm",
                        selectedType === rt.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-base">{rt.icon}</span>
                      <div>
                        <p className="font-medium text-foreground text-xs">{rt.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Título (opcional)</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder={REMINDER_TYPES.find(t => t.value === selectedType)?.label} />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>¿Cuándo?</Label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_DATES.map((qd) => {
                    const qdDate = qd.fn();
                    const isSelected = date && format(date, "yyyy-MM-dd") === format(qdDate, "yyyy-MM-dd");
                    return (
                      <button
                        key={qd.label}
                        type="button"
                        onClick={() => setDate(qd.fn())}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-foreground border-border hover:border-primary/30"
                        )}
                      >
                        {qd.label}
                      </button>
                    );
                  })}
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {date ? format(date, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Audience Configuration */}
              <div className="space-y-3">
                <Label>¿A quién se notifica?</Label>
                <p className="text-xs text-muted-foreground -mt-1">Configure qué audiencia recibe la alerta, por cuál canal y con cuánta anticipación.</p>

                <div className="space-y-3">
                  {(Object.entries(AUDIENCE_CONFIG) as [ReminderAudience, typeof AUDIENCE_CONFIG.doctor][]).map(([key, config]) => {
                    const Icon = config.icon;
                    const aud = audiences[key];
                    return (
                      <div key={key} className={cn(
                        "rounded-xl border transition-all",
                        aud.enabled ? "border-border bg-card" : "border-border/50 bg-muted/20 opacity-60"
                      )}>
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={cn("h-4 w-4", config.color)} />
                            <div>
                              <p className="text-sm font-medium text-foreground">{config.label}</p>
                              <p className="text-[11px] text-muted-foreground">{config.description}</p>
                            </div>
                          </div>
                          <Switch checked={aud.enabled} onCheckedChange={() => toggleAudience(key)} />
                        </div>

                        {aud.enabled && (
                          <div className="px-4 pb-3 pt-0 space-y-3 border-t border-border/50 mt-0 pt-3">
                            {/* Channels */}
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Canal de envío</p>
                              <div className="flex gap-1.5">
                                {(Object.entries(CHANNEL_CONFIG) as [ReminderChannel, typeof CHANNEL_CONFIG.in_app][]).map(([chKey, chConfig]) => {
                                  const ChIcon = chConfig.icon;
                                  const active = aud.channels.includes(chKey);
                                  // Patient can use whatsapp/email; staff/doctor use in_app mainly
                                  return (
                                    <button
                                      key={chKey}
                                      type="button"
                                      onClick={() => toggleAudienceChannel(key, chKey)}
                                      className={cn(
                                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                                        active
                                          ? "bg-primary/10 text-primary border-primary/20"
                                          : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                                      )}
                                    >
                                      <ChIcon className="h-3 w-3" />
                                      {chConfig.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Pre-alerts */}
                            <div>
                              <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Alertar con anticipación</p>
                              <div className="flex flex-wrap gap-1.5">
                                {PRE_ALERT_OPTIONS.map((opt) => {
                                  const pa = aud.preAlerts.find(p => p.hours === opt.hours);
                                  const active = pa?.enabled ?? false;
                                  return (
                                    <button
                                      key={opt.hours}
                                      type="button"
                                      onClick={() => togglePreAlert(key, opt.hours)}
                                      className={cn(
                                        "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                                        active
                                          ? "bg-primary/10 text-primary border-primary/20"
                                          : "bg-muted/30 text-muted-foreground border-transparent hover:border-border"
                                      )}
                                    >
                                      <Clock className="h-3 w-3" />
                                      {opt.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              <div className="space-y-2">
                <Label>Nota (opcional)</Label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="Detalles adicionales..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!date}>
                  <Bell className="h-4 w-4" /> Programar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs: By audience */}
      <Tabs defaultValue="all" className="w-full">
        <div className="px-6 pt-3">
          <TabsList className="h-8 bg-muted/50">
            <TabsTrigger value="all" className="text-xs h-7">Todos</TabsTrigger>
            <TabsTrigger value="doctor" className="text-xs h-7 gap-1"><Stethoscope className="h-3 w-3" /> Doctor</TabsTrigger>
            <TabsTrigger value="staff" className="text-xs h-7 gap-1"><Users className="h-3 w-3" /> Personal</TabsTrigger>
            <TabsTrigger value="patient" className="text-xs h-7 gap-1"><User className="h-3 w-3" /> Paciente</TabsTrigger>
          </TabsList>
        </div>

        {["all", "doctor", "staff", "patient"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0">
            <div className="divide-y divide-border">
              {(() => {
                const filtered = tab === "all"
                  ? scheduled
                  : scheduled.filter(r => r.audiences[tab as ReminderAudience]?.enabled);
                if (filtered.length === 0) {
                  return (
                    <div className="px-6 py-8 text-center text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Sin recordatorios{tab !== "all" ? ` para ${AUDIENCE_CONFIG[tab as ReminderAudience].label}` : ""}</p>
                    </div>
                  );
                }
                return filtered.map((r) => {
                  const typeConfig = REMINDER_TYPES.find(t => t.value === r.type)!;
                  const audienceList = getAudienceSummary(r);
                  const channelList = getChannelSummary(r);
                  const daysUntil = Math.ceil((r.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                  return (
                    <div key={r.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-muted/20 transition-colors">
                      <span className="text-lg mt-0.5">{typeConfig.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{r.title}</p>
                        {r.note && <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                            <CalendarIcon className="h-2.5 w-2.5" />
                            {format(r.date, "d MMM", { locale: es })}
                          </Badge>
                          {audienceList.map(a => (
                            <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/5 text-primary border-primary/20">{a}</Badge>
                          ))}
                          {channelList.map(ch => {
                            const ChIcon = CHANNEL_CONFIG[ch].icon;
                            return (
                              <Badge key={ch} variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                <ChIcon className="h-2.5 w-2.5" />
                                {CHANNEL_CONFIG[ch].label}
                              </Badge>
                            );
                          })}
                          {daysUntil <= 3 && daysUntil > 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-600 border-amber-200">
                              En {daysUntil}d
                            </Badge>
                          )}
                          {daysUntil <= 0 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-destructive/10 text-destructive border-destructive/20">
                              Hoy
                            </Badge>
                          )}
                        </div>
                      </div>
                      <button onClick={() => dismissReminder(r.id)} className="text-muted-foreground hover:text-destructive transition-colors mt-1">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
