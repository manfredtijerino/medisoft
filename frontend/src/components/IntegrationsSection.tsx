import { CalendarDays, MessageCircle, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const integrations = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronice citas de su clínica con Google Calendar. Los pacientes reciben recordatorios automáticos.",
    icon: CalendarDays,
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
    features: ["Sincronización bidireccional", "Recordatorios automáticos", "Vista unificada de citas"],
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Envíe confirmaciones de citas, recordatorios y facturas directamente al WhatsApp del paciente.",
    icon: MessageCircle,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
    features: ["Confirmación de citas", "Envío de facturas PDF", "Recordatorios 24h antes"],
  },
];

export const IntegrationsSection = () => {
  const [connected, setConnected] = useState<Record<string, boolean>>({});

  const handleToggle = (id: string) => {
    setConnected((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (next[id]) {
        toast.success(`${integrations.find((i) => i.id === id)?.name} conectado`);
      } else {
        toast.info(`${integrations.find((i) => i.id === id)?.name} desconectado`);
      }
      return next;
    });
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-card-foreground">Integraciones</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">Conecte aplicaciones externas para potenciar su clínica</p>
      </div>
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => {
          const isConnected = connected[integration.id];
          return (
            <div
              key={integration.id}
              className={cn(
                "rounded-xl border-2 p-5 transition-all",
                isConnected ? integration.borderColor + " " + integration.bgColor : "border-border hover:border-border/80"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", integration.bgColor)}>
                    <integration.icon className={cn("h-5 w-5", integration.color)} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground text-sm">{integration.name}</h3>
                    {isConnected && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Conectado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>
              <ul className="space-y-1.5 mb-4">
                {integration.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className={cn("w-1.5 h-1.5 rounded-full", isConnected ? "bg-success" : "bg-border")} />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={isConnected ? "outline" : "default"}
                size="sm"
                className="w-full"
                onClick={() => handleToggle(integration.id)}
              >
                {isConnected ? "Desconectar" : "Conectar"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
