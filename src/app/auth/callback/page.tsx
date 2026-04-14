"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      // Supabase-js detecta automáticamente el hash (#access_token) 
      // o el código (?code) en la URL y establece la sesión.
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Error en el callback:", error.message);
        router.push("/auth/auth-code-error");
      } else {
        // Una vez que el cliente tiene la sesión, redirigimos al home
        // El middleware o el componente de Home se encargará del resto
        router.push("/");
      }
    };

    handleAuth();
  }, [router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div className="card-home">
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>⏳</div>
        <h2 style={{ marginBottom: '10px' }}>Finalizando inicio de sesión...</h2>
        <p style={{ color: 'var(--text-muted)' }}>Esto tomará solo un segundo.</p>
      </div>
    </div>
  );
}
