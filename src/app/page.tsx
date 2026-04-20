"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import OnboardingModal from "@/components/OnboardingModal";
import OwnerDashboard from "@/components/OwnerDashboard";
import AdminDashboard from "@/components/AdminDashboard";
import Notification from "@/components/Notification";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  city: string;
  has_garage: boolean;
  status: string;
  images?: { image_url: string; label: string }[];
};

type UserProfile = {
  id: string;
  full_name: string;
  role: "tenant" | "owner" | "admin";
  max_budget: number;
};

// Componente de Navegación Superior
const HeaderNav = ({ view, setView, profile, user, tempBudget, setTempBudget, updateBudget, handleLogout, setShowAuth }: any) => {
  const [isFocused, setIsFocused] = useState(false);
  const isBudgetModified = Number(tempBudget) !== Number(profile?.max_budget) && tempBudget !== "";

  return (
    <div style={{ position: 'absolute', top: '20px', right: '20px', left: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
      {view !== "choice" ? (
        <button onClick={() => setView("choice")} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ← Inicio
        </button>
      ) : <div />}
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {profile?.role === "admin" && (
          <button onClick={() => setView("admin")} style={{ background: '#E2E8CE', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Panel Admin</button>
        )}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'white', padding: '6px 16px', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
            {/* Solo mostrar presupuesto si estamos específicamente en la vista de búsqueda (tenant) */}
            {view === "tenant" && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', borderRight: '1px solid #eee', paddingRight: '12px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>Presupuesto</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isBudgetModified && (
                    <button 
                      onClick={() => { updateBudget(Number(tempBudget)); setIsFocused(false); }} 
                      style={{ background: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✔
                    </button>
                  )}
                  <input 
                    type="number" 
                    step="1"
                    onKeyDown={(e) => { if (e.key === '.' || e.key === ',') e.preventDefault(); }}
                    value={tempBudget} 
                    onChange={(e) => setTempBudget(parseInt(e.target.value) || "")}
                    onFocus={() => setIsFocused(true)}
                    placeholder="0"
                    style={{ border: 'none', borderBottom: '1px solid #eee', background: 'none', fontSize: '1rem', fontWeight: '900', width: '80px', outline: 'none', color: 'var(--text-primary)' }}
                  />
                  {(isFocused || isBudgetModified) && (
                    <button 
                      onClick={() => { setTempBudget(profile?.max_budget || ""); setIsFocused(false); }} 
                      style={{ background: '#f44336', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      ✖
                    </button>
                  )}
                </div>
              </div>
            )}
            <span style={{ fontSize: '0.85rem' }}>Hola, <strong>{profile?.full_name?.split(" ")[0] || user.email.split("@")[0]}</strong></span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Salir</button>
          </div>
        ) : (
          <button className="btn-yerba" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={() => setShowAuth(true)}>Ingresar</button>
        )}
      </div>
    </div>
  );
};

export default function Home() {
  const [view, setView] = useState<"choice" | "tenant" | "owner" | "admin">("choice");
  const [showAuth, setShowAuth] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  
  const [budget, setBudget] = useState<number | "">("");
  const [city, setCity] = useState("Corrientes");
  const [hasGarage, setHasGarage] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [notif, setNotif] = useState({ open: false, msg: "" });
  const [tempBudget, setTempBudget] = useState<number | "">("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setBudget("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (profile !== null) {
      setBudget(profile.max_budget);
      setTempBudget(profile.max_budget);
    }
  }, [profile]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      setBudget(data.max_budget);
      setTempBudget(data.max_budget);
      if (data.max_budget === 0 && data.role === "tenant") {
        setShowOnboarding(true);
      }
    }
  };

  const updateBudget = async (newBudget: number) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ max_budget: newBudget })
      .eq("id", user.id);
    
    if (!error) {
      setProfile(prev => prev ? { ...prev, max_budget: newBudget } : null);
      setBudget(newBudget);
      setTempBudget(newBudget);
      setNotif({ open: true, msg: "Presupuesto actualizado correctamente." });
    }
  };

  const handleSearch = async () => {
    if (!budget) return;
    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from("listings")
        .select("*, images:listing_images(image_url, label)")
        .lte("price", budget)
        .eq("city", city)
        .eq("status", "active")
        .order("price", { ascending: false });

      if (error) throw error;
      
      let filtered = data || [];
      if (hasGarage) filtered = filtered.filter(l => l.has_garage);
      setListings(filtered);
    } catch (err) {
      console.error("Error buscando:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView("choice");
  };

  const handleInterest = async (listingId: string) => {
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      const { error } = await supabase
        .from("interests")
        .insert({
          tenant_id: user.id,
          listing_id: listingId,
          status: 'pending'
        });

      if (error) {
        if (error.code === '23505') {
          setNotif({ open: true, msg: "Ya mostraste interés por esta propiedad. El dueño ya tiene tus datos." });
        } else {
          throw error;
        }
      } else {
        setNotif({ open: true, msg: "¡Interés registrado! El dueño ya puede ver tu perfil y contactarte." });
      }
    } catch (err) {
      console.error("Error registrando interés:", err);
      setNotif({ open: true, msg: "No se pudo registrar el interés. Intenta de nuevo." });
    }
  };

  // --- VISTAS ---
  if (view === "choice") {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <HeaderNav 
          view={view} 
          setView={setView} 
          profile={profile} 
          user={user} 
          tempBudget={tempBudget} 
          setTempBudget={setTempBudget}
          updateBudget={updateBudget}
          handleLogout={handleLogout}
          setShowAuth={setShowAuth}
        />
        <h1 className="animate-slide-up" style={{ fontSize: '4rem', marginBottom: '10px', fontWeight: '900' }}>Precio <span className="text-gradient">App</span></h1>
        <p className="animate-slide-up" style={{ color: 'var(--text-secondary)', fontSize: '1.3rem', marginBottom: '60px', textAlign: 'center' }}>Corrientes elige cuánto pagar.</p>
        <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '800px' }}>
          <button className="card-home animate-slide-up" style={{ flex: 1, padding: '50px 30px', cursor: 'pointer', border: 'none' }} onClick={() => setView("tenant")}>
            <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🏠</div>
            <h2 style={{ fontSize: '1.5rem' }}>Busco Hogar</h2>
            <p style={{ color: 'var(--text-muted)' }}>Fija tu presupuesto y encuentra tu lugar.</p>
          </button>
          <button className="card-home animate-slide-up" style={{ flex: 1, padding: '50px 30px', cursor: 'pointer', border: 'none' }} onClick={() => setView("owner")}>
            <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🔑</div>
            <h2 style={{ fontSize: '1.6rem' }}>Ofrezco Casa</h2>
            <p style={{ color: 'var(--text-muted)' }}>Publica y gestiona con precios justos.</p>
          </button>
        </div>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
        <Notification 
          isOpen={notif.open} 
          message={notif.msg} 
          onClose={() => setNotif({ ...notif, open: false })} 
        />
      </main>
    );
  }

  if (view === "tenant") {
    return (
      <main style={{ minHeight: '100vh', padding: '80px 20px 20px 20px', position: 'relative' }}>
        <HeaderNav 
          view={view} 
          setView={setView} 
          profile={profile} 
          user={user} 
          tempBudget={tempBudget} 
          setTempBudget={setTempBudget}
          updateBudget={updateBudget}
          handleLogout={handleLogout}
          setShowAuth={setShowAuth}
        />
        <section style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="animate-slide-up" style={{ fontSize: '2.5rem', marginBottom: '40px', fontWeight: '800' }}>Hogares en <span className="text-gradient">Corrientes</span></h2>
          <div className="card-home animate-slide-up" style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 1fr auto', gap: '20px', alignItems: 'end', marginBottom: '60px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-primary)' }}>Presupuesto</label>
              <input 
                type="number" 
                placeholder="200000" 
                className="input-home" 
                value={budget} 
                onChange={(e) => {
                  const val = Number(e.target.value) || "";
                  setBudget(val);
                  setTempBudget(val);
                }} 
              />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-primary)' }}>CIUDAD</label>
              <select className="input-home" value={city} onChange={(e) => setCity(e.target.value)}>
                 <option value="Corrientes">Corrientes Capital</option>
                 <option value="Paso de los Libres">Paso de los Libres</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px', paddingBottom: '14px' }}>
              <input type="checkbox" checked={hasGarage} onChange={e => setHasGarage(e.target.checked)} />
              <label>Cochera</label>
            </div>
            <button className="btn-yerba" onClick={handleSearch} style={{ height: '52px' }}>Buscar</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', textAlign: 'left' }}>
            {/* Ejemplo Demo: SOLO aparece si el usuario busca y el presupuesto es suficiente */}
            {(budget !== "" && budget >= 350000 && listings.length === 0) && (
               <div className="card-home animate-slide-up" style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--accent-earth)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', zIndex: 1 }}>DEMO</div>
                  <div style={{ height: '220px', backgroundColor: '#E2E8CE', borderRadius: '16px', marginBottom: '16px', overflow: 'hidden' }}>
                    <img src="/departamento_corrientes_demo_2_1776060101051.png" alt="Demo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Dpto. Vista al Paraná</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '16px' }}>Excelente ubicación, 2 dormitorios, balcón corrido y cochera.</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
                    <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent-earth)' }}>$350.000</span>
                    <button className="btn-yerba" onClick={() => alert("¡Esta es una propiedad de ejemplo!")}>Me interesa</button>
                  </div>
               </div>
            )}
             {listings.map(l => {
               const frontImage = l.images?.find(img => img.label.includes("Frente"))?.image_url;
               return (
                 <div key={l.id} className="card-home animate-slide-up">
                   <div style={{ height: '220px', background: '#E2E8CE', borderRadius: '16px', marginBottom: '16px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {frontImage ? (
                       <img src={frontImage} alt={l.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                     ) : (
                       <div style={{ fontSize: '3rem' }}>🏢</div>
                     )}
                   </div>
                   <h3>{l.title}</h3>
                   <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--surface-border)', paddingTop: '16px' }}>
                      <span style={{ fontSize: '1.6rem', fontWeight: '900', color: 'var(--accent-earth)' }}>${l.price.toLocaleString()}</span>
                      <button className="btn-yerba" onClick={() => handleInterest(l.id)}>Me interesa</button>
                   </div>
                 </div>
               );
             })}
          </div>
        </section>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
        {showOnboarding && <OnboardingModal onComplete={(b) => { setBudget(b); setShowOnboarding(false); handleSearch(); }} />}
        <Notification 
          isOpen={notif.open} 
          message={notif.msg} 
          onClose={() => setNotif({ ...notif, open: false })} 
        />
      </main>
    );
  }

  if (view === "admin") {
    return (
      <main style={{ minHeight: '100vh', padding: '80px 20px', position: 'relative' }}>
        <HeaderNav 
          view={view} 
          setView={setView} 
          profile={profile} 
          user={user} 
          tempBudget={tempBudget} 
          setTempBudget={setTempBudget}
          updateBudget={updateBudget}
          handleLogout={handleLogout}
          setShowAuth={setShowAuth}
        />
        <AdminDashboard />
        <Notification 
          isOpen={notif.open} 
          message={notif.msg} 
          onClose={() => setNotif({ ...notif, open: false })} 
        />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '80px 20px', position: 'relative' }}>
      <HeaderNav 
          view={view} 
          setView={setView} 
          profile={profile} 
          user={user} 
          tempBudget={tempBudget} 
          setTempBudget={setTempBudget}
          updateBudget={updateBudget}
          handleLogout={handleLogout}
          setShowAuth={setShowAuth}
        />
      {!user ? (
        <div style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '16px' }}>Acceso Propietarios</h1>
          <button className="btn-yerba" style={{ width: '100%' }} onClick={() => setShowAuth(true)}>Ingresar</button>
        </div>
      ) : <OwnerDashboard />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      <Notification 
        isOpen={notif.open} 
        message={notif.msg} 
        onClose={() => setNotif({ ...notif, open: false })} 
      />
    </main>
  );
}
