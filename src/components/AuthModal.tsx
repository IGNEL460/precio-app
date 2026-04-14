"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) setError(error.message);
  };


  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp && !acceptTerms) {
      setError("Debes aceptar los términos y condiciones para continuar.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        alert("¡Registro exitoso! Por favor verifica tu correo electrónico.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45, 58, 45, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
      <div className="card-home animate-slide-up" style={{ maxWidth: '450px', width: '100%', position: 'relative', overflow: 'hidden' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-muted)' }}>✕</button>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '8px' }}>{isSignUp ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Únete a la red de alquileres más justa de la región.</p>
        </div>

        {/* Botón de Google */}
        <button 
          onClick={handleGoogleLogin} 
          style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--surface-border)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontWeight: 'bold', marginBottom: '20px', transition: 'var(--transition-base)' }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f8f8f8'}
          onMouseOut={(e) => e.currentTarget.style.background = 'white'}
        >
          <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" alt="Google" style={{ width: '18px' }} />
          Continuar con Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '20px' }}>
          <hr style={{ flex: 1, opacity: 0.3 }} /> O USA TU CORREO <hr style={{ flex: 1, opacity: 0.3 }} />
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSignUp && (
            <input 
              type="text" 
              placeholder="Nombre completo" 
              className="input-home" 
              required 
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}
          <input 
            type="email" 
            placeholder="Correo electrónico" 
            className="input-home" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            className="input-home" 
            required 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isSignUp && (
            <div style={{ display: 'flex', alignItems: 'start', gap: '10px', padding: '10px 0' }}>
              <input 
                type="checkbox" 
                id="terms" 
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: '4px', accentColor: 'var(--accent-primary)' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Acepto los <span style={{ color: 'var(--accent-primary)', textDecoration: 'underline', cursor: 'pointer' }}>términos y condiciones</span> y la política de privacidad.
              </label>
            </div>
          )}

          {error && <p style={{ color: '#d32f2f', fontSize: '0.85rem', textAlign: 'center' }}>{error}</p>}

          <button type="submit" className="btn-yerba" style={{ width: '100%', height: '48px', justifyContent: 'center' }} disabled={loading}>
            {loading ? "Procesando..." : isSignUp ? "Registrarme" : "Entrar ahora"}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isSignUp ? "¿Ya tienes cuenta?" : "¿Aún no tienes cuenta?"} {" "}
          <span 
            onClick={() => setIsSignUp(!isSignUp)} 
            style={{ color: 'var(--accent-primary)', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isSignUp ? "Inicia sesión" : "Regístrate gratis"}
          </span>
        </p>
      </div>
    </div>
  );
}
