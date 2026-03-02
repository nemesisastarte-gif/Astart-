import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, BookOpen, ChevronRight, Search, AlertTriangle, Settings } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { ChatMessage, SheetRow } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Bonjour ! Je suis ton assistant magique. Comment puis-je t\'aider aujourd\'hui ?' }
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
            { category: 'Maths', subCategory: 'Addition', fileName: 'Les bases de l\'addition', fileLink: '#' },
            { category: 'Maths', subCategory: 'Soustraction', fileName: 'Soustraire des nombres', fileLink: '#' },
            { category: 'Français', subCategory: 'Conjugaison', fileName: 'Le présent de l\'indicatif', fileLink: '#' },
            { category: 'Sciences', subCategory: 'Plantes', fileName: 'Comment poussent les fleurs', fileLink: '#' },
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
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: "Tu es un assistant pédagogique bienveillant pour des enfants. Réponds simplement et clairement. Si la question porte sur un sujet scolaire, essaie de voir si tu peux mentionner des catégories comme Maths, Français ou Sciences."
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
    <div className="flex h-screen bg-[#f8f9fa]">
      {/* Sidebar - Knowledge Base */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col hidden md:flex">
        <div className="p-6 border-bottom border-gray-100">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-brand-accent rounded-lg flex items-center justify-center">
              <BookOpen className="text-white w-5 h-5" />
            </div>
            <h2 className="font-bold text-lg">Bibliothèque</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Rechercher un document..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-brand-accent/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {['Maths', 'Français', 'Sciences'].map(cat => (
            <div key={cat}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{cat}</h3>
              <div className="space-y-1">
                {filteredKnowledge.filter(k => k.category === cat).map((item, idx) => (
                  <button key={idx} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 group transition-colors flex items-center justify-between">
                    <span className="text-sm text-gray-600 group-hover:text-brand-accent truncate">{item.fileName}</span>
                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-brand-accent" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
              <Bot className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-sm">Astarté AI</h1>
              <p className="text-[10px] text-green-500 font-medium uppercase tracking-widest flex items-center gap-1">
                <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                En ligne
              </p>
            </div>
          </div>
        </header>

        {!apiKey && !isConfiguring && (
          <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-gray-200 p-10 rounded-[2.5rem] shadow-2xl max-w-md text-center"
            >
              <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="text-amber-600 w-10 h-10" />
              </div>
              <h2 className="text-2xl font-black mb-4">IA Non Connectée</h2>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                Pour que le robot puisse répondre, tu dois d'abord insérer une clé magique (API Key) dans la page d'administration.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => window.location.reload()}
                  className="bg-black text-white font-bold px-8 py-3 rounded-xl hover:bg-brand-accent transition-all"
                >
                  Vérifier à nouveau
                </button>
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest justify-center mb-2">
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
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === 'user' ? "bg-brand-accent" : "bg-black"
                )}>
                  {msg.role === 'user' ? <User className="text-white w-4 h-4" /> : <Bot className="text-white w-4 h-4" />}
                </div>
                <div className={cn(
                  "px-5 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                  msg.role === 'user' 
                    ? "bg-brand-accent text-white rounded-tr-none" 
                    : "bg-white border border-gray-100 rounded-tl-none text-gray-700"
                )}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <div className="flex gap-4 max-w-3xl mr-auto">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center shrink-0">
                <Bot className="text-white w-4 h-4" />
              </div>
              <div className="px-5 py-3 rounded-2xl bg-white border border-gray-100 rounded-tl-none flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                <span className="text-sm text-gray-400">Le robot réfléchit...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-8 bg-gradient-to-t from-[#f8f9fa] via-[#f8f9fa] to-transparent">
          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              placeholder="Pose ta question ici..."
              className="w-full pl-6 pr-16 py-4 bg-white border border-gray-200 rounded-2xl shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-accent/20 transition-all"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center hover:bg-brand-accent transition-colors disabled:opacity-50 disabled:hover:bg-black"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-400 mt-4">
            Astarté AI peut faire des erreurs. Vérifie les informations importantes.
          </p>
        </div>
      </div>
    </div>
  );
}
