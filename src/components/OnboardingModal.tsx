"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface OnboardingProps {
  onComplete: (budget: number) => void;
}

export default function OnboardingModal({ onComplete }: OnboardingProps) {
  const [budget, setBudget] = useState<number | "">("");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!budget) return;
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ max_budget: budget })
      .eq("id", user.id);

    if (!error) {
      onComplete(Number(budget));
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45, 58, 45, 0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
      <div className="card-home animate-slide-up" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🧉</div>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>¡Bienvenido!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
          Para mostrarte las mejores opciones, dinos: <br/><strong>¿Cuál es tu presupuesto mensual ideal?</strong>
        </p>
        
        <div style={{ marginBottom: '24px' }}>
          <input 
            type="number" 
            className="input-home" 
            placeholder="$ 0.00" 
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value) || "")}
            style={{ fontSize: '1.5rem', textAlign: 'center' }}
          />
        </div>

        <button 
          onClick={handleSave} 
          className="btn-yerba" 
          style={{ width: '100%', height: '52px', justifyContent: 'center', fontSize: '1.1rem' }}
          disabled={loading}
        >
          {loading ? "Guardando..." : "Comenzar a buscar"}
        </button>
      </div>
    </div>
  );
}
