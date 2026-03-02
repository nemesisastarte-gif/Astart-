import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  History, 
  Settings as SettingsIcon, 
  Activity, 
  Users, 
  MessageSquare, 
  ShieldAlert,
  BarChart3,
  TrendingUp,
  Clock,
  ArrowRight,
  Lock,
  LogOut
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/src/lib/utils';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [newSheetId, setNewSheetId] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchSettings();
    }
  }, [isAuthenticated]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/settings');
      const data = await res.json();
      const settingsObj = data.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      setSettings(settingsObj);
      setNewSheetId(settingsObj.google_sheet_id || '');
    } catch (err) {
      console.error("Failed to fetch settings");
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      fetchSettings();
    } catch (err) {
      console.error("Failed to update setting");
    }
  };

  const fetchData = async () => {
    try {
      const [statsRes, historyRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/history')
      ]);
      setStats(await statsRes.json());
      setHistory(await historyRes.json());
    } catch (err) {
      console.error("Failed to fetch dashboard data");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login-super', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError("Accès refusé. Mot de passe incorrect.");
      }
    } catch (err) {
      setError("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-primary p-6 relative overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-[2rem] p-10 shadow-2xl backdrop-blur-xl relative z-10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-brand-accent rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-brand-accent/20 rotate-3 stellar-glow">
              <ShieldAlert className="text-brand-primary w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter italic stellar-text-glow">POSTE DE CONTRÔLE</h1>
            <p className="text-zinc-500 text-sm mt-3 font-medium">Réservé au Capitaine du Vaisseau</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-3">
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 w-5 h-5" />
                <input 
                  type="password" 
                  className="w-full bg-white/5 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-4 focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all placeholder:text-zinc-600"
                  placeholder="Mot de passe du Capitaine"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            
            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-red-400 text-xs bg-red-400/10 p-4 rounded-xl border border-red-400/20 flex items-center gap-3"
              >
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-accent text-brand-primary font-black py-4 rounded-2xl hover:bg-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 group stellar-glow"
            >
              {isLoading ? "Vérification..." : "Prendre les commandes"}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-primary text-zinc-100 flex relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-white/10 bg-white/5 backdrop-blur-xl flex flex-col p-6 relative z-10">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20 stellar-glow">
            <Activity className="text-brand-primary w-6 h-6" />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tight italic text-white stellar-text-glow">CAPITAINE</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Poste de Contrôle</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
            { id: 'history', label: 'Journal de bord', icon: History },
            { id: 'settings', label: 'Paramètres', icon: SettingsIcon },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all border",
                activeTab === item.id 
                  ? "bg-brand-accent text-brand-primary border-brand-accent/30 shadow-lg shadow-brand-accent/20 stellar-glow" 
                  : "text-zinc-500 border-transparent hover:bg-white/5 hover:text-white"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => setIsAuthenticated(false)}
          className="mt-auto flex items-center gap-3 px-4 py-3 text-zinc-600 hover:text-red-400 transition-colors font-bold text-sm"
        >
          <LogOut className="w-5 h-5" />
          Quitter le poste
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-10 relative z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Header Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Questions Totales', value: stats?.totalQuestions || 0, icon: MessageSquare, color: 'text-brand-accent' },
                  { label: 'Questions Aujourd\'hui', value: stats?.questionsToday || 0, icon: TrendingUp, color: 'text-green-400' },
                  { label: 'Élèves Actifs', value: '30+', icon: Users, color: 'text-purple-400' },
                  { label: 'Santé Système', value: '98%', icon: Activity, color: 'text-brand-accent' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2 bg-white/5 rounded-lg border border-white/10", stat.color)}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                    <h3 className="text-3xl font-black mt-1 text-white">{stat.value}</h3>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-white">
                    <BarChart3 className="w-5 h-5 text-brand-accent" />
                    Catégories Populaires
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats?.popularCategories || []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="category" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#020617', border: '1px solid #ffffff10', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                  <h3 className="text-lg font-bold mb-8 flex items-center gap-2 text-white">
                    <Activity className="w-5 h-5 text-brand-accent" />
                    Utilisation des Clés API
                  </h3>
                  <div className="space-y-6">
                    {stats?.keyUsage?.map((key: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-zinc-500">{key.key_name}</span>
                          <span className="text-zinc-300">{key.usage_count} / {key.max_usage}</span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(key.usage_count / key.max_usage) * 100}%` }}
                            className={cn(
                              "h-full rounded-full",
                              (key.usage_count / key.max_usage) > 0.8 ? "bg-red-500" : "bg-brand-accent"
                            )}
                          />
                        </div>
                      </div>
                    ))}
                    {(!stats?.keyUsage || stats.keyUsage.length === 0) && (
                      <p className="text-zinc-600 text-sm text-center py-10">Aucune clé API configurée</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-sm"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Journal de bord des questions</h3>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <Clock className="w-4 h-4" />
                  Mise à jour en temps réel
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-zinc-500 text-xs font-bold uppercase tracking-wider border-b border-white/10">
                      <th className="px-8 py-4">Heure</th>
                      <th className="px-8 py-4">Élève</th>
                      <th className="px-8 py-4">Question</th>
                      <th className="px-8 py-4">Catégorie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {history.map((item, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-4 text-xs text-zinc-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-8 py-4 text-sm font-medium text-zinc-300">
                          {item.user_email || 'Anonyme'}
                        </td>
                        <td className="px-8 py-4 text-sm text-zinc-400 max-w-md truncate">
                          {item.question}
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-[10px] font-bold uppercase text-brand-accent">
                            {item.category || 'Général'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl space-y-8"
            >
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-8 text-white">Livre Magique (Google Sheets)</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-zinc-500">ID du Classeur Google Sheets</label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="ex: 1A2B3C4D5E6F7G8H9I0J"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none text-white"
                        value={newSheetId}
                        onChange={(e) => setNewSheetId(e.target.value)}
                      />
                      <button 
                        onClick={() => updateSetting('google_sheet_id', newSheetId)}
                        className="bg-brand-accent text-brand-primary font-bold px-6 py-3 rounded-xl hover:bg-white transition-all stellar-glow"
                      >
                        Lier
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-600">
                      L'ID se trouve dans l'URL de ton Sheets : docs.google.com/spreadsheets/d/<strong>ID_ICI</strong>/edit
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-8 text-white">Paramètres du Robot</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-zinc-500">Mode de réponse</label>
                    <div className="grid grid-cols-3 gap-4">
                      {['Rapide', 'Équilibré', 'Précis'].map((mode) => (
                        <button 
                          key={mode}
                          className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:border-brand-accent transition-all text-zinc-400 hover:text-white"
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] backdrop-blur-sm">
                <h3 className="text-xl font-bold mb-8 text-white">Sécurité du Poste</h3>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-zinc-500">Changer le mot de passe du Capitaine</label>
                    <input 
                      type="password" 
                      placeholder="Nouveau mot de passe"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none text-white"
                    />
                  </div>
                  <button className="bg-brand-accent text-brand-primary font-black px-8 py-3 rounded-xl hover:bg-white transition-all stellar-glow">
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
