import { useState } from "react";
import { Users, Mail, Shield, Stethoscope, UserCheck, Plus, X, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    value: "admin",
    label: "Admin",
    description: "Acceso total: configuración, facturación, reportes y gestión de equipo",
    icon: Shield,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    permissions: ["Configuración", "Facturación", "Reportes", "Pacientes", "Calendario", "Equipo"],
  },
  {
    value: "doctor",
    label: "Doctor(a)",
    description: "Expedientes médicos, consultas, calendario y acceso a configuración clínica",
    icon: Stethoscope,
    color: "text-primary",
    bgColor: "bg-primary/10",
    permissions: ["Configuración", "Pacientes", "Expedientes", "Consultas", "Calendario"],
  },
  {
    value: "receptionist",
    label: "Recepcionista",
    description: "Gestión de citas, datos básicos de pacientes y facturación",
    icon: UserCheck,
    color: "text-secondary",
    bgColor: "bg-secondary/10",
    permissions: ["Pacientes", "Calendario", "Facturación"],
  },
  {
    value: "staff",
    label: "Staff",
    description: "Acceso limitado: ver citas del día y datos básicos de pacientes",
    icon: Users,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    permissions: ["Pacientes (solo lectura)", "Calendario (solo lectura)"],
  },
];

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  invitedAt: string;
}

const DEMO_MEMBERS: TeamMember[] = [
  { id: "1", name: "María González", email: "maria@clinicagonzalez.com", role: "admin", status: "active", invitedAt: "2024-01-15" },
  { id: "2", name: "Dr. Carlos Mora", email: "carlos.mora@email.com", role: "doctor", status: "active", invitedAt: "2024-02-01" },
  { id: "3", name: "Ana Rodríguez", email: "ana.r@email.com", role: "receptionist", status: "active", invitedAt: "2024-03-10" },
  { id: "4", name: "", email: "laura.v@email.com", role: "staff", status: "pending", invitedAt: "2024-04-01" },
];

const TeamManagement = () => {
  const [members, setMembers] = useState<TeamMember[]>(DEMO_MEMBERS);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [sending, setSending] = useState(false);

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast.error("Ingrese un correo electrónico");
      return;
    }
    if (members.some((m) => m.email === inviteEmail.trim())) {
      toast.error("Este correo ya está registrado");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setMembers([
        ...members,
        {
          id: Date.now().toString(),
          name: "",
          email: inviteEmail.trim(),
          role: inviteRole,
          status: "pending",
          invitedAt: new Date().toISOString().split("T")[0],
        },
      ]);
      setInviteEmail("");
      setShowInvite(false);
      setSending(false);
      toast.success(`Invitación enviada a ${inviteEmail.trim()}`);
    }, 1000);
  };

  const handleRemove = (id: string) => {
    const member = members.find((m) => m.id === id);
    setMembers(members.filter((m) => m.id !== id));
    toast.success(`${member?.name || member?.email} eliminado del equipo`);
  };

  const handleResend = (email: string) => {
    toast.success(`Invitación reenviada a ${email}`);
  };

  const getRoleInfo = (roleValue: string) => ROLES.find((r) => r.value === roleValue) || ROLES[3];

  return (
    <div className="space-y-6">
      {/* Roles overview */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-card-foreground">Roles y Permisos</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Solo <strong>Admin</strong> y <strong>Doctor(a)</strong> pueden acceder a Configuración
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.value} className="rounded-lg border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", role.bgColor)}>
                      <Icon className={cn("h-4 w-4", role.color)} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{role.label}</p>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {role.permissions.map((perm) => (
                      <span key={perm} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team members */}
      <div className="bg-card rounded-xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-card-foreground">Miembros del Equipo</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{members.length} miembros · {members.filter((m) => m.status === "pending").length} pendientes</p>
          </div>
          <Button size="sm" onClick={() => setShowInvite(true)}>
            <Plus className="h-4 w-4" /> Invitar
          </Button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="px-6 py-4 border-b border-border bg-primary/5 animate-fade-in">
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-2">
                <Label>Correo electrónico</Label>
                <Input
                  type="email"
                  placeholder="nuevo.miembro@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
                />
              </div>
              <div className="w-44 space-y-2">
                <Label>Rol</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <Button onClick={handleInvite} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowInvite(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Members list */}
        <div className="divide-y divide-border">
          {members.map((member) => {
            const role = getRoleInfo(member.role);
            const Icon = role.icon;
            return (
              <div key={member.id} className="px-6 py-4 flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", role.bgColor)}>
                  <Icon className={cn("h-5 w-5", role.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.name || member.email}
                    </p>
                    {member.status === "pending" && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                        Pendiente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.email}</p>
                </div>
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-full", role.bgColor, role.color)}>
                  {role.label}
                </span>
                <div className="flex items-center gap-1">
                  {member.status === "pending" && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleResend(member.email)}>
                      Reenviar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
