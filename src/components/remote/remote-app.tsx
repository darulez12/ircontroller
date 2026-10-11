import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Droplets,
  Fan,
  Lightbulb,
  Minus,
  Moon,
  Plus,
  Power,
  Snowflake,
  Sun,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import {
  canFireIr,
  encodeFrame,
  fireIr,
  formatCode,
  inPreviewFrame,
  warmupIr,
  type Command,
  type Fan as FanSpeed,
  type Mode,
  type Protocol,
  type RemoteSnapshot,
} from "@/lib/ir/engine";

const STORAGE_KEY = "carino-mabe-v1";

const MODES: { id: Mode; label: string; icon: typeof Snowflake }[] = [
  { id: "cool", label: "Frío", icon: Snowflake },
  { id: "dry", label: "Seco", icon: Droplets },
  { id: "auto", label: "Auto", icon: Wind },
  { id: "heat", label: "Calor", icon: Sun },
  { id: "fan", label: "Aire", icon: Fan },
];

const FANS: { id: FanSpeed; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "low", label: "Bajo" },
  { id: "med", label: "Medio" },
  { id: "high", label: "Alto" },
];

const MODE_LABEL: Record<Mode, string> = {
  cool: "Frío",
  dry: "Seco",
  auto: "Auto",
  heat: "Calor",
  fan: "Aire",
};

type Persisted = RemoteSnapshot & {
  instant: boolean;
  swing: boolean;
  turbo: boolean;
  light: boolean;
  eco: boolean;
  quiet: boolean;
};

const INITIAL: Persisted = {
  protocol: "midea",
  power: false,
  mode: "cool",
  temp: 23,
  fan: "auto",
  sleep: false,
  instant: true,
  swing: false,
  turbo: false,
  light: true,
  eco: false,
  quiet: false,
};

type Bridge = "idle" | "sent" | "missing" | "desk" | "preview" | "error";

function loadPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return { ...INITIAL, ...parsed, temp: clampTemp(parsed.temp ?? INITIAL.temp) };
  } catch {
    return INITIAL;
  }
}

function clampTemp(value: number): number {
  if (Number.isNaN(value)) return 23;
  return Math.min(30, Math.max(17, Math.round(value)));
}

function accentClass(mode: Mode, power: boolean): string {
  if (!power) return "text-muted";
  if (mode === "heat") return "text-heat";
  if (mode === "cool" || mode === "dry") return "text-lagoon";
  return "text-ink";
}

function ModeIcon({ mode, className }: { mode: Mode; className?: string }) {
  const Item = MODES.find((entry) => entry.id === mode)?.icon ?? Wind;
  return <Item className={className} strokeWidth={1.75} aria-hidden="true" />;
}

export function RemoteApp() {
  const [state, setState] = useState<Persisted>(INITIAL);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [bridge, setBridge] = useState<Bridge>("idle");
  const [sheet, setSheet] = useState(false);
  const [burst, setBurst] = useState(0);
  const [clock, setClock] = useState("");
  const seq = useRef(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    setState(loadPersisted());
    setReady(true);
    warmupIr();
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  useEffect(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, []);

  async function transmit(next: Persisted, command: Command) {
    const id = ++seq.current;
    try {
      const frame = await encodeFrame(next, command);
      if (id !== seq.current) return;
      setCode(frame.code);
      setBurst((value) => value + 1);
      if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(12);
      if (inPreviewFrame()) {
        setBridge("preview");
        return;
      }
      if (!canFireIr()) {
        setBridge("desk");
        return;
      }
      const result = await fireIr(frame);
      if (id !== seq.current) return;
      setBridge(result);
      if (result === "missing") setSheet(true);
    } catch {
      if (id === seq.current) setBridge("error");
    }
  }

  function commit(partial: Partial<Persisted>, command: Command, force = false) {
    const next = { ...stateRef.current, ...partial };
    stateRef.current = next;
    setState(next);
    const shouldSend = force || command !== "apply" || next.instant;
    if (shouldSend) void transmit(next, command);
  }

  const climate = state.power ? state.mode : "off";
  const status =
    bridge === "sent"
      ? "Señal disparada. Apunta el LED de arriba al Mabe."
      : bridge === "preview"
        ? "Vista previa. En el Redmi, este toque enciende el infrarrojo."
        : bridge === "desk"
          ? "Código listo. Ábrelo en el Redmi para disparar el LED."
          : bridge === "error"
            ? "No se pudo armar la señal. Prueba de nuevo."
            : bridge === "missing"
              ? "El teléfono todavía no tiene el puente del LED."
              : "Cada toque manda el estado completo, como el control de verdad.";

  return (
    <div data-climate={climate} className="min-h-dvh text-ink">
      <header className="statusbar sticky top-0 z-20 bg-ink text-cream">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <p className="font-serif text-lg leading-none">Cariño</p>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex h-8 items-center gap-2 rounded-full bg-cream px-3 text-ink">
              <ModeIcon mode={state.mode} className={`size-3.5 ${accentClass(state.mode, state.power)}`} />
              <span className="font-serif text-sm tabular-nums leading-none">
                {state.power ? `${state.temp}°` : "—"}
              </span>
              <span className="text-xs text-muted">{state.power ? MODE_LABEL[state.mode] : "apagado"}</span>
            </div>
            <span
              key={burst}
              data-hot={burst > 0 ? "true" : "false"}
              className="led size-2 shrink-0 rounded-full bg-cream"
              aria-hidden="true"
            />
            <span className="hidden text-sm tabular-nums text-cream/80 sm:inline">{clock}</span>
          </div>
        </div>
      </header>

      <main className="stage mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-6">
        <p className="text-center text-sm text-balance text-muted">Para no volver a buscar el control.</p>

        <WallUnit state={state} />

        <section className="rounded-3xl bg-cream p-3 shadow-card" aria-label="Control del aire">
          <div className="flex items-center gap-3 p-2">
            <button
              type="button"
              aria-pressed={state.power}
              onClick={() => commit({ power: !state.power }, "apply")}
              className={`grid size-14 place-items-center rounded-full ${
                state.power ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"
              }`}
            >
              <Power className="size-6" strokeWidth={1.75} />
              <span className="sr-only">{state.power ? "Apagar" : "Encender"}</span>
            </button>
            <div className="min-w-0">
              <p className="font-serif text-xl leading-none">{state.power ? "Encendido" : "Apagado"}</p>
              <p className="mt-1 text-sm text-muted">
                {MODE_LABEL[state.mode]} · ventilador {FANS.find((fan) => fan.id === state.fan)?.label.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between px-2">
            <button
              type="button"
              aria-label="Bajar un grado"
              disabled={state.temp <= 17}
              onClick={() => commit({ temp: clampTemp(state.temp - 1) }, "apply")}
              className="grid size-12 place-items-center rounded-full bg-wall text-ink shadow-key disabled:opacity-40"
            >
              <Minus className="size-5" />
            </button>
            <p className={`font-serif text-7xl leading-none tabular-nums ${accentClass(state.mode, true)}`}>
              {state.temp}
              <span className="text-4xl">°</span>
            </p>
            <button
              type="button"
              aria-label="Subir un grado"
              disabled={state.temp >= 30}
              onClick={() => commit({ temp: clampTemp(state.temp + 1) }, "apply")}
              className="grid size-12 place-items-center rounded-full bg-wall text-ink shadow-key disabled:opacity-40"
            >
              <Plus className="size-5" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Modo" className="mt-4 grid grid-cols-5 gap-1.5">
            {MODES.map((mode) => {
              const selected = state.mode === mode.id;
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => commit({ mode: mode.id }, "apply")}
                  className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs ${
                    selected ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={1.75} />
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4 px-1">
            <p className="mb-2 text-xs tracking-wide text-muted uppercase">Ventilador</p>
            <div role="radiogroup" aria-label="Velocidad" className="grid grid-cols-4 gap-1 rounded-full bg-wall p-1">
              {FANS.map((fan) => {
                const selected = state.fan === fan.id;
                return (
                  <button
                    key={fan.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => commit({ fan: fan.id }, "apply")}
                    className={`h-11 rounded-full text-sm ${selected ? "bg-ink text-cream" : "text-ink"}`}
                  >
                    {fan.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-1.5">
            <Chip
              label="Swing"
              pressed={state.swing}
              icon={<Wind className="size-4" />}
              onClick={() => commit({ swing: !state.swing }, "swing")}
            />
            <Chip
              label="Turbo"
              pressed={state.turbo}
              icon={<Zap className="size-4" />}
              onClick={() => commit({ turbo: !state.turbo }, "turbo")}
            />
            <Chip
              label="Luz"
              pressed={state.light}
              icon={<Lightbulb className="size-4" />}
              onClick={() => commit({ light: !state.light }, "light")}
            />
            <Chip
              label="Sueño"
              pressed={state.sleep}
              icon={<Moon className="size-4" />}
              onClick={() => commit({ sleep: !state.sleep }, "sleep")}
            />
            {state.protocol === "midea" ? (
              <Chip
                label="Eco"
                pressed={state.eco}
                icon={<Droplets className="size-4" />}
                onClick={() => commit({ eco: !state.eco }, "eco")}
              />
            ) : null}
            {state.protocol === "midea" ? (
              <Chip
                label="Silencio"
                pressed={state.quiet}
                icon={<VolumeX className="size-4" />}
                onClick={() =>
                  commit({ quiet: !state.quiet }, state.quiet ? "quiet-off" : "quiet-on")
                }
              />
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => commit({}, "apply", true)}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm text-cream"
          >
            Disparar infrarrojo
          </button>
          <p className="mt-3 px-2 text-center text-xs text-pretty text-muted" aria-live="polite">
            {status}
          </p>
          <p className="mt-1 px-2 text-center font-sans text-xs tracking-wide text-ink/70 tabular-nums">
            {code ? formatCode(code) : "—"} · 38 kHz · {state.protocol === "midea" ? "Midea" : "Coolix"}
          </p>
        </section>

        <section className="rounded-3xl bg-cream/70 p-4 shadow-key">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm">Protocolo</p>
            <div className="grid grid-cols-2 gap-1 rounded-full bg-wall p-1">
              {(["midea", "coolix"] as const).map((protocol) => (
                <button
                  key={protocol}
                  type="button"
                  aria-pressed={state.protocol === protocol}
                  onClick={() => setState((current) => ({ ...current, protocol }))}
                  className={`h-11 rounded-full px-4 text-sm ${
                    state.protocol === protocol ? "bg-ink text-cream" : "text-ink"
                  }`}
                >
                  {protocol === "midea" ? "Midea" : "Coolix"}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-pretty text-muted">
            Casi todos los minisplit Mabe hablan Midea. Si el equipo no reacciona, pasa a Coolix y dispara otra vez.
          </p>
          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Enviar al tocar</span>
            <button
              type="button"
              role="switch"
              aria-checked={state.instant}
              onClick={() => setState((current) => ({ ...current, instant: !current.instant }))}
              className={`relative h-7 w-12 rounded-full ${state.instant ? "bg-ink" : "bg-line"}`}
            >
              <span
                className={`absolute top-0.5 size-6 rounded-full bg-cream transition-transform ${
                  state.instant ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
              <span className="sr-only">Enviar al tocar</span>
            </button>
          </label>
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="mt-4 text-sm text-lagoon underline decoration-lagoon/40 underline-offset-4"
          >
            Instalar el puente del Redmi
          </button>
        </section>
      </main>

      {sheet ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bridge-title"
            className="w-full max-w-md rounded-3xl bg-cream p-5 shadow-card"
          >
            <h2 id="bridge-title" className="font-serif text-2xl text-balance">
              El LED necesita un puente
            </h2>
            <p className="mt-2 text-sm text-pretty text-muted">
              Android no deja que una página encienda el infrarrojo. Cariño IR es una app minúscula: recibe el código
              que arma Rust y lo dispara con el emisor del Note 14 Pro.
            </p>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
              <li>Descarga e instala el puente.</li>
              <li>Si HyperOS pregunta, permite instalar de esta fuente.</li>
              <li>Vuelve, apunta la parte de arriba del teléfono al Mabe y toca Disparar.</li>
            </ol>
            <a
              href="/carino-ir.apk"
              download="carino-ir.apk"
              className="mt-5 flex h-12 items-center justify-center rounded-full bg-ink text-sm text-cream"
            >
              Descargar puente
            </a>
            <button
              type="button"
              onClick={() => setSheet(false)}
              className="mt-2 flex h-11 w-full items-center justify-center text-sm text-muted"
            >
              Ahora no
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  label,
  pressed,
  icon,
  onClick,
}: {
  label: string;
  pressed: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-sm ${
        pressed ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function WallUnit({ state }: { state: Persisted }) {
  const airflow = state.power && state.fan !== "auto" ? (state.fan === "high" ? "0.7s" : state.fan === "med" ? "1.1s" : "1.6s") : "1.8s";
  return (
    <div className="px-2" aria-hidden="true">
      <div className="rounded-t-3xl rounded-b-xl bg-cream px-4 pt-4 pb-3 shadow-card">
        <div className="flex items-start justify-between">
          <p className="text-xs tracking-widest text-muted uppercase">Mabe</p>
          <p className={`font-serif text-3xl leading-none tabular-nums ${accentClass(state.mode, state.power)}`}>
            {state.power ? `${state.temp}°` : "–"}
          </p>
        </div>
        <div className="grille mt-3 h-9 rounded-md" />
        <div className="unit-well mt-1">
          <div
            className="louver"
            data-open={state.power ? "true" : "false"}
            data-swing={state.power && state.swing ? "true" : "false"}
          />
        </div>
      </div>
      {state.power ? (
        <div className="mx-8 mt-2 flex justify-center gap-3">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={`air h-8 w-6 rounded-full ${state.mode === "heat" ? "bg-heat/30" : "bg-lagoon/30"}`}
              style={{ animationDelay: `${index * 0.18}s`, animationDuration: airflow }}
            />
          ))}
        </div>
      ) : (
        <div className="h-8" />
      )}
    </div>
  );
}
