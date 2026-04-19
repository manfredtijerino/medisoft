import { useState } from "react";
import { Building2, Link2, CheckCircle2, AlertCircle, Upload, Image, Shield, Wifi, WifiOff, Eye, EyeOff, Trash2, X, Bell, Settings2, Puzzle, Info, Users } from "lucide-react";
import { IntegrationsSection } from "@/components/IntegrationsSection";
import { AlertConfigPanel } from "@/components/notifications/AlertConfigPanel";
import { AlertTemplateManager } from "@/components/notifications/AlertTemplateManager";
import TeamManagement from "@/components/settings/TeamManagement";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PROVINCES = [
  { value: "1", label: "San José" },
  { value: "2", label: "Alajuela" },
  { value: "3", label: "Cartago" },
  { value: "4", label: "Heredia" },
  { value: "5", label: "Guanacaste" },
  { value: "6", label: "Puntarenas" },
  { value: "7", label: "Limón" },
];

const CANTONS: Record<string, { value: string; label: string }[]> = {
  "1": [
    { value: "01", label: "San José" },
    { value: "02", label: "Escazú" },
    { value: "03", label: "Desamparados" },
    { value: "04", label: "Puriscal" },
    { value: "05", label: "Tarrazú" },
    { value: "06", label: "Aserrí" },
    { value: "07", label: "Mora" },
    { value: "08", label: "Goicoechea" },
  ],
  "2": [
    { value: "01", label: "Alajuela" },
    { value: "02", label: "San Ramón" },
    { value: "03", label: "Grecia" },
  ],
};

const DISTRICTS: Record<string, { value: string; label: string }[]> = {
  "1-01": [
    { value: "01", label: "Carmen" },
    { value: "02", label: "Merced" },
    { value: "03", label: "Hospital" },
    { value: "04", label: "Catedral" },
  ],
  "1-02": [
    { value: "01", label: "Escazú" },
    { value: "02", label: "San Antonio" },
    { value: "03", label: "San Rafael" },
  ],
};

const TabExplainer = ({ title, why, because, example }: { title: string; why: string; because: string; example: string }) => (
  <div className="bg-muted/30 rounded-xl border border-border p-5 mb-6">
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Info className="h-4 w-4 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p><span className="font-semibold text-foreground">¿Por qué?</span> {why}</p>
          <p><span className="font-semibold text-foreground">Porque:</span> {because}</p>
          <p><span className="font-semibold text-foreground">Ejemplo:</span> <span className="italic">{example}</span></p>
        </div>
      </div>
    </div>
  </div>
);

const SettingsPage = () => {
  const [province, setProvince] = useState("");
  const [canton, setCanton] = useState("");
  const [district, setDistrict] = useState("");
  const [haciendaModalOpen, setHaciendaModalOpen] = useState(false);
  const [haciendaConnected, setHaciendaConnected] = useState(false);
  const [haciendaEnv, setHaciendaEnv] = useState<"staging" | "production">("staging");
  const [p12File, setP12File] = useState<File | null>(null);
  const [atvUser, setAtvUser] = useState("");
  const [atvPass, setAtvPass] = useState("");
  const [p12Pin, setP12Pin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [logoFile, setLogoFile] = useState<string | null>(null);

  const completionItems = [
    { label: "Razón social", done: false },
    { label: "Cédula jurídica", done: false },
    { label: "Correo electrónico", done: false },
    { label: "Teléfono", done: false },
    { label: "Dirección completa", done: false },
    { label: "Actividad económica", done: false },
    { label: "Conexión a Hacienda", done: haciendaConnected },
    { label: "Logo de clínica", done: !!logoFile },
  ];
  const completionPct = Math.round((completionItems.filter((i) => i.done).length / completionItems.length) * 100);

  const cantons = province ? (CANTONS[province] || []) : [];
  const districts = province && canton ? (DISTRICTS[`${province}-${canton}`] || []) : [];

  const handleConnectHacienda = () => {
    if (!p12File || !atvUser || !atvPass || !p12Pin) {
      toast.error("Complete todos los campos");
      return;
    }
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      setHaciendaConnected(true);
      setHaciendaModalOpen(false);
      toast.success(`Conectado a Hacienda (${haciendaEnv === "staging" ? "Pruebas" : "Producción"})`);
    }, 2000);
  };

  const handleTestConnection = () => {
    setTestingConnection(true);
    setTimeout(() => {
      setTestingConnection(false);
      toast.success("✅ Conexión exitosa con Hacienda (staging)");
    }, 1500);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("El logo debe ser menor a 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setLogoFile(reader.result as string);
      reader.readAsDataURL(file);
      toast.success("Logo cargado");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <p className="text-muted-foreground mt-1">Administre su clínica, alertas, integraciones y más</p>
      </div>

      {/* Completion banner */}
      <div className={cn(
        "rounded-xl p-5 flex items-start gap-4 border",
        completionPct === 100
          ? "bg-success/5 border-success/20"
          : "bg-warning/5 border-warning/20"
      )}>
        {completionPct === 100 ? (
          <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Perfil {completionPct}% completo</p>
            <span className="text-xs text-muted-foreground">{completionItems.filter(i => i.done).length}/{completionItems.length} pasos</span>
          </div>
          <div className="w-full h-2 bg-border rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", completionPct === 100 ? "bg-success" : "bg-warning")}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {completionItems.map((item, i) => (
              <span
                key={i}
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  item.done
                    ? "bg-success/10 text-success line-through"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabbed Settings */}
      <Tabs defaultValue="clinic" className="w-full">
        <TabsList className="w-full justify-start bg-muted/50 p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="clinic" className="gap-2 data-[state=active]:bg-background">
            <Building2 className="h-4 w-4" /> Clínica
          </TabsTrigger>
          <TabsTrigger value="hacienda" className="gap-2 data-[state=active]:bg-background">
            <Shield className="h-4 w-4" /> Hacienda
          </TabsTrigger>
          <TabsTrigger value="brand" className="gap-2 data-[state=active]:bg-background">
            <Image className="h-4 w-4" /> Marca
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2 data-[state=active]:bg-background">
            <Bell className="h-4 w-4" /> Alertas
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2 data-[state=active]:bg-background">
            <Users className="h-4 w-4" /> Personal
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2 data-[state=active]:bg-background">
            <Puzzle className="h-4 w-4" /> Integraciones
          </TabsTrigger>
        </TabsList>

        {/* TAB: Clínica */}
        <TabsContent value="clinic" className="mt-6">
          <TabExplainer
            title="Información de la Clínica"
            why="Estos datos son obligatorios para emitir facturas electrónicas válidas en Costa Rica."
            because="El Ministerio de Hacienda valida el emisor de cada factura. Si los datos no coinciden con los registrados, la factura será rechazada."
            example="Si su razón social es 'Clínica Dental González S.A.' y usted pone 'Clínica González', Hacienda rechazará la factura."
          />
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">Datos del Emisor</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Aparecen como <strong>emisor</strong> en cada factura electrónica</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>Razón Social *</Label>
                  <Input placeholder="Clínica Dental González S.A." />
                  <p className="text-xs text-muted-foreground">Nombre legal exacto como aparece en Hacienda</p>
                </div>
                <div className="space-y-2">
                  <Label>Nombre Comercial</Label>
                  <Input placeholder="Clínica González" />
                  <p className="text-xs text-muted-foreground">Opcional — nombre con el que se conoce la clínica</p>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Identificación *</Label>
                  <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Seleccionar...</option>
                    <option value="01">01 - Cédula Física</option>
                    <option value="02">02 - Cédula Jurídica</option>
                    <option value="03">03 - DIMEX</option>
                    <option value="04">04 - NITE</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Número de Identificación *</Label>
                  <Input placeholder="3101123456" className="font-mono-code" />
                  <p className="text-xs text-muted-foreground">Sin guiones ni espacios</p>
                </div>
                <div className="space-y-2">
                  <Label>Código de Actividad Económica *</Label>
                  <Input placeholder="862010" className="font-mono-code" />
                  <p className="text-xs text-muted-foreground">Código CIIU que identifica su actividad ante Hacienda</p>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico *</Label>
                  <Input type="email" placeholder="info@clinica.com" />
                  <p className="text-xs text-muted-foreground">Se incluye en las facturas electrónicas</p>
                </div>
                <div className="space-y-2">
                  <Label>Código de País</Label>
                  <Input defaultValue="506" className="font-mono-code" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono *</Label>
                  <Input placeholder="22234567" className="font-mono-code" />
                </div>
              </div>

              <Separator />

              <h3 className="font-medium text-card-foreground">Dirección Fiscal</h3>
              <p className="text-sm text-muted-foreground -mt-4">Los códigos de provincia, cantón y distrito se envían a Hacienda en cada factura</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label>Provincia *</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={province}
                    onChange={(e) => { setProvince(e.target.value); setCanton(""); setDistrict(""); }}
                  >
                    <option value="">Seleccionar...</option>
                    {PROVINCES.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cantón *</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={canton}
                    onChange={(e) => { setCanton(e.target.value); setDistrict(""); }}
                    disabled={!province}
                  >
                    <option value="">{province ? "Seleccionar..." : "Seleccione provincia primero"}</option>
                    {cantons.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Distrito *</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!canton}
                  >
                    <option value="">{canton ? "Seleccionar..." : "Seleccione cantón primero"}</option>
                    {districts.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Otras Señas</Label>
                <textarea className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="200m norte del parque España" />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Moneda por Defecto *</Label>
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="CRC">CRC - Colones (₡)</option>
                  <option value="USD">USD - Dólares ($)</option>
                  <option value="EUR">EUR - Euros (€)</option>
                </select>
                <p className="text-xs text-muted-foreground">Moneda predeterminada al crear facturas</p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast.success("Cambios guardados")}>Guardar Cambios</Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Hacienda */}
        <TabsContent value="hacienda" className="mt-6">
          <TabExplainer
            title="Conexión con Hacienda"
            why="Sin esta conexión, el sistema no puede firmar ni enviar facturas electrónicas al Ministerio de Hacienda."
            because="Costa Rica exige que toda factura sea firmada con un certificado digital (.p12) emitido por el BCCR y enviada mediante las credenciales ATV."
            example="Suba su archivo .p12, ingrese su PIN y credenciales ATV. Puede empezar en modo Pruebas (las facturas no son legales) y cambiar a Producción cuando esté listo."
          />
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">Certificado Digital y ATV</h2>
              </div>
            </div>
            <div className="p-6">
              {haciendaConnected ? (
                <div className="space-y-4">
                  <div className="bg-success/5 border border-success/20 rounded-lg p-5 flex items-start gap-4">
                    <Wifi className="h-6 w-6 text-success shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-card-foreground">Conectado — {haciendaEnv === "staging" ? "Ambiente de Pruebas" : "Producción"}</p>
                      <p className="text-sm text-muted-foreground mt-1">Su certificado .p12 está activo y las facturas se firmarán digitalmente.</p>
                      <div className="flex gap-2 mt-3">
                        <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testingConnection}>
                          {testingConnection ? "Probando..." : "Probar Conexión"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => { setHaciendaConnected(false); toast.info("Desconectado de Hacienda"); }}
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-lg p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <WifiOff className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-card-foreground mb-2">No conectado a Hacienda</h3>
                  <p className="text-sm text-muted-foreground mb-2 max-w-md mx-auto">
                    Para enviar facturas electrónicas necesita un certificado digital (.p12) del BCCR y credenciales ATV.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
                    Puede registrar pacientes y productos ahora y conectar Hacienda después.
                  </p>
                  <Button onClick={() => setHaciendaModalOpen(true)}>
                    <Link2 className="h-4 w-4" /> Conectar con Hacienda
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* TAB: Marca */}
        <TabsContent value="brand" className="mt-6">
          <TabExplainer
            title="Identidad Visual"
            why="El logo y la imagen de su clínica generan confianza con los pacientes y profesionalismo en sus documentos."
            because="El logo aparece en el sidebar de la app, en PDFs de facturas y en comunicaciones con pacientes. Un branding consistente mejora la percepción de calidad."
            example="Suba un logo PNG o SVG de alta calidad con fondo transparente. Se mostrará en las facturas que genere y en el menú de navegación."
          />
          <div className="bg-card rounded-xl border border-border shadow-sm">
            <div className="px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-card-foreground">Logo de la Clínica</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Se muestra en el sidebar, facturas y comunicaciones</p>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-6">
                {logoFile ? (
                  <div className="relative group">
                    <img src={logoFile} alt="Logo de clínica" className="w-24 h-24 rounded-xl object-cover border border-border" />
                    <button
                      onClick={() => { setLogoFile(null); toast.info("Logo eliminado"); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-muted border-2 border-dashed border-border flex items-center justify-center">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent cursor-pointer transition-colors text-sm font-medium">
                    <Upload className="h-4 w-4" />
                    {logoFile ? "Cambiar Logo" : "Subir Logo"}
                    <input type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <p className="text-xs text-muted-foreground mt-2">PNG, JPG o SVG. Máximo 2MB.</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB: Alertas */}
        <TabsContent value="alerts" className="mt-6">
          <TabExplainer
            title="Sistema de Alertas y Notificaciones"
            why="Las alertas automáticas reducen inasistencias, mejoran cobros y aseguran seguimientos clínicos."
            because="Clínicas que envían recordatorios ven hasta un 40% menos de inasistencias. Los cobros automáticos a los 7 días reducen la mora en un 60%."
            example="Un paciente tiene cita el viernes. 48h antes, el doctor y el personal reciben un alerta interna. 24h antes, el paciente recibe un WhatsApp con los detalles de la cita."
          />
          <AlertConfigPanel />

          <Separator className="my-8" />

          <AlertTemplateManager />
        </TabsContent>

        {/* TAB: Personal */}
        <TabsContent value="team" className="mt-6">
          <TabExplainer
            title="Gestión de Personal"
            why="Controlar quién accede al sistema protege la información médica y financiera de sus pacientes."
            because="Cada rol tiene permisos específicos. Solo Admin y Doctor(a) pueden modificar la configuración. Recepcionistas gestionan citas y cobros. Staff tiene acceso de solo lectura."
            example="Invite a su recepcionista con el rol 'Recepcionista'. Podrá agendar citas y facturar, pero no podrá cambiar la configuración de Hacienda ni ver reportes financieros completos."
          />
          <TeamManagement />
        </TabsContent>

        {/* TAB: Integraciones */}
        <TabsContent value="integrations" className="mt-6">
          <TabExplainer
            title="Integraciones Externas"
            why="Conectar servicios externos automatiza procesos y elimina la necesidad de duplicar datos manualmente."
            because="Google Calendar sincroniza citas, WhatsApp permite comunicación directa con pacientes, y las pasarelas de pago facilitan cobros en línea."
            example="Al conectar Google Calendar, cada cita creada en el sistema aparece automáticamente en el calendario del doctor. No necesita crear la cita dos veces."
          />
          <IntegrationsSection />
        </TabsContent>
      </Tabs>

      {/* Hacienda Connection Modal */}
      {haciendaModalOpen && (
        <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setHaciendaModalOpen(false)}>
          <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-card-foreground">Conectar con Hacienda</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Suba su certificado .p12 y credenciales ATV</p>
              </div>
              <button onClick={() => setHaciendaModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setHaciendaEnv("staging")}
                    className={cn(
                      "flex-1 p-3 rounded-lg border-2 text-center text-sm transition-all",
                      haciendaEnv === "staging" ? "border-warning bg-warning/5 font-medium" : "border-border"
                    )}
                  >
                    🧪 Pruebas (Staging)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHaciendaEnv("production")}
                    className={cn(
                      "flex-1 p-3 rounded-lg border-2 text-center text-sm transition-all",
                      haciendaEnv === "production" ? "border-success bg-success/5 font-medium" : "border-border"
                    )}
                  >
                    🏭 Producción
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {haciendaEnv === "staging"
                    ? "Use Pruebas mientras configura. Las facturas no son legales."
                    : "Producción envía facturas reales a Hacienda. Asegúrese de que todo esté correcto."}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Usuario ATV *</Label>
                <Input placeholder="cpj-3-101-123456@stag.comprobanteselectronicos.go.cr" value={atvUser} onChange={(e) => setAtvUser(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contraseña ATV *</Label>
                <div className="relative">
                  <Input type={showPass ? "text" : "password"} placeholder="••••••••" value={atvPass} onChange={(e) => setAtvPass(e.target.value)} className="pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Certificado Digital (.p12) *</Label>
                {p12File ? (
                  <div className="bg-success/5 border border-success/20 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium text-card-foreground">{p12File.name}</span>
                      <span className="text-xs text-muted-foreground">({(p12File.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={() => setP12File(null)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="text-sm font-medium text-card-foreground">Seleccionar archivo .p12</span>
                    <span className="text-xs text-muted-foreground mt-1">Emitido por el BCCR</span>
                    <input
                      type="file"
                      accept=".p12,.pfx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) setP12File(file);
                      }}
                    />
                  </label>
                )}
              </div>

              <div className="space-y-2">
                <Label>PIN del Certificado *</Label>
                <div className="relative">
                  <Input type={showPin ? "text" : "password"} placeholder="PIN de 4 dígitos" value={p12Pin} onChange={(e) => setP12Pin(e.target.value)} maxLength={10} className="pr-10 font-mono-code" />
                  <button type="button" onClick={() => setShowPin(!showPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setHaciendaModalOpen(false)}>Cancelar</Button>
                <Button className="flex-1" onClick={handleConnectHacienda} disabled={testingConnection}>
                  {testingConnection ? "Validando..." : "Conectar"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
