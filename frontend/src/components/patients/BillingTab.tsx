import { useState } from "react";
import { Link } from "react-router-dom";
import { Receipt, Package, CheckCircle2, Clock, XCircle, ChevronRight, CreditCard, AlertCircle, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PatientInvoice {
  id: string;
  date: string;
  total: number;
  status: "accepted" | "pending" | "rejected";
  paymentStatus: "paid" | "partial" | "pending";
  paidAmount: number;
  items: { name: string; quantity: number; unitPrice: number }[];
}

const MOCK_PATIENT_INVOICES: PatientInvoice[] = [
  {
    id: "FE-001-00000001",
    date: "2026-04-03",
    total: 90400,
    status: "accepted",
    paymentStatus: "paid",
    paidAmount: 90400,
    items: [
      { name: "Consulta Dental General", quantity: 1, unitPrice: 45000 },
      { name: "Limpieza Dental", quantity: 1, unitPrice: 35000 },
    ],
  },
  {
    id: "FE-001-00000003",
    date: "2026-03-20",
    total: 56500,
    status: "accepted",
    paymentStatus: "partial",
    paidAmount: 28250,
    items: [
      { name: "Ortodoncia — Consulta", quantity: 1, unitPrice: 25000 },
      { name: "Radiografía Panorámica", quantity: 1, unitPrice: 25000 },
    ],
  },
  {
    id: "FE-001-00000007",
    date: "2026-03-01",
    total: 45200,
    status: "pending",
    paymentStatus: "pending",
    paidAmount: 0,
    items: [
      { name: "Extracción Simple", quantity: 1, unitPrice: 40000 },
    ],
  },
];

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  accepted: { label: "Aceptada", class: "bg-success/10 text-success", icon: CheckCircle2 },
  pending: { label: "Pendiente", class: "bg-warning/10 text-warning", icon: Clock },
  rejected: { label: "Rechazada", class: "bg-destructive/10 text-destructive", icon: XCircle },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  paid: { label: "Pagado", class: "bg-success/10 text-success" },
  partial: { label: "Pago Parcial", class: "bg-warning/10 text-warning" },
  pending: { label: "Sin Pagar", class: "bg-destructive/10 text-destructive" },
};

const formatCRC = (n: number) => `₡${n.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

type SubTab = "invoices" | "services";

export const BillingTab = () => {
  const [subTab, setSubTab] = useState<SubTab>("invoices");
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  const allServices = MOCK_PATIENT_INVOICES.flatMap((inv) =>
    inv.items.map((item) => ({
      ...item,
      invoiceId: inv.id,
      date: inv.date,
      invoiceStatus: inv.status,
    }))
  );

  const totalSpent = MOCK_PATIENT_INVOICES.reduce((s, i) => s + i.paidAmount, 0);
  const totalPending = MOCK_PATIENT_INVOICES.reduce((s, i) => s + (i.total - i.paidAmount), 0);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Facturado</p>
          <p className="text-xl font-bold font-mono-code text-card-foreground mt-1">
            {formatCRC(MOCK_PATIENT_INVOICES.reduce((s, i) => s + i.total, 0))}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <p className="text-xs text-muted-foreground">Pagado</p>
          </div>
          <p className="text-xl font-bold font-mono-code text-success mt-1">{formatCRC(totalSpent)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-1.5">
            {totalPending > 0 ? (
              <AlertCircle className="h-3.5 w-3.5 text-warning" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            )}
            <p className="text-xs text-muted-foreground">Saldo Pendiente</p>
          </div>
          <p className={cn("text-xl font-bold font-mono-code mt-1", totalPending > 0 ? "text-warning" : "text-success")}>
            {formatCRC(totalPending)}
          </p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setSubTab("invoices")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            subTab === "invoices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Receipt className="h-4 w-4" />
          Facturas ({MOCK_PATIENT_INVOICES.length})
        </button>
        <button
          onClick={() => setSubTab("services")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
            subTab === "services" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-4 w-4" />
          Servicios ({allServices.length})
        </button>
      </div>

      {subTab === "invoices" && (
        <div className="space-y-3">
          {MOCK_PATIENT_INVOICES.map((inv) => {
            const sc = STATUS_CONFIG[inv.status];
            const pc = PAYMENT_STATUS_CONFIG[inv.paymentStatus];
            const StatusIcon = sc.icon;
            const isExpanded = expandedInvoice === inv.id;

            return (
              <div key={inv.id} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpandedInvoice(isExpanded ? null : inv.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code text-xs font-medium text-primary">{inv.id}</span>
                      <span className="text-xs text-muted-foreground">{inv.date}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", sc.class)}>
                        <StatusIcon className="h-3 w-3" /> {sc.label}
                      </span>
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium", pc.class)}>
                        <CreditCard className="h-3 w-3" /> {pc.label}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-code font-bold text-card-foreground">{formatCRC(inv.total)}</p>
                    {inv.paymentStatus === "partial" && (
                      <p className="text-xs text-warning font-mono-code mt-0.5">
                        Pagado: {formatCRC(inv.paidAmount)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")} />
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 bg-muted/20 space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detalle de Servicios</p>
                    <div className="space-y-2">
                      {inv.items.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-card-foreground">{item.name}</span>
                            {item.quantity > 1 && (
                              <span className="text-xs text-muted-foreground">×{item.quantity}</span>
                            )}
                          </div>
                          <span className="font-mono-code text-card-foreground">{formatCRC(item.unitPrice * item.quantity)}</span>
                        </div>
                      ))}
                    </div>

                    {inv.paymentStatus === "partial" && (
                      <div className="bg-warning/5 border border-warning/20 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <p className="text-sm font-medium text-card-foreground">Pagos Parciales</p>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Pago 1 — 2026-03-20 (Tarjeta)</span>
                            <span className="font-mono-code text-card-foreground">{formatCRC(inv.paidAmount)}</span>
                          </div>
                          <div className="flex justify-between text-warning font-medium">
                            <span>Pendiente — Vence 2026-04-09</span>
                            <span className="font-mono-code">{formatCRC(inv.total - inv.paidAmount)}</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-warning rounded-full transition-all"
                            style={{ width: `${(inv.paidAmount / inv.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="pt-2">
                      <Link to={`/invoices/${inv.id}`}>
                        <Button variant="outline" size="sm">
                          Ver Factura Completa <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {subTab === "services" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Servicio / Producto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Fecha</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cant.</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Factura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allServices.map((svc, i) => (
                <tr key={i} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-card-foreground font-medium">{svc.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{svc.date}</td>
                  <td className="px-3 py-3 text-center font-mono-code">{svc.quantity}</td>
                  <td className="px-5 py-3 text-right font-mono-code font-medium text-card-foreground">{formatCRC(svc.unitPrice * svc.quantity)}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    <Link to={`/invoices/${svc.invoiceId}`} className="font-mono-code text-xs text-primary hover:underline">
                      {svc.invoiceId}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
