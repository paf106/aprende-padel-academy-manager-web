import { login } from "./actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><span className="brand-mark" aria-hidden="true"><span /><span /><span /></span><span>AP <b>Academy</b></span></div>
        <p className="eyebrow">GESTIÓN DE ACADEMIA</p>
        <h1>Bienvenido de nuevo</h1>
        <p className="muted">Accede para gestionar tus clases y alumnos.</p>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <form action={login} className="auth-form">
          <label>Email<input name="email" type="email" placeholder="tu@email.com" autoComplete="email" required /></label>
          <label>Contraseña<input name="password" type="password" placeholder="••••••••" autoComplete="current-password" required minLength={6} /></label>
          <button className="primary-btn" type="submit">Entrar en Academy</button>
        </form>
      </section>
    </main>
  );
}
