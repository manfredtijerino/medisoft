import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, Send, CheckCircle2, XCircle, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FILTERS = [
  { value: "all", label: "Todas" },
  { value: "accepted", label: "Aceptadas" },
  { value: "pending", label: "Pendientes" },
  { value: "rejected", label: "Rechazadas" },
];

const formatCRC = (n: number) => `₡${n.toLocaleString("es-CR")}`;

const DEMO_INVOICES = [
  { id: "FE-001-00000001", patient: "Carlos Rodríguez", date: "2026-04-03", total: 45000, status: "accepted" },
  { id: "FE-001-00000002", patient: "Ana María López", date: "2026-04-03", total: 35000, status: "accepted" },
  { id: "FE-001-00000003", patient: "José Fernández", date: "2026-04-02", total: 25000, status: "pending" },
  { id: "FE-001-00000004", patient: "Laura Sánchez", date: "2026-04-02", total: 80000, status: "accepted" },
  { id: "FE-001-00000005", patient: "Roberto Mora", date: "2026-04-01", total: 52000, status: "rejected" },
  { id: "FE-001-00000006", patient: "María Solano", date: "2026-04-01", total: 45000, status: "accepted" },
  { id: "FE-001-00000007", patient: "Diego Ramírez", date: "2026-03-31", total: 120000, status: "pending" },
  { id: "FE-001-00000008", patient: "Sofía Calderón", date: "2026-03-30", total: 35000, status: "accepted" },
];

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  accepted: { label: "Aceptada", class: "bg-success/10 text-success", icon: CheckCircle2 },
  pending: { label: "Pendiente", class: "bg-warning/10 text-warning", icon: Clock },
  rejected: { label: "Rechazada", class: "bg-destructive/10 text-destructive", icon: XCircle },
};

const PAGE_SIZE = 5;

const InvoicesPage = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    DEMO_INVOICES.filter((inv) => {
      if (activeFilter !== "all" && inv.status !== activeFilter) return false;
      if (search && !inv.id.toLowerCase().includes(search.toLowerCase()) && !inv.patient.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [activeFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Facturas Electrónicas</h1>
          <p className="text-muted-foreground mt-1">
            Cree, envíe y gestione sus facturas electrónicas.
          </p>
        </div>
        <Link to="/invoices/new">
          <Button>
            <Plus className="h-4 w-4" /> Nueva Factura
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Crear</p>
            <p className="text-xs text-muted-foreground">Paciente + servicios + pago</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <Send className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Enviar</p>
            <p className="text-xs text-muted-foreground">Se firma y envía a Hacienda</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Aceptada</p>
            <p className="text-xs text-muted-foreground">Hacienda aprueba la factura</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Rechazada</p>
            <p className="text-xs text-muted-foreground">Corrija errores y reenvíe</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por consecutivo o paciente..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setActiveFilter(f.value); setPage(1); }}
              className={cn(
                "px-3 py-2 text-sm rounded-lg border transition-all",
                activeFilter === f.value
                  ? "border-primary bg-primary text-primary-foreground font-medium shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Consecutivo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paciente</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Fecha</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((inv) => {
                const sc = STATUS_CONFIG[inv.status];
                const StatusIcon = sc.icon;
                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-5 py-4">
                      <Link to={`/invoices/${inv.id}`} className="font-mono-code text-xs font-medium text-primary hover:underline">{inv.id}</Link>
                    </td>
                    <td className="px-5 py-4 font-medium text-card-foreground">{inv.patient}</td>
                    <td className="px-5 py-4 text-muted-foreground hidden md:table-cell">{inv.date}</td>
                    <td className="px-5 py-4 text-right font-mono-code font-medium text-card-foreground">{formatCRC(inv.total)}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium", sc.class)}>
                        <StatusIcon className="h-3 w-3" /> {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {filtered.length} factura{filtered.length !== 1 ? "s" : ""} · Página {page} de {totalPages}
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

export default InvoicesPage;
