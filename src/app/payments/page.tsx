"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { CreditCard, Search, Calendar, ChevronLeft, ChevronRight, Check, AlertCircle, X, Info, Coins, PlusCircle } from "lucide-react";

interface Payment {
  id: string;
  period_month: number;
  period_year: number;
  amount_expected: number;
  amount_paid: number;
  paid_at: string | null;
  payment_method: string | null;
  status: string;
  notes: string | null;
  tenant_id: string;
  property_id: string;
  tenants: {
    first_name: string;
    last_name: string;
  } | null;
  properties: {
    name: string;
  } | null;
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Form State
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Virement");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const monthsList = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*, tenants(first_name, last_name), properties(name)")
        .eq("period_month", selectedMonth)
        .eq("period_year", selectedYear)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPayments((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, selectedMonth, selectedYear]);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const handleGeneratePayments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch active tenants for this month/year (active = true, entry_date <= selected period)
      // entry_date format is YYYY-MM-DD
      const periodDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-28`; // approximation of end of month
      
      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, property_id, rent_amount, entry_date, exit_date, properties(charges_amount)")
        .eq("active", true)
        .lte("entry_date", periodDateStr);

      if (tenantsError) throw tenantsError;

      if (!tenants || tenants.length === 0) {
        alert("Aucun locataire actif trouvé pour générer les loyers.");
        setLoading(false);
        return;
      }

      // Filter out tenants whose exit date is before the current month
      const activeTenants = tenants.filter((t) => {
        if (!t.exit_date) return true;
        const exitDate = new Date(t.exit_date);
        const currentPeriodDate = new Date(selectedYear, selectedMonth - 1, 1);
        return exitDate >= currentPeriodDate;
      });

      // 2. Prepare payments insertion payloads
      const paymentsPayloads = activeTenants.map((t) => {
        // Rent + charges
        const charges = (t.properties as any)?.charges_amount || 0;
        const expected = t.rent_amount + charges;
        
        return {
          user_id: user.id,
          tenant_id: t.id,
          property_id: t.property_id,
          period_month: selectedMonth,
          period_year: selectedYear,
          amount_expected: expected,
          amount_paid: 0,
          status: "En attente",
        };
      });

      // Insert (avoiding duplicates if possible, although user wouldn't click if payments already loaded)
      // Check for already generated
      if (payments.length > 0) {
        const confirmRegen = confirm("Des paiements existent déjà pour cette période. Souhaitez-vous générer des paiements pour les locataires manquants ?");
        if (!confirmRegen) {
          setLoading(false);
          return;
        }

        // Filter out payloads that already have matching tenant_id in payments list
        const existingTenantIds = new Set(payments.map(p => p.tenant_id));
        const newPayloads = paymentsPayloads.filter(p => !existingTenantIds.has(p.tenant_id));

        if (newPayloads.length === 0) {
          alert("Tous les paiements ont déjà été générés pour ce mois.");
          setLoading(false);
          return;
        }

        const { error: insertError } = await supabase.from("payments").insert(newPayloads);
        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase.from("payments").insert(paymentsPayloads);
        if (insertError) throw insertError;
      }

      fetchPayments();
    } catch (err: any) {
      alert("Erreur lors de la génération : " + err.message);
      setLoading(false);
    }
  };

  const openPaymentModal = (p: Payment) => {
    setSelectedPayment(p);
    setAmountPaid(p.amount_expected.toString());
    setPaidAt(new Date().toISOString().split("T")[0]);
    setPaymentMethod(p.payment_method || "Virement");
    setNotes(p.notes || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayment) return;
    setSubmitting(true);
    setFormError("");

    const paid = parseFloat(amountPaid);
    const expected = selectedPayment.amount_expected;
    let status = "Payé";

    if (paid === 0) {
      status = "Impayé";
    } else if (paid < expected) {
      status = "Partiel";
    }

    try {
      const { error } = await supabase
        .from("payments")
        .update({
          amount_paid: paid,
          paid_at: paid > 0 ? paidAt : null,
          payment_method: paid > 0 ? paymentMethod : null,
          status: status,
          notes: notes || null,
        })
        .eq("id", selectedPayment.id);

      if (error) throw error;

      setIsModalOpen(false);
      fetchPayments();
    } catch (err: any) {
      setFormError(err.message || "Une erreur s'est produite.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickPay = async (p: Payment) => {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          amount_paid: p.amount_expected,
          paid_at: new Date().toISOString(),
          payment_method: "Virement",
          status: "Payé",
        })
        .eq("id", p.id);

      if (error) throw error;
      fetchPayments();
    } catch (err) {
      console.error(err);
    }
  };

  // Filters
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.tenants?.first_name.toLowerCase().includes(search.toLowerCase()) ||
      p.tenants?.last_name.toLowerCase().includes(search.toLowerCase()) ||
      p.properties?.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
            <CreditCard className="text-indigo-600" />
            Suivi des Paiements & Loyers
          </h1>
          <p className="text-sm text-slate-500 font-medium">Gérez la facturation et encaissez les loyers</p>
        </div>

        {/* Date Selector widget */}
        <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm self-start sm:self-center">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-bold text-slate-800 w-32 text-center select-none">
            {monthsList[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Generation Bar / Alert */}
      {payments.length === 0 && !loading && (
        <div className="bg-slate-900 text-white rounded-3xl p-8 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[150%] rounded-full bg-indigo-500/10 blur-[80px]" />
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold">Aucun loyer généré pour ce mois</h3>
            <p className="text-slate-400 text-sm max-w-xl">
              Vous pouvez générer automatiquement les échéances mensuelles pour tous vos locataires actuellement actifs.
            </p>
          </div>
          <button
            onClick={handleGeneratePayments}
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all relative z-10 flex items-center gap-2 hover:shadow-lg hover:shadow-indigo-500/25"
          >
            <PlusCircle size={18} />
            Générer les Loyers
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher par locataire ou bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-50/50 focus:bg-white rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-full md:w-auto"
          >
            <option value="">Tous les statuts</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="Impayé">Impayé</option>
            <option value="En attente">En attente</option>
          </select>

          {payments.length > 0 && (
            <button
              onClick={handleGeneratePayments}
              className="px-4 py-2.5 border border-dashed border-indigo-200 hover:border-indigo-500 text-indigo-600 hover:bg-indigo-50/50 rounded-xl text-sm font-semibold transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              Générer manquants
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 animate-pulse">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
              <div className="h-5 bg-slate-100 rounded w-1/3"></div>
              <div className="h-5 bg-slate-100 rounded w-24"></div>
              <div className="h-8 bg-slate-100 rounded w-16"></div>
            </div>
          ))}
        </div>
      ) : payments.length > 0 && filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center text-slate-500">
          Aucun résultat correspondant aux filtres.
        </div>
      ) : payments.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Locataire</th>
                  <th className="px-6 py-4">Bien</th>
                  <th className="px-6 py-4">Attendu</th>
                  <th className="px-6 py-4">Perçu</th>
                  <th className="px-6 py-4">Statut</th>
                  <th className="px-6 py-4">Mode / Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900">
                        {p.tenants ? `${p.tenants.last_name} ${p.tenants.first_name}` : "Inconnu"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-700">{p.properties?.name || "N/A"}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {formatCurrency(p.amount_expected)}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-900">
                      {formatCurrency(p.amount_paid)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          p.status === "Payé"
                            ? "bg-emerald-50 text-emerald-600"
                            : p.status === "Partiel"
                            ? "bg-amber-50 text-amber-600"
                            : p.status === "Impayé"
                            ? "bg-rose-50 text-rose-600"
                            : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {p.amount_paid > 0 && p.paid_at ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-700">{p.payment_method}</span>
                          <span className="text-xs text-slate-400">
                            Le {new Date(p.paid_at).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {p.status !== "Payé" && (
                          <button
                            onClick={() => handleQuickPay(p)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold transition-all border border-emerald-100"
                            title="Marquer comme payé"
                          >
                            Paiement total
                          </button>
                        )}
                        <button
                          onClick={() => openPaymentModal(p)}
                          className="px-3 py-1.5 border border-slate-200 hover:border-indigo-500 text-slate-600 hover:text-indigo-600 rounded-lg text-xs font-bold transition-all"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal - Edit/Record Payment */}
      {isModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 flex flex-col p-8 space-y-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-all"
            >
              <X size={20} />
            </button>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Enregistrer un paiement</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Locataire : {selectedPayment.tenants?.last_name} {selectedPayment.tenants?.first_name}
              </p>
              <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                Loyer attendu : {formatCurrency(selectedPayment.amount_expected)}
              </p>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-600 text-xs rounded-xl">
                <AlertCircle size={16} />
                <p>{formError}</p>
              </div>
            )}

            <form onSubmit={handleSavePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Montant perçu *</label>
                <input
                  type="number"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date de paiement *</label>
                <input
                  type="date"
                  required
                  value={paidAt}
                  onChange={(e) => setPaidAt(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mode de paiement *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="block w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Virement">Virement</option>
                  <option value="Espèces">Espèces</option>
                  <option value="Chèque">Chèque</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note libre (optionnel)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-200 bg-slate-50 rounded-xl text-sm focus:outline-none min-h-[60px]"
                  placeholder="Ex: Reçu en retard, retard justifié..."
                />
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
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Confirmer"
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
