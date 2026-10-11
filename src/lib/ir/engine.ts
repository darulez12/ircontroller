export type Protocol = "midea" | "coolix";
export type Mode = "cool" | "dry" | "auto" | "heat" | "fan";
export type Fan = "auto" | "low" | "med" | "high";
export type Command =
  | "apply"
  | "swing"
  | "turbo"
  | "light"
  | "eco"
  | "quiet-on"
  | "quiet-off"
  | "sleep";

export type RemoteSnapshot = {
  protocol: Protocol;
  power: boolean;
  mode: Mode;
  temp: number;
  fan: Fan;
  sleep: boolean;
};

export type Frame = {
  pattern: number[];
  frequency: number;
  code: string;
};

const MODE_ID: Record<Mode, number> = {
  cool: 0,
  dry: 1,
  auto: 2,
  heat: 3,
  fan: 4,
};

const FAN_ID: Record<Fan, number> = {
  auto: 0,
  low: 1,
  med: 2,
  high: 3,
};

const COMMAND_ID: Record<Command, number> = {
  apply: 0,
  swing: 1,
  turbo: 2,
  light: 3,
  eco: 4,
  "quiet-on": 5,
  "quiet-off": 6,
  sleep: 7,
};

type Exports = {
  memory: WebAssembly.Memory;
  encode: (
    protocol: number,
    power: number,
    mode: number,
    temp: number,
    fan: number,
    sleep: number,
    command: number,
  ) => number;
  pattern_ptr: () => number;
  code_lo: () => number;
  code_hi: () => number;
  carrier_hz: () => number;
};

let loading: Promise<Exports> | null = null;

function loadWasm(): Promise<Exports> {
  if (!loading) {
    loading = (async () => {
      const wasmUrl = (await import("./ir_core.wasm?url")).default;
      const response = await fetch(wasmUrl);
      if (!response.ok) throw new Error("No se pudo cargar el codificador.");
      const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
      return instance.exports as Exports;
    })();
  }
  return loading;
}

export function warmupIr(): void {
  void loadWasm().catch(() => {
    loading = null;
  });
}

export async function encodeFrame(state: RemoteSnapshot, command: Command): Promise<Frame> {
  const wasm = await loadWasm();
  const n = wasm.encode(
    state.protocol === "coolix" ? 1 : 0,
    state.power ? 1 : 0,
    MODE_ID[state.mode],
    state.temp,
    FAN_ID[state.fan],
    state.sleep ? 1 : 0,
    COMMAND_ID[command],
  );
  const view = new Int32Array(wasm.memory.buffer, wasm.pattern_ptr(), n);
  const pattern = Array.from(view);
  const hi = wasm.code_hi() >>> 0;
  const lo = wasm.code_lo() >>> 0;
  const hex = (hi ? hi.toString(16).padStart(4, "0") : "") + lo.toString(16).padStart(hi ? 8 : 6, "0");
  return {
    pattern,
    frequency: wasm.carrier_hz(),
    code: hex.toUpperCase(),
  };
}

export function formatCode(code: string): string {
  return code.replace(/(.{2})(?=.)/g, "$1 ").trim();
}

export function canFireIr(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  if (navigator.webdriver) return false;
  if (!/Android/i.test(navigator.userAgent)) return false;
  try {
    return window.self === window.top;
  } catch {
    return false;
  }
}

export function inPreviewFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

/** Opens the Cariño IR bridge. Resolves "missing" if the app never stole the page. */
export function fireIr(frame: Frame): Promise<"sent" | "missing"> {
  return new Promise((resolve) => {
    let left = false;
    const onVis = () => {
      if (document.hidden) left = true;
    };
    document.addEventListener("visibilitychange", onVis);
    const href =
      `intent://transmit?frequency=${frame.frequency}` +
      `&pattern=${encodeURIComponent(frame.pattern.join(","))}` +
      `#Intent;scheme=carino;package=app.carino.ir;end`;
    window.location.href = href;
    window.setTimeout(() => {
      document.removeEventListener("visibilitychange", onVis);
      resolve(left ? "sent" : "missing");
    }, 700);
  });
}
