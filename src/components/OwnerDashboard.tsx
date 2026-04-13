"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

type Suggestion = {
  discount_percent: number;
  suggested_price: number;
  potential_matches: number;
};

export default function OwnerDashboard() {
  const [step, setStep] = useState<"list" | "create">("list");
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [city, setCity] = useState("Corrientes");
  const [hasGarage, setHasGarage] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    
    setListings(data || []);
    setLoading(false);
  };

  const calculateSuggestions = async (val: number) => {
    // Para el simulador "en vivo" antes de crear, hacemos una query manual
    // Simulamos los saltos de 10%, 15%, 20%...
    const factors = [0, 0.9, 0.85, 0.8]; 
    const results = await Promise.all(factors.map(async (f) => {
      const p = val * f || val;
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true })
        .eq("role", "tenant")
        .gte("max_budget", p);
      
      return {
        discount_percent: Math.round((1 - f) * 100),
        suggested_price: p,
        potential_matches: count || 0
      };
    }));
    setSuggestions(results);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("listings").insert({
      owner_id: user.id,
      title,
      description,
      price: Number(price),
      city,
      has_garage: hasGarage,
      status: "active"
    });

    if (!error) {
      alert("¡Propiedad publicada con éxito!");
      setStep("list");
      fetchMyListings();
      // Limpiar form
      setTitle(""); setDescription(""); setPrice("");
    }
  };

  if (loading) return <p>Cargando tus propiedades...</p>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.4rem' }}>Mis Propiedades</h1>
        {step === "list" && (
          <button className="btn-yerba" onClick={() => setStep("create")}>+ Publicar nueva</button>
        )}
      </div>

      {step === "list" ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {listings.length === 0 ? (
            <div className="card-home" style={{ textAlign: 'center', padding: '60px' }}>
              <p style={{ color: 'var(--text-muted)' }}>Aún no tienes propiedades publicadas.</p>
            </div>
          ) : (
            listings.map(l => (
              <div key={l.id} className="card-home" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginBottom: '4px' }}>{l.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{l.city} • {l.has_garage ? "Con cochera" : "Sin cochera"}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-earth)' }}>${l.price.toLocaleString()}</div>
                  <span style={{ fontSize: '0.75rem', background: '#e2e8ce', padding: '2px 8px', borderRadius: '10px' }}>{l.status.toUpperCase()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="card-home animate-slide-up" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '40px' }}>
          {/* Formulario Estilo Mercado Libre */}
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             <h2 style={{ fontSize: '1.4rem' }}>Detalles de la oferta</h2>
             <div>
               <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>TÍTULO DEL ANUNCIO</label>
               <input type="text" className="input-home" placeholder="Ej: Dpto 2 amb en Cambá Cuá" required value={title} onChange={e => setTitle(e.target.value)} />
             </div>
             <div>
               <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>DESCRIPCIÓN</label>
               <textarea className="input-home" style={{ height: '100px', resize: 'none' }} placeholder="Cuenta más sobre la propiedad..." value={description} onChange={e => setDescription(e.target.value)} />
             </div>
             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>PRECIO MENSUAL ($)</label>
                  <input 
                    type="number" 
                    className="input-home" 
                    placeholder="0.00" 
                    required 
                    value={price} 
                    onChange={e => {
                      setPrice(Number(e.target.value) || "");
                      calculateSuggestions(Number(e.target.value));
                    }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>CIUDAD</label>
                  <select className="input-home" value={city} onChange={e => setCity(e.target.value)}>
                    <option value="Corrientes">Corrientes</option>
                    <option value="Resistencia">Resistencia</option>
                  </select>
                </div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={hasGarage} onChange={e => setHasGarage(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                <label>Incluye cochera</label>
             </div>
             <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                <button type="submit" className="btn-yerba" style={{ flex: 1 }}>Publicar Ahora</button>
                <button type="button" onClick={() => setStep("list")} style={{ background: 'none', border: '1px solid var(--surface-border)', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer' }}>Cancelar</button>
             </div>
          </form>

          {/* SIMULADOR DE PRECIOS JUSTOS (LIVE) */}
          <div style={{ background: '#F0F2E8', borderRadius: '20px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Simulador de Alcance
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Descubre cuántos inquilinos pueden pagar tu precio actual vs. sugerencias de mercado.
            </p>
            
            {price ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {suggestions.map((s, i) => (
                  <div key={i} style={{ background: 'white', padding: '15px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: s.discount_percent === 0 ? '2px solid var(--accent-primary)' : '1px solid var(--surface-border)' }}>
                    <div>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>${s.suggested_price.toLocaleString()}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.discount_percent === 0 ? "Tu precio actual" : `Rebajado un ${s.discount_percent}%`}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--accent-primary)', fontSize: '1.2rem' }}>{s.potential_matches}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Inquilinos interesados</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', border: '2px dashed #D4D8C4', borderRadius: '16px' }}>
                Ingresa un precio para ver el alcance de mercado...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
