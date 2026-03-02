import React, { useState, useEffect } from 'react';
import { Lock, Key, Plus, Trash2, ShieldCheck, LogOut, AlertCircle, BookOpen } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PolarisKey } from '@/src/types';
import { motion, AnimatePresence } from 'motion/react';
import CryptoJS from 'crypto-js';

export default function AdminPanel() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [keys, setKeys] = useState<PolarisKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchKeys();
    }
  }, [isAuthenticated]);

  const fetchKeys = async () => {
    try {
      const res = await fetch('/api/admin/keys');
      const data = await res.json();
      setKeys(data);
    } catch (err) {
      console.error("Failed to fetch keys");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newKeyValue) return;

    // Encrypt key before sending (simple demo encryption)
    const encrypted = CryptoJS.AES.encrypt(newKeyValue, 'secret-salt').toString();

    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: newKeyName, encrypted_key: encrypted })
      });
      if (res.ok) {
        setNewKeyName('');
        setNewKeyValue('');
        fetchKeys();
      }
    } catch (err) {
      console.error("Failed to add key");
    }
  };

  const handleDeleteKey = async (id: number) => {
    try {
      await fetch(`/api/admin/keys/${id}`, { method: 'DELETE' });
      fetchKeys();
    } catch (err) {
      console.error("Failed to delete key");
    }
  };

  const handleToggleKey = async (id: number, currentStatus: number) => {
    try {
      await fetch('/api/admin/keys/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      fetchKeys();
    } catch (err) {
      console.error("Failed to toggle key");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-accent/10 rounded-2xl flex items-center justify-center mb-4 border border-brand-accent/20">
              <Lock className="text-brand-accent w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white">Zone Astarté</h1>
            <p className="text-zinc-500 text-sm mt-2">Entrez le mot magique pour continuer</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Mot de passe</label>
              <input 
                type="password" 
                className="w-full bg-zinc-800 border-zinc-700 text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-accent/50 outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {isLoading ? "Vérification..." : "Accéder à la cachette"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-accent rounded-2xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
              <ShieldCheck className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Coffre-fort Astarté</h1>
              <p className="text-zinc-500 text-sm">Gestion des clés Polaris AI</p>
            </div>
          </div>
          <button 
            onClick={() => setIsAuthenticated(false)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm transition-all"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Add Key Form */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sticky top-8">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-accent" />
                Nouvelle Clé
              </h2>
              <form onSubmit={handleAddKey} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Nom de la clé</label>
                  <input 
                    type="text" 
                    placeholder="ex: Polaris-Prod-01"
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Valeur API Key</label>
                  <input 
                    type="password" 
                    placeholder="sk-polaris-..."
                    className="w-full bg-zinc-800 border-zinc-700 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-brand-accent/50 outline-none"
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-zinc-100 text-black font-bold py-2 rounded-xl hover:bg-white transition-all mt-4"
                >
                  Ajouter au coffre
                </button>
              </form>
            </div>
          </div>

          {/* Keys List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-brand-accent" />
              Clés Actives ({keys.length})
            </h2>
            
            <AnimatePresence>
              {keys.map((key) => (
                <motion.div 
                  key={key.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between group hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                      key.is_active ? "bg-brand-accent/20 text-brand-accent" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Key className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        {key.key_name}
                        {key.is_active ? (
                          <span className="text-[8px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded uppercase tracking-widest">Utilisable</span>
                        ) : (
                          <span className="text-[8px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded uppercase tracking-widest">Désactivée</span>
                        )}
                      </h3>
                      <p className="text-zinc-500 text-[10px] uppercase tracking-widest mt-1">
                        Ajoutée le {new Date(key.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleKey(key.id, key.is_active)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                        key.is_active 
                          ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700" 
                          : "bg-brand-accent text-white hover:bg-brand-accent/90"
                      )}
                    >
                      {key.is_active ? "Désactiver" : "Activer"}
                    </button>
                    <button 
                      onClick={() => handleDeleteKey(key.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {keys.length === 0 && (
              <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl">
                <Key className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                <p className="text-zinc-500">Aucune clé enregistrée dans le coffre.</p>
              </div>
            )}

            <div className="mt-12 p-6 bg-brand-accent/5 border border-brand-accent/20 rounded-3xl">
              <h3 className="text-brand-accent font-bold mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Note sur le Livre Magique (Google Sheets)
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Pour relier tes documents, assure-toi que ton Google Sheet est partagé (Lecture seule). 
                L'IA utilisera les colonnes <strong>Catégorie</strong>, <strong>Sous-catégorie</strong>, 
                <strong>Nom du fichier</strong> et <strong>Lien</strong> pour guider les élèves.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
