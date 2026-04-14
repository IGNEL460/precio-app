"use client";

import { useEffect, useState } from "react";

interface NotificationProps {
  message: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Notification({ message, isOpen, onClose }: NotificationProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      opacity: show ? 1 : 0,
      transition: 'opacity 0.3s ease'
    }}>
      <div className="card-home animate-slide-up" style={{
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center',
        padding: '30px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '15px' }}>✨</div>
        <p style={{ fontSize: '1.1rem', fontWeight: '500', lineHeight: '1.5', marginBottom: '25px' }}>
          {message}
        </p>
        <button 
          onClick={onClose}
          className="btn-yerba"
          style={{ width: '100%', justifyContent: 'center', height: '48px' }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
