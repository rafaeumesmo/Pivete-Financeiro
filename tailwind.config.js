import colors from "tailwindcss/colors";

// Tema claro/escuro por variáveis CSS (data-theme no <html>, ver lib/theme.js).
//
// Tokens semânticos (use estes em código novo):
//   page, surface, line, tile, stack, nav  → fundos e bordas
//   fg, fg-2, fg-3                          → texto primário/secundário/terciário
//   brand, brand-hover, brand-ink           → cor de marca (fundo / hover / texto sobre fundo neutro)
//   on-brand                                → texto/ícone sobre fundo de marca (branco nos dois temas)
//   pos, neg, warn                          → só pra valores e status
//
// Legado: o app foi escrito pro escuro com "white/xx" como tinta; aqui "white"
// vira a tinta do tema (branca no escuro, quase preta no claro) e os tons
// claros de cor (100–400) escurecem no tema claro. Por isso NUNCA use
// text-white sobre fundo de marca — use text-on-brand.
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const TOKENS = {
  page:          { claro: "#F4F5F7", escuro: "#111114" },
  surface:       { claro: "#FFFFFF", escuro: "#1A1B21" },
  line:          { claro: "#E6E8EC", escuro: "#2A2C33" },
  tile:          { claro: "#EEF1F6", escuro: "#24262E" },
  stack:         { claro: "#E6E8EC", escuro: "#2A2C33" },
  nav:           { claro: "#111318", escuro: "#24262E" },
  fg:            { claro: "#111318", escuro: "#F3F4F6" },
  "fg-2":        { claro: "#6B7280", escuro: "#9CA3AF" },
  "fg-3":        { claro: "#9CA3AF", escuro: "#6B7280" },
  brand:         { claro: "#1F3FD6", escuro: "#1F3FD6" },
  "brand-hover": { claro: "#1A35B5", escuro: "#2E4FE6" },
  "brand-ink":   { claro: "#1F3FD6", escuro: "#8FA2FF" },
  "on-brand":    { claro: "#FFFFFF", escuro: "#FFFFFF" },
  pos:           { claro: "#16A34A", escuro: "#22C55E" },
  neg:           { claro: "#DC2626", escuro: "#EF4444" },
  warn:          { claro: "#D97706", escuro: "#F59E0B" },
};

// Superfícies legadas: agora apontam pros mesmos valores dos tokens.
const SUPERFICIES = {
  app:     { escuro: "#111114", claro: "#F4F5F7" },
  deep:    { escuro: "#0d0d0f", claro: "#EEF1F6" },
  sheet:   { escuro: "#1A1B21", claro: "#FFFFFF" },
  sidebar: { escuro: "#1A1B21", claro: "#FFFFFF" },
  raised:  { escuro: "#24262E", claro: "#FFFFFF" },
};
const INK = { escuro: "#F3F4F6", claro: "#111318" };

const MATIZES = ["red", "emerald", "amber", "orange", "blue", "purple", "sky", "yellow"];
const TONS = [100, 200, 300, 400];
// Tom equivalente no claro: os amarelados/verdes precisam escurecer mais.
const TOM_CLARO = (m, t) => (t <= 200 ? 800 : t === 300 || ["emerald", "amber", "yellow", "orange", "sky"].includes(m) ? 700 : 600);

const vars = (tema) => {
  const out = { "--ink": rgb(INK[tema]) };
  for (const [k, c] of Object.entries(TOKENS)) out[`--${k}`] = rgb(c[tema]);
  for (const [k, c] of Object.entries(SUPERFICIES)) out[`--${k}`] = rgb(c[tema]);
  for (const m of MATIZES) for (const t of TONS) out[`--${m}-${t}`] = rgb(colors[m][tema === "escuro" ? t : TOM_CLARO(m, t)]);
  return out;
};

const matizes = Object.fromEntries(MATIZES.map((m) => [m, { ...colors[m], ...Object.fromEntries(TONS.map((t) => [t, v(`${m}-${t}`)])) }]));

// Fundos sólidos coloridos legados (toasts, botões antigos) continuam com
// texto claro no tema claro: dentro deles vale a paleta do escuro.
const SOLIDOS = [
  "bg-[#2563eb]", "bg-[#2563eb]/90", "bg-[#7c3aed]", "bg-blue-500", "bg-blue-600/90",
  "bg-emerald-500", "bg-emerald-600", "bg-emerald-600/90", "bg-red-500", "bg-red-600/90",
  "bg-amber-500", "bg-amber-600/90",
].map((c) => "." + c.replace(/[[\]#/.]/g, "\\$&"));
const SUPERFICIE_SEL = [...Object.keys(SUPERFICIES), "surface", "page"].map((k) => `.bg-${k}`);

// Única sombra permitida.
const SHADOW = "0 1px 2px rgba(16,24,40,.06)";

export default {
  content: ["./index.html", "./*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    // Raios: sm 6 · md 8 (botões, inputs, tiles) · lg 12 (cards) · full só
    // pra avatar e botões circulares do swipe. xl/2xl/3xl ficam presos em
    // 12px até a varredura final removê-los.
    borderRadius: {
      none: "0", sm: "6px", DEFAULT: "6px", md: "8px", lg: "12px",
      xl: "12px", "2xl": "12px", "3xl": "12px", full: "9999px",
    },
    boxShadow: {
      none: "none", sm: SHADOW, DEFAULT: SHADOW, md: SHADOW, lg: SHADOW, xl: SHADOW, "2xl": SHADOW, inner: "none",
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans Variable"', '"Plus Jakarta Sans"', "system-ui", "-apple-system", '"Segoe UI"', "sans-serif"],
      },
      colors: {
        white: v("ink"),
        ...Object.fromEntries(Object.keys(TOKENS).map((k) => [k, v(k)])),
        ...Object.fromEntries(Object.keys(SUPERFICIES).map((k) => [k, v(k)])),
        ...matizes,
      },
    },
  },
  plugins: [
    ({ addBase }) => addBase({
      ":root": vars("escuro"),
      [`[data-theme="light"], [data-theme="light"] :is(${SUPERFICIE_SEL.join(", ")})`]: vars("claro"),
      [`[data-theme="light"] :is(.tema-escuro, ${SOLIDOS.join(", ")})`]: vars("escuro"),
    }),
  ],
};
