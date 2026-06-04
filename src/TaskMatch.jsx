import { useState, useRef, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from "framer-motion";

const INITIAL_TASKS = [
  {
    id: 1,
    title: "Pedir Pizza",
    description: "Todo mundo tá com fome. Escolher sabores e fazer o pedido até às 19h.",
    category: "Alimentação",
    emoji: "🍕",
    gradient: "from-orange-600 via-red-600 to-rose-700",
    accent: "#f97316",
  },
  {
    id: 2,
    title: "Ver Filme",
    description: "Dune: Parte 2 ou Oppenheimer? Alguém escolhe, a gente vai junto.",
    category: "Lazer",
    emoji: "🎬",
    gradient: "from-violet-700 via-purple-700 to-indigo-800",
    accent: "#8b5cf6",
  },
  {
    id: 3,
    title: "Academia",
    description: "Treino de pernas marcado pra terça às 7h. Confirmar presença.",
    category: "Saúde",
    emoji: "💪",
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    accent: "#10b981",
  },
  {
    id: 4,
    title: "Estudar IHC",
    description: "Revisar heurísticas de Nielsen antes da apresentação de quinta.",
    category: "Estudos",
    emoji: "📖",
    gradient: "from-blue-600 via-sky-600 to-cyan-600",
    accent: "#3b82f6",
  },
  {
    id: 5,
    title: "Reunião de Equipe",
    description: "Sprint planning semanal. Preparar card de bloqueios e progresso.",
    category: "Trabalho",
    emoji: "🗓️",
    gradient: "from-amber-600 via-yellow-600 to-orange-500",
    accent: "#f59e0b",
  },
];

const SWIPE_THRESHOLD = 100;
const SWIPE_UP_THRESHOLD = -80;

function SwipeCard({ task, onSwipe, isTop, stackIndex }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateZ = useTransform(x, [-200, 200], [-18, 18]);

  const greenOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const redOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const blueOpacity = useTransform(y, [SWIPE_UP_THRESHOLD, 0], [1, 0]);

  const scale = isTop ? 1 : 1 - stackIndex * 0.04;
  const translateY = isTop ? 0 : stackIndex * 12;
  const opacity = isTop ? 1 : 1 - stackIndex * 0.15;

  function handleDragEnd(_, info) {
    const vx = info.velocity.x;
    const vy = info.velocity.y;
    const ox = info.offset.x;
    const oy = info.offset.y;

    if (oy < SWIPE_UP_THRESHOLD || vy < -500) {
      onSwipe("up", task);
    } else if (ox > SWIPE_THRESHOLD || vx > 600) {
      onSwipe("right", task);
    } else if (ox < -SWIPE_THRESHOLD || vx < -600) {
      onSwipe("left", task);
    } else {
      animate(x, 0, { type: "spring", stiffness: 300, damping: 20 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 20 });
    }
  }

  if (!isTop) {
    return (
      <motion.div
        className="absolute inset-0 mx-auto"
        style={{
          scale,
          y: translateY,
          opacity,
          zIndex: 10 - stackIndex,
          width: "100%",
          originY: 1,
        }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
      >
        <div
          className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} shadow-2xl`}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0 mx-auto cursor-grab active:cursor-grabbing"
      style={{ x, y, rotateZ, zIndex: 20, width: "100%" }}
      drag
      dragConstraints={{ top: -300, bottom: 150, left: -300, right: 300 }}
      dragElastic={0.12}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: x.get() > 0 ? 500 : x.get() < 0 ? -500 : 0,
        y: y.get() < 0 ? -500 : 0,
        opacity: 0,
        transition: { duration: 0.28, ease: "easeOut" },
      }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className={`w-full h-full rounded-3xl bg-gradient-to-br ${task.gradient} overflow-hidden shadow-2xl relative select-none`}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-5 left-5 z-10">
          <span className="text-[10px] font-semibold tracking-widest uppercase bg-white/20 backdrop-blur-sm text-white/90 px-3 py-1 rounded-full border border-white/20">
            {task.category}
          </span>
        </div>

        <div className="absolute top-5 right-5 z-10 text-4xl filter drop-shadow-lg">
          {task.emoji}
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2 leading-tight">
            {task.title}
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">{task.description}</p>
        </div>

        <motion.div
          className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none"
          style={{ backgroundColor: "rgba(22, 163, 74, 0.55)", opacity: greenOpacity }}
        >
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[-20deg]">
            <span className="text-white font-black text-2xl tracking-widest uppercase">Aceito!</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none"
          style={{ backgroundColor: "rgba(220, 38, 38, 0.55)", opacity: redOpacity }}
        >
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2 rotate-[20deg]">
            <span className="text-white font-black text-2xl tracking-widest uppercase">Depois</span>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-3xl flex items-center justify-center z-30 pointer-events-none"
          style={{ backgroundColor: "rgba(37, 99, 235, 0.6)", opacity: blueOpacity }}
        >
          <div className="border-[3px] border-white/90 rounded-xl px-5 py-2">
            <span className="text-white font-black text-2xl tracking-widest uppercase">Delegar ↑</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ActionButtons({ onAction, disabled }) {
  const buttons = [
    {
      id: "left",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      color: "border-red-500/50 text-red-400 hover:bg-red-500/10 hover:border-red-400",
      label: "Depois",
      size: "w-14 h-14",
    },
    {
      id: "up",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
        </svg>
      ),
      color: "border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:border-blue-400",
      label: "Delegar",
      size: "w-12 h-12",
    },
    {
      id: "right",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ),
      color: "border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-400",
      label: "Aceitar",
      size: "w-14 h-14",
    },
  ];

  return (
    <div className="flex items-center justify-center gap-5">
      {buttons.map((btn) => (
        <motion.button
          key={btn.id}
          onClick={() => !disabled && onAction(btn.id)}
          disabled={disabled}
          className={`${btn.size} rounded-full border-2 flex flex-col items-center justify-center gap-1 transition-all duration-200 ${btn.color} disabled:opacity-30 disabled:cursor-not-allowed`}
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
        >
          {btn.icon}
        </motion.button>
      ))}
    </div>
  );
}

function Toast({ message, color, visible }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 20 }}
      className={`fixed bottom-32 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-semibold text-white shadow-xl pointer-events-none ${color}`}
    >
      {message}
    </motion.div>
  );
}

function EmptyState({ stats, onReset }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, type: "spring" }}
      className="flex flex-col items-center justify-center h-full px-8 text-center"
    >
      <div className="text-6xl mb-5">🎉</div>
      <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Deck Finalizado!</h3>
      <p className="text-white/40 text-sm mb-8 leading-relaxed">Suas decisões foram registradas.</p>
      <div className="flex gap-4 mb-8">
        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <span className="text-2xl font-bold text-emerald-400">{stats.accepted}</span>
          <span className="text-xs text-white/40 mt-0.5">Aceitos</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <span className="text-2xl font-bold text-red-400">{stats.rejected}</span>
          <span className="text-xs text-white/40 mt-0.5">Depois</span>
        </div>
        <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
          <span className="text-2xl font-bold text-blue-400">{stats.shared}</span>
          <span className="text-xs text-white/40 mt-0.5">Delegados</span>
        </div>
      </div>
      <motion.button
        onClick={onReset}
        className="w-full py-3.5 rounded-2xl bg-[#2563eb] text-white font-semibold text-sm tracking-wide hover:bg-blue-500 transition-colors"
        whileTap={{ scale: 0.97 }}
      >
        Recomeçar deck
      </motion.button>
    </motion.div>
  );
}

export default function TaskMatch() {
  const [tasks, setTasks] = useState([...INITIAL_TASKS]);
  const [stats, setStats] = useState({ accepted: 0, rejected: 0, shared: 0 });
  const [sharedHistory, setSharedHistory] = useState([]);
  const [toast, setToast] = useState({ visible: false, message: "", color: "" });
  const [activeTab, setActiveTab] = useState("home");
  const [profile, setProfile] = useState({
    name: "Seu Nome",
    handle: "@taskmatch",
    avatar: "👤",
  });
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const profileEmojis = ["😎", "🚀", "⚡", "🎯", "🔥", "💡", "🧠", "✅", "🏆", "👾"];
  const shareRecipientSamples = [
    [
      { name: "Fulano", accepted: true },
      { name: "Ciclano", accepted: true },
      { name: "Deutrano", accepted: false },
    ],
    [
      { name: "Ana", accepted: true },
      { name: "Bruno", accepted: false },
      { name: "Caio", accepted: true },
    ],
    [
      { name: "Lívia", accepted: true },
      { name: "Marina", accepted: true },
      { name: "Pedro", accepted: false },
    ],
  ];

  const tabs = [
    { id: "home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", label: "Início" },
    { id: "explore", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0", label: "Explorar" },
    { id: "ia", icon: "M13 10V3L4 14h7v7l9-11h-7z", label: "RAF" },
    { id: "profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", label: "Perfil" },
  ];

  const tabInfo = {
    explore: {
      emoji: "🔍",
      title: "Explorar tarefas",
      description: "Em breve você verá tarefas inspiradoras e sugestões para o seu deck.",
    },
    ia: {
      emoji: "⚡",
      title: "RAF - Assistente IA",
      description: "Chat inteligente para ajudar com suas tarefas e decisões.",
    },
    profile: {
      emoji: "👤",
      title: "Perfil",
      description: "Gerencie seu perfil e suas preferências dentro do app.",
    },
  };

  const STORAGE_KEY = "taskmatch_raf_history";
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: "raf", text: "RAF online. Fala o que precisa." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  const rafSystemPrompt = `Você é o RAF (Rapid Action Filter), assistente de produtividade do app TaskMatch.
O app funciona com swipe de tarefas estilo Tinder: swipe right = fazer, swipe left = ignorar.

Sua personalidade:
- Respostas sempre curtas (máximo 2 frases)
- Tom sarcástico e direto, nunca cruel
- Sem bajulação, sem exclamação, sem emojis
- Nunca comece com "Claro!", "Ótimo!" ou similares
- Sempre do lado do usuário, mas sem papas na língua

Você pode ajudar com:
- Priorizar tarefas
- Decidir o que fazer agora
- Analisar produtividade
- Criar novas tarefas para o deck

Quando o usuário não souber o que fazer, sugira algo concreto e curto.`;

  const quickActions = [
    { label: "Priorizar tarefas", prompt: "Me ajuda a priorizar minhas tarefas de hoje" },
    { label: "O que fazer agora?", prompt: "O que eu devo fazer agora?" },
    { label: "Criar tarefa", prompt: "Quero criar uma nova tarefa" },
  ];

  const showQuickActions = chatInput.trim() === "";

  function openProfileEditor() {
    setEditedProfile(profile);
    setShowProfileEditor(true);
  }

  function closeProfileEditor() {
    setShowProfileEditor(false);
  }

  function saveProfileEdits() {
    const name = editedProfile.name.trim() || profile.name;
    const rawHandle = editedProfile.handle.trim().replace(/^@+/, "");
    const handle = rawHandle ? `@${rawHandle}` : profile.handle;
    const avatar = editedProfile.avatar.trim() || profile.avatar;

    setProfile({
      ...profile,
      name,
      handle,
      avatar,
    });
    setShowProfileEditor(false);
  }

  function handleLogout() {
    if (window.confirm("Deseja sair do TaskMatch?")) {
      showToast("Logout não implementado.", "bg-red-600/90");
    }
  }

  function formatDeckContext(tasks) {
    if (!tasks.length) return "";

    const entries = tasks.map((task) => {
      const deadline = task.deadline || "sem prazo";
      const delay = task.delayCount ? `, adiada ${task.delayCount}x` : "";
      return `"${task.title}" (prazo: ${deadline}${delay})`;
    });

    return `[Tarefas atuais do deck: ${entries.join(", ")}]`;
  }

  useEffect(() => {
    if (activeTab === "ia") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, activeTab]);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 1024);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatMessages(parsed.slice(-50));
        }
      }
    } catch (error) {
      console.warn("Falha ao carregar histórico RAF", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chatMessages.slice(-50)));
    } catch (error) {
      console.warn("Falha ao salvar histórico RAF", error);
    }
  }, [chatMessages]);

  async function sendUserMessage(text) {
    if (!text || isChatLoading) return;

    const userMessage = {
      id: Date.now(),
      sender: "user",
      text,
    };

    const nextMessages = [...chatMessages, userMessage].slice(-50);
    setChatMessages(nextMessages);
    setChatInput("");
    setIsChatLoading(true);

    if (!tasks.length) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "raf",
          text: "Deck vazio. Cria alguma coisa pra fazer sentido usar o app.",
        },
      ].slice(-50));
      setIsChatLoading(false);
      return;
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "raf",
          text: "API key não configurada. Configure VITE_OPENAI_API_KEY.",
        },
      ].slice(-50));
      setIsChatLoading(false);
      return;
    }

    const deckContext = formatDeckContext(tasks);
    const userContent = `${deckContext}\nMensagem do usuário: ${text}`;
    const messages = [
      { role: "system", content: rafSystemPrompt },
      ...nextMessages.map((message) => ({
        role: message.sender === "user" ? "user" : "assistant",
        content: message.text,
      })),
      { role: "user", content: userContent },
    ];

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages,
          max_tokens: 120,
          temperature: 0.75,
        }),
      });

      const result = await response.json();
      const answer = result?.choices?.[0]?.message?.content?.trim();
      if (!answer) {
        throw new Error(result?.error?.message || "Resposta inválida da API");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "raf",
          text: answer,
        },
      ].slice(-50));
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 2,
          sender: "raf",
          text: "Não foi possível conectar ao RAF agora. Tente novamente.",
        },
      ].slice(-50));
    } finally {
      setIsChatLoading(false);
    }
  }

  function handleSendMessage(event) {
    event.preventDefault();
    sendUserMessage(chatInput.trim());
  }

  function handleQuickAction(prompt) {
    sendUserMessage(prompt);
  }

  const categoryOptions = [
    "Alimentação",
    "Lazer",
    "Saúde",
    "Estudos",
    "Trabalho",
    "Outros",
  ];

  const [newTaskData, setNewTaskData] = useState({
    title: "",
    description: "",
    category: "Alimentação",
    emoji: "✨",
  });
  const [nextTaskId, setNextTaskId] = useState(INITIAL_TASKS.length + 1);

  const total = INITIAL_TASKS.length;
  const remaining = tasks.length;
  const addedTasks = nextTaskId - INITIAL_TASKS.length - 1;
  const completedTasks = stats.accepted + stats.rejected + stats.shared;
  const progress = ((total - remaining) / total) * 100;

  function showToast(message, color) {
    setToast({ visible: true, message, color });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 1800);
  }

  async function handleSwipe(direction, task) {
    if (direction === "right") {
      setStats((s) => ({ ...s, accepted: s.accepted + 1 }));
      showToast("✓  Aceito!", "bg-emerald-600/90 backdrop-blur-md");
    } else if (direction === "left") {
      setStats((s) => ({ ...s, rejected: s.rejected + 1 }));
      showToast("×  Deixado pra depois", "bg-red-600/90 backdrop-blur-md");
    } else if (direction === "up") {
      setStats((s) => ({ ...s, shared: s.shared + 1 }));
      const recipients = shareRecipientSamples[task.id % shareRecipientSamples.length];
      setSharedHistory((prev) => [
        {
          id: task.id,
          title: task.title,
          description: task.description,
          recipients,
        },
        ...prev,
      ]);
      showToast("↑  Compartilhando...", "bg-blue-600/90 backdrop-blur-md");
      try {
        if (navigator.share) {
          await navigator.share({
            title: `TaskMatch: ${task.title}`,
            text: `Deleguei pra você: "${task.title}" — ${task.description}`,
            url: window.location.href,
          });
        }
      } catch {}
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  function handleReset() {
    setTasks([...INITIAL_TASKS]);
    setStats({ accepted: 0, rejected: 0, shared: 0 });
  }

  const topTask = tasks[tasks.length - 1];
  const cardHeight = isDesktop ? 420 : 360;
  const sidebarWidth = 280;

  return (
    <div className="min-h-screen w-full bg-[#111114]">
      {/* MOBILE LAYOUT (< 1024px) */}
      {!isDesktop && (
        <div className="mx-auto w-full max-w-full px-4 py-6">
          <div className="flex flex-col overflow-hidden bg-[#18181c] rounded-[32px]">
            <div className="flex items-center justify-between px-6 pt-4 pb-1 flex-shrink-0">
              <span className="text-xs font-semibold text-white/70">9:41</span>
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/60">
                  <path d="M1.5 8.5C5.5 4.5 12 2.5 17.5 4.5L19 3C13 .5 5 2.5.5 7L1.5 8.5ZM5.5 12.5C7.5 10.5 10 9.5 12.5 9.5S17.5 10.5 19.5 12.5L21 11C18.5 8.5 15.5 7.5 12.5 7.5S6.5 8.5 4 11L5.5 12.5ZM12 20L21.5 10.5L20 9C17 12 14.5 13 12 13S7 12 4 9L2.5 10.5L12 20Z" />
                </svg>
                <div className="w-5 h-2.5 border border-white/50 rounded-sm relative">
                  <div className="absolute inset-[1px] left-[1px] right-[3px] bg-white/70 rounded-sm" />
                  <div className="absolute right-[-3px] top-1/2 -translate-y-1/2 w-0.5 h-1 bg-white/40 rounded-r" />
                </div>
              </div>
            </div>

            <div className="px-6 pt-2 pb-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h1 className="text-xl font-black tracking-tight leading-none text-white">
                  Task<span style={{ color: "#2563eb" }}>Match</span>
                </h1>
                <p className="text-xs text-white/30 mt-0.5">Decida rápido, viva mais.</p>
              </div>
              <div className="flex gap-2">
                <button className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/50">
                    <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                <button className="w-8 h-8 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center" onClick={() => setActiveTab("create")}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>

            {remaining > 0 && (
              <div className="px-6 mb-3 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 font-medium">Deck pessoal</span>
                  <span className="text-xs text-white/30 bg-white/5 px-2.5 py-0.5 rounded-full">
                    {remaining} de {total} restantes
                  </span>
                </div>
                <div className="h-[2px] bg-white/6 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#2563eb] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-1 flex-col min-h-0 px-6 relative overflow-hidden">
              {activeTab === "home" ? (
                remaining > 0 ? (
                  <>
                    <div className="relative" style={{ height: cardHeight }}>
                      {tasks
                        .slice(-3)
                        .reverse()
                        .map((task, i, arr) => {
                          const isTop = i === 0;
                          const stackIndex = arr.length - 1 - i;
                          return (
                            <SwipeCard
                              key={task.id}
                              task={task}
                              isTop={isTop}
                              stackIndex={stackIndex}
                              onSwipe={handleSwipe}
                            />
                          );
                        })}
                    </div>

                    <div className="flex items-center justify-between px-2 mt-3 mb-4">
                      <div className="flex items-center gap-1.5 text-red-400/50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-[10px] font-medium tracking-wide uppercase">Depois</span>
                      </div>
                      <div className="flex flex-col items-center text-blue-400/50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                        </svg>
                        <span className="text-[10px] font-medium tracking-wide uppercase">Delegar</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400/50">
                        <span className="text-[10px] font-medium tracking-wide uppercase">Aceitar</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    <ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} />
                  </>
                ) : (
                  <EmptyState stats={stats} onReset={handleReset} />
                )
              ) : activeTab === "explore" ? (
                <motion.div
                  className="flex h-full flex-col px-4 py-6 overflow-hidden"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex-shrink-0 mb-5">
                    <div className="text-sm font-medium text-white/70 mb-4">Explorar</div>
                    <div className="text-lg font-semibold text-white">Delegações recentes</div>
                    <p className="text-sm text-white/50 mt-1">Veja para quem suas tarefas foram enviadas e como responderam.</p>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    {sharedHistory.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center rounded-[26px] bg-white/5 p-6 text-center text-white/60">
                        <div className="text-xl mb-3">Nada delegado ainda</div>
                        <p className="text-sm text-white/50">Use o gesto de delegar no deck para começar a ver o histórico aqui.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sharedHistory.map((item) => {
                          const acceptedNames = item.recipients.filter((r) => r.accepted).map((r) => r.name);
                          const refusedNames = item.recipients.filter((r) => !r.accepted).map((r) => r.name);
                          return (
                            <div key={`${item.id}-${item.title}`} className="rounded-[22px] bg-white/5 p-4 border border-white/10">
                              <div className="flex items-center justify-between mb-3 gap-3">
                                <div>
                                  <div className="text-[10px] uppercase tracking-[0.24em] text-white/40">Delegado</div>
                                  <div className="text-base font-semibold text-white mt-2">{item.title}</div>
                                </div>
                                <div className="rounded-2xl bg-[#111319] px-3 py-2 text-[12px] text-[#2563eb]">Histórico</div>
                              </div>
                              <div className="text-sm text-white/50">{item.description}</div>
                              <div className="mt-4 text-sm text-white/60 leading-relaxed">
                                {acceptedNames.length > 0 && <span>{acceptedNames.join(", ")} aceitaram</span>}
                                {acceptedNames.length > 0 && refusedNames.length > 0 && <span>, </span>}
                                {refusedNames.length > 0 && (
                                  <span>{refusedNames.join(", ")} recusou{refusedNames.length > 1 ? "ram" : ""}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : activeTab === "ia" ? (
                <motion.div
                  className="flex flex-1 flex-col min-h-0"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex-shrink-0 px-4 pt-4 pb-2">
                    <h2 className="text-sm font-medium text-white/70">RAF</h2>
                  </div>

                  <div className="flex flex-1 flex-col min-h-0 px-4 overflow-hidden">
                    <div className="flex h-full min-h-0 flex-col overflow-hidden">
                      <div
                        className="flex-1 min-h-0 overflow-y-auto"
                        style={{ WebkitOverflowScrolling: "touch" }}
                      >
                        <div className="px-2 pt-4 pb-24 space-y-2.5">
                          {chatMessages.map((message, index) => {
                            const isUser = message.sender === "user";
                            const previous = chatMessages[index - 1];
                            const showIcon = !isUser && (!previous || previous.sender !== "raf");

                            return (
                              <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div className={`flex ${isUser ? "justify-end" : "justify-start"} w-full`}>
                                  <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-2 items-start ${isUser ? "ml-auto" : "mr-auto"}`}>
                                    {!isUser && showIcon && (
                                      <div className="mt-1 text-[15px] text-white/70">⚡</div>
                                    )}
                                    <div
                                      className={`max-w-[78%] rounded-[18px] px-4 py-2.5 text-sm leading-relaxed ${
                                        isUser
                                          ? "bg-[#2979FF] text-white rounded-[18px] rounded-br-[4px]"
                                          : "bg-[#2A2A3A] text-[#E0E0E0] rounded-[18px] rounded-bl-[4px]"
                                      }`}
                                    >
                                      {message.text}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {isChatLoading && (
                            <div className="flex justify-start">
                              <div className="flex items-start gap-2 max-w-[78%]">
                                <div className="mt-1 text-[15px] text-white/70">⚡</div>
                                <div className="rounded-[18px] bg-[#2A2A3A] px-4 py-2.5 text-sm text-[#E0E0E0]">
                                  <div className="flex items-center gap-[6px]">
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/70 animate-pulse" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/70 animate-pulse delay-150" />
                                    <span className="h-2.5 w-2.5 rounded-full bg-white/70 animate-pulse delay-300" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div ref={chatEndRef} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    animate={{ opacity: showQuickActions ? 1 : 0, height: showQuickActions ? "auto" : 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-shrink-0 overflow-hidden"
                  >
                    <div
                      className="flex min-h-[56px] items-center overflow-x-auto px-4 py-2 gap-2 hide-scrollbar"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {quickActions.map((action) => (
                        <button
                          key={action.prompt}
                          type="button"
                          onClick={() => handleQuickAction(action.prompt)}
                          className="whitespace-nowrap rounded-[20px] border border-[rgba(255,255,255,0.15)] bg-transparent px-[14px] py-2 text-[13px] text-[#E0E0E0] transition hover:border-white/30 hover:text-white"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </motion.div>

                  <div className="flex-shrink-0 px-3 pb-3 pt-2 bg-[#18181c]/95 backdrop-blur-sm">
                    <form
                      onSubmit={handleSendMessage}
                      className="flex items-end gap-3 rounded-[24px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.07)] px-3 py-2"
                    >
                      <textarea
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        placeholder="Mensagem..."
                        disabled={isChatLoading}
                        rows={1}
                        className="flex-1 min-h-[44px] max-h-[144px] resize-none rounded-[24px] border-none bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || chatInput.trim() === ""}
                        className={`inline-flex h-12 w-12 items-center justify-center rounded-full transition ${
                          chatInput.trim() === "" ? "bg-white/10 text-white/40" : "bg-[#2979FF] text-white hover:bg-blue-500"
                        }`}
                      >
                        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M13 4l7 6-7 6" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </motion.div>
              ) : activeTab === "create" ? (
                <motion.form
                  className="space-y-5"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!newTaskData.title.trim() || !newTaskData.description.trim()) {
                      showToast("Preencha título e descrição.", "bg-red-600/90 backdrop-blur-md");
                      return;
                    }

                    const newTask = {
                      id: nextTaskId,
                      title: newTaskData.title.trim(),
                      description: newTaskData.description.trim(),
                      category: newTaskData.category,
                      emoji: newTaskData.emoji || "✨",
                      gradient: "from-sky-600 via-cyan-600 to-emerald-600",
                      accent: "#22c55e",
                    };

                    setTasks((prev) => [...prev, newTask]);
                    setNextTaskId((id) => id + 1);
                    setNewTaskData({ title: "", description: "", category: "Alimentação", emoji: "✨" });
                    showToast("Tarefa criada!", "bg-emerald-600/90 backdrop-blur-md");
                    setActiveTab("home");
                  }}
                >
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                    <div className="mb-4 text-center">
                      <div className="text-6xl mb-3">✍️</div>
                      <h2 className="text-2xl font-bold text-white">Criar nova tarefa</h2>
                      <p className="text-sm text-white/60 mt-2">Adicione um card novo para o seu deck.</p>
                    </div>

                    <label className="block text-white/70 text-xs uppercase tracking-[0.24em] mb-2">Título</label>
                    <input
                      value={newTaskData.title}
                      onChange={(event) => setNewTaskData((prev) => ({ ...prev, title: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Ex: Comprar mantimentos"
                    />

                    <label className="block text-white/70 text-xs uppercase tracking-[0.24em] mb-2">Descrição</label>
                    <textarea
                      value={newTaskData.description}
                      onChange={(event) => setNewTaskData((prev) => ({ ...prev, description: event.target.value }))}
                      className="w-full min-h-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                      placeholder="Escreva os detalhes da tarefa..."
                    />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-white/70 text-xs uppercase tracking-[0.24em] mb-2 inline-block">Categoria</span>
                        <select
                          value={newTaskData.category}
                          onChange={(event) => setNewTaskData((prev) => ({ ...prev, category: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                        >
                          {categoryOptions.map((category) => (
                            <option key={category} value={category} className="bg-[#111114] text-white">
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-white/70 text-xs uppercase tracking-[0.24em] mb-2 inline-block">Emoji</span>
                        <input
                          value={newTaskData.emoji}
                          onChange={(event) => setNewTaskData((prev) => ({ ...prev, emoji: event.target.value }))}
                          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                          placeholder="✨"
                        />
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="mt-6 w-full rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Adicionar tarefa
                    </button>
                  </div>
                </motion.form>
              ) : activeTab === "profile" ? (
                <motion.div
                  className="flex h-full flex-col px-4 py-6 overflow-hidden"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex-shrink-0 mb-6">
                    <div className="text-sm font-medium text-white/70 mb-4">Perfil</div>
                    <div className="flex flex-col items-center gap-3">
                      <button
                        type="button"
                        onClick={openProfileEditor}
                        className="relative flex items-center justify-center w-20 h-20 rounded-full bg-white/8 border border-white/12 text-5xl text-white transition hover:bg-white/10"
                      >
                        {profile.avatar}
                        <span className="absolute right-0 bottom-0 flex h-8 w-8 items-center justify-center rounded-full bg-[#11181f]/95 border border-white/10 text-[13px]">
                          ✏️
                        </span>
                      </button>
                      <div className="text-center">
                        <div className="text-xl font-semibold text-white">{profile.name}</div>
                        <div className="text-[13px] text-white/45 mt-1">{profile.handle}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <div className="flex-1 rounded-[14px] bg-white/6 p-3">
                      <div className="text-[22px] font-semibold text-[#2563eb]">{stats.accepted + stats.rejected + stats.shared}</div>
                      <div className="text-[11px] text-white/50 mt-1">Tarefas feitas</div>
                    </div>
                    <div className="flex-1 rounded-[14px] bg-white/6 p-3">
                      <div className="text-[22px] font-semibold text-[#F59E0B]">5</div>
                      <div className="text-[11px] text-white/50 mt-1">Sequência</div>
                    </div>
                    <div className="flex-1 rounded-[14px] bg-white/6 p-3">
                      <div className="text-[22px] font-semibold text-[#10B981]">{Math.round(((stats.accepted + stats.rejected + stats.shared) / total) * 100) || 0}%</div>
                      <div className="text-[11px] text-white/50 mt-1">Taxa</div>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="rounded-[16px] bg-white/5 overflow-hidden border border-white/10">
                      <button
                        type="button"
                        onClick={openProfileEditor}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left text-white transition hover:bg-white/10"
                      >
                        <span className="text-[18px] text-white/50">👤</span>
                        <span className="flex-1 text-sm">Editar perfil</span>
                        <span className="text-white/30">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast("Configurações de notificações em breve.", "bg-white/10")}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left text-white transition hover:bg-white/10 border-t border-white/6"
                      >
                        <span className="text-[18px] text-white/50">🔔</span>
                        <span className="flex-1 text-sm">Notificações</span>
                        <span className="text-white/30">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => showToast("Configuração de aparência em breve.", "bg-white/10")}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left text-white transition hover:bg-white/10 border-t border-white/6"
                      >
                        <span className="text-[18px] text-white/50">🎨</span>
                        <span className="flex-1 text-sm">Aparência</span>
                        <span className="text-white/30">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAboutModal(true)}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left text-white transition hover:bg-white/10 border-t border-white/6"
                      >
                        <span className="text-[18px] text-white/50">ℹ️</span>
                        <span className="flex-1 text-sm">Sobre o TaskMatch</span>
                        <span className="text-white/30">›</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left text-red-300 transition hover:bg-red-500/10 border-t border-white/6"
                      >
                        <span className="text-[18px] text-red-300">🚪</span>
                        <span className="flex-1 text-sm text-red-100">Sair</span>
                        <span className="text-red-300">›</span>
                      </button>
                    </div>
                  </div>

                  {showProfileEditor && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-6">
                      <div className="w-full max-w-md rounded-[30px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">Editar perfil</div>
                            <div className="text-[12px] text-white/45">Atualize nome, nick e emoji.</div>
                          </div>
                          <button type="button" onClick={closeProfileEditor} className="text-white/50 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="mb-4 flex items-center justify-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/8 border border-white/12 text-4xl">
                            {editedProfile.avatar}
                          </div>
                          <div className="space-y-1 text-sm text-white/50">
                            <div>Toque em um emoji abaixo</div>
                          </div>
                        </div>
                        <div className="space-y-3 mb-4">
                          <input
                            value={editedProfile.name}
                            onChange={(event) => setEditedProfile((prev) => ({ ...prev, name: event.target.value }))}
                            placeholder="Seu nome"
                            className="w-full rounded-[12px] bg-white/7 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none border border-transparent focus:border-[#2563eb] focus:bg-white/10"
                          />
                          <input
                            value={editedProfile.handle}
                            onChange={(event) => setEditedProfile((prev) => ({ ...prev, handle: event.target.value }))}
                            placeholder="@nick"
                            className="w-full rounded-[12px] bg-white/7 px-4 py-3 text-sm text-white placeholder:text-white/40 outline-none border border-transparent focus:border-[#2563eb] focus:bg-white/10"
                          />
                        </div>
                        <div className="mb-4 grid grid-cols-5 gap-2">
                          {profileEmojis.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setEditedProfile((prev) => ({ ...prev, avatar: emoji }))}
                              className={`rounded-2xl p-3 text-lg transition ${editedProfile.avatar === emoji ? "border border-[#2563eb] bg-[#2563eb]/20" : "bg-white/5"}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={closeProfileEditor}
                            className="flex-1 rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={saveProfileEdits}
                            className="flex-1 rounded-[14px] bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                          >
                            Salvar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {showAboutModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 py-6">
                      <div className="w-full max-w-md rounded-[30px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-white">Sobre o TaskMatch</div>
                            <div className="text-[12px] text-white/45">Informações do app</div>
                          </div>
                          <button type="button" onClick={() => setShowAboutModal(false)} className="text-white/50 hover:text-white">
                            ✕
                          </button>
                        </div>
                        <div className="space-y-4 text-sm text-white/70">
                          <div>
                            <div className="text-white font-semibold">TaskMatch</div>
                            <div className="text-[13px] text-white/45">Versão 0.0.0</div>
                          </div>
                          <p>
                            TaskMatch é um app dark minimalista para tomar decisões rápidas e organizar seu dia com foco em ação.
                          </p>
                          <p className="text-[13px] text-white/45">
                            Criado para ajudar você a priorizar tarefas, manter ritmo e seguir produtivo sem distrações.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAboutModal(false)}
                          className="mt-5 w-full rounded-[14px] bg-[#2563eb] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  className="flex h-full items-center justify-center px-4 py-8"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl">
                    <div className="text-6xl mb-4">{tabInfo[activeTab].emoji}</div>
                    <h2 className="text-2xl font-bold text-white mb-3">{tabInfo[activeTab].title}</h2>
                    <p className="text-sm text-white/60 leading-relaxed mb-8">{tabInfo[activeTab].description}</p>
                    <button
                      onClick={() => setActiveTab("home")}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                    >
                      Voltar ao Deck
                    </button>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex-shrink-0 border-t pb-6 pt-2" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#111114" }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="flex-1 flex flex-col items-center gap-1 py-1 w-1/4 float-left"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke={isActive ? "#2563eb" : "rgba(255,255,255,0.25)"} strokeWidth={isActive ? 2.2 : 1.8} className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                    <span className="text-[9px] font-medium" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP LAYOUT (≥ 1024px) */}
      {isDesktop && (
        <div className="mx-auto w-full h-screen flex p-6 gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="w-[280px] flex flex-col gap-6 flex-shrink-0">
            {/* Logo */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6">
              <h1 className="text-2xl font-black tracking-tight leading-none text-white">
                Task<span style={{ color: "#2563eb" }}>Match</span>
              </h1>
              <p className="text-xs text-white/30 mt-2">Decida rápido, viva mais.</p>
            </div>

            {/* Profile Card */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40 mb-4">Perfil</p>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/40 mb-1">Usuário</div>
                  <div className="text-lg font-semibold text-white">{profile.name}</div>
                  <div className="text-xs text-white/50 mt-1">{profile.handle}</div>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-3">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Nível</div>
                  <div className="mt-2 text-xl font-semibold text-white">7</div>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-3">
                  <div className="flex items-center justify-between text-xs text-white/50 mb-2">
                    <span>Taxa de aceitação</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`acceptance-${total > 0 ? Math.round((stats.accepted / total) * 100) : 0}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="font-semibold text-emerald-300"
                      >
                        {total > 0 ? Math.round((stats.accepted / total) * 100) : 0}%
                      </motion.span>
                    </AnimatePresence>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-[#2563eb]"
                      animate={{ width: `${total > 0 ? Math.round((stats.accepted / total) * 100) : 0}%` }}
                      transition={{ type: "spring", stiffness: 100, damping: 20 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Session Summary */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40 mb-4">Resumo de sessão</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Aceitas</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`accepted-${stats.accepted}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="font-semibold text-emerald-400"
                    >
                      {stats.accepted}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Delegadas</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`shared-${stats.shared}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="font-semibold text-blue-400"
                    >
                      {stats.shared}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">Restantes</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`remaining-${remaining}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="font-semibold text-white"
                    >
                      {remaining}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER MAIN AREA */}
          <main className="flex flex-1 flex-col min-h-0 bg-[#18181c] rounded-[32px] shadow-2xl overflow-hidden">
            {/* Top Nav */}
            <div className="flex items-center justify-between px-8 pt-6 pb-4 flex-shrink-0 border-b border-white/6">
              <div className="flex items-center gap-8">
                <button className="text-sm text-white/70 hover:text-white transition">Início</button>
                <button className="text-sm text-white/70 hover:text-white transition">Explorar</button>
                <button className="text-sm text-white/70 hover:text-white transition">IA</button>
                <button className="text-sm text-white/70 hover:text-white transition">Perfil</button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-sm text-[#2563eb] hover:bg-[#2563eb]/30 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Criar Deck
              </button>
            </div>

            {/* Progress Bar */}
            {remaining > 0 && (
              <div className="px-8 py-3 flex-shrink-0 border-b border-white/6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-white/40 font-medium">Deck pessoal</span>
                  <span className="text-xs text-white/30">
                    {remaining} de {total} restantes
                  </span>
                </div>
                <div className="h-[2px] bg-white/6 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#2563eb] rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                  />
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex flex-1 flex-col min-h-0 px-8 py-8 overflow-y-auto">
              {activeTab === "home" ? (
                remaining > 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    {/* Swipe Card Stack */}
                    <div className="relative mb-8" style={{ height: cardHeight, width: "100%", maxWidth: 500 }}>
                      {tasks
                        .slice(-3)
                        .reverse()
                        .map((task, i, arr) => {
                          const isTop = i === 0;
                          const stackIndex = arr.length - 1 - i;
                          return (
                            <SwipeCard
                              key={task.id}
                              task={task}
                              isTop={isTop}
                              stackIndex={stackIndex}
                              onSwipe={handleSwipe}
                            />
                          );
                        })}
                    </div>

                    {/* Direction Labels */}
                    <div className="flex items-center justify-between w-full max-w-[500px] px-4 mb-6">
                      <div className="flex items-center gap-2 text-red-400/50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-xs font-medium tracking-wide uppercase">Depois</span>
                      </div>
                      <div className="flex flex-col items-center text-blue-400/50">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 mb-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                        </svg>
                        <span className="text-xs font-medium tracking-wide uppercase">Delegar</span>
                      </div>
                      <div className="flex items-center gap-2 text-emerald-400/50">
                        <span className="text-xs font-medium tracking-wide uppercase">Aceitar</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} />
                  </div>
                ) : (
                  <EmptyState stats={stats} onReset={handleReset} />
                )
              ) : (
                <motion.div
                  className="flex items-center justify-center h-full"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                    <div className="text-6xl mb-4">{tabInfo[activeTab]?.emoji || "🔍"}</div>
                    <h2 className="text-2xl font-bold text-white mb-3">{tabInfo[activeTab]?.title || "Em breve"}</h2>
                    <p className="text-sm text-white/60 leading-relaxed">{tabInfo[activeTab]?.description || "Esta seção em breve."}</p>
                  </div>
                </motion.div>
              )}
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="w-[280px] flex flex-col gap-6 flex-shrink-0">
            {/* Upcoming Tasks */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6 flex flex-col flex-1 min-h-0">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40 mb-4 flex-shrink-0">Próximas tarefas</p>
              <div className="space-y-3 overflow-y-auto flex-1">
                {remaining > 0 ? (
                  tasks.slice(-3).reverse().map((task) => (
                    <div key={task.id} className="rounded-2xl bg-black/20 border border-white/10 p-3">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">{task.category}</p>
                      <p className="font-semibold text-sm text-white leading-tight">{task.title}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40">Nenhuma tarefa pendente</p>
                )}
              </div>
            </div>

            {/* Recent Activities */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6 flex flex-col flex-1 min-h-0">
              <h2 className="text-sm font-semibold text-white mb-4 flex-shrink-0">Atividades recentes</h2>
              <ul className="space-y-2 text-xs leading-6 text-white/70 flex-1 overflow-y-auto">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">●</span>
                  <span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`activity-accepted-${stats.accepted}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        {stats.accepted} tarefas aceitas
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-400">●</span>
                  <span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`activity-rejected-${stats.rejected}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        {stats.rejected} deixadas para depois
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-400">●</span>
                  <span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={`activity-shared-${stats.shared}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        {stats.shared} delegadas
                      </motion.span>
                    </AnimatePresence>
                  </span>
                </li>
              </ul>
            </div>

            {/* Deck Progress */}
            <div className="rounded-3xl bg-[#18181c] border border-white/6 p-6">
              <p className="text-xs uppercase tracking-[0.32em] text-white/40 mb-4">Progresso do deck</p>
              <div className="flex items-center justify-between mb-3 text-xs text-white/70">
                <span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`progress-count-${remaining}`}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                    >
                      {remaining}
                    </motion.span>
                  </AnimatePresence>
                  {" / "}
                  {total}
                </span>
                <span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`progress-percent-${Math.round(progress)}`}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                    >
                      {Math.round(progress)}%
                    </motion.span>
                  </AnimatePresence>
                </span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[#2563eb]"
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          </aside>
        </div>
      )}

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}