import colors from "tailwindcss/colors";

// Tema claro/escuro por variáveis CSS (data-theme no <html>, ver lib/theme.js).
// O app foi escrito pro escuro com "white/xx" como tinta; aqui "white" vira a
// tinta do tema (branca no escuro, quase preta no claro), as superfícies viram
// tokens e os tons claros de cor (100–400, usados como texto) escurecem no
// tema claro pra manter contraste. Branco de verdade: bg-[#fff].
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

const SUPERFICIES = {
  app:     { escuro: "#111114", claro: "#f4f5f7" },
  deep:    { escuro: "#0d0d0f", claro: "#e9ebf0" },
  sheet:   { escuro: "#18191f", claro: "#ffffff" },
  sidebar: { escuro: "#18181c", claro: "#ffffff" },
  raised:  { escuro: "#1f2027", claro: "#ffffff" },
};
const INK = { escuro: "#ffffff", claro: "#111114" };

const MATIZES = ["red", "emerald", "amber", "orange", "blue", "purple", "sky", "yellow"];
const TONS = [100, 200, 300, 400];
// Tom equivalente no claro: os amarelados/verdes precisam escurecer mais.
const TOM_CLARO = (m, t) => (t <= 200 ? 800 : t === 300 || ["emerald", "amber", "yellow", "orange", "sky"].includes(m) ? 700 : 600);

const vars = (tema) => {
  const out = { "--ink": rgb(INK[tema]) };
  for (const [k, c] of Object.entries(SUPERFICIES)) out[`--${k}`] = rgb(c[tema]);
  for (const m of MATIZES) for (const t of TONS) out[`--${m}-${t}`] = rgb(colors[m][tema === "escuro" ? t : TOM_CLARO(m, t)]);
  return out;
};

const matizes = Object.fromEntries(MATIZES.map((m) => [m, { ...colors[m], ...Object.fromEntries(TONS.map((t) => [t, v(`${m}-${t}`)])) }]));

// Fundos sólidos coloridos (botões, toasts, cards de swipe) continuam com
// texto claro no tema claro: dentro deles vale a paleta do escuro.
const SOLIDOS = [
  "bg-[#2563eb]", "bg-[#2563eb]/90", "bg-[#7c3aed]", "bg-blue-500", "bg-blue-600/90",
  "bg-emerald-500", "bg-emerald-600", "bg-emerald-600/90", "bg-red-500", "bg-red-600/90",
  "bg-amber-500", "bg-amber-600/90",
].map((c) => "." + c.replace(/[[\]#/.]/g, "\\$&"));
const SUPERFICIE_SEL = Object.keys(SUPERFICIES).map((k) => `.bg-${k}`);

export default {
  content: ["./index.html", "./*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        white: v("ink"),
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
