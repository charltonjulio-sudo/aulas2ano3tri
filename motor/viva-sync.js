/* Kit Aula Viva — sincronia.
   1) Painel ↔ TV no mesmo navegador: localStorage + evento "storage" (funciona offline).
   2) Painel → celulares: Firebase Realtime Database pela API REST
      (leitura: EventSource em /aovivo/estado.json; escrita: PUT com token do professor).
   Só trafega o estado da aula {aula, i, passo, revelado, max, ts}. Nenhum dado de aluno. */
(function (g) {
  "use strict";
  const V = g.Viva;
  const CAMINHO = "aovivo/estado";

  function cfgFirebase() {
    const c = (g.VIVA_CONFIG && g.VIVA_CONFIG.firebase) || {};
    if (!c.apiKey || !c.databaseURL) return null;
    return {
      apiKey: c.apiKey,
      db: c.databaseURL.replace(/\/+$/, ""),
      authURL: c.authURL || "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword",
      tokenURL: c.tokenURL || "https://securetoken.googleapis.com/v1/token",
    };
  }

  const Sync = {
    chaveLocal: () => "viva:estado:" + V.aulaId(),
    chaveTV: () => "viva:hb-tv:" + V.aulaId(),
    temRemoto: () => !!cfgFirebase(),

    /* ----- local (mesmo navegador) ----- */
    publicarLocal(estado) { V.store.set(this.chaveLocal(), estado); },
    lerLocal() { return V.store.get(this.chaveLocal(), null); },
    ouvirLocal(cb) {
      g.addEventListener("storage", (e) => {
        if (e.key === this.chaveLocal() && e.newValue) { try { cb(JSON.parse(e.newValue)); } catch (x) { /* */ } }
      });
      const atual = this.lerLocal();
      if (atual) cb(atual);
    },
    // batimento da TV para o painel saber que ela está aberta
    batimentoTV() { setInterval(() => V.store.set(this.chaveTV(), Date.now()), 1000); },
    tvAberta() { return Date.now() - (V.store.get(this.chaveTV(), 0) || 0) < 3500; },

    /* ----- remoto: autenticação do professor ----- */
    auth() { return V.store.get("viva:auth", null); },
    async login(email, senha) {
      const c = cfgFirebase(); if (!c) throw new Error("Firebase não configurado em config.js");
      let r;
      try {
        r = await fetch(c.authURL + "?key=" + encodeURIComponent(c.apiKey), {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
        });
      } catch (x) { const e = new Error(x.message); e.rede = true; throw e; }
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { const e = new Error((j.error && j.error.message) || "HTTP " + r.status); e.codigo = e.message; throw e; }
      const a = { email: j.email, uid: j.localId, idToken: j.idToken, refreshToken: j.refreshToken, expira: Date.now() + (+j.expiresIn - 60) * 1000 };
      V.store.set("viva:auth", a);
      return a;
    },
    logout() { V.store.del("viva:auth"); },
    async token() {
      const c = cfgFirebase(); let a = this.auth();
      if (!c || !a) return null;
      if (Date.now() < a.expira) return a.idToken;
      const r = await fetch(c.tokenURL + "?key=" + encodeURIComponent(c.apiKey), {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(a.refreshToken),
      });
      const j = await r.json();
      if (!r.ok) { this.logout(); throw new Error((j.error && j.error.message) || "sessão expirada"); }
      a = Object.assign(a, { idToken: j.id_token, refreshToken: j.refresh_token, expira: Date.now() + (+j.expires_in - 60) * 1000 });
      V.store.set("viva:auth", a);
      return a.idToken;
    },

    /* ----- remoto: escrita (professor), com junção de envios próximos ----- */
    _pendente: null, _tm: null,
    publicarRemoto(estado, aoStatus) {
      if (!cfgFirebase() || !this.auth()) return;
      this._pendente = estado;
      clearTimeout(this._tm);
      this._tm = setTimeout(async () => {
        const e = this._pendente; this._pendente = null;
        try {
          const tk = await this.token();
          const corpo = Object.assign({}, e, { ts: { ".sv": "timestamp" } }); // relógio do Firebase
          const r = await fetch(cfgFirebase().db + "/" + CAMINHO + ".json?auth=" + encodeURIComponent(tk), { method: "PUT", body: JSON.stringify(corpo) });
          if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 120));
          aoStatus && aoStatus("ok");
        } catch (err) { aoStatus && aoStatus("erro", err.message); }
      }, 120);
    },
    // o painel reenvia o estado a cada 25 s: é o "estou ao vivo" que os celulares conferem
    VIDA: 75000,
    batimentoRemoto(obter, aoStatus) { setInterval(() => { if (this.auth()) this.publicarRemoto(obter(), aoStatus); }, 25000); },
    publicar(estado, aoStatus) { this.publicarLocal(estado); this.publicarRemoto(estado, aoStatus); },

    /* ----- remoto: leitura em tempo real (alunos / TV em outro aparelho) -----
       aoStatus("ao-vivo" | "conectando" | "offline" | "parado")
       "parado" = o banco tem um estado, mas o painel não manda sinal há mais de VIDA ms.
       cb(estado, fresco) */
    ouvirRemoto(cb, aoStatus) {
      const c = cfgFirebase();
      if (!c || typeof g.EventSource !== "function") { aoStatus && aoStatus("offline"); return null; }
      let estado = null, es = null, guarda = null, vivoAte = 0, ultimo = "";
      const VIDA = this.VIDA;
      const st = (s) => { ultimo = s; aoStatus && aoStatus(s); };
      const fresco = () => Date.now() < vivoAte;
      const avaliar = () => st(estado && fresco() ? "ao-vivo" : estado ? "parado" : "ao-vivo-vazio");
      setInterval(() => { if (ultimo === "ao-vivo" && !fresco()) { st("parado"); if (estado) cb(estado, false); } }, 5000);
      const abrir = () => {
        st("conectando");
        es = new EventSource(c.db + "/" + CAMINHO + ".json");
        clearTimeout(guarda);
        guarda = setTimeout(() => st("offline"), 9000);
        const aplicar = (ev, mesclar) => {
          let msg; try { msg = JSON.parse(ev.data); } catch (x) { return; }
          if (!msg) return;
          const partes = String(msg.path || "/").split("/").filter(Boolean);
          if (!partes.length) estado = mesclar ? Object.assign({}, estado || {}, msg.data || {}) : msg.data;
          else { estado = Object.assign({}, estado || {}); estado[partes[0]] = msg.data; }
          clearTimeout(guarda);
          if (estado && typeof estado.ts === "number") {
            const idade = Math.max(0, Date.now() - estado.ts); // relógio do aparelho pode estar um pouco errado
            vivoAte = Date.now() + VIDA - idade;
          } else vivoAte = 0;
          avaliar();
          if (estado) cb(estado, fresco());
        };
        es.addEventListener("put", (ev) => aplicar(ev, false));
        es.addEventListener("patch", (ev) => aplicar(ev, true));
        es.addEventListener("keep-alive", () => { clearTimeout(guarda); avaliar(); });
        es.addEventListener("cancel", () => { st("offline"); });
        es.onerror = () => { st(navigator.onLine === false ? "offline" : "conectando"); clearTimeout(guarda); guarda = setTimeout(() => st("offline"), 9000); };
      };
      abrir();
      g.addEventListener("online", () => { if (es && es.readyState === 2) abrir(); });
      return { fechar: () => es && es.close() };
    },
  };
  V.Sync = Sync;
})(window);
