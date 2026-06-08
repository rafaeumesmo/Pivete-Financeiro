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
        <div className="flex flex-col w-full h-screen bg-[#111114] overflow-hidden">

          {/* HEADER */}
          <div className="flex-shrink-0 flex items-center justify-between px-5 pt-safe pt-4 pb-3 bg-[#111114]">
            <div>
              <h1 className="text-[22px] font-black tracking-tight leading-none text-white">
                Task<span style={{ color: "#2563eb" }}>Match</span>
              </h1>
              <p className="text-[11px] text-white/30 mt-0.5">Decida rápido, viva mais.</p>
            </div>
            <div className="flex gap-2">
              <button className="w-9 h-9 rounded-2xl bg-white/[0.05] border border-white/[0.07] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white/40">
                  <path strokeLinecap="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              <button
                onClick={() => setActiveTab("create")}
                className="w-9 h-9 rounded-2xl bg-[#2563eb]/20 border border-[#2563eb]/30 flex items-center justify-center"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </div>

          {/* PROGRESS BAR — só na home com cards */}
          {activeTab === "home" && remaining > 0 && (
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-white/30 font-medium">Deck pessoal</span>
                <span className="text-[11px] text-white/20 bg-white/[0.05] px-2.5 py-0.5 rounded-full">
                  {remaining} de {total} restantes
                </span>
              </div>
              <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#2563eb] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 20 }}
                />
              </div>
            </div>
          )}

          {/* CONTENT AREA */}
          <div className="flex-1 min-h-0 overflow-hidden relative">

            {/* ── HOME ── */}
            {activeTab === "home" && (
              <div className="flex flex-col h-full">
                {remaining > 0 ? (
                  <>
                    {/* Card stack — ocupa o espaço disponível */}
                    <div className="flex-1 min-h-0 px-5 pt-2 pb-2 relative">
                      <div className="relative w-full h-full">
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
                    </div>

                    {/* Direction hints */}
                    <div className="flex-shrink-0 flex items-center justify-between px-8 py-2">
                      <div className="flex items-center gap-1.5 text-red-400/45">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="text-[9px] font-semibold tracking-widest uppercase">Depois</span>
                      </div>
                      <div className="flex flex-col items-center text-blue-400/45">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3 mb-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                        </svg>
                        <span className="text-[9px] font-semibold tracking-widest uppercase">Delegar</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400/45">
                        <span className="text-[9px] font-semibold tracking-widest uppercase">Aceitar</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex-shrink-0 flex items-center justify-center gap-5 pb-4">
                      <ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} />
                    </div>
                  </>
                ) : (
                  <EmptyState stats={stats} onReset={handleReset} />
                )}
              </div>
            )}

            {/* ── EXPLORE ── */}
            {activeTab === "explore" && (
              <motion.div
                className="flex flex-col h-full px-5 pt-4 overflow-y-auto"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Explorar</p>
                <h2 className="text-lg font-bold text-white mb-1">Delegações recentes</h2>
                <p className="text-sm text-white/40 mb-5">Veja para quem suas tarefas foram enviadas.</p>

                {sharedHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center flex-1 rounded-3xl bg-white/[0.03] border border-white/[0.06] p-8 text-center">
                    <div className="text-3xl mb-3 opacity-30">↑</div>
                    <p className="text-sm text-white/30">Nada delegado ainda</p>
                    <p className="text-xs text-white/20 mt-1">Use o gesto de delegar no deck para começar.</p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-6">
                    {sharedHistory.map((item) => {
                      const acceptedNames = item.recipients.filter((r) => r.accepted).map((r) => r.name);
                      const refusedNames  = item.recipients.filter((r) => !r.accepted).map((r) => r.name);
                      return (
                        <div key={`${item.id}-${item.title}`} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-4">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Delegado</div>
                              <div className="text-base font-semibold text-white">{item.title}</div>
                            </div>
                            <div className="rounded-xl bg-[#111319] px-2.5 py-1 text-[11px] text-[#2563eb] flex-shrink-0">Histórico</div>
                          </div>
                          <p className="text-sm text-white/40 mb-2">{item.description}</p>
                          <p className="text-sm">
                            {acceptedNames.length > 0 && <span className="text-emerald-400">{acceptedNames.join(", ")} aceitaram</span>}
                            {acceptedNames.length > 0 && refusedNames.length > 0 && <span className="text-white/20"> · </span>}
                            {refusedNames.length > 0 && <span className="text-red-400">{refusedNames.join(", ")} recusou{refusedNames.length > 1 ? "ram" : ""}</span>}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── RAF ── */}
            {activeTab === "ia" && (
              <motion.div
                className="flex flex-col h-full"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Header */}
                <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-white/[0.05]">
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-0.5">Assistente</p>
                  <h2 className="text-base font-bold text-white">⚡ RAF</h2>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4" style={{ WebkitOverflowScrolling: "touch" }}>
                  <div className="space-y-2.5 pb-2">
                    {chatMessages.map((message, index) => {
                      const isUser = message.sender === "user";
                      const previous = chatMessages[index - 1];
                      const showIcon = !isUser && (!previous || previous.sender !== "raf");
                      return (
                        <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`flex items-start gap-1.5 ${isUser ? "ml-auto" : "mr-auto"}`}>
                            {!isUser && showIcon && <div className="mt-1 text-[13px] text-white/40 flex-shrink-0">⚡</div>}
                            {!isUser && !showIcon && <div className="w-[19px] flex-shrink-0" />}
                            <div
                              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                isUser
                                  ? "bg-[#2563eb] text-white rounded-br-[4px]"
                                  : "bg-white/[0.07] text-white/80 rounded-bl-[4px]"
                              }`}
                            >
                              {message.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-1.5">
                          <div className="mt-1 text-[13px] text-white/40">⚡</div>
                          <div className="bg-white/[0.07] rounded-2xl rounded-bl-[4px] px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-150" />
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Quick actions */}
                <AnimatePresence>
                  {chatInput.trim() === "" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex-shrink-0 overflow-hidden"
                    >
                      <div
                        className="flex items-center gap-2 px-5 py-2 overflow-x-auto"
                        style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
                      >
                        {quickActions.map((action) => (
                          <button
                            key={action.prompt}
                            type="button"
                            onClick={() => handleQuickAction(action.prompt)}
                            className="whitespace-nowrap flex-shrink-0 rounded-full border border-white/[0.12] bg-transparent px-4 py-2 text-[13px] text-white/50 transition hover:border-white/25 hover:text-white/75"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <div className="flex-shrink-0 px-4 pb-3 pt-2 bg-[#111114]">
                  <form
                    onSubmit={handleSendMessage}
                    className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-3 py-2"
                  >
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}}
                      placeholder="Mensagem..."
                      disabled={isChatLoading}
                      rows={1}
                      className="flex-1 min-h-[40px] max-h-[120px] resize-none bg-transparent px-2 py-2 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={isChatLoading || chatInput.trim() === ""}
                      className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition ${
                        chatInput.trim() === "" ? "bg-white/10 text-white/30" : "bg-[#2563eb] text-white"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M13 4l7 6-7 6" />
                      </svg>
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* ── CREATE ── */}
            {activeTab === "create" && (
              <motion.div
                className="h-full overflow-y-auto px-5 pt-4 pb-6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Nova tarefa</p>
                <h2 className="text-lg font-bold text-white mb-5">Criar card</h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTaskData.title.trim() || !newTaskData.description.trim()) {
                      showToast("Preencha título e descrição.", "bg-red-600/90");
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
                    showToast("Tarefa criada!", "bg-emerald-600/90");
                    setActiveTab("home");
                  }}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Título</label>
                    <input
                      value={newTaskData.title}
                      onChange={(e) => setNewTaskData((p) => ({ ...p, title: e.target.value }))}
                      className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25"
                      placeholder="Ex: Comprar mantimentos"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Descrição</label>
                    <textarea
                      value={newTaskData.description}
                      onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))}
                      className="w-full min-h-[100px] rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 resize-none"
                      placeholder="Detalhes da tarefa..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Categoria</label>
                      <select
                        value={newTaskData.category}
                        onChange={(e) => setNewTaskData((p) => ({ ...p, category: e.target.value }))}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60"
                      >
                        {["Alimentação","Lazer","Saúde","Estudos","Trabalho","Outros"].map((c) => (
                          <option key={c} value={c} className="bg-[#111114]">{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Emoji</label>
                      <input
                        value={newTaskData.emoji}
                        onChange={(e) => setNewTaskData((p) => ({ ...p, emoji: e.target.value }))}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25"
                        placeholder="✨"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-[#2563eb] py-3.5 text-sm font-semibold text-white hover:bg-blue-500 transition mt-2"
                  >
                    Adicionar tarefa
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── PROFILE ── */}
            {activeTab === "profile" && (
              <motion.div
                className="h-full overflow-y-auto px-5 pt-4 pb-6"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Avatar */}
                <div className="flex flex-col items-center gap-2 mb-6">
                  <button
                    type="button"
                    onClick={openProfileEditor}
                    className="relative w-20 h-20 rounded-full bg-white/[0.06] border border-white/10 text-5xl flex items-center justify-center hover:bg-white/10 transition"
                  >
                    {profile.avatar}
                    <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-[#111114] border border-white/10 text-[13px] flex items-center justify-center">✏️</span>
                  </button>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-white">{profile.name}</div>
                    <div className="text-[13px] text-white/35 mt-0.5">{profile.handle}</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: "Feitas",    value: stats.accepted + stats.rejected + stats.shared, color: "text-[#2563eb]" },
                    { label: "Sequência", value: 5,                                               color: "text-amber-400" },
                    { label: "Taxa",
                      value: stats.accepted + stats.rejected + stats.shared > 0
                        ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%`
                        : "0%",
                      color: "text-emerald-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.07] p-3">
                      <div className={`text-xl font-bold ${color}`}>{value}</div>
                      <div className="text-[11px] text-white/35 mt-0.5">{label}</div>
                    </div>
                  ))}
                </div>

                {/* Menu */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] overflow-hidden">
                  {[
                    { label: "Editar perfil",    action: openProfileEditor,                                 icon: "👤" },
                    { label: "Notificações",      action: () => showToast("Em breve.", "bg-white/10"),      icon: "🔔" },
                    { label: "Aparência",         action: () => showToast("Em breve.", "bg-white/10"),      icon: "🎨" },
                    { label: "Sobre o TaskMatch", action: () => setShowAboutModal(true),                    icon: "ℹ️" },
                  ].map(({ label, action, icon }, i) => (
                    <button
                      key={label}
                      type="button"
                      onClick={action}
                      className={`flex w-full items-center gap-3 px-4 py-4 text-left text-white hover:bg-white/[0.05] transition ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
                    >
                      <span className="text-[17px] text-white/40">{icon}</span>
                      <span className="flex-1 text-sm">{label}</span>
                      <span className="text-white/20 text-lg leading-none">›</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left border-t border-white/[0.05] hover:bg-red-500/10 transition"
                  >
                    <span className="text-[17px]">🚪</span>
                    <span className="flex-1 text-sm text-red-300">Sair</span>
                    <span className="text-red-400/40 text-lg leading-none">›</span>
                  </button>
                </div>

                {/* Profile editor modal */}
                {showProfileEditor && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6">
                    <div className="w-full max-w-md rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-semibold text-white">Editar perfil</div>
                          <div className="text-[12px] text-white/40">Atualize nome, nick e emoji.</div>
                        </div>
                        <button type="button" onClick={closeProfileEditor} className="text-white/40 hover:text-white text-lg">✕</button>
                      </div>
                      <div className="flex justify-center mb-4">
                        <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 text-4xl flex items-center justify-center">
                          {editedProfile.avatar}
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <input
                          value={editedProfile.name}
                          onChange={(e) => setEditedProfile((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Seu nome"
                          className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]"
                        />
                        <input
                          value={editedProfile.handle}
                          onChange={(e) => setEditedProfile((p) => ({ ...p, handle: e.target.value }))}
                          placeholder="@nick"
                          className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]"
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {profileEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditedProfile((p) => ({ ...p, avatar: emoji }))}
                            className={`rounded-xl p-2.5 text-lg transition ${editedProfile.avatar === emoji ? "border border-[#2563eb] bg-[#2563eb]/20" : "bg-white/[0.04]"}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={closeProfileEditor} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/70">Cancelar</button>
                        <button type="button" onClick={saveProfileEdits} className="flex-1 rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white">Salvar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* About modal */}
                {showAboutModal && (
                  <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6">
                    <div className="w-full max-w-md rounded-[28px] bg-[#18191f] border border-white/10 p-5 shadow-2xl">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-sm font-semibold text-white">Sobre o TaskMatch</div>
                          <div className="text-[12px] text-white/40">Informações do app</div>
                        </div>
                        <button type="button" onClick={() => setShowAboutModal(false)} className="text-white/40 hover:text-white text-lg">✕</button>
                      </div>
                      <div className="space-y-3 text-sm text-white/60 mb-5">
                        <div>
                          <div className="text-white font-semibold">TaskMatch</div>
                          <div className="text-[12px] text-white/35">Versão 0.0.0</div>
                        </div>
                        <p>App dark minimalista para tomar decisões rápidas e organizar seu dia com foco em ação.</p>
                        <p className="text-[12px] text-white/35">Criado para ajudar você a priorizar tarefas, manter ritmo e seguir produtivo sem distrações.</p>
                      </div>
                      <button type="button" onClick={() => setShowAboutModal(false)} className="w-full rounded-xl bg-[#2563eb] py-2.5 text-sm font-semibold text-white">Fechar</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* BOTTOM NAV */}
          <div
            className="flex-shrink-0 flex items-center border-t border-white/[0.06] bg-[#111114] pb-safe"
            style={{ paddingBottom: "max(env(safe-area-inset-bottom), 8px)" }}
          >
            {[
              { id: "home",    label: "Início",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
              { id: "explore", label: "Explorar", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" },
              { id: "ia",      label: "RAF",       icon: "M13 10V3L4 14h7v7l9-11h-7z" },
              { id: "profile", label: "Perfil",    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isActive ? "#3b82f6" : "rgba(255,255,255,0.22)"}
                    strokeWidth={isActive ? 2.2 : 1.8}
                    className="w-5 h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.2)" }}
                  >
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* DESKTOP LAYOUT (≥ 1024px) */}
      {isDesktop && (
        <div className="w-full h-screen flex bg-[#111114]">
          {/* LEFT SIDEBAR */}
          <aside className="w-[220px] flex-shrink-0 bg-[#18181c] flex flex-col px-4 py-6 border-r border-white/[0.05]">
            {/* Logo */}
            <div className="mb-6 px-2">
              <h1 className="text-xl font-black tracking-tight leading-none text-white">
                Task<span style={{ color: "#2563eb" }}>Match</span>
              </h1>
              <p className="text-[11px] text-white/30 mt-1">Decida rápido, viva mais.</p>
            </div>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5">
              {[
                { id: "home",    label: "Início",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
                { id: "explore", label: "Explorar", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" },
                { id: "ia",      label: "RAF",       icon: "M13 10V3L4 14h7v7l9-11h-7z" },
                { id: "profile", label: "Perfil",    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-[#2563eb]/15 text-[#93c5fd]"
                        : "text-white/40 hover:bg-white/5 hover:text-white/60"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.2 : 1.8} className="w-[17px] h-[17px] flex-shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                    <span className="text-[13px] font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Session stats */}
            <div className="mt-auto pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-white/25 mb-1">Sessão atual</p>
              {[
                { label: "Aceitas",   value: stats.accepted, color: "text-emerald-400" },
                { label: "Delegadas", value: stats.shared,   color: "text-blue-400"   },
                { label: "Depois",    value: stats.rejected, color: "text-red-400"    },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[12px] text-white/40">{label}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={value}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className={`text-[14px] font-semibold ${color}`}
                    >
                      {value}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ))}
              {/* Taxa */}
              <div className="flex items-center justify-between mt-1">
                <span className="text-[12px] text-white/40">Taxa de aceite</span>
                <span className="text-[13px] font-semibold text-emerald-400">
                  {stats.accepted + stats.rejected + stats.shared > 0
                    ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%`
                    : "—"}
                </span>
              </div>
              <div className="h-[3px] bg-white/[0.08] rounded-full overflow-hidden mt-0.5">
                <motion.div
                  className="h-full bg-[#2563eb] rounded-full"
                  animate={{
                    width: stats.accepted + stats.rejected + stats.shared > 0
                      ? `${Math.round((stats.accepted / (stats.accepted + stats.rejected + stats.shared)) * 100)}%`
                      : "0%"
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                />
              </div>
            </div>
          </aside>

          {/* CENTER MAIN AREA */}
          <main className="flex flex-1 flex-col min-h-0 overflow-hidden">

            {/* ── HOME ── */}
            {activeTab === "home" && (
              <>
                {/* Topbar */}
                <div className="flex items-center justify-between px-10 pt-6 pb-3 flex-shrink-0 border-b border-white/[0.05]">
                  <span className="text-[11px] font-semibold tracking-[0.06em] uppercase text-white/30">Deck pessoal</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-white/20 bg-white/[0.05] px-3 py-1 rounded-full">
                      {remaining} de {total} restantes
                    </span>
                    <button
                      onClick={() => setActiveTab("create")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#2563eb]/20 border border-[#2563eb]/30 text-[12px] font-medium text-[#3b82f6] hover:bg-[#2563eb]/30 transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Criar card
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                {remaining > 0 && (
                  <div className="px-10 pt-3 pb-1 flex-shrink-0">
                    <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[#2563eb] rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ type: "spring", stiffness: 120, damping: 20 }}
                      />
                    </div>
                  </div>
                )}

                {/* Cards area */}
                <div className="flex flex-1 flex-col items-center justify-center gap-6 px-10 py-6 min-h-0">
                  {remaining > 0 ? (
                    <>
                      <div className="relative w-full max-w-[520px]" style={{ height: cardHeight }}>
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

                      {/* Direction hints */}
                      <div className="flex items-center justify-between w-full max-w-[520px] px-2">
                        <div className="flex items-center gap-1.5 text-red-400/50">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                          </svg>
                          <span className="text-[10px] font-semibold tracking-widest uppercase">Depois</span>
                        </div>
                        <div className="flex flex-col items-center text-blue-400/50">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5 mb-0.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                          </svg>
                          <span className="text-[10px] font-semibold tracking-widest uppercase">Delegar</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-400/50">
                          <span className="text-[10px] font-semibold tracking-widest uppercase">Aceitar</span>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>

                      <ActionButtons onAction={(dir) => topTask && handleSwipe(dir, topTask)} disabled={!topTask} />
                    </>
                  ) : (
                    <EmptyState stats={stats} onReset={handleReset} />
                  )}
                </div>
              </>
            )}

            {/* ── EXPLORE ── */}
            {activeTab === "explore" && (
              <motion.div
                className="flex flex-1 flex-col items-center justify-start px-10 py-10 overflow-y-auto"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-full max-w-xl">
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-2">Explorar</p>
                  <h2 className="text-xl font-bold text-white mb-1">Delegações recentes</h2>
                  <p className="text-sm text-white/40 mb-8">Veja para quem suas tarefas foram enviadas e como responderam.</p>

                  {sharedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-3xl bg-white/[0.03] border border-white/[0.06] p-12 text-center">
                      <div className="text-4xl mb-4 opacity-30">↑</div>
                      <p className="text-sm text-white/30">Nada delegado ainda</p>
                      <p className="text-xs text-white/20 mt-1">Use o gesto de delegar no deck para começar.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sharedHistory.map((item) => {
                        const acceptedNames = item.recipients.filter((r) => r.accepted).map((r) => r.name);
                        const refusedNames  = item.recipients.filter((r) => !r.accepted).map((r) => r.name);
                        return (
                          <div key={`${item.id}-${item.title}`} className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="text-[10px] uppercase tracking-[0.2em] text-white/30 mb-1">Delegado</div>
                                <div className="text-base font-semibold text-white">{item.title}</div>
                              </div>
                              <div className="rounded-xl bg-[#111319] px-3 py-1.5 text-[12px] text-[#2563eb] flex-shrink-0">Histórico</div>
                            </div>
                            <p className="text-sm text-white/40 mb-3">{item.description}</p>
                            <p className="text-sm text-white/50">
                              {acceptedNames.length > 0 && <span className="text-emerald-400">{acceptedNames.join(", ")} aceitaram</span>}
                              {acceptedNames.length > 0 && refusedNames.length > 0 && <span className="text-white/30"> · </span>}
                              {refusedNames.length > 0 && <span className="text-red-400">{refusedNames.join(", ")} recusou{refusedNames.length > 1 ? "ram" : ""}</span>}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* ── RAF (IA) ── */}
            {activeTab === "ia" && (
              <motion.div
                className="flex flex-1 flex-col min-h-0"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {/* Header */}
                <div className="flex-shrink-0 px-10 pt-7 pb-4 border-b border-white/[0.05]">
                  <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-0.5">Assistente</p>
                  <h2 className="text-lg font-bold text-white">⚡ RAF</h2>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto px-10 py-6">
                  <div className="w-full max-w-xl mx-auto space-y-3">
                    {chatMessages.map((message, index) => {
                      const isUser = message.sender === "user";
                      const previous = chatMessages[index - 1];
                      const showIcon = !isUser && (!previous || previous.sender !== "raf");
                      return (
                        <div key={message.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                          <div className={`flex items-start gap-2 ${isUser ? "ml-auto" : "mr-auto"}`}>
                            {!isUser && showIcon && <div className="mt-1 text-[15px] text-white/50 flex-shrink-0">⚡</div>}
                            {!isUser && !showIcon && <div className="w-[21px] flex-shrink-0" />}
                            <div
                              className={`max-w-[480px] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                                isUser
                                  ? "bg-[#2563eb] text-white rounded-br-[4px]"
                                  : "bg-white/[0.07] text-white/80 rounded-bl-[4px]"
                              }`}
                            >
                              {message.text}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {isChatLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-2">
                          <div className="mt-1 text-[15px] text-white/50">⚡</div>
                          <div className="bg-white/[0.07] rounded-2xl rounded-bl-[4px] px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse" />
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-150" />
                              <span className="w-2 h-2 rounded-full bg-white/50 animate-pulse delay-300" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </div>

                {/* Quick actions */}
                <AnimatePresence>
                  {chatInput.trim() === "" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex-shrink-0 overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-10 pb-3">
                        {quickActions.map((action) => (
                          <button
                            key={action.prompt}
                            type="button"
                            onClick={() => handleQuickAction(action.prompt)}
                            className="whitespace-nowrap rounded-[20px] border border-white/[0.12] bg-transparent px-4 py-2 text-[13px] text-white/50 transition hover:border-white/25 hover:text-white/80"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input */}
                <div className="flex-shrink-0 px-10 pb-8 pt-2">
                  <div className="w-full max-w-xl mx-auto">
                    <form
                      onSubmit={handleSendMessage}
                      className="flex items-end gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-2"
                    >
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }}}
                        placeholder="Mensagem..."
                        disabled={isChatLoading}
                        rows={1}
                        className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-white/30 outline-none disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={isChatLoading || chatInput.trim() === ""}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
                          chatInput.trim() === "" ? "bg-white/10 text-white/30" : "bg-[#2563eb] text-white hover:bg-blue-500"
                        }`}
                      >
                        <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h14M13 4l7 6-7 6" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── PROFILE ── */}
            {activeTab === "profile" && (
              <motion.div
                className="flex flex-1 flex-col items-center overflow-y-auto px-10 py-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-full max-w-xl flex flex-col gap-5">
                  {/* Avatar + info */}
                  <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6">
                    <div className="flex items-center gap-4 mb-5">
                      <button
                        type="button"
                        onClick={openProfileEditor}
                        className="relative w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 text-4xl flex items-center justify-center hover:bg-white/10 transition"
                      >
                        {profile.avatar}
                        <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#18181c] border border-white/10 text-[11px] flex items-center justify-center">✏️</span>
                      </button>
                      <div>
                        <div className="text-lg font-semibold text-white">{profile.name}</div>
                        <div className="text-sm text-white/35">{profile.handle}</div>
                      </div>
                      <div className="ml-auto flex gap-2">
                        <span className="text-[11px] font-semibold bg-[#2563eb]/15 text-[#93c5fd] px-3 py-1 rounded-full">Nível 7</span>
                        <span className="text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 px-3 py-1 rounded-full">5 dias</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Tarefas feitas", value: stats.accepted + stats.rejected + stats.shared, color: "text-[#2563eb]" },
                        { label: "Sequência",       value: 5,                                              color: "text-amber-400" },
                        { label: "Taxa",
                          value: stats.accepted + stats.rejected + stats.shared > 0
                            ? `${Math.round(((stats.accepted) / (stats.accepted + stats.rejected + stats.shared)) * 100)}%`
                            : "0%",
                          color: "text-emerald-400" },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="rounded-2xl bg-black/20 border border-white/[0.08] p-3">
                          <div className={`text-xl font-bold ${color}`}>{value}</div>
                          <div className="text-[11px] text-white/40 mt-0.5">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Menu */}
                  <div className="rounded-3xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                    {[
                      { label: "Editar perfil",     action: openProfileEditor,                                          icon: "👤" },
                      { label: "Notificações",       action: () => showToast("Em breve.", "bg-white/10"),               icon: "🔔" },
                      { label: "Aparência",          action: () => showToast("Em breve.", "bg-white/10"),               icon: "🎨" },
                      { label: "Sobre o TaskMatch",  action: () => setShowAboutModal(true),                             icon: "ℹ️" },
                    ].map(({ label, action, icon }, i) => (
                      <button
                        key={label}
                        type="button"
                        onClick={action}
                        className={`flex w-full items-center gap-3 px-5 py-4 text-left text-white hover:bg-white/[0.05] transition ${i > 0 ? "border-t border-white/[0.05]" : ""}`}
                      >
                        <span className="text-[17px] text-white/40">{icon}</span>
                        <span className="flex-1 text-sm">{label}</span>
                        <span className="text-white/20">›</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-5 py-4 text-left border-t border-white/[0.05] hover:bg-red-500/10 transition"
                    >
                      <span className="text-[17px]">🚪</span>
                      <span className="flex-1 text-sm text-red-300">Sair</span>
                      <span className="text-red-400/40">›</span>
                    </button>
                  </div>
                </div>

                {/* Profile editor modal */}
                {showProfileEditor && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-sm rounded-[28px] bg-[#18191f] border border-white/10 p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-sm font-semibold text-white">Editar perfil</div>
                          <div className="text-[12px] text-white/40">Atualize nome, nick e emoji.</div>
                        </div>
                        <button type="button" onClick={closeProfileEditor} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
                      </div>
                      <div className="flex items-center justify-center mb-5">
                        <div className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 text-4xl flex items-center justify-center">
                          {editedProfile.avatar}
                        </div>
                      </div>
                      <div className="space-y-3 mb-4">
                        <input
                          value={editedProfile.name}
                          onChange={(e) => setEditedProfile((p) => ({ ...p, name: e.target.value }))}
                          placeholder="Seu nome"
                          className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]"
                        />
                        <input
                          value={editedProfile.handle}
                          onChange={(e) => setEditedProfile((p) => ({ ...p, handle: e.target.value }))}
                          placeholder="@nick"
                          className="w-full rounded-xl bg-white/[0.06] px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none border border-transparent focus:border-[#2563eb]"
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-2 mb-5">
                        {profileEmojis.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => setEditedProfile((p) => ({ ...p, avatar: emoji }))}
                            className={`rounded-xl p-2.5 text-lg transition ${editedProfile.avatar === emoji ? "border border-[#2563eb] bg-[#2563eb]/20" : "bg-white/[0.04] hover:bg-white/10"}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3">
                        <button type="button" onClick={closeProfileEditor} className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/70 hover:bg-white/10 transition">Cancelar</button>
                        <button type="button" onClick={saveProfileEdits} className="flex-1 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition">Salvar</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* About modal */}
                {showAboutModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-sm rounded-[28px] bg-[#18191f] border border-white/10 p-6 shadow-2xl">
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <div className="text-sm font-semibold text-white">Sobre o TaskMatch</div>
                          <div className="text-[12px] text-white/40">Informações do app</div>
                        </div>
                        <button type="button" onClick={() => setShowAboutModal(false)} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
                      </div>
                      <div className="space-y-3 text-sm text-white/60 mb-5">
                        <div>
                          <div className="text-white font-semibold">TaskMatch</div>
                          <div className="text-[12px] text-white/35">Versão 0.0.0</div>
                        </div>
                        <p>App dark minimalista para tomar decisões rápidas e organizar seu dia com foco em ação.</p>
                        <p className="text-[12px] text-white/35">Criado para ajudar você a priorizar tarefas, manter ritmo e seguir produtivo sem distrações.</p>
                      </div>
                      <button type="button" onClick={() => setShowAboutModal(false)} className="w-full rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition">Fechar</button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── CREATE ── */}
            {activeTab === "create" && (
              <motion.div
                className="flex flex-1 flex-col items-center overflow-y-auto px-10 py-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="w-full max-w-xl flex flex-col gap-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-white/30 mb-1">Nova tarefa</p>
                      <h2 className="text-xl font-bold text-white">Criar card</h2>
                    </div>
                    <button
                      onClick={() => setActiveTab("home")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Voltar
                    </button>
                  </div>
 
                  {/* Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newTaskData.title.trim() || !newTaskData.description.trim()) {
                        showToast("Preencha título e descrição.", "bg-red-600/90");
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
                      showToast("Tarefa criada!", "bg-emerald-600/90");
                      setActiveTab("home");
                    }}
                    className="rounded-3xl bg-white/[0.03] border border-white/[0.06] p-6 flex flex-col gap-5"
                  >
                    <div>
                      <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Título</label>
                      <input
                        value={newTaskData.title}
                        onChange={(e) => setNewTaskData((p) => ({ ...p, title: e.target.value }))}
                        className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition"
                        placeholder="Ex: Comprar mantimentos"
                      />
                    </div>
 
                    <div>
                      <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Descrição</label>
                      <textarea
                        value={newTaskData.description}
                        onChange={(e) => setNewTaskData((p) => ({ ...p, description: e.target.value }))}
                        className="w-full min-h-[120px] rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 resize-none transition"
                        placeholder="Detalhes da tarefa..."
                      />
                    </div>
 
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Categoria</label>
                        <select
                          value={newTaskData.category}
                          onChange={(e) => setNewTaskData((p) => ({ ...p, category: e.target.value }))}
                          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 transition"
                        >
                          {["Alimentação","Lazer","Saúde","Estudos","Trabalho","Outros"].map((c) => (
                            <option key={c} value={c} className="bg-[#111114]">{c}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold tracking-[0.1em] uppercase text-white/35 mb-2">Emoji</label>
                        <input
                          value={newTaskData.emoji}
                          onChange={(e) => setNewTaskData((p) => ({ ...p, emoji: e.target.value }))}
                          className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3 text-sm text-white outline-none focus:border-[#2563eb]/60 placeholder:text-white/25 transition"
                          placeholder="✨"
                        />
                      </div>
                    </div>
 
                    <div className="flex gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setActiveTab("home")}
                        className="flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] py-3 text-sm text-white/50 hover:bg-white/[0.07] hover:text-white/70 transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="flex-1 rounded-2xl bg-[#2563eb] py-3 text-sm font-semibold text-white hover:bg-blue-500 transition"
                      >
                        Adicionar tarefa
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
 
          </main>
        </div>
      )}

      <Toast visible={toast.visible} message={toast.message} color={toast.color} />
    </div>
  );
}