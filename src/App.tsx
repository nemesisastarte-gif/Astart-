import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import AdminPanel from './components/AdminPanel';
import AdminDashboard from './components/AdminDashboard';
import { Settings, MessageSquare, ShieldAlert } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [view, setView] = useState<'chat' | 'astarte' | 'dashboard'>('chat');

  return (
    <div className="relative min-h-screen">
      {view === 'chat' && <ChatInterface />}
      {view === 'astarte' && <AdminPanel />}
      {view === 'dashboard' && <AdminDashboard />}
      
      {/* Navigation Controls */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-4 z-50">
        <div className="flex flex-col-reverse gap-3 items-end group">
          <button 
            onClick={() => setView('chat')}
            className={cn(
              "w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all border-2 border-white",
              view === 'chat' ? "bg-brand-accent text-white scale-110" : "bg-black text-white hover:scale-110"
            )}
            title="Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setView('astarte')}
            className={cn(
              "w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all border-2 border-white",
              view === 'astarte' ? "bg-brand-accent text-white scale-110" : "bg-black text-white hover:scale-110"
            )}
            title="Astarté (Clés)"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setView('dashboard')}
            className={cn(
              "w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all border-2 border-white",
              view === 'dashboard' ? "bg-brand-accent text-white scale-110" : "bg-black text-white hover:scale-110"
            )}
            title="Poste de Contrôle"
          >
            <ShieldAlert className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
