import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Clock, Send, Download, Mail, MessageCircle, FileText, CreditCard, AlertCircle, Copy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type HaciendaStatus = "pending" | "sent" | "accepted" | "rejected";

const STATUS_CONFIG: Record<HaciendaStatus, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  pending: { label: "Pendiente", color: "text-muted-foreground", icon: Clock, bg: "bg-muted" },
  sent: { label: "Enviada", color: "text-primary", icon: Send, bg: "bg-primary/10" },
  accepted: { label: "Aceptada", color: "text-success", icon: CheckCircle2, bg: "bg-success/10" },
  rejected: { label: "Rechazada", color: "text-destructive", icon: XCircle, bg: "bg-destructive/10" },
};

const MOCK_INVOICE = {
  id: "inv_abc123",
  documentType: "01",
  documentTypeName: "Factura Electrónica",
  consecutivo: "00100001010000000001",
  clave: "50604042600310112345600100001010000000001123456789",
  date: "2026-04-04T09:00:00Z",
  patient: { name: "Carlos Rodríguez Mora", cedula: "1-1234-0567", email: "carlos@email.com" },
  lines: [
    { name: "Consulta Dental General", quantity: 1, unitPrice: 45000, taxRate: 13 },
    { name: "Limpieza Dental", quantity: 1, unitPrice: 35000, taxRate: 13 },
  ],
  paymentMethod: "Tarjeta",
  saleCondition: "Contado",
  subtotal: 80000,
  totalTax: 10400,
  total: 90400,
  notes: "",
};

const formatCRC = (amount: number) => `₡${amount.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;

const InvoiceDetailPage = () => {
  const { id } = useParams();
  const [status, setStatus] = useState<HaciendaStatus>("sent");
  const invoice = MOCK_INVOICE;
  const statusInfo = STATUS_CONFIG[status];

  // Simulate polling for Hacienda status
  useEffect(() => {
    if (status !== "sent") return;
    const timer = setTimeout(() => setStatus("accepted"), 5000);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{invoice.documentTypeName}</h1>
            <p className="text-muted-foreground text-sm mt-0.5 font-mono-code">
              Consecutivo: {invoice.consecutivo}
            </p>
          </div>
        </div>
        <div className={cn("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold", statusInfo.bg, statusInfo.color)}>
          <statusInfo.icon className="h-4 w-4" />
          {statusInfo.label}
          {status === "sent" && <span className="animate-pulse">●</span>}
        </div>
      </div>

      {/* Status banner */}
      {status === "sent" && (
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary animate-pulse" />
          <div>
            <p className="text-sm font-medium text-foreground">Esperando respuesta de Hacienda...</p>
            <p className="text-xs text-muted-foreground">La factura fue enviada. Hacienda responde en 1-3 minutos. Esta página se actualiza automáticamente.</p>
          </div>
        </div>
      )}

      {status === "accepted" && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <p className="text-sm font-medium text-foreground">✅ Factura aceptada por Hacienda</p>
            <p className="text-xs text-muted-foreground">La factura es un documento legal válido. Puede descargar el XML firmado o enviarla al paciente.</p>
          </div>
        </div>
      )}

      {status === "rejected" && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Factura rechazada por Hacienda</p>
            <p className="text-xs text-muted-foreground mt-1">Motivo: "Receptor no registrado en el sistema de Hacienda"</p>
            <p className="text-xs text-muted-foreground mt-1">Verifique la cédula del paciente y corrija los datos antes de reintentar.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Clave */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground mb-1">Clave Numérica (50 dígitos)</p>
            <div className="flex items-center gap-2">
              <p className="text-xs font-mono-code text-card-foreground break-all">{invoice.clave}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(invoice.clave); toast.success("Clave copiada"); }}
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Patient */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Receptor</p>
            <p className="text-sm font-semibold text-card-foreground">{invoice.patient.name}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="font-mono-code">{invoice.patient.cedula}</span>
              <span>{invoice.patient.email}</span>
            </div>
          </div>

          {/* Line items */}
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Detalle</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-5 py-2.5 font-medium text-muted-foreground">Descripción</th>
                  <th className="text-center px-3 py-2.5 font-medium text-muted-foreground">Cant.</th>
                  <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">Precio</th>
                  <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">IVA</th>
                  <th className="text-right px-5 py-2.5 font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => {
                  const sub = line.quantity * line.unitPrice;
                  const tax = sub * (line.taxRate / 100);
                  return (
                    <tr key={i} className="border-t border-border">
                      <td className="px-5 py-3 text-card-foreground">{line.name}</td>
                      <td className="px-3 py-3 text-center font-mono-code">{line.quantity}</td>
                      <td className="px-5 py-3 text-right font-mono-code">{formatCRC(line.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-mono-code text-muted-foreground">{formatCRC(tax)}</td>
                      <td className="px-5 py-3 text-right font-mono-code font-medium">{formatCRC(sub + tax)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="border-t border-border px-5 py-3 space-y-1 bg-muted/30">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono-code">{formatCRC(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IVA</span>
                <span className="font-mono-code">{formatCRC(invoice.totalTax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-1 border-t border-border">
                <span>Total</span>
                <span className="font-mono-code text-primary">{formatCRC(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Pago</p>
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-muted-foreground">Condición</p>
                <p className="font-medium text-card-foreground">{invoice.saleCondition}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Método</p>
                <p className="font-medium text-card-foreground">{invoice.paymentMethod}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monto</p>
                <p className="font-medium font-mono-code text-card-foreground">{formatCRC(invoice.total)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar actions */}
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Acciones</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Descargando PDF...")}>
              <Download className="h-4 w-4" /> Descargar PDF
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Descargando XML...")}>
              <FileText className="h-4 w-4" /> Descargar XML
            </Button>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Enviar al Paciente</p>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Correo enviado a " + invoice.patient.email)}>
              <Mail className="h-4 w-4" /> Enviar por Correo
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Mensaje de WhatsApp enviado")}>
              <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
            </Button>
          </div>

          {status === "accepted" && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Documentos Relacionados</p>
              <Button variant="outline" className="w-full justify-start text-warning" onClick={() => toast.info("Crear nota de crédito — próximamente")}>
                <RotateCcw className="h-4 w-4" /> Nota de Crédito
              </Button>
              <p className="text-xs text-muted-foreground">Emita una nota de crédito para revertir total o parcialmente esta factura</p>
            </div>
          )}

          <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Información</p>
            <div className="text-xs space-y-1.5 text-muted-foreground">
              <div className="flex justify-between">
                <span>Fecha</span>
                <span className="text-card-foreground">{new Date(invoice.date).toLocaleDateString("es-CR")}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo</span>
                <span className="text-card-foreground">{invoice.documentTypeName}</span>
              </div>
              <div className="flex justify-between">
                <span>Moneda</span>
                <span className="text-card-foreground">CRC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetailPage;
