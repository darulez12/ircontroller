import { i as __toESM } from "../_runtime.mjs";
import { K as require_react, b as require_jsx_runtime } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as Sun, c as Plus, d as Lightbulb, f as Fan, l as Moon, n as Wind, o as Snowflake, p as Droplets, r as VolumeX, s as Power, t as Zap, u as Minus } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-poiT3K3G.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var MODE_ID = {
	cool: 0,
	dry: 1,
	auto: 2,
	heat: 3,
	fan: 4
};
var FAN_ID = {
	auto: 0,
	low: 1,
	med: 2,
	high: 3
};
var COMMAND_ID = {
	apply: 0,
	swing: 1,
	turbo: 2,
	light: 3,
	eco: 4,
	"quiet-on": 5,
	"quiet-off": 6,
	sleep: 7
};
var loading = null;
function loadWasm() {
	if (!loading) loading = (async () => {
		const wasmUrl = (await import("./ir_core-DG_0wySt.mjs")).default;
		const response = await fetch(wasmUrl);
		if (!response.ok) throw new Error("No se pudo cargar el codificador.");
		const { instance } = await WebAssembly.instantiate(await response.arrayBuffer(), {});
		return instance.exports;
	})();
	return loading;
}
function warmupIr() {
	loadWasm().catch(() => {
		loading = null;
	});
}
async function encodeFrame(state, command) {
	const wasm = await loadWasm();
	const n = wasm.encode(state.protocol === "coolix" ? 1 : 0, state.power ? 1 : 0, MODE_ID[state.mode], state.temp, FAN_ID[state.fan], state.sleep ? 1 : 0, COMMAND_ID[command]);
	const view = new Int32Array(wasm.memory.buffer, wasm.pattern_ptr(), n);
	const pattern = Array.from(view);
	const hi = wasm.code_hi() >>> 0;
	const lo = wasm.code_lo() >>> 0;
	const hex = (hi ? hi.toString(16).padStart(4, "0") : "") + lo.toString(16).padStart(hi ? 8 : 6, "0");
	return {
		pattern,
		frequency: wasm.carrier_hz(),
		code: hex.toUpperCase()
	};
}
function formatCode(code) {
	return code.replace(/(.{2})(?=.)/g, "$1 ").trim();
}
function canFireIr() {
	if (typeof navigator === "undefined" || typeof window === "undefined") return false;
	if (navigator.webdriver) return false;
	if (!/Android/i.test(navigator.userAgent)) return false;
	try {
		return window.self === window.top;
	} catch {
		return false;
	}
}
function inPreviewFrame() {
	if (typeof window === "undefined") return false;
	try {
		return window.self !== window.top;
	} catch {
		return true;
	}
}
/** Opens the Cariño IR bridge. Resolves "missing" if the app never stole the page. */
function fireIr(frame) {
	return new Promise((resolve) => {
		let left = false;
		const onVis = () => {
			if (document.hidden) left = true;
		};
		document.addEventListener("visibilitychange", onVis);
		const href = `intent://transmit?frequency=${frame.frequency}&pattern=${encodeURIComponent(frame.pattern.join(","))}#Intent;scheme=carino;package=app.carino.ir;end`;
		window.location.href = href;
		window.setTimeout(() => {
			document.removeEventListener("visibilitychange", onVis);
			resolve(left ? "sent" : "missing");
		}, 700);
	});
}
var STORAGE_KEY = "carino-mabe-v1";
var MODES = [
	{
		id: "cool",
		label: "Frío",
		icon: Snowflake
	},
	{
		id: "dry",
		label: "Seco",
		icon: Droplets
	},
	{
		id: "auto",
		label: "Auto",
		icon: Wind
	},
	{
		id: "heat",
		label: "Calor",
		icon: Sun
	},
	{
		id: "fan",
		label: "Aire",
		icon: Fan
	}
];
var FANS = [
	{
		id: "auto",
		label: "Auto"
	},
	{
		id: "low",
		label: "Bajo"
	},
	{
		id: "med",
		label: "Medio"
	},
	{
		id: "high",
		label: "Alto"
	}
];
var MODE_LABEL = {
	cool: "Frío",
	dry: "Seco",
	auto: "Auto",
	heat: "Calor",
	fan: "Aire"
};
var INITIAL = {
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
	quiet: false
};
function loadPersisted() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return INITIAL;
		const parsed = JSON.parse(raw);
		return {
			...INITIAL,
			...parsed,
			temp: clampTemp(parsed.temp ?? INITIAL.temp)
		};
	} catch {
		return INITIAL;
	}
}
function clampTemp(value) {
	if (Number.isNaN(value)) return 23;
	return Math.min(30, Math.max(17, Math.round(value)));
}
function accentClass(mode, power) {
	if (!power) return "text-muted";
	if (mode === "heat") return "text-heat";
	if (mode === "cool" || mode === "dry") return "text-lagoon";
	return "text-ink";
}
function ModeIcon({ mode, className }) {
	const Item = MODES.find((entry) => entry.id === mode)?.icon ?? Wind;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Item, {
		className,
		strokeWidth: 1.75,
		"aria-hidden": "true"
	});
}
function RemoteApp() {
	const [state, setState] = (0, import_react.useState)(INITIAL);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [code, setCode] = (0, import_react.useState)("");
	const [bridge, setBridge] = (0, import_react.useState)("idle");
	const [sheet, setSheet] = (0, import_react.useState)(false);
	const [burst, setBurst] = (0, import_react.useState)(0);
	const [clock, setClock] = (0, import_react.useState)("");
	const seq = (0, import_react.useRef)(0);
	const stateRef = (0, import_react.useRef)(state);
	stateRef.current = state;
	(0, import_react.useEffect)(() => {
		setState(loadPersisted());
		setReady(true);
		warmupIr();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}, [state, ready]);
	(0, import_react.useEffect)(() => {
		const tick = () => setClock((/* @__PURE__ */ new Date()).toLocaleTimeString("es-MX", {
			hour: "2-digit",
			minute: "2-digit"
		}));
		tick();
		const id = window.setInterval(tick, 15e3);
		return () => window.clearInterval(id);
	}, []);
	async function transmit(next, command) {
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
	function commit(partial, command, force = false) {
		const next = {
			...stateRef.current,
			...partial
		};
		stateRef.current = next;
		setState(next);
		if (force || command !== "apply" || next.instant) transmit(next, command);
	}
	const climate = state.power ? state.mode : "off";
	const status = bridge === "sent" ? "Señal disparada. Apunta el LED de arriba al Mabe." : bridge === "preview" ? "Vista previa. En el Redmi, este toque enciende el infrarrojo." : bridge === "desk" ? "Código listo. Ábrelo en el Redmi para disparar el LED." : bridge === "error" ? "No se pudo armar la señal. Prueba de nuevo." : bridge === "missing" ? "El teléfono todavía no tiene el puente del LED." : "Cada toque manda el estado completo, como el control de verdad.";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"data-climate": climate,
		className: "min-h-dvh text-ink",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "statusbar sticky top-0 z-20 bg-ink text-cream",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto flex h-14 max-w-3xl items-center gap-3 px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-serif text-lg leading-none",
						children: "Cariño"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "ml-auto flex items-center gap-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex h-8 items-center gap-2 rounded-full bg-cream px-3 text-ink",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModeIcon, {
										mode: state.mode,
										className: `size-3.5 ${accentClass(state.mode, state.power)}`
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-serif text-sm tabular-nums leading-none",
										children: state.power ? `${state.temp}°` : "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted",
										children: state.power ? MODE_LABEL[state.mode] : "apagado"
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"data-hot": burst > 0 ? "true" : "false",
								className: "led size-2 shrink-0 rounded-full bg-cream",
								"aria-hidden": "true"
							}, burst),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "hidden text-sm tabular-nums text-cream/80 sm:inline",
								children: clock
							})
						]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "stage mx-auto flex w-full max-w-md flex-col gap-5 px-4 pt-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-balance text-muted",
						children: "Para no volver a buscar el control."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(WallUnit, { state }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-3xl bg-cream p-3 shadow-card",
						"aria-label": "Control del aire",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 p-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									"aria-pressed": state.power,
									onClick: () => commit({ power: !state.power }, "apply"),
									className: `grid size-14 place-items-center rounded-full ${state.power ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Power, {
										className: "size-6",
										strokeWidth: 1.75
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: state.power ? "Apagar" : "Encender"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "font-serif text-xl leading-none",
										children: state.power ? "Encendido" : "Apagado"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-sm text-muted",
										children: [
											MODE_LABEL[state.mode],
											" · ventilador ",
											FANS.find((fan) => fan.id === state.fan)?.label.toLowerCase()
										]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex items-center justify-between px-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Bajar un grado",
										disabled: state.temp <= 17,
										onClick: () => commit({ temp: clampTemp(state.temp - 1) }, "apply"),
										className: "grid size-12 place-items-center rounded-full bg-wall text-ink shadow-key disabled:opacity-40",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "size-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: `font-serif text-7xl leading-none tabular-nums ${accentClass(state.mode, true)}`,
										children: [state.temp, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-4xl",
											children: "°"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-label": "Subir un grado",
										disabled: state.temp >= 30,
										onClick: () => commit({ temp: clampTemp(state.temp + 1) }, "apply"),
										className: "grid size-12 place-items-center rounded-full bg-wall text-ink shadow-key disabled:opacity-40",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-5" })
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								role: "radiogroup",
								"aria-label": "Modo",
								className: "mt-4 grid grid-cols-5 gap-1.5",
								children: MODES.map((mode) => {
									const selected = state.mode === mode.id;
									const Icon = mode.icon;
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										role: "radio",
										"aria-checked": selected,
										onClick: () => commit({ mode: mode.id }, "apply"),
										className: `flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs ${selected ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
											className: "size-4",
											strokeWidth: 1.75
										}), mode.label]
									}, mode.id);
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 px-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mb-2 text-xs tracking-wide text-muted uppercase",
									children: "Ventilador"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									role: "radiogroup",
									"aria-label": "Velocidad",
									className: "grid grid-cols-4 gap-1 rounded-full bg-wall p-1",
									children: FANS.map((fan) => {
										const selected = state.fan === fan.id;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											role: "radio",
											"aria-checked": selected,
											onClick: () => commit({ fan: fan.id }, "apply"),
											className: `h-11 rounded-full text-sm ${selected ? "bg-ink text-cream" : "text-ink"}`,
											children: fan.label
										}, fan.id);
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 grid grid-cols-3 gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Swing",
										pressed: state.swing,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Wind, { className: "size-4" }),
										onClick: () => commit({ swing: !state.swing }, "swing")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Turbo",
										pressed: state.turbo,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "size-4" }),
										onClick: () => commit({ turbo: !state.turbo }, "turbo")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Luz",
										pressed: state.light,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lightbulb, { className: "size-4" }),
										onClick: () => commit({ light: !state.light }, "light")
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Sueño",
										pressed: state.sleep,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-4" }),
										onClick: () => commit({ sleep: !state.sleep }, "sleep")
									}),
									state.protocol === "midea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Eco",
										pressed: state.eco,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Droplets, { className: "size-4" }),
										onClick: () => commit({ eco: !state.eco }, "eco")
									}) : null,
									state.protocol === "midea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chip, {
										label: "Silencio",
										pressed: state.quiet,
										icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(VolumeX, { className: "size-4" }),
										onClick: () => commit({ quiet: !state.quiet }, state.quiet ? "quiet-off" : "quiet-on")
									}) : null
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => commit({}, "apply", true),
								className: "mt-4 flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm text-cream",
								children: "Disparar infrarrojo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-3 px-2 text-center text-xs text-pretty text-muted",
								"aria-live": "polite",
								children: status
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 px-2 text-center font-sans text-xs tracking-wide text-ink/70 tabular-nums",
								children: [
									code ? formatCode(code) : "—",
									" · 38 kHz · ",
									state.protocol === "midea" ? "Midea" : "Coolix"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "rounded-3xl bg-cream/70 p-4 shadow-key",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm",
									children: "Protocolo"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-2 gap-1 rounded-full bg-wall p-1",
									children: ["midea", "coolix"].map((protocol) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										"aria-pressed": state.protocol === protocol,
										onClick: () => setState((current) => ({
											...current,
											protocol
										})),
										className: `h-11 rounded-full px-4 text-sm ${state.protocol === protocol ? "bg-ink text-cream" : "text-ink"}`,
										children: protocol === "midea" ? "Midea" : "Coolix"
									}, protocol))
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-2 text-xs text-pretty text-muted",
								children: "Casi todos los minisplit Mabe hablan Midea. Si el equipo no reacciona, pasa a Coolix y dispara otra vez."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "mt-4 flex items-center justify-between gap-3 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Enviar al tocar" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									role: "switch",
									"aria-checked": state.instant,
									onClick: () => setState((current) => ({
										...current,
										instant: !current.instant
									})),
									className: `relative h-7 w-12 rounded-full ${state.instant ? "bg-ink" : "bg-line"}`,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `absolute top-0.5 size-6 rounded-full bg-cream transition-transform ${state.instant ? "translate-x-5" : "translate-x-0.5"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "sr-only",
										children: "Enviar al tocar"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setSheet(true),
								className: "mt-4 text-sm text-lagoon underline decoration-lagoon/40 underline-offset-4",
								children: "Instalar el puente del Redmi"
							})
						]
					})
				]
			}),
			sheet ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-40 flex items-end justify-center bg-ink/40 p-3 sm:items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					role: "dialog",
					"aria-modal": "true",
					"aria-labelledby": "bridge-title",
					className: "w-full max-w-md rounded-3xl bg-cream p-5 shadow-card",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							id: "bridge-title",
							className: "font-serif text-2xl text-balance",
							children: "El LED necesita un puente"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-pretty text-muted",
							children: "Android no deja que una página encienda el infrarrojo. Cariño IR es una app minúscula: recibe el código que arma Rust y lo dispara con el emisor del Note 14 Pro."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", {
							className: "mt-4 list-decimal space-y-2 pl-5 text-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Descarga e instala el puente." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Si HyperOS pregunta, permite instalar de esta fuente." }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "Vuelve, apunta la parte de arriba del teléfono al Mabe y toca Disparar." })
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							href: "/carino-ir.apk",
							download: "carino-ir.apk",
							className: "mt-5 flex h-12 items-center justify-center rounded-full bg-ink text-sm text-cream",
							children: "Descargar puente"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setSheet(false),
							className: "mt-2 flex h-11 w-full items-center justify-center text-sm text-muted",
							children: "Ahora no"
						})
					]
				})
			}) : null
		]
	});
}
function Chip({ label, pressed, icon, onClick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		"aria-pressed": pressed,
		onClick,
		className: `flex h-11 items-center justify-center gap-1.5 rounded-full text-sm ${pressed ? "bg-ink text-cream" : "bg-wall text-ink shadow-key"}`,
		children: [icon, label]
	});
}
function WallUnit({ state }) {
	const airflow = state.power && state.fan !== "auto" ? state.fan === "high" ? "0.7s" : state.fan === "med" ? "1.1s" : "1.6s" : "1.8s";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "px-2",
		"aria-hidden": "true",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-t-3xl rounded-b-xl bg-cream px-4 pt-4 pb-3 shadow-card",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: "Mabe"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: `font-serif text-3xl leading-none tabular-nums ${accentClass(state.mode, state.power)}`,
						children: state.power ? `${state.temp}°` : "–"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "grille mt-3 h-9 rounded-md" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "unit-well mt-1",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "louver",
						"data-open": state.power ? "true" : "false",
						"data-swing": state.power && state.swing ? "true" : "false"
					})
				})
			]
		}), state.power ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-8 mt-2 flex justify-center gap-3",
			children: [
				0,
				1,
				2
			].map((index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `air h-8 w-6 rounded-full ${state.mode === "heat" ? "bg-heat/30" : "bg-lagoon/30"}`,
				style: {
					animationDelay: `${index * .18}s`,
					animationDuration: airflow
				}
			}, index))
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8" })]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RemoteApp, {});
}
//#endregion
export { Home as component };
