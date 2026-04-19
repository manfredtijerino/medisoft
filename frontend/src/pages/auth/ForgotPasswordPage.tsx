import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Mail, Loader2, ArrowLeft } from "lucide-react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
      toast.success("Correo enviado");
    } catch {
      toast.error("Error al enviar el correo");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
          <Mail className="h-8 w-8 text-success" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Correo Enviado</h2>
        <p className="text-muted-foreground mb-6">Revise su bandeja de entrada para restablecer su contraseña.</p>
        <Link to="/login" className="text-primary font-medium hover:underline text-sm">
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <Link to="/login" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      <h2 className="text-2xl font-bold text-foreground mb-2">Recuperar Contraseña</h2>
      <p className="text-muted-foreground mb-8">Ingrese su correo para recibir un enlace de recuperación</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Correo electrónico</Label>
          <Input id="email" type="email" placeholder="nombre@clinica.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Enviar Enlace
        </Button>
      </form>
    </div>
  );
};

export default ForgotPasswordPage;
