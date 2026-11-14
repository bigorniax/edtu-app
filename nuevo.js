/* EDTU nuevo: barra de cuenta + animaciones (compartido) */
(function () {
  const SB_URL = "https://gesqkfjcdyntkgsptwwa.supabase.co";
  const SB_KEY = "sb_publishable_RS9lYVszixarVsB4C3eOhw_yW_8uLit";
  const $ = id => document.getElementById(id);

  /* ---------- barra: sombra al bajar ---------- */
  const barra = document.querySelector(".topbar");
  const alScroll = () => { if (barra) barra.classList.toggle("scroll", window.scrollY > 10); };
  addEventListener("scroll", alScroll, { passive: true }); alScroll();

  /* ---------- cuentas (las mismas de EDTU) ---------- */
  let sb = null, modo = "entrar";
  function cargaSupabase(cb) {
    if (window.supabase) return cb();
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
    s.onload = cb; s.onerror = () => pinta(null);
    document.head.appendChild(s);
  }
  function conectaCuentas() {
    pinta(null);
    cargaSupabase(() => {
      sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
      sb.auth.getSession().then(({ data }) => pinta(data.session ? data.session.user : null));
      sb.auth.onAuthStateChange((_e, sesion) => pinta(sesion ? sesion.user : null));
    });
  }
  function nombreDe(u) { return u ? (u.email || "").split("@")[0] || "jugador" : ""; }

  function pinta(usuario) {
    const zona = $("cuenta"); if (!zona) return;
    if (usuario) {
      zona.innerHTML = '<span class="saludo">' + nombreDe(usuario) + '</span><button class="btn-pl" id="salir">SALIR</button>';
      $("salir").onclick = () => sb && sb.auth.signOut();
    } else {
      zona.innerHTML = '<button class="btn-pl" id="entrar">ENTRAR</button><button class="btn-pl fuerte" id="registro">CREAR CUENTA</button>';
      $("entrar").onclick = () => abreAuth("entrar");
      $("registro").onclick = () => abreAuth("crear");
    }
  }

  function abreAuth(m) { modo = m; pintaModo(); $("authMsg").textContent = ""; $("authFs").classList.add("open"); setTimeout(() => $("authEmail").focus(), 80); }
  function cierraAuth() { $("authFs").classList.remove("open"); }
  function pintaModo() {
    const crear = modo === "crear";
    $("authTitulo").textContent = crear ? "CREAR CUENTA" : "ENTRAR";
    $("authSub").textContent = crear ? "Correo personal (o un usuario sin correo) y una contraseña de 6 o más." : "Con tu correo o usuario y tu contraseña.";
    $("authGo").textContent = crear ? "CREAR CUENTA" : "ENTRAR";
    $("authCambio").textContent = crear ? "¿Ya tienes cuenta? Entrar" : "¿No tienes cuenta? Crear una";
  }

  function leeIdentidad() {
    let v = ($("authEmail").value || "").trim();
    if (!v) return { error: "Escribe tu correo o un usuario." };
    if (!v.includes("@")) {
      if (!/^[a-z0-9_]{3,20}$/i.test(v)) return { error: "El usuario tiene de 3 a 20 letras, números o _ (sin espacios)." };
      v = v.toLowerCase() + "@sincorreo.edtu.cl";
    }
    return { email: v };
  }

  async function enviaAuth() {
    const msg = $("authMsg"), boton = $("authGo");
    const id = leeIdentidad(); const pass = $("authPass").value || "";
    if (id.error) { msg.style.color = "#ff8a8a"; msg.textContent = id.error; return; }
    if (pass.length < 6) { msg.style.color = "#ff8a8a"; msg.textContent = "La contraseña necesita al menos 6 letras o números."; return; }
    if (!sb) { msg.style.color = "#ff8a8a"; msg.textContent = "Las cuentas no están disponibles ahora mismo."; return; }
    boton.disabled = true; msg.style.color = "#c9d0d8"; msg.textContent = "Un momento…";
    try {
      if (modo === "crear") {
        const { data, error } = await sb.auth.signUp({ email: id.email, password: pass });
        if (error) throw error;
        if (data.session) { msg.textContent = "¡Cuenta creada! Ya estás dentro."; setTimeout(cierraAuth, 900); }
        else { msg.textContent = "Cuenta creada. Si pide confirmar el correo, revísalo."; }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email: id.email, password: pass });
        if (error) throw error;
        msg.textContent = "¡Entraste!"; setTimeout(cierraAuth, 600);
      }
    } catch (e) {
      msg.style.color = "#ff8a8a";
      msg.textContent = (e && e.message) ? traduce(e.message) : "No pude entrar. Intenta de nuevo.";
    } finally { boton.disabled = false; }
  }
  function traduce(t) {
    t = t.toLowerCase();
    if (t.includes("invalid login")) return "Correo o clave incorrectos.";
    if (t.includes("already registered") || t.includes("already been registered")) return "Esa cuenta ya existe. Entra con tu clave.";
    if (t.includes("password")) return "La contraseña necesita al menos 6 caracteres.";
    if (t.includes("rate limit")) return "Espera un poco y vuelve a intentar.";
    return "No pude completar la acción: " + t;
  }

  function creaVentanaAuth() {
    const d = document.createElement("div");
    d.id = "authFs";
    d.innerHTML = '<div class="auth-card">' +
      '<button class="cerrar" id="authCerrar" aria-label="Cerrar">✕</button>' +
      '<h2 id="authTitulo">ENTRAR</h2><div class="sub" id="authSub"></div>' +
      '<label>CORREO O USUARIO</label><input id="authEmail" type="text" autocomplete="username" placeholder="tu correo o un usuario" />' +
      '<label>CONTRASEÑA</label><input id="authPass" type="password" autocomplete="current-password" placeholder="mínimo 6" />' +
      '<button class="btn-pl fuerte go" id="authGo">ENTRAR</button>' +
      '<div class="o">o</div>' +
      '<button class="btn-google" id="authGoogle"><span class="g">G</span> CONTINUAR CON GOOGLE</button>' +
      '<div class="msg" id="authMsg"></div>' +
      '<div class="cambio" id="authCambio"></div></div>';
    document.body.appendChild(d);
    $("authCerrar").onclick = cierraAuth;
    d.addEventListener("click", e => { if (e.target === d) cierraAuth(); });
    $("authGo").onclick = enviaAuth;
    $("authGoogle").onclick = async () => {
      const msg = $("authMsg");
      if (!sb) { msg.style.color = "#ff8a8a"; msg.textContent = "Las cuentas no están disponibles ahora mismo."; return; }
      msg.style.color = "#c9d0d8"; msg.textContent = "Abriendo Google…";
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + window.location.pathname }
      });
      if (error) { msg.style.color = "#ff8a8a"; msg.textContent = "No pude abrir Google: " + error.message; }
    };
    $("authPass").addEventListener("keydown", e => { if (e.key === "Enter") enviaAuth(); });
    $("authCambio").onclick = () => { modo = modo === "crear" ? "entrar" : "crear"; pintaModo(); $("authMsg").textContent = ""; };
    addEventListener("keydown", e => { if (e.key === "Escape") cierraAuth(); });
    pintaModo();
  }

  /* ---------- animaciones al bajar ---------- */
  function revelar() {
    const items = document.querySelectorAll(".revela");
    if (!("IntersectionObserver" in window)) { items.forEach(i => i.classList.add("visto")); return; }
    const obs = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visto"); obs.unobserve(e.target); } }), { threshold: 0.15 });
    items.forEach(i => obs.observe(i));
  }
  function contadores() {
    document.querySelectorAll("[data-cuenta]").forEach(el => {
      const fin = +el.dataset.cuenta; let hecho = false;
      const obs = new IntersectionObserver(es => es.forEach(e => {
        if (!e.isIntersecting || hecho) return; hecho = true;
        const t0 = performance.now(), dur = 1400;
        const paso = t => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(fin * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(paso); };
        requestAnimationFrame(paso);
      }), { threshold: 0.4 });
      obs.observe(el);
    });
  }

  /* ---------- configuracion ---------- */
  const CONF_KEY = "edtu_config";
  const CONF_DEF = { anim: true, part: true, grande: false };
  function leeConf() {
    try { return Object.assign({}, CONF_DEF, JSON.parse(localStorage.getItem(CONF_KEY) || "{}")); }
    catch (e) { return Object.assign({}, CONF_DEF); }
  }
  function guardaConf(c) { try { localStorage.setItem(CONF_KEY, JSON.stringify(c)); } catch (e) {} }
  function aplicaConf(c) {
    const h = document.documentElement;
    h.classList.toggle("sin-anim", !c.anim);
    h.classList.toggle("sin-part", !c.part);
    h.classList.toggle("letra-grande", !!c.grande);
  }
  function creaConfig() {
    const d = document.createElement("div");
    d.id = "configFs";
    d.innerHTML = '<div class="config-card"><button class="cerrar" id="configCerrar" aria-label="Cerrar">✕</button>' +
      '<h2>CONFIGURACIÓN</h2>' +
      '<div class="opcion"><span>Animaciones<small>Efectos y movimientos de la página</small></span><button class="interruptor" data-k="anim"></button></div>' +
      '<div class="opcion"><span>Partículas de fondo<small>Las lucecitas que flotan</small></span><button class="interruptor" data-k="part"></button></div>' +
      '<div class="opcion"><span>Letra grande<small>Textos un poco más grandes</small></span><button class="interruptor" data-k="grande"></button></div>' +
      '<div class="opcion"><span>Restablecer<small>Vuelve todo como al principio</small></span><button class="btn-pl" id="configReset" style="font-size:10px;padding:7px 10px">RESTABLECER</button></div>' +
      '</div>';
    document.body.appendChild(d);
    const pinta = () => {
      const c = leeConf();
      d.querySelectorAll(".interruptor").forEach(b => b.classList.toggle("on", !!c[b.dataset.k]));
    };
    d.querySelectorAll(".interruptor").forEach(b => b.onclick = () => {
      const c = leeConf(); c[b.dataset.k] = !c[b.dataset.k]; guardaConf(c); aplicaConf(c); pinta();
    });
    document.getElementById("configReset").onclick = () => { guardaConf(Object.assign({}, CONF_DEF)); aplicaConf(CONF_DEF); pinta(); };
    document.getElementById("configCerrar").onclick = () => d.classList.remove("open");
    d.addEventListener("click", e => { if (e.target === d) d.classList.remove("open"); });
    addEventListener("keydown", e => { if (e.key === "Escape") d.classList.remove("open"); });
    window.EDTU_CONFIG_ABRIR = () => { pinta(); d.classList.add("open"); };
    pinta();
  }
  function ponGear() {
    const nav = document.querySelector(".topbar"); if (!nav) return;
    const g = document.createElement("button");
    g.className = "gear"; g.setAttribute("aria-label", "Configuración"); g.title = "Configuración"; g.innerHTML = "⚙";
    g.onclick = () => window.EDTU_CONFIG_ABRIR && window.EDTU_CONFIG_ABRIR();
    nav.insertBefore(g, nav.querySelector(".cuenta"));
  }
  aplicaConf(leeConf());
  creaConfig();
  ponGear();

  /* ---------- menu de tres rayitas (celular) ---------- */
  function creaMenuMovil() {
    const nav = document.querySelector(".topbar"), enlaces = document.querySelectorAll(".menu-top a");
    if (!nav || !enlaces.length) return;
    const boton = document.createElement("button");
    boton.className = "burger"; boton.setAttribute("aria-label", "Menú");
    boton.innerHTML = "<span></span><span></span><span></span>";
    const panel = document.createElement("div");
    panel.className = "menu-movil";
    enlaces.forEach(a => { const c = document.createElement("a"); c.href = a.getAttribute("href"); c.textContent = a.textContent; panel.appendChild(c); });
    nav.insertBefore(boton, nav.querySelector(".cuenta"));
    document.body.appendChild(panel);
    const cierra = () => { boton.classList.remove("abierto"); panel.classList.remove("abierto"); };
    boton.onclick = () => { const abre = !panel.classList.contains("abierto"); boton.classList.toggle("abierto", abre); panel.classList.toggle("abierto", abre); };
    panel.addEventListener("click", e => { if (e.target.tagName === "A") cierra(); });
    addEventListener("keydown", e => { if (e.key === "Escape") cierra(); });
  }
  creaMenuMovil();

  creaVentanaAuth();
  conectaCuentas();
  pintaModo();
  revelar();
  contadores();
  window.EDTU_NUEVO = { abreAuth, cierraAuth };
})();
