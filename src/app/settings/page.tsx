"use client";

import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import React, { useState, useEffect } from "react";
import { Save, Globe, User, Shield, AlertCircle, CheckCircle } from "lucide-react";

export default function SettingsPage() {
  const { currency, setCurrency } = useSettings();
  const { profile, refreshProfile, user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (profile?.full_name) {
      setFullName(profile.full_name);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    setErrorMsg("");

    try {
      if (profile) {
        const { error } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            currency: currency,
          })
          .eq("id", profile.id);

        if (error) {
          setErrorMsg("Impossible de mettre à jour le profil.");
        } else {
          setSuccess(true);
          await refreshProfile();
          setTimeout(() => setSuccess(false), 3000);
        }
      }
    } catch (err) {
      setErrorMsg("Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Paramètres</h1>
        <p className="text-sm text-slate-500 font-medium">Gérez vos préférences de compte et d'application</p>
      </div>

      {success && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm rounded-2xl">
          <CheckCircle size={18} className="flex-shrink-0" />
          <p>Paramètres enregistrés avec succès !</p>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm rounded-2xl">
          <AlertCircle size={18} className="flex-shrink-0" />
          <p>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profil Section */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
            <User className="text-indigo-500" size={20} />
            Profil Propriétaire
          </h2>
          
          <div className="max-w-md space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-semibold text-slate-700 mb-2">
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="block w-full px-4 py-2.5 text-base border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl border bg-slate-50 text-slate-900"
                placeholder="Votre nom complet"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Adresse email (Non modifiable)
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="block w-full px-4 py-2.5 text-base border-slate-200 rounded-xl border bg-slate-100 text-slate-400 cursor-not-allowed sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Préférences Régionales */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-2">
            <Globe className="text-indigo-500" size={20} />
            Préférences Régionales
          </h2>
          
          <div className="max-w-md space-y-6">
            <div>
              <label htmlFor="currency" className="block text-sm font-semibold text-slate-700 mb-2">
                Devise par défaut
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="block w-full pl-3 pr-10 py-2.5 text-base border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl border bg-slate-50 text-slate-900"
              >
                <option value="XAF">Franc CFA (XAF)</option>
                <option value="EUR">Euro (€)</option>
                <option value="USD">Dollar Américain ($)</option>
                <option value="CAD">Dollar Canadien ($ CA)</option>
              </select>
              <p className="mt-2 text-sm text-slate-500">
                Cette devise sera utilisée sur tous vos tableaux de bord et rapports financiers.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-start">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Save size={16} />
                Enregistrer les modifications
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
