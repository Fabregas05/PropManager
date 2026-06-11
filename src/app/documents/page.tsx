"use client";

import React, { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/AuthContext";
import { Files, Plus, Download, Trash, FileText, File, FilePlus } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface DocumentItem {
  id: string;
  filename: string;
  storage_path: string;
  category: string;
  uploaded_at: string;
  property_id?: string | null;
  tenant_id?: string | null;
  properties?: { name: string } | null;
  tenants?: { first_name: string; last_name: string } | null;
}

export default function DocumentsPage() {
  const { user } = useAuth();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("Bail");
  const [uploading, setUploading] = useState(false);

  // associations
  const [properties, setProperties] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Generator state
  const [genTitle, setGenTitle] = useState("Quittance de Loyer");
  const [genRecipient, setGenRecipient] = useState("");
  const [genBody, setGenBody] = useState("Merci de votre paiement pour le mois.");
  const templateRef = useRef<HTMLDivElement | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*, properties(name), tenants(first_name, last_name), property_id, tenant_id")
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments((data as any) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPropertiesAndTenants = async () => {
    try {
      const { data: props } = await supabase.from('properties').select('id,name').order('name', { ascending: true });
      const { data: tnts } = await supabase.from('tenants').select('id,first_name,last_name').order('last_name', { ascending: true });
      setProperties(props || []);
      setTenants(tnts || []);
      setSelectedPropertyId(props?.[0]?.id || null);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) fetchDocuments();
  }, [user]);

  useEffect(() => {
    if (user) fetchPropertiesAndTenants();
  }, [user]);

  const handleUpload = async () => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const bucket = "documents";
      const path = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from("documents").insert([
        {
          user_id: user.id,
          property_id: selectedPropertyId,
          tenant_id: selectedTenantId,
          category,
          filename: file.name,
          storage_path: path,
        },
      ]);
      if (insertErr) throw insertErr;

      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      alert("Erreur lors de l'upload : " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (path: string) => {
    try {
      const bucket = "documents";
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
      if (error) throw error;
      const url = (data as any).signedUrl || (data as any).signed_url || (data as any).publicUrl;
      if (!url) throw new Error("Impossible de créer l'URL signée.");
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléchargement.");
    }
  };

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Supprimer ce document ?")) return;
    try {
      const bucket = "documents";
      await supabase.storage.from(bucket).remove([path]);
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      setDocuments(documents.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  const prefillGeneratorFromDocument = (d: DocumentItem) => {
    setGenTitle(d.filename.replace(/\.[^/.]+$/, ''));
    const recipient = d.tenants ? `${d.tenants.last_name} ${d.tenants.first_name}` : (d.properties?.name || '');
    setGenRecipient(recipient);
    setGenBody(`Document original: ${d.filename}\n\nDescription:`);
    setSelectedPropertyId((d as any).property_id || null);
    setSelectedTenantId((d as any).tenant_id || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const uploadGeneratedPdf = async (blob: Blob, filename: string, propId?: string | null, tenantId?: string | null) => {
    if (!user) return;
    try {
      // Use the Blob directly (cast to any) to avoid build-time TypeScript issues
      const fileToUpload = blob as any;
      const path = `${user.id}/generated/${Date.now()}_${filename}`;
      const { error: uploadErr } = await supabase.storage.from('documents').upload(path, fileToUpload as any);
      if (uploadErr) throw uploadErr;

      const { error: insertErr } = await supabase.from('documents').insert([
        {
          user_id: user.id,
          property_id: propId || null,
          tenant_id: tenantId || null,
          category: category,
          filename,
          storage_path: path,
        },
      ]);
      if (insertErr) throw insertErr;
      fetchDocuments();
      alert('PDF généré et sauvegardé dans Documents.');
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la sauvegarde du PDF.');
    }
  };

  const generatePdfFromTemplate = async (saveToDocuments = false) => {
    if (!templateRef.current) return;
    try {
      const el = templateRef.current;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'pt', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgProps = (pdf as any).getImageProperties(imgData);
      const imgWidth = pageWidth;
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      if (saveToDocuments) {
        const blob = pdf.output('blob');
        const filename = `${genTitle.replace(/\s+/g, '_')}.pdf`;
        await uploadGeneratedPdf(blob, filename, selectedPropertyId, selectedTenantId);
      } else {
        pdf.save(`${genTitle.replace(/\s+/g, '_')}.pdf`);
      }
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la génération PDF.');
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            Documents
          </h1>
          <p className="text-sm text-slate-500 font-medium">Gérez les baux, quittances et autres pièces jointes</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
          <label className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-2 rounded-xl shadow-sm cursor-pointer">
            <input
              type="file"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="hidden"
            />
            <Plus size={16} />
            <span className="text-sm font-medium">Choisir un fichier</span>
          </label>

          <select value={selectedPropertyId || ""} onChange={(e) => setSelectedPropertyId(e.target.value || null)} className="px-3 py-2 rounded-xl border border-slate-100 bg-white text-sm">
            <option value="">Associer à un bien (optionnel)</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select value={selectedTenantId || ""} onChange={(e) => setSelectedTenantId(e.target.value || null)} className="px-3 py-2 rounded-xl border border-slate-100 bg-white text-sm">
            <option value="">Associer à un locataire (optionnel)</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>{t.last_name} {t.first_name}</option>
            ))}
          </select>

          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-100 bg-white text-sm">
            <option>Bail</option>
            <option>Quittance</option>
            <option>Facture</option>
            <option>Autre</option>
          </select>

          <button onClick={handleUpload} disabled={!file || uploading} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all">
            {uploading ? 'Téléversement...' : 'Téléverser'}
          </button>
        </div>
      </div>

      {/* Generator panel */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold mb-2">Générateur de document</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="px-3 py-2 border rounded-xl" value={genTitle} onChange={(e)=>setGenTitle(e.target.value)} placeholder="Titre" />
          <input className="px-3 py-2 border rounded-xl" value={genRecipient} onChange={(e)=>setGenRecipient(e.target.value)} placeholder="Destinataire" />
          <select value={selectedPropertyId || ""} onChange={(e)=>setSelectedPropertyId(e.target.value || null)} className="px-3 py-2 border rounded-xl">
            <option value="">Bien (optionnel)</option>
            {properties.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={selectedTenantId || ""} onChange={(e)=>setSelectedTenantId(e.target.value || null)} className="px-3 py-2 border rounded-xl">
            <option value="">Locataire (optionnel)</option>
            {tenants.map(t=> <option key={t.id} value={t.id}>{t.last_name} {t.first_name}</option>)}
          </select>
        </div>
        <textarea className="w-full mt-3 p-3 border rounded-xl" rows={4} value={genBody} onChange={(e)=>setGenBody(e.target.value)} />
        <div className="mt-3 flex gap-2">
          <button onClick={()=>generatePdfFromTemplate(false)} className="px-4 py-2 bg-green-600 text-white rounded-xl">Générer PDF</button>
          <button onClick={()=>generatePdfFromTemplate(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl">Générer et sauvegarder</button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4 animate-pulse">Chargement...</div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow p-12 text-center text-slate-500">
          Aucun document trouvé.
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-[0_2px_20px_rgb(0,0,0,0.02)] border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Fichier</th>
                    <th className="px-6 py-4">Catégorie</th>
                    <th className="px-6 py-4">Bien / Locataire</th>
                    <th className="px-6 py-4">Téléversé</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {documents.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Files className="text-slate-500" />
                          <div>
                            <div className="font-semibold text-slate-900">{d.filename}</div>
                            <div className="text-xs text-slate-400">{d.storage_path}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{d.category}</td>
                      <td className="px-6 py-4">{d.properties?.name || (d.tenants ? `${d.tenants.last_name} ${d.tenants.first_name}` : '—')}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm">{new Date(d.uploaded_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                        <button onClick={() => handleDownload(d.storage_path)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                          <Download />
                        </button>
                        <button onClick={() => prefillGeneratorFromDocument(d)} title="Préremplir le générateur" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                          <FilePlus />
                        </button>
                        <button onClick={() => handleDelete(d.id, d.storage_path)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600">
                          <Trash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {documents.map((d) => (
              <div key={d.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Files />
                    <div>
                      <div className="font-semibold">{d.filename}</div>
                      <div className="text-xs text-slate-400">{d.category} • {new Date(d.uploaded_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(d.storage_path)} className="p-2 rounded-lg hover:bg-slate-100">
                      <Download />
                    </button>
                    <button onClick={() => prefillGeneratorFromDocument(d)} title="Préremplir le générateur" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600">
                      <FilePlus />
                    </button>
                    <button onClick={() => handleDelete(d.id, d.storage_path)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-600">
                      <Trash />
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-sm text-slate-600">{d.properties?.name || (d.tenants ? `${d.tenants.last_name} ${d.tenants.first_name}` : '—')}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Hidden template used for PDF generation */}
      <div style={{ position: 'absolute', left: -9999, top: -9999 }} aria-hidden>
        <div ref={templateRef} style={{ width: 794, padding: 24, background: '#fff', color: '#111', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
              PM
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>PropManager</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>Quittance / Document généré</div>
            </div>
          </div>
          <h1 style={{ fontSize: 20, marginBottom: 8 }}>{genTitle}</h1>
          <div style={{ marginBottom: 12 }}>Destinataire: {genRecipient}</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{genBody}</div>
          <div style={{ marginTop: 24 }}>Date: {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
