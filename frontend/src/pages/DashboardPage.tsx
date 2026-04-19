import { FileText, Users, Plus, TrendingUp, Clock, AlertCircle, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const StatCard = ({ label, value, description, icon: Icon, color }: { label: string; value: string; description: string; icon: React.ElementType; color: string }) => (
  <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
    </div>
    <p className="text-2xl font-bold text-card-foreground">{value}</p>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
  </div>
);

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {user?.firstName || "Usuario"}
        </h1>
        <p className="text-muted-foreground mt-1">Este es el resumen de actividad de su clínica</p>
      </div>

      {/* Quick actions with descriptions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/invoices/new" className="group">
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-5 hover:bg-primary/10 transition-colors h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <Plus className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground">Nueva Factura</h3>
            </div>
            <p className="text-sm text-muted-foreground">Cree una factura electrónica, calcule impuestos y envíe a Hacienda en un clic</p>
          </div>
        </Link>
        <Link to="/patients/new" className="group">
          <div className="bg-secondary/5 border border-secondary/15 rounded-xl p-5 hover:bg-secondary/10 transition-colors h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                <Users className="h-5 w-5 text-secondary-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground">Nuevo Paciente</h3>
            </div>
            <p className="text-sm text-muted-foreground">Registre un paciente con su cédula y datos de contacto para poder facturarle</p>
          </div>
        </Link>
        <Link to="/products/new" className="group">
          <div className="bg-accent border border-border rounded-xl p-5 hover:bg-accent/80 transition-colors h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Package className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="font-semibold text-card-foreground">Nuevo Producto</h3>
            </div>
            <p className="text-sm text-muted-foreground">Agregue un servicio o producto al catálogo con código CABYS y precio</p>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Facturas Hoy" value="0" description="Facturas creadas en el día" icon={FileText} color="bg-primary/10 text-primary" />
        <StatCard label="Ingresos del Mes" value="₡0" description="Total facturado este mes" icon={TrendingUp} color="bg-success/10 text-success" />
        <StatCard label="Pacientes" value="0" description="Pacientes registrados" icon={Users} color="bg-secondary/10 text-secondary" />
        <StatCard label="Pendientes" value="0" description="Facturas sin respuesta de Hacienda" icon={Clock} color="bg-warning/10 text-warning" />
      </div>

      {/* Pacientes de Hoy */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-card-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Pacientes de Hoy
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">Citas programadas para hoy</p>
          </div>
          <Link to="/calendar" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver calendario <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {[
            { name: "Carlos Ramírez", time: "08:00", type: "Consulta general", color: "bg-primary" },
            { name: "Ana Mora", time: "09:00", type: "Limpieza dental", color: "bg-secondary" },
            { name: "Luis Solano", time: "10:30", type: "Ortodoncia", color: "bg-warning" },
            { name: "María Jiménez", time: "14:00", type: "Control", color: "bg-success" },
          ].map((appt, i) => (
            <div key={i} className="px-6 py-3 flex items-center gap-4 hover:bg-muted/30 transition-colors">
              <div className={`w-1 h-10 rounded-full ${appt.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{appt.name}</p>
                <p className="text-xs text-muted-foreground">{appt.type}</p>
              </div>
              <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded">{appt.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent invoices */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-card-foreground">Facturas Recientes</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Las últimas facturas creadas en su clínica</p>
          </div>
          <Link to="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-2">No hay facturas aún</p>
          <p className="text-sm text-muted-foreground mb-4">
            Cree su primera factura para empezar a ver el historial aquí
          </p>
          <Link to="/invoices/new">
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="h-4 w-4" /> Crear Primera Factura
            </button>
          </Link>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-card-foreground flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            Pasos para Iniciar
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Complete estos pasos en orden para empezar a facturar electrónicamente</p>
        </div>
        <div className="p-6 space-y-1">
          {[
            { label: "Completar datos de la clínica", desc: "Razón social, cédula y dirección fiscal", link: "/settings" },
            { label: "Conectar con Hacienda", desc: "Suba su certificado .p12 y credenciales ATV", link: "/settings" },
            { label: "Agregar productos o servicios", desc: "Defina su catálogo con códigos CABYS", link: "/products/new" },
            { label: "Registrar primer paciente", desc: "Datos del paciente para facturar", link: "/patients/new" },
            { label: "Crear primera factura", desc: "Seleccione paciente, servicios y envíe a Hacienda", link: "/invoices/new" },
          ].map((step, i) => (
            <Link
              key={i}
              to={step.link}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
            >
              <div className="w-7 h-7 rounded-full border-2 border-border flex items-center justify-center text-xs font-medium text-muted-foreground group-hover:border-primary group-hover:text-primary transition-colors shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-card-foreground">{step.label}</p>
                <p className="text-xs text-muted-foreground">{step.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
