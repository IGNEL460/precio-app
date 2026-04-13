"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    tenants: 0,
    owners: 0,
    listings: 0,
    interests: 0
  });
  const [recentListings, setRecentListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalStats();
  }, []);

  const fetchGlobalStats = async () => {
    setLoading(true);
    
    // 1. Contar Perfiles por Rol
    const { data: profiles } = await supabase.from("profiles").select("role");
    const tenants = profiles?.filter(p => p.role === 'tenant').length || 0;
    const owners = profiles?.filter(p => p.role === 'owner').length || 0;

    // 2. Contar Listings
    const { count: listingsCount } = await supabase
      .from("listings")
      .select("*", { count: 'exact', head: true });

    // 3. Contar Intereses
    const { count: interestsCount } = await supabase
      .from("interests")
      .select("*", { count: 'exact', head: true });

    // 4. Obtener Últimos Registros para la tabla "amigable"
    const { data: recent } = await supabase
      .from("listings")
      .select("*, profiles!listings_owner_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(10);

    setStats({
      tenants,
      owners,
      listings: listingsCount || 0,
      interests: interestsCount || 0
    });
    setRecentListings(recent || []);
    setLoading(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>📊 Cargando panorama global...</div>;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'left' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '40px' }}>Torre de Control</h1>

      {/* Grid de Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
        {[
          { label: 'Inquilinos', val: stats.tenants, icon: '👥' },
          { label: 'Propietarios', val: stats.owners, icon: '🔑' },
          { label: 'Ofertas Activas', val: stats.listings, icon: '🏠' },
          { label: 'Intereses Generados', val: stats.interests, icon: '🔥' }
        ].map((s, i) => (
          <div key={i} className="card-home" style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '10px' }}>{s.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-primary)' }}>{s.val}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', marginTop: '4px' }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Tabla "Amigable" para Humanos */}
      <div className="card-home" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.2rem' }}>Últimas Propiedades Publicadas</h2>
          <button onClick={fetchGlobalStats} style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 'bold' }}>🔄 Actualizar</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#F0F2E8', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <tr>
              <th style={{ padding: '16px' }}>PROPIEDAD</th>
              <th style={{ padding: '16px' }}>DUEÑO</th>
              <th style={{ padding: '16px' }}>PRECIO</th>
              <th style={{ padding: '16px' }}>ESTADO</th>
              <th style={{ padding: '16px' }}>FECHA</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '0.95rem' }}>
            {recentListings.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '16px' }}>
                  <strong>{l.title}</strong><br/>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{l.city}</span>
                </td>
                <td style={{ padding: '16px' }}>{l.profiles?.full_name || 'Sin nombre'}</td>
                <td style={{ padding: '16px', fontWeight: 'bold' }}>${l.price.toLocaleString()}</td>
                <td style={{ padding: '16px' }}>
                  <span style={{ fontSize: '0.75rem', background: l.status === 'active' ? '#E2E8CE' : '#f0f0f0', padding: '4px 10px', borderRadius: '12px' }}>
                    {l.status.toUpperCase()}
                  </span>
                </td>
                <td style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  {new Date(l.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
