import { useState } from "react";
import { Bell, Calendar, CreditCard, Clock, UserX, CheckCircle2, X, ChevronRight, MessageCircle, Mail, Shield, Sparkles, Eye, Send, Ban, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { AlertTemplateManager } from "./AlertTemplateManager";

type AlertType = "appointment_reminder" | "payment_overdue" | "follow_up_missing" | "patient_inactive" | "appointment_confirmed" | "prescription_renewal" | "lab_results";
type AlertChannel = "whatsapp" | "in_app" | "email";
type AlertStatus = "pending_approval" | "approved" | "sent" | "dismissed" | "rejected";
type AlertAudience = "staff" | "patient" | "both";

interface Alert {
  id: string;
  type: AlertType;
  channel: AlertChannel;
  status: AlertStatus;
  audience: AlertAudience;
  title: string;
  description: string;
  patientName: string;
  time: string;
  actionLabel?: string;
  aiGenerated: boolean;
  templateName?: string;
  previewMessage?: string;
}

const ALERT_CONFIG: Record<AlertType, { icon: typeof Bell; color: string; bg: string; label: string }> = {
  appointment_reminder: { icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", label: "Recordatorio de Cita" },
  payment_overdue: { icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50", label: "Pago Vencido" },
  follow_up_missing: { icon: Clock, color: "text-violet-600", bg: "bg-violet-50", label: "Seguimiento Pendiente" },
  patient_inactive: { icon: UserX, color: "text-muted-foreground", bg: "bg-muted/50", label: "Paciente Inactivo" },
  appointment_confirmed: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", label: "Cita Confirmada" },
  prescription_renewal: { icon: FileText, color: "text-cyan-600", bg: "bg-cyan-50", label: "Renovación Receta" },
  lab_results: { icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", label: "Resultados Lab" },
};

const DEMO_ALERTS: Alert[] = [
  {
    id: "1", type: "appointment_reminder", channel: "whatsapp", status: "pending_approval", audience: "patient",
    title: "Recordatorio: Cita mañana", description: "Carlos Rodríguez tiene cita mañana a las 9:00 AM",
    patientName: "Carlos Rodríguez", time: "Hace 5 min", actionLabel: "Aprobar y Enviar", aiGenerated: true,
    templateName: "Recordatorio 24h",
    previewMessage: "Hola Carlos 👋 Le recordamos su cita mañana 8 Abr a las 9:00 AM en Clínica González. Confirme respondiendo SÍ. Si necesita reagendar, llámenos al 2223-4567.",
  },
  {
    id: "2", type: "payment_overdue", channel: "email", status: "pending_approval", audience: "patient",
    title: "Cobro: Factura vencida 7 días", description: "Factura #FE-0042 de Diego Ramírez — ₡28,500 pendiente",
    patientName: "Diego Ramírez", time: "Hace 1 hora", actionLabel: "Aprobar y Enviar", aiGenerated: true,
    templateName: "Cobro amigable 7d",
    previewMessage: "Estimado Diego, le informamos que su factura #FE-0042 por ₡28,500 se encuentra pendiente de pago desde hace 7 días. Puede realizar el pago por SINPE Móvil al 8845-1234 o en nuestra clínica. Quedamos atentos.",
  },
  {
    id: "3", type: "follow_up_missing", channel: "in_app", status: "pending_approval", audience: "staff",
    title: "Seguimiento no agendado", description: "Laura Sánchez — consulta hace 14 días sin cita de seguimiento",
    patientName: "Laura Sánchez", time: "Hace 2 horas", actionLabel: "Agendar cita", aiGenerated: true,
    templateName: "Alerta interna seguimiento",
  },
  {
    id: "4", type: "patient_inactive", channel: "in_app", status: "approved", audience: "staff",
    title: "Paciente inactivo 3 meses", description: "María Solano no ha visitado en 3 meses",
    patientName: "María Solano", time: "Ayer", aiGenerated: false,
  },
  {
    id: "5", type: "appointment_confirmed", channel: "whatsapp", status: "sent", audience: "both",
    title: "Cita confirmada por paciente", description: "Ana López confirmó su cita del 10 Abr a las 2:00 PM vía WhatsApp",
    patientName: "Ana López", time: "Ayer", aiGenerated: false,
  },
];


const STATUS_META: Record<AlertStatus, { label: string; color: string; bg: string }> = {
  pending_approval: { label: "Pendiente aprobación", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "Aprobado", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  sent: { label: "Enviado", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  dismissed: { label: "Descartado", color: "text-muted-foreground", bg: "bg-muted/50 border-border" },
  rejected: { label: "Rechazado", color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
};

const AUDIENCE_META: Record<AlertAudience, { label: string; icon: typeof Shield }> = {
  staff: { label: "Equipo", icon: Shield },
  patient: { label: "Paciente", icon: Send },
  both: { label: "Ambos", icon: Send },
};

export const NotificationCenter = () => {
  const [alerts, setAlerts] = useState(DEMO_ALERTS);
  const [activeTab, setActiveTab] = useState("pending");
  const [previewAlert, setPreviewAlert] = useState<Alert | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);

  const pendingCount = alerts.filter(a => a.status === "pending_approval").length;

  const approveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "sent" as AlertStatus } : a));
    setPreviewAlert(null);
  };

  const rejectAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" as AlertStatus } : a));
    setPreviewAlert(null);
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: "dismissed" as AlertStatus } : a));
  };

  const pendingAlerts = alerts.filter(a => a.status === "pending_approval");
  const historyAlerts = alerts.filter(a => ["sent", "approved", "rejected", "dismissed"].includes(a.status));

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {pendingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
                {pendingCount}
              </span>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Centro de Notificaciones</SheetTitle>
              <div className="flex items-center gap-2">
                {pendingCount > 0 && (
                  <Badge className="bg-destructive text-destructive-foreground text-[10px] px-2">
                    {pendingCount} por aprobar
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Alertas generadas por IA — requieren aprobación antes de enviarse al paciente.</p>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-5 pt-3 shrink-0">
              <TabsList className="w-full">
                <TabsTrigger value="pending" className="flex-1 gap-1 text-xs">
                  <Shield className="h-3.5 w-3.5" /> Por Aprobar
                  {pendingCount > 0 && <span className="ml-1 bg-destructive/10 text-destructive px-1.5 rounded-full text-[10px] font-bold">{pendingCount}</span>}
                </TabsTrigger>
                <TabsTrigger value="history" className="flex-1 gap-1 text-xs">
                  <Clock className="h-3.5 w-3.5" /> Historial
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex-1 gap-1 text-xs">
                  <FileText className="h-3.5 w-3.5" /> Plantillas
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pending Approval */}
            <TabsContent value="pending" className="flex-1 overflow-y-auto mt-0 px-0">
              {pendingAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-400" />
                  <p className="font-medium">Todo aprobado</p>
                  <p className="text-xs mt-1">No hay alertas pendientes de aprobación</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingAlerts.map((alert) => {
                    const config = ALERT_CONFIG[alert.type];
                    const Icon = config.icon;
                    const audienceMeta = AUDIENCE_META[alert.audience];
                    return (
                      <div key={alert.id} className="px-5 py-4 space-y-3">
                        <div className="flex gap-3">
                          <div className={`${config.bg} rounded-lg p-2 h-fit shrink-0`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[10px] text-muted-foreground">{alert.time}</span>
                              {alert.aiGenerated && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-violet-600 border-violet-200 bg-violet-50">
                                  <Sparkles className="h-2.5 w-2.5" /> IA
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                {alert.channel === "whatsapp" && <><MessageCircle className="h-2.5 w-2.5 text-emerald-600" /> WhatsApp</>}
                                {alert.channel === "email" && <><Mail className="h-2.5 w-2.5 text-blue-600" /> Email</>}
                                {alert.channel === "in_app" && <><Bell className="h-2.5 w-2.5" /> App</>}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
                                <audienceMeta.icon className="h-2.5 w-2.5" /> {audienceMeta.label}
                              </Badge>
                              {alert.templateName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground">
                                  {alert.templateName}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Preview message */}
                        {alert.previewMessage && (
                          <div className="bg-muted/40 rounded-lg p-3 text-xs text-foreground border border-border ml-11">
                            <p className="text-[10px] text-muted-foreground mb-1.5 font-medium uppercase tracking-wider">Vista previa del mensaje:</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{alert.previewMessage}</p>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 ml-11">
                          <Button
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => approveAlert(alert.id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Aprobar y Enviar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setPreviewAlert(alert)}
                          >
                            <Eye className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                            onClick={() => rejectAlert(alert.id)}
                          >
                            <Ban className="h-3.5 w-3.5" /> Rechazar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* History */}
            <TabsContent value="history" className="flex-1 overflow-y-auto mt-0 px-0">
              {historyAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Clock className="h-10 w-10 mb-3 text-muted-foreground/40" />
                  <p className="font-medium">Sin historial</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {historyAlerts.map((alert) => {
                    const config = ALERT_CONFIG[alert.type];
                    const Icon = config.icon;
                    const statusMeta = STATUS_META[alert.status];
                    return (
                      <div key={alert.id} className="px-5 py-3.5 flex gap-3 opacity-80">
                        <div className={`${config.bg} rounded-lg p-2 h-fit shrink-0`}>
                          <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{alert.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{alert.patientName} · {alert.time}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Badge variant="outline" className={`${statusMeta.bg} ${statusMeta.color} text-[10px] px-1.5 py-0 h-4 border`}>
                              {statusMeta.label}
                            </Badge>
                            {alert.channel === "whatsapp" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-emerald-600 border-emerald-200 bg-emerald-50">
                                <MessageCircle className="h-2.5 w-2.5" /> WhatsApp
                              </Badge>
                            )}
                            {alert.channel === "email" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 text-blue-600 border-blue-200 bg-blue-50">
                                <Mail className="h-2.5 w-2.5" /> Email
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Templates */}
            <TabsContent value="templates" className="flex-1 overflow-y-auto mt-0 px-0">
              <div className="px-5 py-4">
                <AlertTemplateManager />
              </div>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
};
