import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, BookOpen, ChevronRight, Search, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ChatMessage, SheetRow } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis Polaris brain, ton assistant pédagogique futuriste. Comment puis-je t\'aider dans tes cours aujourd\'hui ? N\'hésite pas à consulter les fichiers PDF de la bibliothèque !' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [knowledge, setKnowledge] = useState<SheetRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isConfiguring, setIsConfiguring] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch the active API key from the database
  useEffect(() => {
    const fetchKey = async () => {
      try {
        const res = await fetch('/api/chat/key');
        if (res.ok) {
          const data = await res.json();
          // Decrypt the key using the same salt as in AdminPanel
          const bytes = CryptoJS.AES.decrypt(data.encrypted_key, 'secret-salt');
          const decryptedKey = bytes.toString(CryptoJS.enc.Utf8);
          if (decryptedKey) {
            setApiKey(decryptedKey);
          }
        }
      } catch (err) {
        console.error("Failed to fetch AI key:", err);
      } finally {
        setIsConfiguring(false);
      }
    };
    fetchKey();
  }, []);

  // Fetch knowledge base from server (Google Sheets proxy)
  useEffect(() => {
    const fetchKnowledge = async () => {
      try {
        const res = await fetch('/api/knowledge');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setKnowledge(data);
        } else {
          // Fallback to mock data if sheet is empty or not configured
          setKnowledge([
            { category: 'Maths', subCategory: 'Addition', class: '6ème', fileName: 'Les bases de l\'addition', fileLink: '#' },
            { category: 'Maths', subCategory: 'Soustraction', class: '6ème', fileName: 'Soustraire des nombres', fileLink: '#' },
            { category: 'Français', subCategory: 'Conjugaison', class: '5ème', fileName: 'Le présent de l\'indicatif', fileLink: '#' },
            { category: 'Sciences', subCategory: 'Plantes', class: '4ème', fileName: 'Comment poussent les fleurs', fileLink: '#' },
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch knowledge:", err);
      }
    };
    fetchKnowledge();
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: "L'IA n'est pas encore configurée. Veuillez ajouter une clé API dans l'administration." }]);
      setIsLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Prepare knowledge context for the AI
      const knowledgeContext = knowledge.map(k => 
        `- Document: "${k.fileName}" | Catégorie: ${k.category} | Sous-catégorie: ${k.subCategory} | Classe: ${k.class} | Lien: ${k.fileLink}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: `Tu es Polaris brain, l'assistant pédagogique du site SuccessPolaris, créé par le Lion d'Astarté connu sous le symbole de TSEK. Ton style est futuriste, poli et motivant. 
          
          Tu as accès à une bibliothèque de documents ci-dessous. Lorsqu'un élève te pose une question sur un cours ou cherche un document, tu DOIS lui indiquer avec précision sa Catégorie, sa Sous-catégorie et sa Classe, puis lui donner le lien direct.
          
          FORMATAGE :
          - Utilise le **gras** pour les termes importants.
          - Utilise des listes à puces pour structurer tes explications.
          - Pour les mathématiques, utilise impérativement le format LaTeX entre $ pour les formules en ligne (ex: $E=mc^2$) et entre $$ pour les formules centrées.
          
          BIBLIOTHÈQUE DISPONIBLE :
          ${knowledgeContext}
          
          Si on te demande qui tu es ou quelle est ton identité, réponds impérativement : 'Je suis Polaris brain crée par le Lion d'Astarté connu sous le symbole de TSEK'. 
          Réponds toujours de manière bienveillante, simple et claire pour aider les élèves.`
        }
      });

      const assistantContent = response.text || "Désolé, je n'ai pas pu générer de réponse.";
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);

      // Log the chat to the database
      try {
        await fetch('/api/chat/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: userMessage,
            answer: assistantContent,
            category: userMessage.toLowerCase().includes('math') ? 'Maths' : 
                      userMessage.toLowerCase().includes('français') ? 'Français' : 
                      userMessage.toLowerCase().includes('science') ? 'Sciences' : 'Général',
            user_email: 'élève@école.fr' // Mock email
          })
        });
      } catch (logErr) {
        console.error("Failed to log chat:", logErr);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Oups ! J'ai eu un petit problème technique. Peux-tu répéter ?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredKnowledge = knowledge.filter(item => 
    item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-brand-primary text-brand-text">
      {/* Sidebar - Knowledge Base */}
      <div className="w-80 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col hidden md:flex">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center stellar-glow">
              <BookOpen className="text-brand-primary w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg stellar-text-glow">Bibliothèque</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher un document..."
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {['Maths', 'Français', 'Sciences'].map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 px-2">{cat}</h3>
              <div className="space-y-1">
                {filteredKnowledge.filter(k => k.category === cat).map((item, idx) => (
                  <button key={idx} className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 group transition-colors flex flex-col gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm text-zinc-400 group-hover:text-brand-accent truncate">{item.fileName}</span>
                      <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-brand-accent" />
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 uppercase tracking-widest">{item.class}</span>
                      <span className="text-[9px] bg-brand-accent/5 px-1.5 py-0.5 rounded text-brand-accent/60 uppercase tracking-widest">{item.subCategory}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none" />

        <header className="h-16 border-b border-white/5 bg-brand-primary/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent/20 border border-brand-accent/30 rounded-full flex items-center justify-center stellar-glow">
              <Bot className="text-brand-accent w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">Polaris Brain</h1>
              <p className="text-[10px] text-brand-accent font-medium uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 bg-brand-accent rounded-full animate-pulse" />
                En ligne
              </p>
            </div>
          </div>
        </header>

        {!apiKey && !isConfiguring && (
          <div className="absolute inset-0 z-20 bg-brand-primary/60 backdrop-blur-sm flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-zinc-900 border border-white/10 p-10 rounded-[2.5rem] shadow-2xl max-w-md text-center glass-panel"
            >
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-amber-500 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-4 text-white">IA Non Connectée</h2>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                Pour que le robot puisse répondre, tu dois d'abord insérer une clé magique (API Key) dans la page d'administration.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-brand-accent text-brand-primary font-bold px-8 py-3 rounded-xl hover:bg-white transition-all stellar-glow"
                >
                  Vérifier à nouveau
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest justify-center mb-2">
                  <Settings className="w-3 h-3" />
                  Utilise le bouton en bas à droite
                </div>
              </div>
            </motion.div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-3xl",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  msg.role === 'user' ? "bg-brand-accent border-brand-accent/30 stellar-glow" : "bg-white/10 border-white/10"
                )}>
                  {msg.role === 'user' ? <User className="text-brand-primary w-4 h-4" /> : <Bot className="text-brand-accent w-4 h-4" />}
                </div>
                <div className={cn(
                  "px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-brand-accent text-brand-primary font-medium rounded-tr-none" 
                    : "bg-white/5 border border-white/10 rounded-tl-none text-zinc-300 backdrop-blur-sm"
                )}>
                  <div className="markdown-body">
                    <ReactMarkdown 
                      remarkPlugins={[remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex gap-4 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                <Bot className="text-brand-accent w-4 h-4" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 rounded-tl-none flex items-center gap-2 backdrop-blur-sm">
                <Loader2 className="w-4 h-4 animate-spin text-brand-accent" />
                <span className="text-sm text-zinc-500">Le robot réfléchit...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-gradient-to-t from-brand-primary via-brand-primary to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              placeholder="Pose ta question ici..."
              className="w-full pl-6 pr-16 py-4 bg-white/5 border border-white/10 rounded-2xl shadow-2xl focus:outline-none focus:ring-2 focus:ring-brand-accent/30 transition-all text-white placeholder:text-zinc-600 backdrop-blur-xl"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-brand-accent text-brand-primary rounded-xl flex items-center justify-center hover:bg-white transition-all disabled:opacity-50 stellar-glow"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase tracking-widest font-bold">
            Astarté AI • SuccessPolaris Astral Palace
          </p>
        </div>
      </div>
    </div>
  );
}
