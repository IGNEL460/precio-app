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
  const [interests, setInterests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [city, setCity] = useState("Corrientes");
  const [hasGarage, setHasGarage] = useState(false);
  const [rooms, setRooms] = useState(1);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [uploading, setUploading] = useState(false);
  
  // Array de objetos para las fotos: { label: string, url: string | null }
  const [photos, setPhotos] = useState<{label: string, url: string | null}[]>([]);

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
    
    // Traer Intereses
    const listingIds = data?.map(l => l.id) || [];
    if (listingIds.length > 0) {
      const { data: interestsData } = await supabase
        .from("interests")
        .select(`
          id,
          status,
          created_at,
          tenant:profiles!interests_tenant_id_fkey(full_name, email),
          listing:listings(title)
        `)
        .in("listing_id", listingIds)
        .order("created_at", { ascending: false });
      
      setInterests(interestsData || []);
    }

    setLoading(false);
  };

  const calculateSuggestions = async (val: number) => {
    // Simulamos los saltos de 0% (actual), 10%, 15%, 20%...
    const factors = [1, 0.9, 0.85, 0.8]; 
    const results = await Promise.all(factors.map(async (f) => {
      const p = val * f;
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

  // Recalcular los slots de fotos cuando cambien las habitaciones o el garage
  useEffect(() => {
    const slots = [{ label: "Frente de la propiedad", url: null }];
    for (let i = 1; i <= rooms; i++) {
      slots.push({ label: `Habitación ${i}`, url: null });
    }
    if (hasGarage) {
      slots.push({ label: "Garage / Cochera", url: null });
    }
    setPhotos(slots);
  }, [rooms, hasGarage]);

  const handleFileUpload = async (index: number, file: File) => {
    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `listings/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('tickets') // Usamos el bucket existente por ahora, o podrías crear 'properties'
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('tickets')
        .getPublicUrl(filePath);

      const newPhotos = [...photos];
      newPhotos[index].url = publicUrl;
      setPhotos(newPhotos);
    } catch (err: any) {
      alert("Error subiendo imagen: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: listingData, error: listingError } = await supabase.from("listings").insert({
      owner_id: user.id,
      title,
      description,
      price: Number(price),
      city,
      has_garage: hasGarage,
      rooms: rooms,
      status: "active"
    }).select().single();

    if (listingError) {
      alert("Error al crear oferta: " + listingError.message);
      return;
    }

    // Insertar las imágenes vinculadas
    const validPhotos = photos.filter(p => p.url).map(p => ({
      listing_id: listingData.id,
      image_url: p.url,
      label: p.label
    }));

    if (validPhotos.length > 0) {
      await supabase.from("listing_images").insert(validPhotos);
    }

    alert("¡Propiedad publicada con éxito! Se han guardado las fotos que subiste. Recuerda que puedes editar esta publicación más tarde para añadir las fotos que falten o cambiar los detalles de la cochera.");
    setStep("list");
    fetchMyListings();
    setTitle(""); setDescription(""); setPrice(""); setRooms(1);
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

          {/* Sección de Interesados */}
          {interests.length > 0 && (
            <div style={{ marginTop: '60px' }}>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '24px' }}>Inquilinos Interesados</h2>
              <div className="card-home" style={{ padding: '0', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead style={{ background: '#F0F2E8', fontSize: '0.85rem' }}>
                    <tr>
                      <th style={{ padding: '16px' }}>INQUILINO</th>
                      <th style={{ padding: '16px' }}>PROPIEDAD</th>
                      <th style={{ padding: '16px' }}>FECHA</th>
                      <th style={{ padding: '16px' }}>ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interests.map((int) => (
                      <tr key={int.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td style={{ padding: '16px' }}>
                          <strong>{int.tenant?.full_name}</strong><br/>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{int.tenant?.email}</span>
                        </td>
                        <td style={{ padding: '16px' }}>{int.listing?.title}</td>
                        <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          {new Date(int.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <button 
                            className="btn-yerba" 
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => alert(`Próximamente: Abrir chat con ${int.tenant?.full_name}`)}
                          >
                            Contactar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" checked={hasGarage} onChange={e => setHasGarage(e.target.checked)} style={{ width: '20px', height: '20px' }} />
                  <label>Incluye cochera</label>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>CANT. HABITACIONES</label>
                  <input type="number" min="1" max="10" className="input-home" value={rooms} onChange={e => setRooms(parseInt(e.target.value) || 1)} />
                </div>
              </div>

              {/* CARGA DE FOTOS DINÁMICA */}
              <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '15px' }}>📸 Fotos requeridas ({photos.length})</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {photos.map((photo, idx) => (
                    <div key={idx} style={{ background: '#f8f8f8', padding: '12px', borderRadius: '12px', border: '1px dashed #ccc', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-secondary)' }}>{photo.label.toUpperCase()}</div>
                      {photo.url ? (
                        <div style={{ position: 'relative', height: '80px' }}>
                           <img src={photo.url} alt="subida" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
                           <button onClick={() => {const n = [...photos]; n[idx].url = null; setPhotos(n);}} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                        </div>
                      ) : (
                        <input type="file" accept="image/*" onChange={(e) => e.target.files && handleFileUpload(idx, e.target.files[0])} style={{ fontSize: '0.7rem', width: '100%' }} />
                      )}
                    </div>
                  ))}
                </div>
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
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.discount_percent === 0 ? "Precio Sugerido (Sin recargos)" : `Rebajado un ${s.discount_percent}%`}</div>
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
