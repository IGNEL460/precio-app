"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import OnboardingModal from "@/components/OnboardingModal";
import OwnerDashboard from "@/components/OwnerDashboard";
import AdminDashboard from "@/components/AdminDashboard";

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

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      if (data.max_budget === 0 && data.role === "tenant") {
        setShowOnboarding(true);
      } else {
        setBudget(data.max_budget);
      }
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
          alert("Ya mostraste interés por esta propiedad. El dueño ya tiene tus datos.");
        } else {
          throw error;
        }
      } else {
        alert("¡Interés registrado! El dueño ya puede ver tu perfil y contactarte.");
      }
    } catch (err) {
      console.error("Error registrando interés:", err);
      alert("No se pudo registrar el interés. Intenta de nuevo.");
    }
  };

  const HeaderNav = () => (
    <div style={{ position: 'absolute', top: '20px', right: '20px', left: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
      {view !== "choice" ? (
        <button onClick={() => setView("choice")} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>← Inicio</button>
      ) : <div />}
      
      <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
        {profile?.role === "admin" && (
          <button onClick={() => setView("admin")} style={{ background: '#E2E8CE', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>⚙️ Panel Admin</button>
        )}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'white', padding: '6px 16px', borderRadius: '30px', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.85rem' }}>Hola, <strong>{profile?.full_name?.split(" ")[0] || user.email.split("@")[0]}</strong></span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Salir</button>
          </div>
        ) : (
          <button className="btn-yerba" style={{ padding: '8px 20px', fontSize: '0.9rem' }} onClick={() => setShowAuth(true)}>Ingresar</button>
        )}
      </div>
    </div>
  );

  // --- VISTAS ---
  if (view === "choice") {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', position: 'relative' }}>
        <HeaderNav />
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
      </main>
    );
  }

  if (view === "tenant") {
    return (
      <main style={{ minHeight: '100vh', padding: '80px 20px 20px 20px', position: 'relative' }}>
        <HeaderNav />
        <section style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
          <h2 className="animate-slide-up" style={{ fontSize: '2.5rem', marginBottom: '40px', fontWeight: '800' }}>Hogares en <span className="text-gradient">Corrientes</span></h2>
          <div className="card-home animate-slide-up" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 0.5fr', gap: '16px', alignItems: 'end', marginBottom: '60px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--accent-primary)' }}>PRESUPUESTO MÁXIMO</label>
              <input type="number" className="input-home" value={budget} onChange={(e) => setBudget(Number(e.target.value) || "")} />
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
      </main>
    );
  }

  if (view === "admin") {
    return (
      <main style={{ minHeight: '100vh', padding: '80px 20px', position: 'relative' }}>
        <HeaderNav />
        <AdminDashboard />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '80px 20px', position: 'relative' }}>
      <HeaderNav />
      {!user ? (
        <div style={{ maxWidth: '500px', margin: '60px auto', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '16px' }}>Acceso Propietarios</h1>
          <button className="btn-yerba" style={{ width: '100%' }} onClick={() => setShowAuth(true)}>Ingresar</button>
        </div>
      ) : <OwnerDashboard />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
    </main>
  );
}
