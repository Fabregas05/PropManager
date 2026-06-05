"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { Building2, Users, Wallet, TrendingUp, Download, Plus, Calendar, AlertCircle } from "lucide-react";
import Link from "next/link";

interface MonthlyStat {
  month: string;
  amount: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useSettings();

  const [loading, setLoading] = useState(true);
  const [totalProperties, setTotalProperties] = useState(0);
  const [activeTenants, setActiveTenants] = useState(0);
  const [currentMonthRevenue, setCurrentMonthRevenue] = useState(0);
  const [currentMonthExpected, setCurrentMonthExpected] = useState(0);
  const [occupancyRate, setOccupancyRate] = useState(0);

  // Payments breakdown for current month
  const [paidCount, setPaidCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);

  // Revenue chart history (last 6 months)
  const [chartData, setChartData] = useState<MonthlyStat[]>([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // 1-12
      const currentYear = now.getFullYear();

      // 1. Fetch total properties
      const { count: propCount, error: propError } = await supabase
        .from("properties")
        .select("*", { count: "exact", head: true });

      if (propError) throw propError;
      setTotalProperties(propCount || 0);

      // 2. Fetch active tenants
      const { count: tenantCount, error: tenantError } = await supabase
        .from("tenants")
        .select("*", { count: "exact", head: true })
        .eq("active", true);

      if (tenantError) throw tenantError;
      setActiveTenants(tenantCount || 0);

      // Occupancy Rate calculation
      const totalProps = propCount || 0;
      const occupiedProps = tenantCount || 0;
      setOccupancyRate(totalProps > 0 ? Math.round((occupiedProps / totalProps) * 100) : 0);

      // 3. Fetch payments for the current month
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("amount_expected, amount_paid, status")
        .eq("period_month", currentMonth)
        .eq("period_year", currentYear);

      if (paymentsError) throw paymentsError;

      let paidSum = 0;
      let expectedSum = 0;
      let paidC = 0;
      let pendingC = 0;
      let lateC = 0;

      if (payments && payments.length > 0) {
        payments.forEach((p) => {
          paidSum += p.amount_paid || 0;
          expectedSum += p.amount_expected || 0;
          if (p.status === "Payé") {
            paidC++;
          } else if (p.status === "En attente") {
            pendingC++;
          } else if (p.status === "Partiel" || p.status === "Impayé") {
            lateC++;
          }
        });
      }

      setCurrentMonthRevenue(paidSum);
      setCurrentMonthExpected(expectedSum);
      setPaidCount(paidC);
      setPendingCount(pendingC);
      setLateCount(lateC);

      // 4. Fetch last 6 months payments for chart history
      // We will loop back 6 months from now
      const statsHistory: MonthlyStat[] = [];
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const y = d.getFullYear();

        const { data: histPayments, error: histError } = await supabase
          .from("payments")
          .select("amount_paid")
          .eq("period_month", m)
          .eq("period_year", y);

        if (histError) throw histError;

        const monthlyPaid = histPayments?.reduce((sum, p) => sum + (p.amount_paid || 0), 0) || 0;
        statsHistory.push({
          month: `${monthNames[m - 1]}`,
          amount: monthlyPaid,
        });
      }

      setChartData(statsHistory);
    } catch (err) {
      console.error("Error loading dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  // Calculations for display
  const receivedPercentage = currentMonthExpected > 0 ? Math.round((currentMonthRevenue / currentMonthExpected) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Vue d'ensemble</h1>
          <p className="text-sm text-slate-500 font-medium">Suivi de l'activité de vos biens et locataires</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/properties"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/25 transition-all justify-center"
          >
            <Plus size={16} />
            Nouveau Bien
          </Link>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Biens" 
          amount={loading ? "..." : totalProperties.toString()} 
          percentage="" 
          isPositive={true} 
          icon={<Building2 size={24} />} 
          theme="indigo" 
        />
        <StatCard 
          title="Locataires Actifs" 
          amount={loading ? "..." : activeTenants.toString()} 
          percentage="" 
          isPositive={true} 
          icon={<Users size={24} />} 
          theme="amber" 
        />
        <StatCard 
          title="Loyers Perçus (Mois)" 
          amount={loading ? "..." : formatCurrency(currentMonthRevenue)} 
          percentage={currentMonthExpected > 0 ? `${receivedPercentage}% de l'attendu` : ""} 
          isPositive={true} 
          icon={<Wallet size={24} />} 
          theme="emerald" 
        />
        <StatCard 
          title="Taux d'Occupation" 
          amount={loading ? "..." : `${occupancyRate}%`} 
          percentage="" 
          isPositive={occupancyRate >= 80} 
          icon={<TrendingUp size={24} />} 
          theme="rose" 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evolution Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Évolution des Revenus</h2>
              <p className="text-sm text-slate-500 mt-1">Comparatif des encaissements des 6 derniers mois</p>
            </div>
          </div>
          
          <div className="h-[280px] flex items-end justify-between px-2 relative mt-4">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[0,1,2,3,4].map(i => (
                <div key={i} className="w-full border-t border-slate-100/80"></div>
              ))}
            </div>
            
            {/* Chart Bars */}
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm font-medium">
                Chargement de l'historique...
              </div>
            ) : chartData.length === 0 || chartData.every(d => d.amount === 0) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm font-medium p-4">
                <AlertCircle className="mb-2 text-indigo-500" size={24} />
                Aucun historique de paiement enregistré. Générez des échéances et encaissez des loyers.
              </div>
            ) : (
              chartData.map((d, i) => {
                // Find maximum amount to calculate heights relatively
                const maxVal = Math.max(...chartData.map(c => c.amount), 1);
                const heightPercent = Math.max((d.amount / maxVal) * 90, 5); // min 5% for visibility

                return (
                  <div key={i} className="w-12 flex flex-col items-center gap-3 relative z-10 group cursor-pointer">
                    {/* Tooltip on hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-xs font-semibold py-1.5 px-3 rounded-xl opacity-0 group-hover:opacity-100 transition-all transform group-hover:-translate-y-1 shadow-lg pointer-events-none whitespace-nowrap">
                      {formatCurrency(d.amount)}
                    </div>
                    {/* Bar */}
                    <div className="w-full bg-indigo-100/50 rounded-t-xl relative overflow-hidden group-hover:bg-indigo-200/50 transition-colors" style={{ height: `200px` }}>
                      <div className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl group-hover:from-indigo-500 group-hover:to-indigo-300 transition-colors" style={{ height: `${heightPercent}%` }}></div>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{d.month}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
        
        {/* Pie-chart / status of rents this month */}
        <div className="bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 p-8 flex flex-col">
          <div>
            <h2 className="text-lg font-bold text-slate-900">État des Loyers</h2>
            <p className="text-sm text-slate-500 mt-1">Échéances du mois en cours</p>
          </div>
          
          <div className="flex-1 flex flex-col justify-center items-center mt-6">
            {loading ? (
              <div className="w-48 h-48 rounded-full border-[20px] border-slate-50 flex items-center justify-center text-slate-400 text-sm font-semibold">
                Chargement...
              </div>
            ) : currentMonthExpected === 0 ? (
              <div className="w-48 h-48 rounded-full border-[20px] border-slate-100 flex items-center justify-center text-center p-6 text-slate-400 text-xs font-medium">
                Pas de loyers générés
              </div>
            ) : (
              <div className="relative w-48 h-48 rounded-full border-[20px] border-slate-50 border-t-emerald-500 border-r-emerald-500 border-b-amber-400 border-l-rose-500 shadow-inner flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center flex-col bg-white rounded-full m-1 shadow-sm">
                  <span className="text-sm font-medium text-slate-500">Recouvré</span>
                  <span className="text-2xl font-extrabold text-slate-900">{receivedPercentage}%</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600 font-medium"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Payés</div>
              <span className="font-bold text-slate-900">{loading ? "..." : paidCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-600 font-medium"><span className="w-3 h-3 rounded-full bg-amber-400"></span> En attente</div>
              <span className="font-bold text-slate-900">{loading ? "..." : pendingCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center justify-between text-sm w-full">
                <div className="flex items-center gap-2 text-slate-600 font-medium"><span className="w-3 h-3 rounded-full bg-rose-500"></span> En retard / Partiel</div>
                <span className="font-bold text-slate-900">{loading ? "..." : lateCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
