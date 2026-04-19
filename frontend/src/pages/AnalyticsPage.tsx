import { useState, useMemo } from "react";
import { BarChart3, TrendingUp, Users, Package, DollarSign, CalendarIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const TIME_RANGES = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "last30days", label: "30 Días" },
  { value: "3months", label: "3 Meses" },
  { value: "12months", label: "12 Meses" },
  { value: "custom", label: "Personalizado" },
];

const formatCRC = (amount: number) => `₡${amount.toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;

// Demo data
const dailySalesData = [
  { day: "Lun", ingresos: 185000, facturas: 4 },
  { day: "Mar", ingresos: 240000, facturas: 6 },
  { day: "Mié", ingresos: 310000, facturas: 7 },
  { day: "Jue", ingresos: 195000, facturas: 5 },
  { day: "Vie", ingresos: 420000, facturas: 9 },
  { day: "Sáb", ingresos: 380000, facturas: 8 },
  { day: "Dom", ingresos: 120000, facturas: 3 },
];

const monthlyTrendData = [
  { month: "Ene", ingresos: 1800000, gastos: 600000 },
  { month: "Feb", ingresos: 2100000, gastos: 700000 },
  { month: "Mar", ingresos: 1950000, gastos: 650000 },
  { month: "Abr", ingresos: 2400000, gastos: 800000 },
  { month: "May", ingresos: 2200000, gastos: 720000 },
  { month: "Jun", ingresos: 2450000, gastos: 780000 },
];

const paymentMethodData = [
  { name: "Tarjeta", value: 55, amount: 1347500, color: "hsl(224, 76%, 40%)" },
  { name: "Efectivo", value: 30, amount: 735000, color: "hsl(174, 84%, 32%)" },
  { name: "Transferencia", value: 12, amount: 294000, color: "hsl(38, 92%, 50%)" },
  { name: "SINPE Móvil", value: 3, amount: 73500, color: "hsl(142, 71%, 45%)" },
];

const serviceTypeData = [
  { name: "Consulta", value: 35 },
  { name: "Limpieza", value: 25 },
  { name: "Ortodoncia", value: 20 },
  { name: "Extracción", value: 12 },
  { name: "Otros", value: 8 },
];

const SERVICE_COLORS = ["hsl(224, 76%, 40%)", "hsl(174, 84%, 32%)", "hsl(38, 92%, 50%)", "hsl(0, 72%, 51%)", "hsl(215, 16%, 47%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-card-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: p.color }} />
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? formatCRC(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

const AnalyticsPage = () => {
  const [range, setRange] = useState("last30days");
  const [customFrom, setCustomFrom] = useState<Date>();
  const [customTo, setCustomTo] = useState<Date>();

  const stats = [
    { label: "Ingresos Totales", value: formatCRC(2450000), change: 12, icon: DollarSign, color: "text-success", bgColor: "bg-success/10" },
    { label: "Facturas Emitidas", value: "47", change: 8, icon: TrendingUp, color: "text-primary", bgColor: "bg-primary/10" },
    { label: "Pacientes Atendidos", value: "32", change: 5, icon: Users, color: "text-secondary", bgColor: "bg-secondary/10" },
    { label: "Ticket Promedio", value: formatCRC(52128), change: -3, icon: BarChart3, color: "text-warning", bgColor: "bg-warning/10" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analíticas</h1>
          <p className="text-muted-foreground mt-1">Resumen financiero y operativo de su clínica</p>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {TIME_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-lg border transition-all font-medium",
                range === r.value
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom date range */}
      {range === "custom" && (
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Desde:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                {customFrom ? format(customFrom, "dd MMM yyyy", { locale: es }) : "Fecha inicio"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">Hasta:</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[160px] justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                {customTo ? format(customTo, "dd MMM yyyy", { locale: es }) : "Fecha fin"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", stat.bgColor)}>
                <stat.icon className={cn("h-4 w-4", stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-card-foreground font-mono-code">{stat.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {stat.change > 0 ? (
                <ArrowUpRight className="h-3 w-3 text-success" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-destructive" />
              )}
              <p className={cn("text-xs font-medium", stat.change > 0 ? "text-success" : "text-destructive")}>
                {stat.change > 0 ? "+" : ""}{stat.change}% vs período anterior
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue trend - area chart */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Tendencia de Ingresos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ingresos vs gastos por mes</p>
          </div>
          <div className="p-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(224, 76%, 40%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(224, 76%, 40%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(174, 84%, 32%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(174, 84%, 32%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `₡${(v / 1000000).toFixed(1)}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="hsl(224, 76%, 40%)" fill="url(#colorIngresos)" strokeWidth={2} />
                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="hsl(174, 84%, 32%)" fill="url(#colorGastos)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment methods - pie chart */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Métodos de Pago</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Distribución de pagos</p>
          </div>
          <div className="p-4 h-72 flex flex-col">
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethodData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                    {paymentMethodData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {paymentMethodData.map((m, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-muted-foreground">{m.name} ({m.value}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily sales - bar chart */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Ventas Diarias</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ingresos y cantidad de facturas por día</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailySalesData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `₡${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="ingresos" name="Ingresos" fill="hsl(224, 76%, 40%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service distribution - bar chart horizontal */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Distribución por Servicio</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Porcentaje de citas por tipo de servicio</p>
          </div>
          <div className="p-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceTypeData} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 32%, 91%)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(215, 16%, 47%)" }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(215, 16%, 47%)" }} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Porcentaje"]} />
                <Bar dataKey="value" name="Porcentaje" radius={[0, 4, 4, 0]}>
                  {serviceTypeData.map((_, i) => (
                    <Cell key={i} fill={SERVICE_COLORS[i % SERVICE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Servicios Más Vendidos
            </h2>
          </div>
          <div className="p-4">
            {[
              { name: "Consulta Dental General", qty: 18, revenue: 810000 },
              { name: "Limpieza Dental", qty: 12, revenue: 420000 },
              { name: "Ortodoncia — Consulta", qty: 8, revenue: 200000 },
              { name: "Extracción Simple", qty: 5, revenue: 200000 },
              { name: "Blanqueamiento", qty: 4, revenue: 280000 },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-primary bg-primary/10 w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.qty} vendidos</p>
                  </div>
                </div>
                <span className="text-sm font-mono-code font-medium text-card-foreground">{formatCRC(p.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-secondary" /> Pacientes Más Frecuentes
            </h2>
          </div>
          <div className="p-4">
            {[
              { name: "Carlos Rodríguez", visits: 5, spent: 280000 },
              { name: "Ana María López", visits: 4, spent: 220000 },
              { name: "José Fernández", visits: 3, spent: 180000 },
              { name: "Laura Sánchez", visits: 3, spent: 135000 },
              { name: "Roberto Mora", visits: 2, spent: 95000 },
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-secondary bg-secondary/10 w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.visits} visitas</p>
                  </div>
                </div>
                <span className="text-sm font-mono-code font-medium text-card-foreground">{formatCRC(p.spent)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
