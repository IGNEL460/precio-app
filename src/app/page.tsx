"use client";

import SearchHeader from "@/components/SearchHeader";
import styles from "./page.module.css";
import { useState, useEffect } from "react";
import Link from "next/link";
import ShareTicketButton from "@/components/ShareTicketButton";

type PriceResult = {
  price_id: string;
  product_name: string;
  store_name: string;
  store_address: string;
  price: number;
  ticket_date: string;
  distance_meters: number;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PriceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

  // 1. Pedir geolocalización de inmediato al abrir la web
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Geolocalización denegada, usando default. Error:", err)
      );
    }
  }, []);

  // 2. Debounce: Esperar que el usuario deje de teclear (400ms) antes de atacar la API
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim().length > 2) {
        handleSearch(query);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query, userLocation]);

  const handleSearch = async (searchTerm: string) => {
    setLoading(true);

    // Si no hay GPS disponible, buscamos en el Obelisco, BA (Placeholder)
    const lat = userLocation?.lat || -34.6037;
    const lng = userLocation?.lng || -58.3816;

    try {
      const res = await fetch(`/api/prices?q=${encodeURIComponent(searchTerm)}&lat=${lat}&lng=${lng}&radius=5000`);
      if (res.ok) {
        const data = await res.json();
        setResults(data || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {/* Componente superior interactivo para lanzar las búsquedas */}
      <SearchHeader query={query} onSearch={setQuery} />

      <section className={styles.content}>

        {/* Panel de Resultados (Solo se muestra cuando se empieza a escribir) */}
        {query.trim().length > 2 ? (
          <div className="glass-card animate-fade-in" style={{ padding: '30px', maxWidth: '800px', margin: '0 auto 40px auto' }}>
            <h2 style={{ marginBottom: '20px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '16px' }}>
              Resultados cercanos para "{query}"
            </h2>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <span className="text-gradient" style={{ fontWeight: 'bold' }}>Geolocalizando ofertas...</span>
              </div>
            ) : results.length > 0 ? (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {results.map((r, i) => (
                    <div key={r.price_id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--surface-border)' }}>
                      <div>
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--text-primary)' }}>{r.product_name}</h3>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.store_name} ${r.store_address}`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: '500' }}
                            title="Abrir en Google Maps"
                          >
                            📍 {r.store_name} ({Math.round(r.distance_meters)}m)
                          </a>
                          <span>🗓️ {new Date(r.ticket_date).toLocaleDateString()}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                          {r.store_address}
                        </div>
                      </div>
                      <div className="text-gradient" style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>
                        ${Number(r.price).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botón de Reporte Colaborativo al final de la lista */}
                <div style={{ marginTop: '30px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid var(--surface-border)' }}>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.95rem' }}>
                    ¿Conseguiste un precio diferente o fuiste a otra sucursal hoy?
                  </p>
                  <Link href="/scan">
                    <button
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--accent-primary)',
                        color: 'var(--accent-primary)',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        transition: 'all 0.3s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(128, 90, 213, 0.1)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      Escanear ticket para "{query}"
                    </button>
                  </Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                <p style={{ marginBottom: '16px' }}>Ningún usuario en tu zona cargó este producto recientemente.</p>
                <p className="text-gradient" style={{ fontWeight: 'bold' }}>¡Sé el primero en reportarlo para ayudar a tu comunidad!</p>
              </div>
            )}
          </div>
        ) : (
          // Panel de Introducción (Se muestra cuando no hay búsquedas activas)
          <>
            <div className="glass-card animate-fade-in" style={{ padding: '40px', maxWidth: '800px', margin: '0 auto 40px auto' }}>
              <h2 style={{ marginBottom: '16px' }}>¿Viste un precio distinto?</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Si lo encontraste en oferta o más caro que en nuestra app, envíanos una foto del ticket con fecha de hoy.
                Nuestra Inteligencia Artificial lo leerá en la nube y formará parte de nuestro índice global de economía civil.
              </p>

              <Link href="/scan">
                <button className={styles.uploadBtn}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Escanear Ticket Inteligente
                </button>
              </Link>

              {/* Botón de Pruebas: Compartir Web Share API */}
              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
                <ShareTicketButton ticketUrl="https://preciomauro.loca.lt" storeName="Mi Tienda Local" />
              </div>
            </div>

            <div className={styles.grid}>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Precios Locales</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Visualiza la dispersión de precios en tiempo real basándonos en tu código postal.</p>
              </div>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Validación Humana</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Nuestra IA comete errores. Todo es curado en nuestra Cloud Validation Platform.</p>
              </div>
              <div className="glass-card" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>Geolocalización</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Usa las coordenadas geográficas mediante PostGIS de Supabase para ver cuán cerca estás.</p>
              </div>
            </div>
          </>
        )}
      </section>

      <footer className={styles.footer}>
        <p>© 2026 Precio App - Economía Local Abierta</p>
      </footer>
    </main>
  );
}
