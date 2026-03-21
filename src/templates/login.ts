/**
 * Template de Login - Común para todos los roles
 */

export function loginTemplate() {
  return `
    <section class="login-shell">
      <article class="login-card">
        <h1>Login de Acceso</h1>
        <p>Ingresa con tus credenciales de usuario</p>

        <form id="login-form" class="form-grid">
          <label for="user">Email</label>
          <input id="user" type="email" placeholder="tu@email.com" required />

          <label for="pass">Contraseña</label>
          <input id="pass" type="password" placeholder="tu contraseña" required />

          <button class="cta" type="submit">Entrar</button>
        </form>

        <!-- Ayuda para desarrollo -->
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f0cce6; font-size: 13px; color: #888;">
          <p style="font-weight: 600; color: #666; margin-bottom: 8px;">💡 Credenciales de prueba:</p>
          <p>admin@electoral.test / Admin123456!</p>
          <p>supervisor.distrito@electoral.test / Supervisor123!</p>
          <p>supervisor.recinto@electoral.test / Supervisor123!</p>
          <p>veedor@electoral.test / Veedor123!</p>
          <p>lector@electoral.test / Lector123!</p>
        </div>
      </article>
    </section>
  `
}
