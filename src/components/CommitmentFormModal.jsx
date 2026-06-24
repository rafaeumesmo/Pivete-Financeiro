import { useState } from "react";
import { motion } from "framer-motion";
import { DAY_LABELS } from "../lib/commitments";

const CATEGORIES = ["Saúde", "Alimentação", "Estudos", "Trabalho", "Lazer"];
const ONBOARDING_GRADIENTS = {
  Alimentação: { gradient: "from-orange-600 via-red-600 to-rose-700",     accent: "#f97316" },
  Lazer:       { gradient: "from-violet-700 via-purple-700 to-indigo-800", accent: "#8b5cf6" },
  Saúde:       { gradient: "from-emerald-600 via-teal-600 to-cyan-700",    accent: "#10b981" },
  Estudos:     { gradient: "from-blue-600 via-sky-600 to-cyan-600",        accent: "#3b82f6" },
  Trabalho:    { gradient: "from-amber-600 via-yellow-600 to-orange-500",  accent: "#f59e0b" },
};

const TYPE_OPTIONS = [
  { v: "weekdays",      label: "Dias da semana",  desc: "Escolho quais dias" },
  { v: "interval",      label: "Intervalo",        desc: "A cada N dias" },
  { v: "weekdays_only", label: "Dias úteis",       desc: "Seg a Sex" },
  { v: "weekend",       label: "Fim de semana",    desc: "Sáb e Dom" },
  { v: "event",         label: "Evento único",     desc: "Uma data específica" },
];

export function CommitmentFormModal({ initial = null, onSave, onClose, isDesktop }) {
  const editing = !!initial;
  const [title,        setTitle]       = useState(initial?.title || "");
  const [emoji,        setEmoji]       = useState(initial?.emoji || "🎯");
  const [category,     setCategory]    = useState(initial?.category || "Saúde");
  const [type,         setType]        = useState(initial?.type || "weekdays");
  const [weekdays,     setWeekdays]    = useState(initial?.weekdays || [1, 3, 5]);
  const [intervalDays, setIntervalDays]= useState(initial?.intervalDays || 2);
  const [eventDate,    setEventDate]   = useState(initial?.eventDate || "");
  const [showBefore,   setShowBefore]  = useState(initial?.showBeforeDays ?? 7);
  const [time,         setTime]        = useState(initial?.time || "");
  const [reminder,     setReminder]    = useState(initial?.reminder ?? false);
  const [error,        setError]       = useState("");

  function toggleWeekday(dow) {
    setWeekdays(prev =>
      prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow].sort((a, b) => a - b)
    );
  }

  function handleSave() {
    if (!title.trim()) { setError("Dê um título ao compromisso."); return; }
    if (type === "weekdays" && weekdays.length === 0) { setError("Escolha pelo menos 1 dia."); return; }
    if (type === "event" && !eventDate) { setError("Escolha a data do evento."); return; }
    const g = ONBOARDING_GRADIENTS[category] || { gradient: "from-blue-600 via-sky-600 to-cyan-600", accent: "#2563eb" };
    onSave({
      ...(initial || {}),
      title: title.trim(),
      emoji,
      category,
      gradient: g.gradient,
      accent: g.accent,
      type,
      weekdays: type === "weekdays" ? weekdays : [],
      intervalDays: type === "interval" ? Math.max(1, intervalDays) : 1,
      eventDate: type === "event" ? eventDate : null,
      showBeforeDays: showBefore,
      time: time || null,
      reminder,
      paused: initial?.paused ?? false,
      createdAt: initial?.createdAt || new Date().toISOString(),
    });
  }

  return (
    <div
      className={`fixed inset-0 z-[80] flex bg-black/70 backdrop-blur-sm px-4 ${isDesktop ? "items-center justify-center" : "items-end"}`}
      style={{ paddingBottom: isDesktop ? 0 : "max(env(safe-area-inset-bottom), 16px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: isDesktop ? 0 : 40, scale: isDesktop ? 0.97 : 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: isDesktop ? 0 : 40 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#18191f] rounded-3xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0 border-b border-white/[0.06]">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-blue-400/70 mb-0.5">Compromisso recorrente</p>
            <h2 className="text-base font-bold text-white">{editing ? "Editar compromisso" : "Novo compromisso"}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center text-white/40 hover:text-white transition">✕</button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">

          {/* Title + Emoji */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Título</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Academia, Pilates, Ler..."
                autoFocus
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-[#2563eb]/60 transition"
              />
            </div>
            <div className="w-16">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Emoji</label>
              <input
                value={emoji}
                onChange={e => setEmoji(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-1 py-2.5 text-center text-xl text-white outline-none focus:border-[#2563eb]/60 transition"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Categoria</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563eb]/60"
            >
              {CATEGORIES.map(c => <option key={c} value={c} className="bg-[#18191f]">{c}</option>)}
            </select>
          </div>

          {/* Frequency type */}
          <div>
            <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Frequência</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setType(o.v)}
                  className={`p-2.5 rounded-xl border text-left transition ${type === o.v ? "bg-[#2563eb]/15 border-[#2563eb]/40" : "bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.06]"}`}
                >
                  <p className={`text-[12px] font-semibold ${type === o.v ? "text-[#93c5fd]" : "text-white/60"}`}>{o.label}</p>
                  <p className="text-[10px] text-white/25 mt-0.5">{o.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Weekday picker */}
          {type === "weekdays" && (
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-2">Dias da semana</label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, dow) => (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleWeekday(dow)}
                    className={`flex-1 h-9 rounded-xl text-[11px] font-semibold border transition ${
                      weekdays.includes(dow)
                        ? "bg-[#2563eb] border-[#2563eb] text-white"
                        : "bg-white/[0.04] border-white/[0.08] text-white/35 hover:border-white/20"
                    }`}
                  >
                    {label.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interval picker */}
          {type === "interval" && (
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Repetir a cada quantos dias?</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setIntervalDays(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.10] transition text-xl leading-none">−</button>
                <span className="flex-1 text-center text-3xl font-bold text-white">{intervalDays}</span>
                <button type="button" onClick={() => setIntervalDays(v => Math.min(30, v + 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.10] transition text-xl leading-none">+</button>
              </div>
              <p className="text-[11px] text-white/25 text-center mt-1">
                {intervalDays === 1 ? "Todo dia" : intervalDays === 2 ? "Dias alternados" : `A cada ${intervalDays} dias`}
              </p>
            </div>
          )}

          {/* Event pickers */}
          {type === "event" && (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Data do evento</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563eb]/60 transition [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Aparecer quantos dias antes?</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setShowBefore(v => Math.max(1, v - 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.10] transition text-xl leading-none">−</button>
                  <span className="flex-1 text-center text-3xl font-bold text-white">{showBefore}</span>
                  <button type="button" onClick={() => setShowBefore(v => Math.min(30, v + 1))} className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.09] text-white/70 hover:bg-white/[0.10] transition text-xl leading-none">+</button>
                </div>
                <p className="text-[11px] text-white/25 text-center mt-1">{showBefore} {showBefore === 1 ? "dia" : "dias"} antes do evento</p>
              </div>
            </div>
          )}

          {/* Time + Reminder */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Horário (opcional)</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.05] px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#2563eb]/60 transition [color-scheme:dark]"
              />
            </div>
            <div className="w-28 flex-shrink-0">
              <label className="block text-[10px] font-semibold tracking-widest uppercase text-white/30 mb-1.5">Lembrete</label>
              <button
                type="button"
                onClick={() => setReminder(v => !v)}
                className={`w-full h-[42px] rounded-xl border flex items-center justify-center gap-1.5 text-sm font-medium transition ${reminder ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-white/[0.04] border-white/[0.08] text-white/35 hover:text-white/55"}`}
              >
                🔔 {reminder ? "On" : "Off"}
              </button>
            </div>
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 pb-5 pt-3 border-t border-white/[0.06]">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-sm font-semibold text-white hover:bg-blue-500 transition"
          >
            {editing ? "Salvar alterações" : "Criar compromisso"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
