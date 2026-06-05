"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { Plus, Search, Building2, MapPin, Edit3, Trash2, X, Home, Euro, Sparkles, AlertCircle } from "lucide-react";

interface Property {
  id: string;
  name: string;
  address: string;
  type: string;
  surface: number | null;
  rooms: number | null;
  rent_amount: number;
  charges_amount: number;
  deposit_amount: number;
  status: string;
  notes: string | null;
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [type, setType] = useState("Appartement");
  const [surface, setSurface] = useState("");
  const [rooms, setRooms] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [chargesAmount, setChargesAmount] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [status, setStatus] = useState("Vacant");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching properties:", error);
      } else {
        setProperties(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchProperties();
    }
  }, [user]);

  const openAddModal = () => {
    setEditingProperty(null);
    setName("");
    setAddress("");
    setType("Appartement");
    setSurface("");
    setRooms("");
    setRentAmount("");
    setChargesAmount("0");
    setDepositAmount("0");
    setStatus("Vacant");
    setNotes("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setName(property.name);
    setAddress(property.address);
    setType(property.type);
    setSurface(property.surface?.toString() || "");
    setRooms(property.rooms?.toString() || "");
    setRentAmount(property.rent_amount.toString());
    setChargesAmount(property.charges_amount.toString());
    setDepositAmount(property.deposit_amount.toString());
    setStatus(property.status);
    setNotes(property.notes || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce bien ? Tous les locataires et paiements associés pourraient être affectés.")) return;
    try {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        setProperties(properties.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFormError("");

    const payload = {
      user_id: user.id,
      name,
      address,
      type,
      surface: surface ? parseFloat(surface) : null,
      rooms: rooms ? parseInt(rooms) : null,
      rent_amount: parseFloat(rentAmount),
      charges_amount: parseFloat(chargesAmount) || 0,
      deposit_amount: parseFloat(depositAmount) || 0,
      status,
      notes: notes || null,
    };

    try {
      if (editingProperty) {
        const { error } = await supabase
          .from("properties")
          .update(payload)
          .eq("id", editingProperty.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("properties").insert([payload]);

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchProperties();
    } catch (err: any) {
      setFormError(err.message || "Une erreur s'est produite lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Filters
  const filteredProperties = properties.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter ? p.type === typeFilter : true;
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
            <Building2 className="text-indigo-600" />
            Biens Immobiliers
          </h1>
          <p className="text-sm text-slate-500 font-medium">Gérez votre parc immobilier en toute simplicité</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 transition-all w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          Nouveau Bien
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom ou adresse..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Tous les types</option>
            <option value="Studio">Studio</option>
            <option value="Appartement">Appartement</option>
            <option value="Maison">Maison</option>
            <option value="Bureau">Bureau</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="">Tous les statuts</option>
            <option value="Vacant">Vacant</option>
            <option value="Loué">Loué</option>
            <option value="En travaux">En travaux</option>
          </select>
        </div>
      </div>

      {/* Grid of properties */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4 animate-pulse">
              <div className="h-6 bg-slate-100 rounded w-2/3"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-20 bg-slate-100 rounded-xl"></div>
              <div className="h-10 bg-slate-100 rounded-xl w-1/3"></div>
            </div>
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto">
            <Building2 size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800">Aucun bien trouvé</h3>
          <p className="text-slate-500 text-sm">
            {search || typeFilter || statusFilter
              ? "Essayez de modifier vos filtres de recherche ou créez un nouveau bien."
              : "Commencez par ajouter votre premier bien immobilier pour configurer votre parc."}
          </p>
          <button
            onClick={openAddModal}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Ajouter un Bien
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] hover:shadow-xl hover:shadow-slate-100 border border-slate-100 p-6 flex flex-col justify-between transition-all group relative overflow-hidden"
            >
              {/* Top border highlight on hover */}
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-indigo-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      p.status === "Loué"
                        ? "bg-emerald-50 text-emerald-600"
                        : p.status === "Vacant"
                        ? "bg-amber-50 text-amber-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {p.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg">
                    {p.type}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                  {p.name}
                </h3>
                <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                  <MapPin size={14} className="text-slate-400" />
                  <span className="line-clamp-1">{p.address}</span>
                </p>

                {/* Characteristics */}
                <div className="grid grid-cols-2 gap-3 mt-5 p-3.5 bg-slate-50/70 rounded-xl text-slate-600 text-xs font-semibold">
                  <div>
                    <span className="text-slate-400 block font-medium">Surface</span>
                    <span className="text-slate-800">{p.surface ? `${p.surface} m²` : "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Pièces</span>
                    <span className="text-slate-800">{p.rooms ? `${p.rooms} pièces` : "N/A"}</span>
                  </div>
                </div>
              </div>

              {/* Rent Details & Action buttons */}
              <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Loyer Mensuel CC</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {formatCurrency(p.rent_amount + (p.charges_amount || 0))}
                  </span>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:text-indigo-600 text-slate-500 rounded-xl transition-all"
                    title="Modifier"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2 border border-slate-200 hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 text-slate-500 rounded-xl transition-all"
                    title="Supprimer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal - Add/Edit Property */}
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
                {editingProperty ? "Modifier le bien" : "Ajouter un nouveau bien"}
              </h2>
              <p className="text-sm text-slate-500 font-medium">Saisissez les informations techniques et financières.</p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl">
                <AlertCircle size={16} />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom du bien / Titre descriptif *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Ex: Studio n°4 bis - Résidence Central"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse exacte *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    placeholder="Ex: 14 rue de la République, 75001 Paris"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type de bien *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Studio">Studio</option>
                    <option value="Appartement">Appartement</option>
                    <option value="Maison">Maison</option>
                    <option value="Bureau">Bureau</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Statut locatif *</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="block w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Vacant">Vacant</option>
                    <option value="Loué">Loué</option>
                    <option value="En travaux">En travaux</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Surface (m²)</label>
                  <input
                    type="number"
                    value={surface}
                    onChange={(e) => setSurface(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 34"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nombre de pièces</label>
                  <input
                    type="number"
                    value={rooms}
                    onChange={(e) => setRooms(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Loyer Hors Charges *</label>
                  <input
                    type="number"
                    required
                    value={rentAmount}
                    onChange={(e) => setRentAmount(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 650"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Charges estimées</label>
                  <input
                    type="number"
                    value={chargesAmount}
                    onChange={(e) => setChargesAmount(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 50"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dépôt de garantie</label>
                  <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="Ex: 1300"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Notes libres / Informations privées</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]"
                    placeholder="Détails du compteur d'eau, informations d'accès, code digicode..."
                  />
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
