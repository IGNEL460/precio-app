export default function AuthErrorPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
      <div className="card-home" style={{ maxWidth: '400px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>⚠️ Error de Autenticación</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
          No pudimos completar tu inicio de sesión. Esto puede pasar si el enlace expiró o si hay un problema de configuración.
        </p>
        <a href="/" className="btn-yerba" style={{ display: 'inline-block', textDecoration: 'none' }}>
          Volver al Inicio
        </a>
      </div>
    </div>
  )
}
