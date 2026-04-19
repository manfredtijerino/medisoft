import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Search, Info, FileText, CreditCard, Send, Package, User, X, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  { value: "01", label: "Factura Electrónica", description: "Requiere datos del paciente. Para ventas con receptor identificado.", icon: FileText },
  { value: "04", label: "Tiquete Electrónico", description: "No requiere paciente. Para ventas menores a ₡50.000 sin receptor.", icon: Zap },
];

const PAYMENT_METHODS = [
  { value: "01", label: "Efectivo" },
  { value: "02", label: "Tarjeta" },
  { value: "03", label: "Cheque" },
  { value: "04", label: "Transferencia" },
  { value: "99", label: "Otros" },
];

const MOCK_PATIENTS = [
  { id: "1", name: "Carlos Rodríguez Mora", cedula: "1-1234-0567", email: "carlos@email.com", lastVisit: "2024-01-15" },
  { id: "2", name: "Ana María López", cedula: "1-0567-0890", email: "ana@email.com", lastVisit: "2024-02-20" },
  { id: "3", name: "José Fernández", cedula: "3-101-654321", email: "jose@email.com", lastVisit: "2024-03-10" },
  { id: "4", name: "María Elena Castro", cedula: "1-0890-0123", email: "maria@email.com", lastVisit: "2024-01-28" },
  { id: "5", name: "Luis Alberto Vargas", cedula: "2-0345-0678", email: "luis@email.com", lastVisit: "2024-03-05" },
];

const MOCK_PRODUCTS = [
  { id: "1", name: "Consulta Dental General", price: 45000, taxRate: 13, unit: "Sp", category: "Consultas", popular: true },
  { id: "2", name: "Limpieza Dental", price: 35000, taxRate: 13, unit: "Sp", category: "Preventivo", popular: true },
  { id: "3", name: "Ortodoncia — Consulta", price: 25000, taxRate: 13, unit: "Sp", category: "Ortodoncia", popular: false },
  { id: "4", name: "Extracción Simple", price: 40000, taxRate: 13, unit: "Sp", category: "Cirugía", popular: false },
  { id: "5", name: "Blanqueamiento Dental", price: 70000, taxRate: 13, unit: "Sp", category: "Estética", popular: true },
  { id: "6", name: "Radiografía Periapical", price: 15000, taxRate: 0, unit: "Sp", category: "Diagnóstico", popular: false },
  { id: "7", name: "Resina Compuesta", price: 55000, taxRate: 13, unit: "Sp", category: "Restauraciones", popular: false },
  { id: "8", name: "Corona Dental", price: 180000, taxRate: 13, unit: "Sp", category: "Prótesis", popular: false },
  { id: "9", name: "Endodoncia (1 conducto)", price: 95000, taxRate: 13, unit: "Sp", category: "Endodoncia", popular: true },
  { id: "10", name: "Profilaxis Infantil", price: 28000, taxRate: 0, unit: "Sp", category: "Preventivo", popular: false },
];

interface LineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
}

interface PaymentInstallment {
  amount: number;
  dueDate: string;
  method: string;
}

const CreateInvoicePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("01");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientOpen, setPatientOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null);
  const [patientHighlight, setPatientHighlight] = useState(-1);
  const [productSearch, setProductSearch] = useState("");
  const [productOpen, setProductOpen] = useState(false);
  const [productHighlight, setProductHighlight] = useState(-1);
  const [productCategory, setProductCategory] = useState("all");
  const [lines, setLines] = useState<LineItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("02");
  const [saleCondition, setSaleCondition] = useState("01");
  const [creditTerm, setCreditTerm] = useState("15");
  const [sendToHacienda, setSendToHacienda] = useState(true);
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);

  const patientInputRef = useRef<HTMLInputElement>(null);
  const productInputRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(e.target as Node) &&
          patientInputRef.current && !patientInputRef.current.contains(e.target as Node)) {
        setPatientOpen(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target as Node) &&
          productInputRef.current && !productInputRef.current.contains(e.target as Node)) {
        setProductOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredPatients = patientSearch.length >= 1
    ? MOCK_PATIENTS.filter((p) =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        p.cedula.includes(patientSearch)
      )
    : MOCK_PATIENTS;

  const categories = ["all", ...Array.from(new Set(MOCK_PRODUCTS.map(p => p.category)))];

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch = productSearch.length === 0 ||
      p.name.toLowerCase().includes(productSearch.toLowerCase());
    const matchesCategory = productCategory === "all" || p.category === productCategory;
    return matchesSearch && matchesCategory;
  });

  const popularProducts = MOCK_PRODUCTS.filter(p => p.popular);

  const addLine = (product: typeof MOCK_PRODUCTS[0]) => {
    const existing = lines.findIndex(l => l.productId === product.id);
    if (existing >= 0) {
      const updated = [...lines];
      updated[existing].quantity += 1;
      setLines(updated);
      toast.success(`${product.name} — cantidad actualizada`);
    } else {
      setLines([...lines, {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.price,
        taxRate: product.taxRate,
        discount: 0,
      }]);
    }
    setProductSearch("");
    setProductOpen(false);
    setProductHighlight(-1);
  };

  const removeLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, qty: number) => {
    const updated = [...lines];
    updated[index].quantity = Math.max(1, qty);
    setLines(updated);
  };

  const updateDiscount = (index: number, disc: number) => {
    const updated = [...lines];
    updated[index].discount = Math.max(0, Math.min(100, disc));
    setLines(updated);
  };

  const subtotal = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitPrice;
    return sum + base - (base * l.discount / 100);
  }, 0);
  const totalTax = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitPrice;
    const afterDiscount = base - (base * l.discount / 100);
    return sum + afterDiscount * (l.taxRate / 100);
  }, 0);
  const totalDiscount = lines.reduce((sum, l) => {
    const base = l.quantity * l.unitPrice;
    return sum + (base * l.discount / 100);
  }, 0);
  const total = subtotal + totalTax;

  const formatCRC = (amount: number) => `₡${amount.toLocaleString("es-CR", { minimumFractionDigits: 0 })}`;

  const handlePatientKeyDown = (e: React.KeyboardEvent) => {
    if (!patientOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPatientHighlight(prev => Math.min(prev + 1, filteredPatients.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPatientHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && patientHighlight >= 0) {
      e.preventDefault();
      setSelectedPatient(filteredPatients[patientHighlight]);
      setPatientSearch("");
      setPatientOpen(false);
      setPatientHighlight(-1);
    } else if (e.key === "Escape") {
      setPatientOpen(false);
    }
  };

  const handleProductKeyDown = (e: React.KeyboardEvent) => {
    if (!productOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setProductHighlight(prev => Math.min(prev + 1, filteredProducts.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setProductHighlight(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && productHighlight >= 0) {
      e.preventDefault();
      addLine(filteredProducts[productHighlight]);
    } else if (e.key === "Escape") {
      setProductOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error("Agregue al menos un servicio o producto");
      return;
    }
    if (docType === "01" && !selectedPatient) {
      toast.error("Seleccione un paciente para Factura Electrónica");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success(sendToHacienda ? "Factura creada y enviada a Hacienda" : "Factura creada exitosamente");
      navigate("/invoices");
    }, 1500);
  };

  const needsPatient = docType === "01";

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/invoices">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Nueva Factura</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Tab</kbd> para navegar, <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">↑↓</kbd> para seleccionar, <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Enter</kbd> para confirmar.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo de documento */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Tipo de Documento</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DOC_TYPES.map((dt) => {
                const Icon = dt.icon;
                return (
                  <button
                    key={dt.value}
                    type="button"
                    onClick={() => setDocType(dt.value)}
                    className={cn(
                      "p-4 rounded-lg border-2 text-left transition-all flex items-start gap-3",
                      docType === dt.value
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <div className={cn(
                      "rounded-lg p-2 shrink-0",
                      docType === dt.value ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn("h-5 w-5", docType === dt.value ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div>
                      <p className="font-medium text-card-foreground text-sm">{dt.value} — {dt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{dt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Paciente */}
        {needsPatient && (
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">Paciente</h2>
              </div>
            </div>
            <div className="p-6">
              {selectedPatient ? (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-card-foreground">{selectedPatient.name}</p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">Cédula: {selectedPatient.cedula}</p>
                    </div>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setSelectedPatient(null); setTimeout(() => patientInputRef.current?.focus(), 100); }}>
                    <X className="h-4 w-4 mr-1" /> Cambiar
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    ref={patientInputRef}
                    placeholder="Escriba nombre o cédula para buscar..."
                    className="pl-10 h-12 text-base"
                    value={patientSearch}
                    onChange={(e) => { setPatientSearch(e.target.value); setPatientOpen(true); setPatientHighlight(-1); }}
                    onFocus={() => setPatientOpen(true)}
                    onKeyDown={handlePatientKeyDown}
                    autoFocus
                  />
                  {patientOpen && (
                    <div ref={patientDropdownRef} className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto">
                      {filteredPatients.length > 0 ? (
                        <>
                          <div className="px-4 py-2 border-b border-border">
                            <p className="text-xs text-muted-foreground">{filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""} encontrado{filteredPatients.length !== 1 ? "s" : ""}</p>
                          </div>
                          {filteredPatients.map((p, i) => (
                            <button
                              key={p.id}
                              type="button"
                              className={cn(
                                "w-full text-left px-4 py-3 transition-colors border-b border-border last:border-0 flex items-center gap-3",
                                patientHighlight === i ? "bg-accent" : "hover:bg-accent/50"
                              )}
                              onClick={() => {
                                setSelectedPatient(p);
                                setPatientSearch("");
                                setPatientOpen(false);
                              }}
                              onMouseEnter={() => setPatientHighlight(i)}
                            >
                              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <span className="text-sm font-semibold text-muted-foreground">{p.name.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-card-foreground truncate">{p.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{p.cedula}</p>
                              </div>
                              {patientHighlight === i && (
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground shrink-0">Enter</kbd>
                              )}
                            </button>
                          ))}
                        </>
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted-foreground">No se encontraron pacientes</p>
                          <Link to="/patients/new" className="text-xs text-primary hover:underline mt-1 inline-block">
                            + Crear nuevo paciente
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Servicios y Productos */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Servicios y Productos</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Busque o seleccione los servicios populares para agregar rápidamente.</p>
          </div>
          <div className="p-6 space-y-4">
            {/* Quick-add popular items */}
            {lines.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Más utilizados
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addLine(p)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all text-sm group"
                    >
                      <Plus className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="text-card-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">{formatCRC(p.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search with category filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  ref={productInputRef}
                  placeholder="Buscar servicio o producto..."
                  className="pl-10 h-12 text-base"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setProductOpen(true); setProductHighlight(-1); setProductCategory("all"); }}
                  onFocus={() => setProductOpen(true)}
                  onKeyDown={handleProductKeyDown}
                />
                {productOpen && (
                  <div ref={productDropdownRef} className="absolute z-20 top-full mt-1 w-full bg-popover border border-border rounded-xl shadow-xl max-h-80 overflow-hidden flex flex-col">
                    {/* Category chips */}
                    <div className="px-3 py-2 border-b border-border flex gap-1.5 overflow-x-auto flex-shrink-0">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => { setProductCategory(cat); setProductHighlight(-1); }}
                          className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                            productCategory === cat
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {cat === "all" ? "Todos" : cat}
                        </button>
                      ))}
                    </div>
                    {/* Results */}
                    <div className="overflow-y-auto flex-1">
                      {filteredProducts.length > 0 ? (
                        filteredProducts.map((p, i) => (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              "w-full text-left px-4 py-3 transition-colors border-b border-border last:border-0 flex justify-between items-center gap-3",
                              productHighlight === i ? "bg-accent" : "hover:bg-accent/50"
                            )}
                            onClick={() => addLine(p)}
                            onMouseEnter={() => setProductHighlight(i)}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-card-foreground truncate">{p.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{p.category}</Badge>
                                  {p.taxRate > 0 && <span className="text-[10px] text-muted-foreground">IVA {p.taxRate}%</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-mono font-medium text-card-foreground">{formatCRC(p.price)}</span>
                              {productHighlight === i && (
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] text-muted-foreground">Enter</kbd>
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-6 text-center">
                          <p className="text-sm text-muted-foreground">No se encontraron productos</p>
                          <Link to="/products/new" className="text-xs text-primary hover:underline mt-1 inline-block">
                            + Crear nuevo producto
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-border bg-muted/30 flex-shrink-0">
                      <p className="text-[10px] text-muted-foreground text-center">
                        <kbd className="px-1 py-0.5 bg-background rounded border border-border">↑↓</kbd> navegar · <kbd className="px-1 py-0.5 bg-background rounded border border-border">Enter</kbd> agregar · <kbd className="px-1 py-0.5 bg-background rounded border border-border">Esc</kbd> cerrar
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Line items */}
            {lines.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                      <th className="text-center px-2 py-3 font-medium text-muted-foreground w-20">Cant.</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-foreground">Precio</th>
                      <th className="text-center px-2 py-3 font-medium text-muted-foreground w-20">Desc.%</th>
                      <th className="text-right px-3 py-3 font-medium text-muted-foreground">IVA</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => {
                      const lineBase = line.quantity * line.unitPrice;
                      const lineDiscount = lineBase * line.discount / 100;
                      const lineAfterDiscount = lineBase - lineDiscount;
                      const lineTax = lineAfterDiscount * (line.taxRate / 100);
                      const lineTotal = lineAfterDiscount + lineTax;
                      return (
                        <tr key={i} className="border-t border-border hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-card-foreground font-medium">{line.name}</p>
                            {line.discount > 0 && (
                              <p className="text-xs text-primary mt-0.5">-{formatCRC(lineDiscount)} descuento</p>
                            )}
                          </td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(e) => updateQuantity(i, parseInt(e.target.value) || 1)}
                              className="text-center h-8 w-16 mx-auto font-mono"
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-muted-foreground">{formatCRC(line.unitPrice)}</td>
                          <td className="px-2 py-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={line.discount}
                              onChange={(e) => updateDiscount(i, parseFloat(e.target.value) || 0)}
                              className="text-center h-8 w-16 mx-auto font-mono"
                            />
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-xs text-muted-foreground">{formatCRC(lineTax)}</td>
                          <td className="px-4 py-3 text-right font-mono font-semibold text-card-foreground">{formatCRC(lineTotal)}</td>
                          <td className="px-2 py-3">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" onClick={() => removeLine(i)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {/* Quick add another */}
                <div className="px-4 py-2 border-t border-border bg-muted/20">
                  <button
                    type="button"
                    onClick={() => { setProductOpen(true); productInputRef.current?.focus(); }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" /> Agregar otro servicio o producto
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                <Package className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Use el buscador o los botones rápidos para agregar ítems</p>
              </div>
            )}
          </div>
        </div>

        {/* Pago */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Forma de Pago</h2>
            </div>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label>Condición de Venta</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={saleCondition}
                  onChange={(e) => {
                    setSaleCondition(e.target.value);
                    if (e.target.value !== "03") setInstallments([]);
                  }}
                >
                  <option value="01">Contado</option>
                  <option value="02">Crédito</option>
                  <option value="03">Varios Pagos</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {saleCondition === "02" && (
                <div className="space-y-2">
                  <Label>Plazo de Crédito</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={creditTerm}
                    onChange={(e) => setCreditTerm(e.target.value)}
                  >
                    <option value="15">15 días</option>
                    <option value="30">30 días</option>
                    <option value="45">45 días</option>
                    <option value="60">60 días</option>
                    <option value="90">90 días</option>
                  </select>
                  <p className="text-xs text-muted-foreground">El paciente tendrá {creditTerm} días para pagar</p>
                </div>
              )}
            </div>

            {saleCondition === "03" && (
              <div className="space-y-4 border-t border-border pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">Plan de Pagos</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Divida el total en cuotas. El primer pago se registra al crear la factura.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const remaining = total - installments.reduce((s, inst) => s + inst.amount, 0);
                      const today = new Date();
                      today.setDate(today.getDate() + (installments.length + 1) * 15);
                      setInstallments([...installments, {
                        amount: Math.max(0, remaining),
                        dueDate: today.toISOString().split("T")[0],
                        method: paymentMethod,
                      }]);
                    }}
                    disabled={total <= 0}
                  >
                    <Plus className="h-4 w-4" /> Agregar Cuota
                  </Button>
                </div>

                {installments.length === 0 && (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Agregue cuotas para dividir el pago total de {formatCRC(total)}
                    </p>
                  </div>
                )}

                {installments.length > 0 && (
                  <div className="space-y-3">
                    {installments.map((inst, i) => (
                      <div key={i} className="bg-muted/30 rounded-lg border border-border p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-card-foreground">
                            Cuota {i + 1} {i === 0 && <span className="text-xs text-primary font-normal ml-1">(Pago inicial)</span>}
                          </p>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInstallments(installments.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Monto</Label>
                            <Input type="number" min={0} value={inst.amount} onChange={(e) => { const updated = [...installments]; updated[i].amount = parseFloat(e.target.value) || 0; setInstallments(updated); }} className="h-9 font-mono" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Fecha {i === 0 ? "de Pago" : "de Vencimiento"}</Label>
                            <Input type="date" value={inst.dueDate} onChange={(e) => { const updated = [...installments]; updated[i].dueDate = e.target.value; setInstallments(updated); }} className="h-9" />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Método</Label>
                            <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm" value={inst.method} onChange={(e) => { const updated = [...installments]; updated[i].method = e.target.value; setInstallments(updated); }}>
                              {PAYMENT_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    {(() => {
                      const totalInstallments = installments.reduce((s, inst) => s + inst.amount, 0);
                      const diff = total - totalInstallments;
                      return (
                        <div className={cn(
                          "rounded-lg p-3 text-sm flex items-center justify-between",
                          Math.abs(diff) < 1 ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/20"
                        )}>
                          <div className="flex items-center gap-2">
                            <Info className={cn("h-4 w-4", Math.abs(diff) < 1 ? "text-primary" : "text-destructive")} />
                            <span className="text-card-foreground">
                              Total cuotas: <span className="font-mono font-medium">{formatCRC(totalInstallments)}</span>
                              {" / "}<span className="font-mono">{formatCRC(total)}</span>
                            </span>
                          </div>
                          {Math.abs(diff) >= 1 && (
                            <span className={cn("text-xs font-medium", diff > 0 ? "text-destructive" : "text-destructive")}>
                              {diff > 0 ? `Faltan ${formatCRC(diff)}` : `Excede por ${formatCRC(Math.abs(diff))}`}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-card rounded-xl border border-border shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-card-foreground">Resumen</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono">{formatCRC(subtotal + totalDiscount)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Descuento</span>
                  <span className="font-mono">-{formatCRC(totalDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span className="font-mono">{formatCRC(totalTax)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono text-primary">{formatCRC(total)}</span>
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 cursor-pointer">
              <input
                type="checkbox"
                checked={sendToHacienda}
                onChange={(e) => setSendToHacienda(e.target.checked)}
                className="rounded border-input"
              />
              <div>
                <p className="text-sm font-medium text-card-foreground flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" /> Enviar a Hacienda
                </p>
                <p className="text-xs text-muted-foreground">La factura se firmará digitalmente y se enviará al Ministerio de Hacienda</p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link to="/invoices">
                <Button type="button" variant="outline">Cancelar</Button>
              </Link>
              <Button type="submit" disabled={loading} className="min-w-[180px]">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                ) : (
                  <><Save className="h-4 w-4" /> Crear Factura</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateInvoicePage;
