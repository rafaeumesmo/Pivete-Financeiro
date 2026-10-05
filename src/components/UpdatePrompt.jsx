import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";
import { ICON_STROKE } from "../lib/icons.js";
import { APP_NAME } from "../config.js";

// Deploy novo → sw.js novo com outro precache. O SW novo fica esperando até a
// pessoa tocar em Atualizar (aí ele assume e a página recarrega com o build
// novo), pra não recarregar no meio de um lançamento. Como PWA instalado pode
// ficar dias aberto, procura versão nova a cada hora e sempre que o app volta
// pra frente.
const UMA_HORA = 60 * 60 * 1000;

export function UpdatePrompt() {
  const { needRefresh: [temVersaoNova, setTemVersaoNova], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const checar = () => { if (navigator.onLine) reg.update().catch(() => {}); };
      setInterval(checar, UMA_HORA);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checar(); });
    },
  });

  if (!temVersaoNova) return null;
  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-32px)] max-w-sm flex items-center gap-3 pl-4 pr-2 py-2 rounded-md bg-nav text-on-nav text-sm shadow"
      style={{ top: "max(env(safe-area-inset-top), 16px)" }}
    >
      <span className="flex-1 min-w-0">Saiu versão nova do {APP_NAME}.</span>
      <button type="button" onClick={() => updateServiceWorker(true)} className="inline-flex items-center gap-1.5 rounded-md bg-brand text-on-brand px-3 py-1.5 text-[13px] font-semibold hover:bg-brand-hover transition">
        <RefreshCw size={14} strokeWidth={ICON_STROKE} aria-hidden />Atualizar
      </button>
      <button type="button" onClick={() => setTemVersaoNova(false)} aria-label="Depois" className="w-8 h-8 rounded-md flex items-center justify-center opacity-70 hover:opacity-100 transition">
        <X size={16} strokeWidth={ICON_STROKE} aria-hidden />
      </button>
    </div>
  );
}
