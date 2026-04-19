import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Search, Package, Tag, Info, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const TAX_CODES = [
  { value: "01", label: "Impuesto al Valor Agregado (IVA)" },
  { value: "02", label: "Impuesto Selectivo de Consumo (ISC)" },
  { value: "08", label: "IVA (Bienes Usados)" },
  { value: "12", label: "Impuesto Específico" },
];

const TAX_RATES = [
  { value: "01", label: "Tarifa reducida 1%", rate: 1 },
  { value: "02", label: "Tarifa reducida 2%", rate: 2 },
  { value: "03", label: "Tarifa reducida 4%", rate: 4 },
  { value: "04", label: "Tarifa transitoria 4%", rate: 4 },
  { value: "05", label: "Tarifa transitoria 8%", rate: 8 },
  { value: "08", label: "Tarifa general 13%", rate: 13 },
];

const UNITS = [
  { value: "Sp", label: "Servicio profesional" },
  { value: "Unid", label: "Unidad" },
  { value: "Kg", label: "Kilogramo" },
  { value: "m", label: "Metro" },
  { value: "L", label: "Litro" },
  { value: "h", label: "Hora" },
  { value: "d", label: "Día" },
  { value: "Os", label: "Otros" },
];

const MOCK_CABYS = [
  { code: "8621001000100", description: "Servicios de consulta médica dental general" },
  { code: "8621002000100", description: "Servicios de cirugía dental" },
  { code: "8621003000100", description: "Servicios de ortodoncia" },
  { code: "8620100000100", description: "Servicios de consulta médica general" },
  { code: "3250994000100", description: "Instrumental y equipo dental" },
];

const CreateProductPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"service" | "product">("service");
  const [cabysSearch, setCabysSearch] = useState("");
  const [cabysOpen, setCabysOpen] = useState(false);
  const [selectedCabys, setSelectedCabys] = useState<{ code: string; description: string } | null>(null);
  const [price, setPrice] = useState("");
  const [taxRate, setTaxRate] = useState(13);
  const [currency, setCurrency] = useState("CRC");

  const filteredCabys = cabysSearch.length >= 3
    ? MOCK_CABYS.filter((c) =>
        c.description.toLowerCase().includes(cabysSearch.toLowerCase()) ||
        c.code.includes(cabysSearch)
      )
    : [];

  const priceNum = parseFloat(price.replace(/[^\d.]/g, "")) || 0;
  const taxAmount = priceNum * (taxRate / 100);
  const total = priceNum + taxAmount;

  const currencySymbol = currency === "CRC" ? "₡" : currency === "USD" ? "$" : "€";

  const formatCurrency = (amount: number) => {
    if (currency === "CRC") {
      return `₡${amount.toLocaleString("es-CR", { minimumFractionDigits: 2 })}`;
    }
    return `${currencySymbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCabys) {
      toast.error("Debe seleccionar un código CABYS");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Producto creado exitosamente");
      navigate("/products");
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/products">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nuevo Producto o Servicio</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Defina un servicio o producto del catálogo de su clínica. Cada ítem necesita un código CABYS para facturar.
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">¿Qué es el código CABYS?</p>
          <p>Es un código de 13 dígitos que clasifica cada producto o servicio según el gobierno de Costa Rica. Hacienda lo exige en cada línea de factura para validar impuestos. Use el buscador para encontrar el código correcto.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Tipo</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">¿Es un servicio que ofrece o un producto que vende?</p>
          </div>
          <div className="p-6">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("service")}
                className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                  type === "service"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="font-medium text-card-foreground">🩺 Servicio</p>
                <p className="text-xs text-muted-foreground mt-1">Consultas, tratamientos, procedimientos</p>
              </button>
              <button
                type="button"
                onClick={() => setType("product")}
                className={`flex-1 p-4 rounded-lg border-2 text-left transition-all ${
                  type === "product"
                    ? "border-secondary bg-secondary/5"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <p className="font-medium text-card-foreground">📦 Producto</p>
                <p className="text-xs text-muted-foreground mt-1">Medicamentos, insumos, equipos</p>
              </button>
            </div>
          </div>
        </div>

        {/* Información general */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Información General</h2>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input placeholder={type === "service" ? "Limpieza Dental" : "Kit de sutura"} required />
              </div>
              <div className="space-y-2">
                <Label>Código Interno</Label>
                <Input placeholder="SERV-001" className="font-mono-code" />
                <p className="text-xs text-muted-foreground">Opcional — código propio de su clínica</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                placeholder="Descripción detallada del servicio o producto..."
              />
            </div>
          </div>
        </div>

        {/* CABYS */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Código CABYS *</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Busque por nombre o código. Mínimo 3 caracteres.</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Ej: consulta dental, ortodoncia, 8621..."
                className="pl-10"
                value={cabysSearch}
                onChange={(e) => {
                  setCabysSearch(e.target.value);
                  setCabysOpen(true);
                }}
                onFocus={() => setCabysOpen(true)}
              />
              {cabysOpen && filteredCabys.length > 0 && (
                <div className="absolute z-10 top-full mt-1 w-full bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredCabys.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b border-border last:border-0"
                      onClick={() => {
                        setSelectedCabys(c);
                        setCabysSearch("");
                        setCabysOpen(false);
                      }}
                    >
                      <p className="text-sm font-medium text-card-foreground">{c.description}</p>
                      <p className="text-xs text-muted-foreground font-mono-code mt-0.5">{c.code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedCabys && (
              <div className="bg-secondary/5 border border-secondary/20 rounded-lg p-4 flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-card-foreground">{selectedCabys.description}</p>
                  <p className="text-xs text-muted-foreground font-mono-code mt-1">Código: {selectedCabys.code}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCabys(null)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  Cambiar
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Precio e impuestos */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Precio e Impuestos</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Configure el precio y la tarifa de impuesto aplicable</p>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Precio *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{currencySymbol}</span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="45000"
                    className="pl-8 font-mono-code"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Moneda *</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="CRC">CRC - Colones</option>
                  <option value="USD">USD - Dólares</option>
                  <option value="EUR">EUR - Euros</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Unidad de Medida *</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="Sp">
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>{u.value} - {u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Tipo de Impuesto</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" defaultValue="01">
                  {TAX_CODES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Tarifa</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue="08"
                  onChange={(e) => {
                    const rate = TAX_RATES.find((r) => r.value === e.target.value);
                    if (rate) setTaxRate(rate.rate);
                  }}
                >
                  {TAX_RATES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Porcentaje</Label>
                <Input value={`${taxRate}%`} readOnly className="font-mono-code bg-muted" />
              </div>
            </div>

            {/* Price preview */}
            {priceNum > 0 && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Precio base</span>
                  <span className="font-mono-code">{formatCurrency(priceNum)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IVA ({taxRate}%)</span>
                  <span className="font-mono-code">+ {formatCurrency(taxAmount)}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-semibold">
                  <span>Precio final</span>
                  <span className="font-mono-code text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/products">
            <Button type="button" variant="outline">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar {type === "service" ? "Servicio" : "Producto"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CreateProductPage;
