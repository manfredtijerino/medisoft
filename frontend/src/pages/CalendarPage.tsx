import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, User, Plus, Link2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay, addWeeks, subWeeks } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ViewMode = "day" | "week";

interface Appointment {
  id: string;
  patientName: string;
  time: string;
  duration: number; // minutes
  type: string;
  color: string;
}

// Mock data
const MOCK_APPOINTMENTS: Appointment[] = [
  { id: "1", patientName: "Carlos Ramírez", time: "08:00", duration: 30, type: "Consulta general", color: "bg-primary/15 text-primary border-primary/30" },
  { id: "2", patientName: "Ana Mora", time: "09:00", duration: 60, type: "Limpieza dental", color: "bg-secondary/15 text-secondary border-secondary/30" },
  { id: "3", patientName: "Luis Solano", time: "10:30", duration: 45, type: "Ortodoncia", color: "bg-warning/15 text-warning border-warning/30" },
  { id: "4", patientName: "María Jiménez", time: "14:00", duration: 30, type: "Control", color: "bg-success/15 text-success border-success/30" },
  { id: "5", patientName: "Pedro Vargas", time: "15:30", duration: 60, type: "Extracción", color: "bg-destructive/15 text-destructive border-destructive/30" },
];

const HOURS = Array.from({ length: 12 }, (_, i) => i + 7); // 7am to 6pm

const CalendarPage = () => {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [connected, setConnected] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const navigate = (dir: number) => {
    if (view === "day") setCurrentDate(prev => addDays(prev, dir));
    else setCurrentDate(prev => dir > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1));
  };

  const getAppointmentsForDay = (date: Date) => {
    if (isSameDay(date, new Date())) return MOCK_APPOINTMENTS;
    if (isSameDay(date, addDays(new Date(), 1))) return MOCK_APPOINTMENTS.slice(0, 2);
    if (isSameDay(date, addDays(new Date(), 2))) return MOCK_APPOINTMENTS.slice(2, 4);
    return [];
  };

  const getTopOffset = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return ((h - 7) * 64) + (m / 60) * 64;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestione las citas de su clínica</p>
        </div>
        <div className="flex items-center gap-3">
          {!connected ? (
            <button
              onClick={() => setConnected(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium text-card-foreground hover:bg-muted transition-colors"
            >
              <Link2 className="h-4 w-4" />
              Conectar Google Calendar
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              Google Calendar conectado
            </span>
          )}
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="h-4 w-4" /> Nueva Cita
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <h2 className="font-semibold text-card-foreground ml-2">
            {view === "day"
              ? format(currentDate, "EEEE d 'de' MMMM, yyyy", { locale: es })
              : `${format(weekStart, "d MMM", { locale: es })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: es })}`}
          </h2>
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setView("day")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", view === "day" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Día
          </button>
          <button
            onClick={() => setView("week")}
            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors", view === "week" ? "bg-card text-card-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
          >
            Semana
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {view === "week" ? (
          <>
            {/* Week header */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
              <div className="p-3" />
              {weekDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-3 text-center border-l border-border",
                    isSameDay(day, new Date()) && "bg-primary/5"
                  )}
                >
                  <p className="text-xs text-muted-foreground uppercase">{format(day, "EEE", { locale: es })}</p>
                  <p className={cn(
                    "text-lg font-semibold mt-0.5",
                    isSameDay(day, new Date()) ? "text-primary" : "text-card-foreground"
                  )}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>
            {/* Week body */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] overflow-y-auto max-h-[600px]">
              <div>
                {HOURS.map((h) => (
                  <div key={h} className="h-16 flex items-start justify-end pr-2 pt-0.5">
                    <span className="text-[10px] text-muted-foreground">{`${h}:00`}</span>
                  </div>
                ))}
              </div>
              {weekDays.map((day) => {
                const appts = getAppointmentsForDay(day);
                return (
                  <div key={day.toISOString()} className="relative border-l border-border">
                    {HOURS.map((h) => (
                      <div key={h} className="h-16 border-b border-border/50" />
                    ))}
                    {appts.map((a) => (
                      <div
                        key={a.id}
                        className={cn("absolute left-1 right-1 rounded-md border px-2 py-1 text-[10px] cursor-pointer hover:opacity-80 transition-opacity overflow-hidden", a.color)}
                        style={{ top: getTopOffset(a.time), height: (a.duration / 60) * 64 }}
                      >
                        <p className="font-semibold truncate">{a.patientName}</p>
                        <p className="truncate opacity-80">{a.time} · {a.type}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Day view */
          <div className="grid grid-cols-[60px_1fr]">
            <div>
              {HOURS.map((h) => (
                <div key={h} className="h-16 flex items-start justify-end pr-2 pt-0.5">
                  <span className="text-[10px] text-muted-foreground">{`${h}:00`}</span>
                </div>
              ))}
            </div>
            <div className="relative border-l border-border">
              {HOURS.map((h) => (
                <div key={h} className="h-16 border-b border-border/50" />
              ))}
              {getAppointmentsForDay(currentDate).map((a) => (
                <div
                  key={a.id}
                  className={cn("absolute left-2 right-2 rounded-lg border px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity", a.color)}
                  style={{ top: getTopOffset(a.time), height: (a.duration / 60) * 64 }}
                >
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-sm font-semibold truncate">{a.patientName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3 shrink-0 opacity-70" />
                    <span className="text-xs opacity-80">{a.time} — {a.duration} min · {a.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Today's summary */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6">
        <h3 className="font-semibold text-card-foreground flex items-center gap-2 mb-4">
          <CalendarDays className="h-4 w-4 text-primary" />
          Resumen del Día — {format(new Date(), "d 'de' MMMM", { locale: es })}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
            <p className="text-2xl font-bold text-primary">{MOCK_APPOINTMENTS.length}</p>
            <p className="text-sm text-muted-foreground">Citas programadas</p>
          </div>
          <div className="bg-success/5 rounded-lg p-4 border border-success/10">
            <p className="text-2xl font-bold text-success">0</p>
            <p className="text-sm text-muted-foreground">Completadas</p>
          </div>
          <div className="bg-warning/5 rounded-lg p-4 border border-warning/10">
            <p className="text-2xl font-bold text-warning">5</p>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
