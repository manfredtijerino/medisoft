import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CostaRicaMapBg } from "@/components/CostaRicaMapBg";

export const AuthLayout = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center animate-pulse">
          <span className="text-primary-foreground font-bold text-sm">MC</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-secondary/30" />
        <CostaRicaMapBg />
        <div className="relative z-10 flex flex-col justify-center p-12 text-primary-foreground">
          <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-8 shadow-lg">
            <span className="text-secondary-foreground font-bold text-2xl">MC</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">MediSoft</h1>
          <p className="text-xl text-primary-foreground/80 mb-8 leading-relaxed">
            Gestión de clínicas y facturación electrónica para Costa Rica.
          </p>
          <div className="space-y-4 text-primary-foreground/70">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Pacientes, productos y servicios en un solo lugar</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Facturación electrónica conectada a Hacienda</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span>Cumplimiento legal automático</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-background relative">
        <CostaRicaMapBg />
        <div className="w-full max-w-md relative z-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
