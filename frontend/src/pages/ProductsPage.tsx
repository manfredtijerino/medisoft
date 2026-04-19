import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Package, Tag, Calculator, ShieldCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatCRC = (n: number) => `₡${n.toLocaleString("es-CR")}`;

const DEMO_PRODUCTS = [
  { id: "1", name: "Consulta Dental General", cabys: "85121801", price: 45000, tax: 0, type: "servicio" },
  { id: "2", name: "Limpieza Dental", cabys: "85121802", price: 35000, tax: 13, type: "servicio" },
  { id: "3", name: "Ortodoncia — Consulta", cabys: "85121803", price: 25000, tax: 0, type: "servicio" },
  { id: "4", name: "Extracción Simple", cabys: "85121804", price: 40000, tax: 0, type: "servicio" },
  { id: "5", name: "Blanqueamiento Dental", cabys: "85121805", price: 70000, tax: 13, type: "servicio" },
  { id: "6", name: "Radiografía Periapical", cabys: "85121806", price: 15000, tax: 0, type: "servicio" },
  { id: "7", name: "Resina Compuesta", cabys: "42151601", price: 55000, tax: 13, type: "producto" },
  { id: "8", name: "Corona Dental", cabys: "42152001", price: 180000, tax: 13, type: "producto" },
];

const PAGE_SIZE = 5;

const ProductsPage = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() =>
    DEMO_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.cabys.includes(search)
    ), [search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Productos y Servicios</h1>
          <p className="text-muted-foreground mt-1">
            Catálogo con precio, impuesto y código CABYS.
          </p>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="h-4 w-4" /> Nuevo Producto
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <Tag className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Código CABYS</p>
            <p className="text-xs text-muted-foreground">Clasificación obligatoria de Hacienda</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <Calculator className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Impuesto automático</p>
            <p className="text-xs text-muted-foreground">IVA por producto, se calcula al facturar</p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 flex gap-3">
          <ShieldCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-card-foreground">Reutilizable</p>
            <p className="text-xs text-muted-foreground">Agregue una vez, use en todas sus facturas</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o código CABYS..." className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">CABYS</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">Tipo</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Precio</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <td className="px-5 py-4 font-medium text-card-foreground">{p.name}</td>
                  <td className="px-5 py-4 font-mono-code text-xs text-muted-foreground">{p.cabys}</td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className={cn(
                      "inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                      p.type === "servicio" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                    )}>{p.type}</span>
                  </td>
                  <td className="px-5 py-4 text-right font-mono-code font-medium text-card-foreground">{formatCRC(p.price)}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={cn(
                      "text-xs font-medium",
                      p.tax > 0 ? "text-warning" : "text-muted-foreground"
                    )}>{p.tax}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between text-sm">
          <span className="text-muted-foreground text-xs">
            {filtered.length} producto{filtered.length !== 1 ? "s" : ""} · Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
              <Button key={pg} variant={pg === page ? "default" : "ghost"} size="sm" className="w-8 h-8 p-0" onClick={() => setPage(pg)}>
                {pg}
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

export default ProductsPage;
