/* Kit Aula Viva — núcleo: utilidades, acessibilidade e leitura em voz. */
(function (g) {
  "use strict";
  const V = (g.Viva = g.Viva || {});
  V.VERSAO = "1.4.0";

  V.store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* modo privado */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* */ } },
  };

  V.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  // **negrito**, *itálico*, `código`, quebra de linha
  V.md = (s) => {
    const cods = [];
    let t = V.esc(s).replace(/`([^`]+)`/g, (m, c) => "\u0000" + (cods.push(c) - 1) + "\u0000");
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+?)\*(?![*\w])/g, "$1<em>$2</em>").replace(/\n/g, "<br>");
    return t.replace(/\u0000(\d+)\u0000/g, (m, k) => "<code>" + cods[+k] + "</code>");
  };

  V.$ = (sel, raiz) => (raiz || document).querySelector(sel);
  V.$$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));

  V.embaralhar = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  V.normCodigo = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

  V.sha256 = async (txt) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  V.semMovimento = () => document.documentElement.classList.contains("sem-mov") ||
    (g.matchMedia && g.matchMedia("(prefers-reduced-motion: reduce)").matches);

  V.aulaId = () => (g.AULA && g.AULA.id) || "aula";

  /* ---------- Leitura em voz (Web Speech API, pt-BR) ---------- */
  let vozes = [];
  function carregarVozes() { try { vozes = speechSynthesis.getVoices(); } catch (e) { vozes = []; } }
  if (g.speechSynthesis) { carregarVozes(); speechSynthesis.onvoiceschanged = carregarVozes; }
  V.podeFalar = () => !!g.speechSynthesis;
  V.falar = (texto, aoTerminar) => {
    if (!g.speechSynthesis || !texto) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(texto).replace(/[#*_`>]/g, " "));
    u.lang = "pt-BR";
    const v = vozes.find((x) => /pt[-_]BR/i.test(x.lang)) || vozes.find((x) => /^pt/i.test(x.lang));
    if (v) u.voice = v;
    u.rate = V.store.get("viva:a11y", {}).vel || 0.95;
    if (aoTerminar) u.onend = aoTerminar;
    speechSynthesis.speak(u);
    return true;
  };
  V.pararFala = () => { try { speechSynthesis.cancel(); } catch (e) { /* */ } };
  V.falando = () => { try { return speechSynthesis.speaking; } catch (e) { return false; } };
  // Texto legível de um elemento, pulando o que tem data-nao-ler
  V.textoDe = (el) => {
    if (!el) return "";
    const c = el.cloneNode(true);
    c.querySelectorAll("[data-nao-ler],script,style").forEach((n) => n.remove());
    return (c.innerText || c.textContent || "").replace(/\s+/g, " ").trim();
  };

  /* ---------- Barra de acessibilidade ----------
     Botões com data-a11y="menos|mais|ler|tema|mov|apoio" dentro de `raiz`.
     tema: claro → escuro → alto contraste (começa pelo tema do aparelho).
     `alvoLeitura()` devolve o elemento a ler. `aoMudar(prefs)` avisa a página. */
  V.a11y = {
    prefs: null,
    init(opts) {
      const o = opts || {};
      this.alvo = o.alvoLeitura || (() => document.body);
      this.aoMudar = o.aoMudar || (() => {});
      this.prefs = Object.assign({ escala: 1, semMov: false, apoio: false }, V.store.get("viva:a11y", {}));
      if (!this.prefs.tema) {
        const escuro = g.matchMedia && g.matchMedia("(prefers-color-scheme: dark)").matches;
        this.prefs.tema = this.prefs.contraste ? "contraste" : escuro ? "escuro" : "claro";
      }
      delete this.prefs.contraste;
      this.aplicar();
      V.$$("[data-a11y]", o.raiz).forEach((b) => b.addEventListener("click", () => this.acao(b.dataset.a11y, b)));
      if (!V.podeFalar()) V.$$('[data-a11y="ler"]', o.raiz).forEach((b) => (b.hidden = true));
    },
    acao(a, botao) {
      const p = this.prefs;
      if (a === "menos") p.escala = Math.max(0.85, +(p.escala - 0.15).toFixed(2));
      if (a === "mais") p.escala = Math.min(1.9, +(p.escala + 0.15).toFixed(2));
      if (a === "tema" || a === "contraste") {
        p.tema = { claro: "escuro", escuro: "contraste", contraste: "claro" }[p.tema] || "claro";
        V.toast({ claro: "☀️ Tema claro", escuro: "🌙 Tema escuro", contraste: "◐ Alto contraste" }[p.tema]);
      }
      if (a === "mov") p.semMov = !p.semMov;
      if (a === "apoio") p.apoio = !p.apoio;
      if (a === "ler") {
        if (V.falando()) { V.pararFala(); botao && botao.classList.remove("ativo"); return; }
        botao && botao.classList.add("ativo");
        V.falar(V.textoDe(this.alvo()), () => botao && botao.classList.remove("ativo"));
        return;
      }
      this.aplicar();
      V.store.set("viva:a11y", p);
      this.aoMudar(p);
    },
    aplicar() {
      const h = document.documentElement, p = this.prefs;
      h.style.setProperty("--escala", p.escala);
      h.classList.toggle("alto-contraste", p.tema === "contraste");
      h.classList.toggle("tema-escuro", p.tema === "escuro");
      h.classList.toggle("hub-claro", p.tema === "claro");
      h.classList.toggle("sem-mov", !!p.semMov);
      h.classList.toggle("modo-apoio", !!p.apoio);
      const ic = { claro: "☀️", escuro: "🌙", contraste: "◐" }[p.tema], nome = { claro: "claro", escuro: "escuro", contraste: "alto contraste" }[p.tema];
      V.$$('[data-a11y="tema"], [data-a11y="contraste"]').forEach((b) => { b.textContent = ic; b.setAttribute("aria-label", "Tema: " + nome + ". Toque para trocar"); b.removeAttribute("aria-pressed"); });
      V.$$('[data-a11y="apoio"]').forEach((b) => b.setAttribute("aria-pressed", !!p.apoio));
      V.$$('[data-a11y="mov"]').forEach((b) => b.setAttribute("aria-pressed", !!p.semMov));
    },
  };

  /* ---------- Reforço positivo (adesivos) ---------- */
  const FRASES_OK = ["Isso aí! ✅", "Mandou bem! 🌟", "Certinho! 👏", "Boa! Você pegou a ideia. 💡", "Acertou! 🎯"];
  const FRASES_QUASE = ["Quase! Olhe a dica. 💡", "Ainda não. Tente de novo, sem pressa. 🙂", "Errar faz parte do treino. Mais uma! 💪"];
  V.fraseOk = () => FRASES_OK[Math.floor(Math.random() * FRASES_OK.length)];
  V.fraseQuase = () => FRASES_QUASE[Math.floor(Math.random() * FRASES_QUASE.length)];

  V.toast = (msg, tipo) => {
    let t = V.$("#viva-toast");
    if (!t) { t = document.createElement("div"); t.id = "viva-toast"; t.setAttribute("role", "status"); t.setAttribute("aria-live", "polite"); document.body.appendChild(t); }
    t.className = "mostra " + (tipo || "");
    t.textContent = msg;
    clearTimeout(t._tm);
    t._tm = setTimeout(() => (t.className = ""), 2600);
  };

  /* ---------- QR (qrcode-generator, MIT, embutido em motor/qrcode.js) ---------- */
  V.qrSVG = (texto, celula) => {
    if (typeof g.qrcode !== "function") return "";
    const q = g.qrcode(0, "M"); q.addData(texto); q.make();
    return q.createSvgTag({ cellSize: celula || 6, margin: 2, scalable: true });
  };

  /* Portão do professor: pede a frase (config.profSenhaHash ou jogoSenhaHash) uma vez por navegador.
     Site estático é público: isto afasta curiosos, não é segurança. Quem controla TV e celulares é o login do Firebase. */
  V.portaoProfessor = (aoLiberar, linkAluno) => {
    const c = g.VIVA_CONFIG || {}, h = c.profSenhaHash || c.jogoSenhaHash;
    if (!h || V.store.get("viva:prof-ok", "") === h) return aoLiberar();
    const d = document.createElement("div");
    d.id = "portao";
    d.innerHTML = '<form><h2>🔒 Área do professor</h2><p>Digite a frase do professor.</p><input type="password" autocomplete="current-password" aria-label="Frase do professor"><p class="msg" aria-live="polite"></p><button class="btn" type="submit">Entrar</button><p><a href="' + (linkAluno || "../../index.html") + '">Sou aluno → ir para a aula</a></p></form>';
    document.body.appendChild(d);
    const f = d.querySelector("form"), inp = d.querySelector("input");
    inp.focus();
    f.onsubmit = async (e) => {
      e.preventDefault();
      if ((await V.sha256(V.normCodigo(inp.value))) === h) { V.store.set("viva:prof-ok", h); d.remove(); aoLiberar(); }
      else d.querySelector(".msg").textContent = "Frase diferente.";
    };
  };

  // URL de uma página irmã (mesma pasta da aula)
  V.urlIrma = (arquivo) => new URL(arquivo, g.location.href).href;
})(window);
