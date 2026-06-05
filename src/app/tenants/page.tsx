"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Plus, Search, Users, MapPin, Edit3, Trash2, X, AlertCircle, Calendar, Mail, Phone, CheckCircle, HelpCircle } from "lucide-react";

interface Tenant {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  birthdate: string | null;
  entry_date: string;
  exit_date: string | null;
  rent_amount: number;
  deposit_paid: boolean;
  active: boolean;
  property_id: string;
  properties: {
    name: string;
  } | null;
}

interface Property {
  id: string;
  name: string;
}

export default function TenantsPage() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [propertyFilter, setPropertyFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [depositPaid, setDepositPaid] = useState(false);
  const [active, setActive] = useState(true);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTenantsAndProperties = async () => {
    setLoading(true);
    try {
      // Fetch Tenants (with join on properties)
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });

      if (tenantError) throw tenantError;

      // Fetch Properties to link in form
      const { data: propData, error: propError } = await supabase
        .from("properties")
        .select("id, name")
        .order("name", { ascending: true });

      if (propError) throw propError;

      setTenants((tenantData as any) || []);
      setProperties(propData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTenantsAndProperties();
    }
  }, [user]);

  const openAddModal = () => {
    setEditingTenant(null);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setBirthdate("");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setExitDate("");
    setRentAmount("");
    setPropertyId(properties[0]?.id || "");
    setDepositPaid(false);
    setActive(true);
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: Tenant) => {
    setEditingTenant(t);
    setFirstName(t.first_name);
    setLastName(t.last_name);
    setEmail(t.email || "");
    setPhone(t.phone || "");
    setBirthdate(t.birthdate || "");
    setEntryDate(t.entry_date);
    setExitDate(t.exit_date || "");
    setRentAmount(t.rent_amount.toString());
    setPropertyId(t.property_id);
    setDepositPaid(t.deposit_paid);
    setActive(t.active);
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce locataire ? Tous ses paiements associés seront également affectés.")) return;
    try {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        setTenants(tenants.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!propertyId) {
      setFormError("Vous devez associer ce locataire à un bien existant.");
      return;
    }
    setSubmitting(true);
    setFormError("");

    const payload = {
      user_id: user.id,
      property_id: propertyId,
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      birthdate: birthdate || null,
      entry_date: entryDate,
      exit_date: exitDate || null,
      rent_amount: parseFloat(rentAmount),
      deposit_paid: depositPaid,
      active: active,
    };

    try {
      if (editingTenant) {
        const { error } = await supabase
          .from("tenants")
          .update(payload)
          .eq("id", editingTenant.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("tenants").insert([payload]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchTenantsAndProperties();
    } catch (err: any) {
      setFormError(err.message || "Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      `${t.first_name} ${t.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (t.email && t.email.toLowerCase().includes(search.toLowerCase()));
    const matchesProperty = propertyFilter ? t.property_id === propertyFilter : true;
    return matchesSearch && matchesProperty;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
            <Users className="text-indigo-600" />
            Locataires
          </h1>
          <p className="text-sm text-slate-500 font-medium">Gérez les dossiers et informations de vos locataires</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={properties.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 transition-all w-full sm:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          title={properties.length === 0 ? "Ajoutez d'abord un bien" : ""}
        >
          <Plus size={16} />
          Nouveau Locataire
        </button>
      </div>

      {properties.length === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-amber-800 text-sm flex gap-3">
          <AlertCircle className="flex-shrink-0 text-amber-600" />
          <p>
            <strong>Important :</strong> Vous devez ajouter au moins un <strong>Bien Immobilier</strong> avant de pouvoir y associer un locataire.
          </p>
        </div>
      )}

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={propertyFilter}
            onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-auto"
          >
            <option value="">Tous les biens</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List of tenants */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
              <div className="space-y-2 w-1/3">
                <div className="h-5 bg-slate-100 rounded w-2/3"></div>
                <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              </div>
              <div className="h-5 bg-slate-100 rounded w-24"></div>
              <div className="h-8 bg-slate-100 rounded w-12"></div>
            </div>
          ))}
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Users size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Aucun locataire trouvé</h3>
          <p className="text-slate-500 text-sm">
            {search || propertyFilter
              ? "Modifiez vos termes de recherche ou sélectionnez un autre bien."
              : "Ajoutez les coordonnées de vos locataires pour automatiser le suivi des loyers."}
          </p>
          <button
            onClick={openAddModal}
            disabled={properties.length === 0}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Plus size={16} />
            Ajouter un Locataire
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Nom / Prénom</th>
                  <th className="px-6 py-4">Bien loué</th>
                  <th className="px-6 py-4">Entrée / Loyer</th>
                  <th className="px-6 py-4">Statut Caution</th>
                  <th className="px-6 py-4">Statut Bail</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {t.last_name} {t.first_name}
                        </span>
                        <span className="text-xs text-slate-500 font-medium flex items-center gap-2 mt-1">
                          {t.email && (
                            <span className="flex items-center gap-1">
                              <Mail size={12} /> {t.email}
                            </span>
                          )}
                          {t.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={12} /> {t.phone}
                            </span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                        <MapPin size={14} className="text-slate-400" />
                        {t.properties?.name || "Bien non lié"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800">
                          {formatCurrency(t.rent_amount)}/mois
                        </span>
                        <span className="text-xs text-slate-500 font-medium mt-0.5">
                          Depuis le {new Date(t.entry_date).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.deposit_paid
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-rose-50 text-rose-600"
                        }`}
                      >
                        {t.deposit_paid ? "Caution Versée" : "Non versée"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          t.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.active ? "Actif" : "Inactif / Sorti"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(t)}
                          className="p-2 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all"
                          title="Modifier"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 text-slate-500 rounded-xl transition-all"
                          title="Supprimer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal - Add/Edit Tenant */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col p-8 space-y-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                {editingTenant ? "Modifier le dossier locataire" : "Ajouter un nouveau locataire"}
              </h2>
              <p className="text-sm text-slate-500 font-medium">Associez le locataire à un bien et renseignez ses coordonnées.</p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl">
                <AlertCircle size={16} />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bien Immobilier associé *</label>
                  <select
                    required
                    value={propertyId}
                    onChange={(e) => setPropertyId(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loyer de base Hors Charges *</label>
                  <input
                    type="number"
                    required
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 550"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: Paul"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom de famille *</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: Bertrand"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="paul.bertrand@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date de naissance</label>
                  <input
                    type="date"
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date d'entrée *</label>
                  <input
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date de sortie (optionnel)</label>
                  <input
                    type="date"
                    value={exitDate}
                    onChange={(e) => setExitDate(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none"
                  />
                </div>

                <div className="flex flex-col justify-center space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200/50">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={depositPaid}
                      onChange={(e) => setDepositPaid(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Dépôt de garantie versé
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                    />
                    Bail Actif (Locataire présent)
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Enregistrer"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
