/* Kit Aula Viva — presença (chamada) e "saiu da tela".
   Só funciona com Firebase configurado e o login "Anônimo" ativado (docs/FIREBASE.md).
   Celular: cria uma conta anônima (sem e-mail) e grava SÓ no próprio nó:
     presenca/<aula>/<uid> = { n, c, t, cod, ap, pg, vis, nav, vt, us, sl, jg }
       n nome · c nº da chamada · t turma · cod código do aparelho · ap modelo/sistema/navegador
       pg página (slides|jogo) · vis tela visível · nav saiu clicando num link do site
       vt último sinal (relógio do Firebase) · us hora em que a tela saiu · sl slide · jg progresso do jogo
   Professor: lê presenca/<aula> (as regras só deixam o UID do professor ler).
   Sair da tela = trocar de app, de aba, bloquear o celular ou fechar o navegador. */
(function (g) {
  "use strict";
  const V = g.Viva;
  const CH_CONTA = "viva:anon", CH_ID = "viva:aluno-id", CH_NAV = "viva:nav-int";
  const SV = { ".sv": "timestamp" };
  const ALFA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

  /* nomes que não são nome (a lista é curta de propósito: o professor vê tudo de qualquer jeito) */
  const FEIOS = /(^|\s)(porra|caralho|merda|bosta|puta|puto|buceta|cu|viado|fdp|pqp|vsf|krl|cacete|piroca|ninguem|anonimo)(\s|$)/i;

  const P = {
    VIDA: 70000, BATIDA: 20000,
    ativo: () => !!(V.Sync && V.Sync.cfg()),
    identidade: () => V.store.get(CH_ID, null),

    /* Confere o nome digitado. Devolve texto do erro ou "" se estiver ok. */
    validarNome(nome) {
      const n = String(nome || "").trim().replace(/\s+/g, " ");
      if (n.length > 60) return "Nome muito comprido.";
      if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/.test(n)) return "Use só letras no nome (sem números ou emoji).";
      const partes = n.split(" ").filter((x) => x.length >= 2);
      if (partes.length < 2) return "Escreva nome e sobrenome.";
      if (FEIOS.test(n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())) return "Use seu nome de verdade: ele vai para a chamada.";
      return "";
    },
    definirAluno(a) {
      const id = { nome: String(a.nome).trim().replace(/\s+/g, " ").slice(0, 60), numero: +a.numero || 0, turma: String(a.turma || "").slice(0, 30) };
      V.store.set(CH_ID, id);
      if (this._caminho) this.enviar({ n: id.nome, c: id.numero, t: id.turma });
      return id;
    },

    /* ----- conta anônima do aparelho ----- */
    async conta() {
      const c = V.Sync.cfg(); if (!c) return null;
      let a = V.store.get(CH_CONTA, null);
      if (a && a.db !== c.db) a = null; // outro projeto
      if (!a) {
        const r = await fetch(c.signUpURL + "?key=" + encodeURIComponent(c.apiKey), {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error((j.error && j.error.message) || "HTTP " + r.status);
        a = { uid: j.localId, idToken: j.idToken, refreshToken: j.refreshToken, expira: Date.now() + (+j.expiresIn - 60) * 1000, db: c.db };
        V.store.set(CH_CONTA, a);
      } else if (Date.now() >= a.expira) {
        try { a = await V.Sync.renovar(a); } catch (e) { V.store.del(CH_CONTA); return this.conta(); }
        V.store.set(CH_CONTA, a);
      }
      return a;
    },
    codigo() {
      const a = V.store.get(CH_CONTA, null); if (!a) return "";
      let h = 2166136261; for (const ch of a.uid) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
      let s = ""; for (let i = 0; i < 4; i++) { h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0; s += ALFA[h % ALFA.length]; }
      return s;
    },

    /* ----- descrição do aparelho (modelo quando o navegador informa) ----- */
    async aparelho() {
      const ua = navigator.userAgent || "";
      let modelo = "", so = "", nav = "";
      const uad = navigator.userAgentData;
      if (uad && uad.getHighEntropyValues) {
        try {
          const h = await uad.getHighEntropyValues(["model", "platformVersion"]);
          modelo = h.model || "";
          if (uad.platform) so = uad.platform + (h.platformVersion && uad.platform === "Android" ? " " + h.platformVersion.split(".")[0] : "");
        } catch (x) { /* navegador recusou */ }
      }
      if (!modelo) { const m = ua.match(/Android [\d.]+; (?:[a-z]{2}-[a-z]{2}; )?([^;)]+?)(?: Build|\))/i); if (m && m[1] !== "K") modelo = m[1].trim(); }
      if (!so) {
        let m;
        if ((m = ua.match(/Android ([\d]+)/))) so = "Android " + m[1];
        else if ((m = ua.match(/(iPhone|iPad).*? OS (\d+)/))) { so = "iOS " + m[2]; modelo = modelo || m[1]; }
        else if (/Windows/.test(ua)) so = "Windows"; else if (/CrOS/.test(ua)) so = "Chromebook"; else if (/Mac OS X/.test(ua)) so = "Mac"; else if (/Linux/.test(ua)) so = "Linux";
      }
      nav = /SamsungBrowser/.test(ua) ? "Samsung Internet" : /FxiOS|Firefox/.test(ua) ? "Firefox" : /EdgA?\//.test(ua) ? "Edge" : /OPR|Opera/.test(ua) ? "Opera"
        : /MiuiBrowser/.test(ua) ? "Mi Browser" : /CriOS|Chrome/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "";
      const marcas = [[/^SM-/, "Samsung"], [/^moto|^XT\d/i, "Motorola"], [/^Redmi|^POCO|^M2\d|^2\d{3}/i, "Xiaomi"], [/^CPH/, "Oppo"], [/^RMX/, "Realme"], [/^V2\d/, "vivo"], [/^LM-/, "LG"], [/^Infinix|^X6\d{2}/i, "Infinix"], [/^Pixel/, ""]];
      const mk = marcas.find(([re]) => re.test(modelo));
      if (mk && mk[1] && modelo.indexOf(mk[1]) !== 0) modelo = mk[1] + " " + modelo;
      return [modelo, so, nav].filter(Boolean).join(" · ").slice(0, 80);
    },

    /* ----- envio (PATCH só no próprio nó) ----- */
    async enviar(campos, manterVivo) {
      if (!this._caminho) return;
      try {
        const a = await this.conta();
        await fetch(this._db + "/" + this._caminho + ".json?auth=" + encodeURIComponent(a.idToken), {
          method: "PATCH", body: JSON.stringify(Object.assign({ vt: SV }, campos)), keepalive: !!manterVivo,
        });
      } catch (x) { /* sem internet: tenta de novo na próxima batida */ }
    },

    /* Liga a presença numa página. o = { pagina: "slides"|"jogo", extra: () => ({...}) } */
    async iniciar(o) {
      if (!this.ativo() || this._caminho) return;
      const c = V.Sync.cfg();
      let a;
      try { a = await this.conta(); } catch (e) { this.erro = e.message; return; }
      this._db = c.db; this._caminho = "presenca/" + V.aulaId() + "/" + a.uid;
      const extra = o.extra || (() => ({}));
      const id = this.identidade() || {};
      const visivel = () => document.visibilityState !== "hidden";
      this.enviar(Object.assign({ cod: this.codigo(), ap: await this.aparelho(), pg: o.pagina, vis: visivel(), nav: false }, id.nome ? { n: id.nome, c: id.numero, t: id.turma } : {}, extra()));
      setInterval(() => { if (visivel()) this.enviar(Object.assign({ vis: true, nav: false, pg: o.pagina }, extra())); }, this.BATIDA);
      // clique num link do próprio site não conta como "saiu"
      document.addEventListener("click", (e) => {
        const l = e.target.closest && e.target.closest("a[href]");
        if (l && l.origin === location.origin) sessionStorage.setItem(CH_NAV, Date.now());
      }, true);
      let saiu = false;
      const sair = () => {
        if (saiu) return; saiu = true;
        const nav = Date.now() - (+sessionStorage.getItem(CH_NAV) || 0) < 3000;
        this.enviar({ vis: false, nav, us: SV, pg: o.pagina }, true);
      };
      document.addEventListener("visibilitychange", () => {
        if (!visivel()) sair();
        else { saiu = false; this.enviar(Object.assign({ vis: true, nav: false, pg: o.pagina }, extra())); }
      });
      g.addEventListener("pagehide", sair);
      this.atualizar = (campos) => this.enviar(Object.assign({ vis: visivel() }, campos));
    },
    atualizar() { /* substituído em iniciar() */ },

    /* ----- tela "Chamada" no celular ----- */
    pedirNome(o) {
      const id = this.identidade() || {}, turmas = o.turmas || [];
      const fundo = document.createElement("div"); fundo.className = "chamada-fundo";
      fundo.innerHTML = '<form class="chamada-caixa" novalidate><h2 class="s-titulo">📋 Chamada</h2><p>Escreva seu nome para o professor saber que você está na aula.</p>' +
        '<label class="rot" for="ch-nome">Nome e sobrenome</label><input id="ch-nome" class="resp-texto" maxlength="60" autocomplete="name">' +
        '<label class="rot" for="ch-num">Número da chamada</label><input id="ch-num" class="resp-texto" type="number" min="1" max="60" inputmode="numeric">' +
        (turmas.length ? '<label class="rot" for="ch-turma">Turma</label><select id="ch-turma" class="resp-texto"><option value="">Escolha…</option>' + turmas.map((t) => "<option>" + V.esc(t) + "</option>").join("") + "</select>" : "") +
        '<p class="ch-msg" aria-live="polite"></p><p style="display:flex;gap:.5em;flex-wrap:wrap"><button class="btn" type="submit">Entrar na aula ▶</button>' +
        (o.podePular ? '<button class="btn sec" type="button" data-pular>Estou estudando em casa</button>' : "") + "</p></form>";
      document.body.appendChild(fundo);
      const f = fundo.querySelector("form"), q = (s) => fundo.querySelector(s);
      if (id.nome) q("#ch-nome").value = id.nome;
      if (id.numero) q("#ch-num").value = id.numero;
      if (id.turma && q("#ch-turma")) q("#ch-turma").value = id.turma;
      const fechar = () => { fundo.remove(); o.aoFim && o.aoFim(this.identidade()); };
      f.onsubmit = (e) => {
        e.preventDefault();
        const nome = q("#ch-nome").value, num = +q("#ch-num").value, tu = q("#ch-turma") ? q("#ch-turma").value : "";
        const erro = this.validarNome(nome) || (!(num >= 1 && num <= 60) ? "Coloque seu número da chamada." : "") || (turmas.length && !tu ? "Escolha sua turma." : "");
        if (erro) { q(".ch-msg").textContent = erro; return; }
        this.definirAluno({ nome, numero: num, turma: tu }); fechar();
      };
      const pl = q("[data-pular]"); if (pl) pl.onclick = () => { sessionStorage.setItem("viva:pulou-chamada", "1"); fechar(); };
      setTimeout(() => q("#ch-nome").focus(), 50);
    },

    /* ----- painel do professor: escuta a turma ----- */
    ouvirTurma(cb, aoStatus) {
      const c = V.Sync.cfg(); if (!c || !V.Sync.auth()) return null;
      let mapa = {}, es = null, reabrir = null, fechado = false;
      const aplicar = (ev) => {
        let m; try { m = JSON.parse(ev.data); } catch (x) { return; }
        if (!m) return;
        const p = String(m.path || "/").split("/").filter(Boolean);
        if (!p.length) mapa = ev.type === "patch" ? Object.assign({}, mapa, m.data || {}) : (m.data || {});
        else if (p.length === 1) { if (m.data === null) delete mapa[p[0]]; else mapa[p[0]] = ev.type === "patch" ? Object.assign({}, mapa[p[0]] || {}, m.data) : m.data; }
        else { const n = Object.assign({}, mapa[p[0]] || {}); if (m.data === null) delete n[p[1]]; else n[p[1]] = m.data; mapa[p[0]] = n; }
        cb(mapa);
      };
      const abrir = async () => {
        if (fechado) return;
        let tk; try { tk = await V.Sync.token(); } catch (e) { aoStatus && aoStatus("erro", e.message); return; }
        if (es) es.close();
        es = new EventSource(c.db + "/presenca/" + encodeURIComponent(V.aulaId()) + ".json?auth=" + encodeURIComponent(tk));
        es.addEventListener("put", aplicar); es.addEventListener("patch", aplicar);
        es.addEventListener("keep-alive", () => aoStatus && aoStatus("ok"));
        es.addEventListener("auth_revoked", () => setTimeout(abrir, 500));
        es.addEventListener("cancel", () => { aoStatus && aoStatus("erro", "sem permissão: confira as regras do Firebase (presenca)"); });
        let abriu = false;
        es.onopen = () => { abriu = true; aoStatus && aoStatus("ok"); };
        es.onerror = () => { if (!abriu && aoStatus) aoStatus("erro", "não conectou à chamada: confira se as regras novas (presenca) foram publicadas no Firebase"); };
        clearTimeout(reabrir); reabrir = setTimeout(abrir, 45 * 60000); // antes do token de 1 h vencer
      };
      abrir();
      return { fechar() { fechado = true; es && es.close(); clearTimeout(reabrir); }, mapa: () => mapa };
    },
    async novaChamada() {
      const c = V.Sync.cfg(), tk = await V.Sync.token();
      const r = await fetch(c.db + "/presenca/" + encodeURIComponent(V.aulaId()) + ".json?auth=" + encodeURIComponent(tk), { method: "DELETE" });
      if (!r.ok) throw new Error("HTTP " + r.status);
    },
  };
  V.Presenca = P;
})(window);
