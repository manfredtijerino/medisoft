import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, ChevronLeft, ChevronRight, Phone, Mail, Calendar, AlertCircle, CheckCircle2, Bell, Clock, CreditCard, UserX, Stethoscope, Filter, ArrowUpDown, MessageCircle, Trash2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type PatientStatus = "good" | "unpaid" | "reminder_sent" | "follow_up" | "no_appointment";
type AlertLevel = "none" | "info" | "warning" | "critical";

interface DemoPatient {
  id: string;
  name: string;
  cedula: string;
  email: string;
  phone: string;
  visits: number;
  nextAppt: string | null;
  notified: boolean;
  notifiedChannel?: "whatsapp" | "email" | "app";
  status: PatientStatus;
  balance: number;
  createdAt: string;
  alertLevel: AlertLevel;
  alertMessage?: string;
}

const DEMO_PATIENTS: DemoPatient[] = [
  { id: "1", name: "Carlos Rodríguez Mora", cedula: "1-0456-0789", email: "carlos@email.com", phone: "8845-1234", visits: 5, nextAppt: "8 Abr, 9:00 AM", notified: true, notifiedChannel: "whatsapp", status: "unpaid", balance: 56000, createdAt: "2025-04-01", alertLevel: "critical", alertMessage: "Saldo vencido 7+ días" },
  { id: "2", name: "Ana María López", cedula: "3-0234-0567", email: "ana@email.com", phone: "7012-5678", visits: 4, nextAppt: "10 Abr, 2:00 PM", notified: true, notifiedChannel: "email", status: "good", balance: 0, createdAt: "2025-03-28", alertLevel: "none" },
  { id: "3", name: "José Fernández Arias", cedula: "1-0987-0321", email: "jose@email.com", phone: "6234-9012", visits: 3, nextAppt: null, status: "reminder_sent", balance: 0, createdAt: "2025-03-25", alertLevel: "info", alertMessage: "Recordatorio enviado", notified: false },
  { id: "4", name: "Laura Sánchez Vargas", cedula: "2-0345-0678", email: "laura@email.com", phone: "8456-3456", visits: 3, nextAppt: "12 Abr, 11:00 AM", notified: false, status: "follow_up", balance: 0, createdAt: "2025-03-20", alertLevel: "warning", alertMessage: "Seguimiento pendiente 14 días" },
  { id: "5", name: "Roberto Mora Jiménez", cedula: "1-0567-0890", email: "roberto@email.com", phone: "7678-7890", visits: 2, nextAppt: "15 Abr, 3:00 PM", notified: true, notifiedChannel: "whatsapp", status: "good", balance: 0, createdAt: "2025-03-15", alertLevel: "none" },
  { id: "6", name: "María Solano Castro", cedula: "4-0123-0456", email: "maria@email.com", phone: "8890-1234", visits: 2, nextAppt: null, status: "no_appointment", balance: 0, createdAt: "2025-01-10", alertLevel: "warning", alertMessage: "Sin visita en 3 meses", notified: false },
  { id: "7", name: "Diego Ramírez Ulate", cedula: "1-0789-0123", email: "diego@email.com", phone: "6012-5678", visits: 1, nextAppt: "20 Abr, 10:00 AM", notified: false, status: "unpaid", balance: 28500, createdAt: "2025-04-02", alertLevel: "critical", alertMessage: "Factura vencida ₡28,500" },
  { id: "8", name: "Sofía Calderón Brenes", cedula: "3-0456-0789", email: "sofia@email.com", phone: "7234-9012", visits: 1, nextAppt: null, status: "good", balance: 0, createdAt: "2025-04-03", alertLevel: "none", notified: false },
];

const ALERT_TABS: { value: AlertLevel | "all"; label: string; icon: React.ElementType; color: string }[] = [
  { value: "all", label: "Todos", icon: Filter, color: "text-foreground" },
  { value: "critical", label: "Críticas", icon: AlertCircle, color: "text-destructive" },
  { value: "warning", label: "Atención", icon: Clock, color: "text-amber-600" },
  { value: "info", label: "Info", icon: Bell, color: "text-blue-600" },
  { value: "none", label: "Al Día", icon: CheckCircle2, color: "text-emerald-600" },
];

const ALERT_LEVEL_CONFIG: Record<AlertLevel, { bg: string; text: string; border: string; dot: string }> = {
  critical: { bg: "bg-destructive/5", text: "text-destructive", border: "border-destructive/20", dot: "bg-destructive" },
  warning: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  info: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  none: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

const PAGE_SIZE = 6;

const formatBalance = (amount: number) => {
  if (amount === 0) return null;
  return `₡${amount.toLocaleString("es-CR")}`;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString("es-CR", { day: "numeric", month: "short" });
};

const PatientsPage = () => {
  const [patients, setPatients] = useState(DEMO_PATIENTS);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [alertFilter, setAlertFilter] = useState<AlertLevel | "all">("all");
  const [sortBy, setSortBy] = useState<"recent" | "alerts">("recent");

  const deletePatient = (id: string, name: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
    toast.success(`Paciente "${name}" eliminado`);
    setPage(1);
  };

  const filtered = useMemo(() => {
    let results = patients.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.cedula.includes(search) ||
        p.email.toLowerCase().includes(search.toLowerCase());
      const matchesAlert = alertFilter === "all" || p.alertLevel === alertFilter;
      return matchesSearch && matchesAlert;
    });

    if (sortBy === "alerts") {
      const order: Record<AlertLevel, number> = { critical: 0, warning: 1, info: 2, none: 3 };
      results = [...results].sort((a, b) => order[a.alertLevel] - order[b.alertLevel]);
    } else {
      results = [...results].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return results;
  }, [search, alertFilter, sortBy, patients]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => ({
    all: patients.length,
    critical: patients.filter(p => p.alertLevel === "critical").length,
    warning: patients.filter(p => p.alertLevel === "warning").length,
    info: patients.filter(p => p.alertLevel === "info").length,
    none: patients.filter(p => p.alertLevel === "none").length,
  }), [patients]);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vista operativa — citas, cobros y alertas al instante.
          </p>
        </div>
        <Link to="/patients/new">
          <Button>
            <Plus className="h-4 w-4" /> Nuevo Paciente
          </Button>
        </Link>
      </div>

      {/* Alert filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-1.5 flex-wrap">
          {ALERT_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.value as keyof typeof counts] ?? 0;
            const active = alertFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => { setAlertFilter(tab.value as AlertLevel | "all"); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:border-primary/30 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="sm:ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5"
            onClick={() => setSortBy(sortBy === "recent" ? "alerts" : "recent")}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {sortBy === "recent" ? "Recientes" : "Por Alertas"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, cédula o correo..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-8"></th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cobros</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Próxima Cita</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Alerta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">Registrado</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">No se encontraron pacientes</td></tr>
              )}
              {paginated.map((p) => {
                const alertCfg = ALERT_LEVEL_CONFIG[p.alertLevel];
                return (
                  <tr key={p.id} className={`transition-colors hover:bg-muted/30 ${p.alertLevel === "critical" ? "bg-destructive/[0.02]" : ""}`}>
                    {/* Alert dot */}
                    <td className="px-4 py-4">
                      {p.alertLevel !== "none" && (
                        <span className={`block h-2.5 w-2.5 rounded-full ${alertCfg.dot} ${p.alertLevel === "critical" ? "animate-pulse" : ""}`} title={p.alertMessage} />
                      )}
                    </td>

                    {/* Patient name + contact */}
                    <td className="px-4 py-4">
                      <Link to={`/patients/${p.id}`} className="font-medium text-foreground hover:text-primary transition-colors">
                        {p.name}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="font-mono">{p.cedula}</span>
                        <span className="hidden sm:flex items-center gap-0.5"><Phone className="h-3 w-3" />{p.phone}</span>
                      </div>
                    </td>

                    {/* Cobros */}
                    <td className="px-4 py-4">
                      {p.balance > 0 ? (
                        <div>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-semibold gap-1">
                            <CreditCard className="h-3 w-3" />
                            {formatBalance(p.balance)}
                          </Badge>
                          <p className="text-[10px] text-amber-600/80 mt-1">Saldo pendiente</p>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Al Día
                        </Badge>
                      )}
                    </td>

                    {/* Próxima Cita + Notificado */}
                    <td className="px-4 py-4 hidden md:table-cell">
                      {p.nextAppt ? (
                        <div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {p.nextAppt}
                          </span>
                          <div className="mt-1">
                            {p.notified ? (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5 bg-emerald-50 text-emerald-600 border-emerald-200">
                                {p.notifiedChannel === "whatsapp" && <MessageCircle className="h-2.5 w-2.5" />}
                                {p.notifiedChannel === "email" && <Mail className="h-2.5 w-2.5" />}
                                {p.notifiedChannel === "app" && <Bell className="h-2.5 w-2.5" />}
                                Notificado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-amber-600 border-amber-200 bg-amber-50">
                                Sin notificar
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin cita</span>
                      )}
                    </td>

                    {/* Alert */}
                    <td className="px-4 py-4 hidden lg:table-cell">
                      {p.alertMessage ? (
                        <Badge variant="outline" className={`${alertCfg.bg} ${alertCfg.text} ${alertCfg.border} text-[11px] font-medium`}>
                          {p.alertMessage}
                        </Badge>
                      ) : (
                        <span className="text-xs text-emerald-600">✓ Sin alertas</span>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-4 py-4 hidden xl:table-cell">
                      <span className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/patients/${p.id}`}>Ver perfil</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deletePatient(p.id, p.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {filtered.length} paciente{filtered.length !== 1 ? "s" : ""} · Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === page ? "default" : "ghost"} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(p)}>
                {p}
              </Button>
            ))}
            <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientsPage;
