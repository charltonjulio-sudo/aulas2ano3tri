/* Kit Aula Viva — desenho dos slides (TV, prévia do professor e celular do aluno).
   Tipos: hero, conteudo, caso, quadro, demo (codigo|carta|planilha), pratica (python|planilha|texto|desenho),
          quiz, cards (virar|classificar), atividade.  Ver docs/ESQUEMA.md. */
(function (g) {
  "use strict";
  const V = g.Viva, md = V.md, esc = V.esc;

  /* ---------- estado local do aluno (respostas, adesivos) ---------- */
  const chaveAluno = () => "viva:aluno:" + V.aulaId();
  V.alunoEstado = () => V.store.get(chaveAluno(), { r: {}, adesivos: 0 });
  V.alunoSalvar = (st) => V.store.set(chaveAluno(), st);
  V.alunoResp = (id, val) => { const st = V.alunoEstado(); if (val === undefined) return st.r[id]; st.r[id] = val; V.alunoSalvar(st); return val; };
  V.ganharAdesivo = (motivo) => {
    const st = V.alunoEstado(); st.adesivos = (st.adesivos || 0) + 1; V.alunoSalvar(st);
    const b = V.$("#adesivos"); if (b) { b.textContent = "⭐ " + st.adesivos; b.classList.remove("pulo"); void b.offsetWidth; b.classList.add("pulo"); }
    V.toast((motivo || V.fraseOk()) + "  +1 ⭐", "ok");
  };

  /* ---------- realce simples de Python ---------- */
  const KW = /^(False|None|True|and|as|break|continue|def|elif|else|for|from|if|import|in|is|not|or|pass|return|while|with|try|except|finally|lambda|class)$/;
  const BI = /^(print|input|int|float|str|len|range|round|type|list|dict|sum|max|min|abs|bool)$/;
  V.realce = (cod) => {
    const re = /(#.*$)|("(?:[^"\\]|\\.)*"?|'(?:[^'\\]|\\.)*'?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_À-ÿ][\wÀ-ÿ]*)|(\/\/|==|!=|<=|>=|[+\-*/%=<>(),:\[\]{}])/gm;
    let out = "", i = 0, m;
    while ((m = re.exec(cod))) {
      out += esc(cod.slice(i, m.index)); i = re.lastIndex;
      const [t, com, str, num, id, op] = m;
      if (com) out += '<span class="hl-com">' + esc(t) + "</span>";
      else if (str) out += '<span class="hl-str">' + esc(t) + "</span>";
      else if (num) out += '<span class="hl-num">' + esc(t) + "</span>";
      else if (id) out += KW.test(t) ? '<span class="hl-kw">' + t + "</span>" : BI.test(t) ? '<span class="hl-bi">' + t + "</span>" : esc(t);
      else if (op) out += '<span class="hl-op">' + esc(t) + "</span>";
      else out += esc(t);
    }
    return out + esc(cod.slice(i));
  };

  /* ---------- digitação animada ---------- */
  function digitar(alvo, texto, fmt, el, aoFim) {
    const meu = el._anim;
    if (V.semMovimento()) { alvo.innerHTML = fmt(texto); aoFim && aoFim(); return; }
    const vel = Math.max(18, Math.min(55, 1400 / Math.max(texto.length, 1)));
    let k = 0;
    alvo.classList.add("digitando");
    const passo = () => {
      if (el._anim !== meu) return;
      k++; alvo.innerHTML = fmt(texto.slice(0, k));
      if (k < texto.length) setTimeout(passo, vel); else { alvo.classList.remove("digitando"); aoFim && aoFim(); }
    };
    passo();
  }

  /* ---------- passos de cada slide (cada "Próximo" do professor) ---------- */
  V.passos = (s) => {
    if (s.tipo === "conteudo" && s.revelar_itens && s.itens) return s.itens.length;
    if (s.tipo === "demo") return s.modo === "codigo" ? s.linhas.length + (s.saida !== undefined ? 1 : 0) : s.modo === "carta" ? s.campos.length : s.passos.length;
    if (s.tipo === "cards" && s.modo === "virar") return s.cartas.length;
    if (s.tipo === "quadro" && s.animar !== false) return s.linhas.length;
    if (s.tipo === "tutorial") return s.passos.length;
    return 0;
  };
  V.temRevelar = (s) => ["quiz", "pratica", "cards", "caso"].includes(s.tipo) && !(s.tipo === "cards" && s.modo === "virar") && !(s.tipo === "caso" && !s.resposta) && !(s.tipo === "pratica" && !s.solucao);

  /* ---------- partes comuns ---------- */
  const titulo = (s) => (s.titulo ? '<h2 class="s-titulo">' + md(s.titulo) + "</h2>" : "");
  const imagem = (s) => (s.imagem ? '<figure class="s-img"><img src="' + esc(s.imagem.src) + '" alt="' + esc(s.imagem.alt || "") + '">' + (s.imagem.legenda ? "<figcaption>" + md(s.imagem.legenda) + "</figcaption>" : "") + "</figure>" : "");
  const apoio = (s, ctx) => (ctx === "aluno" && s.apoio ? '<div class="apoio-box"><span class="apoio-emoji" aria-hidden="true">' + esc(s.apoio.emoji || "🧩") + '</span><p>' + md(s.apoio.texto) + "</p></div>" : "");
  const glossario = (s, ctx) => (ctx === "aluno" && s.glossario && s.glossario.length ? '<details class="glossario"><summary>📖 Palavras novas (' + s.glossario.length + ")</summary><dl>" + s.glossario.map((x) => "<dt>" + esc(x.emoji || "") + " " + esc(x.termo) + "</dt><dd>" + md(x.explica) + "</dd>").join("") + "</dl></details>" : "");

  /* ---------- tipos ---------- */
  const T = {};
  T.hero = (s) => '<div class="s-hero">' + (s.emoji ? '<div class="hero-emoji" aria-hidden="true">' + esc(s.emoji) + "</div>" : "") + "<h1>" + md(s.titulo) + "</h1>" + (s.subtitulo ? '<p class="hero-sub">' + md(s.subtitulo) + "</p>" : "") + "</div>";

  T.conteudo = (s, ctx, est) => {
    const n = s.revelar_itens && ctx !== "aluno-tudo" ? est.passo : (s.itens || []).length;
    return titulo(s) + (s.texto ? '<p class="s-texto">' + md(s.texto) + "</p>" : "") +
      (s.itens ? '<ul class="s-itens">' + s.itens.map((it, i) => '<li class="' + (i < n ? "ver" : "oculto") + '">' + md(it) + "</li>").join("") + "</ul>" : "") +
      (s.destaque ? '<div class="s-destaque">' + md(s.destaque) + "</div>" : "") + imagem(s);
  };

  T.caso = (s, ctx, est) => '<span class="s-tag">' + esc(s.tag || "Caso real") + "</span>" + titulo(s) + '<p class="s-texto">' + md(s.texto) + "</p>" +
    (s.pergunta ? '<div class="s-pergunta">🤔 ' + md(s.pergunta) + "</div>" : "") +
    (s.resposta && est.revelado ? '<div class="s-resposta">' + md(s.resposta) + "</div>" : "") +
    (s.fonte ? '<p class="s-fonte">Fonte: ' + (s.fonte.url ? '<a href="' + esc(s.fonte.url) + '" target="_blank" rel="noopener">' + esc(s.fonte.titulo) + "</a>" : esc(s.fonte.titulo)) + (s.fonte.data ? " (" + esc(s.fonte.data) + ")" : "") + "</p>" : "") + imagem(s);

  /* Quadro de giz: cada "Próximo" escreve uma linha; o professor pode editar e mudar o tamanho (estado.zq / estado.qe). */
  T.quadro = (s, ctx, est, el) => {
    const n = V.passos(s) ? Math.max(0, Math.min(s.linhas.length, est.passo)) : s.linhas.length;
    const prev = el._prev || {};
    const anima = !!V.passos(s) && prev.id === s.id && prev.passo === n - 1 && n > 0;
    el.innerHTML = '<div class="s-quadro" style="--zq:' + (+est.zq || 1) + '"><div class="quadro-rotulo">✍️ Copie no caderno</div>' + titulo(s) + '<div class="quadro-linhas">' +
      s.linhas.map((l, i) => '<p class="' + (i >= n ? "giz-vazia" : "") + '" data-g="' + i + '">' + (i < n - (anima ? 1 : 0) ? md(l) : "") + "</p>").join("") + "</div></div>";
    if (anima) digitar(el.querySelector('[data-g="' + (n - 1) + '"]'), s.linhas[n - 1], md, el);
    return null;
  };

  /* Passo a passo de ferramenta real (Google Slides, Drive…), conferido em ajuda oficial + tutoriais. */
  const menu = (m) => (m && m.length ? ' <span class="menu-cam">' + m.map((x) => '<span class="menu-it">' + esc(x) + "</span>").join('<span class="menu-seta">›</span>') + "</span>" : "");
  const atalho = (a) => (a && a.length ? ' <span class="atalho">' + a.map((k) => "<kbd>" + esc(k) + "</kbd>").join("+") + "</span>" : "");
  T.tutorial = (s, ctx, est) => {
    const n = ctx === "aluno" ? s.passos.length : Math.min(s.passos.length, est.passo);
    const feitos = ctx === "aluno" ? V.alunoResp(s.id + ":chk") || [] : [];
    return '<span class="s-tag tut">🧭 Passo a passo · ' + esc(s.ferramenta || "") + "</span>" + titulo(s) + (s.texto ? '<p class="s-texto">' + md(s.texto) + "</p>" : "") +
      '<ol class="tut-passos">' + s.passos.map((p, i) => '<li class="' + (i < n ? "ver" : "oculto") + '">' + (ctx === "aluno" ? '<label><input type="checkbox" data-chk="' + i + '"' + (feitos.includes(i) ? " checked" : "") + "> <span>" : "<span>") +
        md(p.texto) + menu(p.menu) + atalho(p.atalho) + (p.dica ? '<small class="tut-dica">💡 ' + md(p.dica) + "</small>" : "") + "</span>" + (ctx === "aluno" ? "</label>" : "") + "</li>").join("") + "</ol>" +
      (s.fontes && s.fontes.length ? '<p class="s-fonte">Conferido em: ' + s.fontes.map((f) => (f.url ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.titulo) + "</a>" : esc(f.titulo))).join(" · ") + "</p>" : "");
  };

  T.atividade = (s, ctx) => {
    const feitos = ctx === "aluno" ? V.alunoResp(s.id + ":chk") || [] : [];
    let h = titulo(s) + '<div class="ativ-meta">' + (s.tempo_min ? "<span>⏱️ " + s.tempo_min + " min</span>" : "") + (s.entrega ? "<span>📤 " + md(s.entrega) + "</span>" : "") + "</div>";
    h += '<ol class="ativ-itens">' + s.itens.map((it, i) => "<li>" + (ctx === "aluno" ? '<label><input type="checkbox" data-chk="' + i + '"' + (feitos.includes(i) ? " checked" : "") + "> <span>" + md(it) + "</span></label>" : md(it)) + "</li>").join("") + "</ol>";
    if (ctx === "aluno" && s.resposta_texto) h += '<label class="rot">Sua resposta</label><textarea class="resp-texto" rows="5" data-resp></textarea><button type="button" class="btn sec" data-copiar>📋 Copiar resposta</button>';
    return h;
  };

  T.quiz = (s, ctx, est) => {
    let ops = s.opcoes.map((t, i) => ({ t, i }));
    if (ctx === "aluno" && document.documentElement.classList.contains("modo-apoio") && s.apoio_opcoes && s.apoio_opcoes < ops.length) {
      const erradas = ops.filter((o) => o.i !== s.correta).slice(0, s.apoio_opcoes - 1);
      ops = ops.filter((o) => o.i === s.correta || erradas.includes(o)).sort((a, b) => a.i - b.i);
    }
    const resp = ctx === "aluno" ? V.alunoResp(s.id) : undefined;
    const mostra = ctx === "aluno" ? resp !== undefined : est.revelado;
    return '<span class="s-tag quiz">❓ Pergunta rápida</span>' + titulo(s) + '<p class="s-pergunta-q">' + md(s.pergunta) + "</p>" +
      '<div class="quiz-ops">' + ops.map((o, k) => {
        let cls = "op";
        if (mostra && o.i === s.correta) cls += " certa";
        if (mostra && resp === o.i && o.i !== s.correta) cls += " errada";
        return '<button type="button" class="' + cls + '" data-op="' + o.i + '"' + (ctx !== "aluno" || mostra ? " disabled" : "") + '><b>' + "ABCDEF"[k] + "</b> " + md(o.t) + "</button>";
      }).join("") + "</div>" + (mostra && s.explicacao ? '<div class="s-resposta">' + (ctx === "aluno" ? (resp === s.correta ? "✅ " : "💡 ") : "✅ ") + md(s.explicacao) + "</div>" : "");
  };

  T.cards = (s, ctx, est) => {
    if (s.modo === "virar") {
      const viradas = ctx === "aluno" ? V.alunoResp(s.id) || [] : null;
      return titulo(s) + (s.texto ? '<p class="s-texto">' + md(s.texto) + "</p>" : "") + '<div class="cartas">' + s.cartas.map((c, i) => {
        const v = ctx === "aluno" ? viradas.includes(i) : i < est.passo;
        return '<button type="button" class="carta' + (v ? " virada" : "") + '" data-carta="' + i + '"' + (ctx === "aluno" ? "" : " tabindex=-1") + '><span class="frente">' + md(c.frente) + '</span><span class="verso">' + md(c.verso) + "</span></button>";
      }).join("") + "</div>" + (ctx === "aluno" ? '<p class="dica-uso">Toque nas cartas para virar.</p>' : "");
    }
    // classificar
    const feitos = ctx === "aluno" ? V.alunoResp(s.id) || {} : {};
    const mostraTudo = ctx !== "aluno" && est.revelado;
    return titulo(s) + (s.texto ? '<p class="s-texto">' + md(s.texto) + "</p>" : "") +
      '<div class="classif-itens">' + s.itens.map((it, i) => (ctx === "aluno" && feitos[i] !== undefined) || mostraTudo ? "" : '<button type="button" class="chip" data-item="' + i + '">' + md(it.texto) + "</button>").join("") + "</div>" +
      '<div class="classif-grupos">' + s.grupos.map((gr, gi) => '<div class="grupo" data-grupo="' + gi + '"><div class="grupo-nome">' + md(gr) + '</div><div class="grupo-itens">' +
        s.itens.map((it, i) => ((ctx === "aluno" && feitos[i] === gi) || (mostraTudo && it.grupo === gi) ? '<span class="chip fixo">' + md(it.texto) + "</span>" : "")).join("") + "</div></div>").join("") + "</div>" +
      (ctx === "aluno" ? '<p class="dica-uso">Toque num cartão e depois no grupo certo.</p>' : "");
  };

  T.pratica = (s, ctx, est) => {
    let h = '<span class="s-tag pratica">🛠️ Sua vez</span>' + titulo(s) + '<p class="s-texto">' + md(s.enunciado) + "</p>";
    if (ctx !== "aluno") {
      h += '<div class="faca-celular">📱 Faça no seu celular' + (s.modo === "desenho" || s.modo === "texto" ? " ou no caderno" : "") + "</div>";
      if (est.revelado && s.solucao) h += s.modo === "python" ? '<pre class="codigo">' + V.realce(s.solucao) + "</pre>" : '<div class="s-resposta">' + md(s.solucao) + "</div>";
      return h;
    }
    if (s.modo === "python") h += '<div class="py-box"><textarea class="py-editor" rows="' + Math.max(4, (s.inicial || "").split("\n").length + 1) + '" aria-label="Seu código Python"></textarea><div class="py-botoes"><button type="button" class="btn" data-rodar>▶ Rodar</button><button type="button" class="btn sec" data-restaurar>↺ Começar de novo</button></div><pre class="py-saida" aria-live="polite"></pre></div>';
    if (s.modo === "planilha") h += '<div class="pl-box" data-planilha></div>';
    if (s.modo === "texto") h += '<textarea class="resp-texto" rows="6" data-resp aria-label="Sua resposta"></textarea><button type="button" class="btn sec" data-copiar>📋 Copiar resposta</button>';
    if (s.modo === "desenho") h += '<div class="desenho"><div class="cores">' + ["#1a1a2e", "#C62828", "#1565C0", "#2E7D32", "#E65100", "#7B1FA2"].map((c, i) => '<button type="button" class="cor' + (i === 0 ? " sel" : "") + '" style="background:' + c + '" data-cor="' + c + '" aria-label="cor ' + (i + 1) + '"></button>').join("") + '<button type="button" class="btn sec" data-limpar>🧽 Limpar</button><button type="button" class="btn" data-baixar>💾 Baixar</button></div><canvas width="900" height="600" aria-label="Área de desenho"></canvas></div>';
    if (s.dica) h += '<details class="dica"><summary>💡 Dica</summary><p>' + md(s.dica) + "</p></details>";
    return h;
  };

  /* ---------- demo: "eu faço" animado ---------- */
  T.demo = (s, ctx, est, el) => {
    const n = V.passos(s), p = Math.max(0, Math.min(n, est.passo));
    const prev = el._prev || {};
    const anima = prev.id === s.id && prev.passo === p - 1 && p > 0;
    let h = '<span class="s-tag demo">👀 Veja como se faz</span>' + titulo(s);
    if (s.modo === "codigo") {
      const L = s.linhas.map((x) => (typeof x === "string" ? { t: x } : x));
      const nl = Math.min(p, L.length);
      h += '<div class="demo-cod"><div class="ed-barra"><span></span><span></span><span></span> ' + esc(s.arquivo || "programa.py") + '</div><div class="ed">' +
        L.map((l, i) => '<div class="ed-linha' + (i === nl - 1 ? " atual" : "") + (i >= nl ? " vazia" : "") + '"><span class="ed-n">' + (i + 1) + '</span><code data-l="' + i + '">' + (i < nl - (anima && p <= L.length ? 1 : 0) ? V.realce(l.t) : "") + "</code></div>").join("") + "</div>";
      const ex = nl > 0 && p <= L.length ? L[nl - 1].explica : s.explica_saida;
      if (ex) h += '<div class="balao">' + md(ex) + "</div>";
      if (s.saida !== undefined && p > L.length) h += '<div class="saida"><div class="saida-rot">▶ Saída</div><pre>' + esc(s.saida) + "</pre></div>";
      h += "</div>";
      el.innerHTML = h;
      if (anima && p <= L.length) digitar(el.querySelector('[data-l="' + (p - 1) + '"]'), L[p - 1].t, V.realce, el);
      return null;
    }
    if (s.modo === "carta") {
      const cab = s.campos.map((c, i) => Object.assign({ i }, c)).filter((c) => (c.area || (/^(para|de|cc|cco|assunto)$/i.test(c.rotulo) ? "cab" : "corpo")) === "cab");
      const corpo = s.campos.map((c, i) => Object.assign({ i }, c)).filter((c) => !cab.includes(c) && !cab.some((x) => x.i === c.i));
      const linha = (c) => '<div class="ct-campo' + (c.i === p - 1 ? " atual" : "") + (c.i >= p ? " vazia" : "") + '"><span class="ct-rot">' + esc(c.rotulo) + '</span><span class="ct-txt" data-c="' + c.i + '">' + (c.i < p - (anima ? 1 : 0) ? md(c.texto) : "") + "</span></div>";
      h += '<div class="demo-carta ' + (s.formato === "carta" ? "papel" : "email") + '">' + (cab.length ? '<div class="ct-cab">' + cab.map(linha).join("") + "</div>" : "") + '<div class="ct-corpo">' + corpo.map(linha).join("") + "</div></div>";
      if (p > 0 && s.campos[p - 1].explica) h += '<div class="balao">' + md(s.campos[p - 1].explica) + "</div>";
      el.innerHTML = h;
      if (anima) digitar(el.querySelector('[data-c="' + (p - 1) + '"]'), s.campos[p - 1].texto, md, el);
      return null;
    }
    // planilha
    const PL = g.VivaPlanilha, pl = new PL.Planilha(s.celulas);
    s.passos.slice(0, p).forEach((x) => pl.definir(x.cel, x.entrada));
    const usados = Object.keys(s.celulas).concat(s.passos.map((x) => x.cel)).map(PL.parseRef);
    const nc = s.colunas || Math.max(...usados.map((r) => r.c)), nl = s.linhas_qtd || Math.max(...usados.map((r) => r.l));
    const atual = p > 0 ? s.passos[p - 1] : null;
    const refs = atual ? pl.referencias(atual.cel) : [];
    const fmt = s.formatos || {};
    let tb = '<table class="pl"><thead><tr><th></th>' + Array.from({ length: nc }, (_, c) => "<th>" + PL.colLetra(c + 1) + "</th>").join("") + "</tr></thead><tbody>";
    for (let l = 1; l <= nl; l++) {
      tb += "<tr><th>" + l + "</th>";
      for (let c = 1; c <= nc; c++) {
        const r = PL.refStr(c, l), sel = atual && atual.cel.toUpperCase() === r, ref = refs.includes(r);
        const v = sel && anima ? "" : pl.exibir(r, fmt[r]);
        tb += '<td class="' + (sel ? "sel " : "") + (ref ? "ref " : "") + (l === 1 && s.cabecalho !== false ? "cab " : "") + (typeof pl.valor(r) === "number" ? "num" : "") + '" data-r="' + r + '">' + esc(v) + "</td>";
      }
      tb += "</tr>";
    }
    tb += "</tbody></table>";
    h += '<div class="demo-pl"><div class="pl-fx"><span class="pl-nome">' + (atual ? atual.cel.toUpperCase() : "") + '</span><span class="pl-f">fx</span><span class="pl-entrada">' + (atual && !anima ? esc(atual.entrada) : "") + '</span></div><div class="pl-rola">' + tb + "</div></div>";
    if (atual && atual.explica) h += '<div class="balao">' + md(atual.explica) + "</div>";
    el.innerHTML = h;
    if (anima) {
      const fx = el.querySelector(".pl-entrada"), td = el.querySelector('td[data-r="' + atual.cel.toUpperCase() + '"]');
      digitar(fx, String(atual.entrada), esc, el, () => { td.textContent = pl.exibir(atual.cel.toUpperCase(), fmt[atual.cel.toUpperCase()]); td.classList.add("acende"); });
    }
    return null;
  };

  /* Slide com as edições do professor aplicadas (quadro editado ao vivo). */
  V.efetivo = (s, estado) => (estado && estado.qe && estado.qe[s.id] && s.tipo === "quadro" ? Object.assign({}, s, { linhas: estado.qe[s.id] }) : s);

  /* ---------- render principal ----------
     ctx: "tv" (palco 1600×900) | "aluno" (celular) ; est: {passo, revelado} */
  V.render = (s, el, ctx, est) => {
    est = est || { passo: 0, revelado: false };
    el._anim = (el._anim || 0) + 1;
    el.className = (el.dataset.base ? el.dataset.base + " " : "") + "slide t-" + s.tipo + " ctx-" + ctx + (s.modo ? " m-" + s.modo : "");
    el.dataset.slide = s.id;
    const f = T[s.tipo];
    if (!f) { el.innerHTML = "<p>Tipo de slide desconhecido: " + esc(s.tipo) + "</p>"; return; }
    const r = f(s, ctx, est, el);
    if (r !== null) el.innerHTML = r;
    if (s.tipo !== "hero") el.insertAdjacentHTML("afterbegin", apoio(s, ctx));
    el.insertAdjacentHTML("beforeend", glossario(s, ctx));
    el._prev = { id: s.id, passo: est.passo };
    if (ctx === "aluno") ligarAluno(s, el);
    if (el.classList.contains("palco")) V.ajustarPalco(el);
  };

  /* Reduz a letra do palco 1600×900 até o conteúdo caber (também durante a animação). */
  V.ajustarPalco = (el) => {
    const cabe = () => { let f = parseFloat(el.style.fontSize) || 38; while (el.scrollHeight > 902 && f > 22) { f -= 2; el.style.fontSize = f + "px"; } };
    el.style.fontSize = "38px"; cabe();
    if (!el._mo) { el._mo = new MutationObserver(() => { clearTimeout(el._mt); el._mt = setTimeout(cabe, 30); }); el._mo.observe(el, { childList: true, subtree: true, characterData: true }); }
  };

  /* ---------- interações no celular ---------- */
  function ligarAluno(s, el) {
    // quiz
    V.$$("[data-op]", el).forEach((b) => b.addEventListener("click", () => {
      if (V.alunoResp(s.id) !== undefined) return;
      const i = +b.dataset.op; V.alunoResp(s.id, i);
      if (i === s.correta) V.ganharAdesivo(); else V.toast("Não foi dessa vez. Leia a explicação. 💡");
      V.render(s, el, "aluno", { passo: 0 });
    }));
    // cartas
    V.$$("[data-carta]", el).forEach((b) => b.addEventListener("click", () => {
      const v = V.alunoResp(s.id) || []; const i = +b.dataset.carta;
      b.classList.toggle("virada");
      if (!v.includes(i)) { v.push(i); V.alunoResp(s.id, v); if (v.length === s.cartas.length) V.ganharAdesivo("Viu todas as cartas!"); }
    }));
    // classificar
    let escolhido = null;
    V.$$("[data-item]", el).forEach((b) => b.addEventListener("click", () => { V.$$("[data-item]", el).forEach((x) => x.classList.remove("sel")); b.classList.add("sel"); escolhido = +b.dataset.item; }));
    V.$$("[data-grupo]", el).forEach((gr) => gr.addEventListener("click", () => {
      if (escolhido === null) { V.toast("Primeiro toque num cartão. 👆"); return; }
      const gi = +gr.dataset.grupo, it = s.itens[escolhido];
      if (it.grupo === gi) {
        const f = V.alunoResp(s.id) || {}; f[escolhido] = gi; V.alunoResp(s.id, f);
        V.toast(V.fraseOk(), "ok"); escolhido = null;
        if (Object.keys(f).length === s.itens.length) V.ganharAdesivo("Tudo no lugar certo!");
        V.render(s, el, "aluno", { passo: 0 });
      } else { gr.classList.add("treme"); setTimeout(() => gr.classList.remove("treme"), 500); V.toast(it.dica || V.fraseQuase()); }
    }));
    // checklist
    V.$$("[data-chk]", el).forEach((c) => c.addEventListener("change", () => {
      const f = V.alunoResp(s.id + ":chk") || []; const i = +c.dataset.chk;
      const n = c.checked ? f.concat([i]) : f.filter((x) => x !== i); V.alunoResp(s.id + ":chk", n);
      if (c.checked && n.length === (s.itens || s.passos).length) V.ganharAdesivo(s.tipo === "tutorial" ? "Passo a passo completo!" : "Atividade completa!");
    }));
    // texto livre
    const ta = V.$("[data-resp]", el);
    if (ta) { ta.value = V.alunoResp(s.id + ":txt") || ""; ta.addEventListener("input", () => V.alunoResp(s.id + ":txt", ta.value)); }
    const cp = V.$("[data-copiar]", el);
    if (cp) cp.addEventListener("click", async () => { try { await navigator.clipboard.writeText(ta.value); V.toast("Copiado! Cole no Classroom. 📋", "ok"); } catch (e) { ta.select(); V.toast("Segure o dedo no texto e escolha Copiar."); } });
    // python
    const ed = V.$(".py-editor", el);
    if (ed) {
      ed.value = V.alunoResp(s.id + ":py") ?? (s.inicial || "");
      ed.addEventListener("input", () => V.alunoResp(s.id + ":py", ed.value));
      const saida = V.$(".py-saida", el), rodar = V.$("[data-rodar]", el);
      const exec = async () => {
        rodar.disabled = true; saida.className = "py-saida"; saida.textContent = V.Python.pronto() ? "Rodando…" : "Baixando o Python (só na primeira vez, ~6 MB)…";
        try {
          const r = await V.Python.rodar(ed.value);
          saida.textContent = r.saida + (r.erro ? (r.saida ? "\n" : "") + r.erro : "");
          if (r.erro) saida.classList.add("erro");
          else if (s.esperado !== undefined) {
            if (V.Python.normalizar(r.saida) === V.Python.normalizar(s.esperado)) { saida.classList.add("ok"); if (!V.alunoResp(s.id)) { V.alunoResp(s.id, 1); V.ganharAdesivo("Programa funcionando!"); } }
            else V.toast("Rodou, mas a saída ainda não é a pedida. Compare com o enunciado. 💡");
          }
        } catch (e) { saida.textContent = e.message; saida.classList.add("erro"); }
        rodar.disabled = false;
      };
      V.Python.editor(ed, exec);
      rodar.addEventListener("click", exec);
      V.$("[data-restaurar]", el).addEventListener("click", () => { ed.value = s.inicial || ""; V.alunoResp(s.id + ":py", ed.value); });
    }
    // planilha interativa
    const pb = V.$("[data-planilha]", el);
    if (pb) V.planilhaInterativa(pb, s);
    // desenho
    const cv = V.$(".desenho canvas", el);
    if (cv) V.quadroDesenho(cv, s, el);
  }

  /* ---------- mini planilha interativa (prática) ---------- */
  V.planilhaInterativa = (box, s, op) => {
    op = op || {};
    const PL = g.VivaPlanilha;
    const salvo = V.alunoResp(s.id + ":pl") || {};
    const base = Object.assign({}, s.celulas, salvo);
    const pl = new PL.Planilha(base);
    const editaveis = (s.editaveis || [s.alvo && s.alvo.cel]).filter(Boolean).map((x) => x.toUpperCase());
    const usados = Object.keys(s.celulas).concat(editaveis).map(PL.parseRef);
    const nc = s.colunas || Math.max(...usados.map((r) => r.c)), nl = s.linhas_qtd || Math.max(...usados.map((r) => r.l));
    let sel = editaveis[0];
    const desenha = () => {
      let tb = '<div class="pl-fx"><span class="pl-nome">' + sel + '</span><span class="pl-f">fx</span><input class="pl-input" aria-label="Conteúdo da célula ' + sel + '" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="btn" data-ok>✔</button></div>';
      tb += '<div class="pl-rola"><table class="pl"><thead><tr><th></th>' + Array.from({ length: nc }, (_, c) => "<th>" + PL.colLetra(c + 1) + "</th>").join("") + "</tr></thead><tbody>";
      for (let l = 1; l <= nl; l++) {
        tb += "<tr><th>" + l + "</th>";
        for (let c = 1; c <= nc; c++) {
          const r = PL.refStr(c, l), ed = editaveis.includes(r);
          tb += '<td class="' + (r === sel ? "sel " : "") + (ed ? "edit " : "") + (l === 1 && s.cabecalho !== false ? "cab " : "") + (typeof pl.valor(r) === "number" ? "num" : "") + '" data-r="' + r + '">' + esc(pl.exibir(r, (s.formatos || {})[r])) + "</td>";
        }
        tb += "</tr>";
      }
      box.innerHTML = tb + "</tbody></table></div><p class=\"pl-msg\" aria-live=\"polite\"></p>";
      const inp = V.$(".pl-input", box);
      inp.value = String(pl.bruto(sel));
      const v = pl.valor(sel);
      if (PL.ehErro(v)) V.$(".pl-msg", box).textContent = "⚠️ " + v.erro + (v.dica ? " — " + v.dica : "");
      V.$$("td.edit", box).forEach((td) => td.addEventListener("click", () => { sel = td.dataset.r; desenha(); V.$(".pl-input", box).focus(); }));
      const confirmar = () => {
        pl.definir(sel, inp.value); salvo[sel] = inp.value; V.alunoResp(s.id + ":pl", salvo); desenha();
        if (s.alvo) {
          const a = s.alvo, val = pl.valor(a.cel), msg = V.$(".pl-msg", box);
          const okFormula = !a.exige_formula || pl.ehFormula(a.cel);
          const okValor = typeof a.valor === "number" ? typeof val === "number" && Math.abs(val - a.valor) < 1e-9 : String(PL.ehErro(val) ? val.erro : val) === String(a.valor);
          if (okValor && okFormula) { msg.textContent = "✅ " + V.fraseOk(); msg.className = "pl-msg ok"; if (!op.silencioso && !V.alunoResp(s.id)) { V.alunoResp(s.id, 1); V.ganharAdesivo(); } op.aoAcertar && op.aoAcertar(); }
          else if (okValor && !okFormula) { msg.textContent = "O número está certo, mas use uma fórmula (começa com =) para a planilha calcular sozinha."; msg.className = "pl-msg"; op.aoErrar && op.aoErrar(); }
          else if (pl.bruto(a.cel) !== "") { if (!PL.ehErro(val)) { msg.textContent = "💡 " + (s.dica_erro || V.fraseQuase()); msg.className = "pl-msg"; } op.aoErrar && op.aoErrar(); }
        }
      };
      V.$("[data-ok]", box).addEventListener("click", confirmar);
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); confirmar(); } });
    };
    desenha();
    return { planilha: pl };
  };

  /* ---------- área de desenho (para quem se expressa melhor desenhando) ---------- */
  V.quadroDesenho = (cv, s, el) => {
    const cx = cv.getContext("2d");
    const branco = () => { cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); };
    branco();
    const salvo = V.alunoResp(s.id + ":des");
    if (salvo) { const im = new Image(); im.onload = () => cx.drawImage(im, 0, 0); im.src = salvo; }
    let cor = "#1a1a2e", des = false;
    cx.lineWidth = 6; cx.lineCap = "round"; cx.lineJoin = "round";
    const pt = (e) => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)]; };
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", (e) => { des = true; cv.setPointerCapture(e.pointerId); cx.strokeStyle = cor; cx.beginPath(); cx.moveTo(...pt(e)); });
    cv.addEventListener("pointermove", (e) => { if (!des) return; cx.lineTo(...pt(e)); cx.stroke(); });
    const fim = () => { if (!des) return; des = false; try { V.alunoResp(s.id + ":des", cv.toDataURL("image/png")); } catch (x) { /* */ } };
    cv.addEventListener("pointerup", fim); cv.addEventListener("pointercancel", fim);
    V.$$("[data-cor]", el).forEach((b) => b.addEventListener("click", () => { cor = b.dataset.cor; V.$$("[data-cor]", el).forEach((x) => x.classList.toggle("sel", x === b)); }));
    V.$("[data-limpar]", el).addEventListener("click", () => { branco(); V.alunoResp(s.id + ":des", null); });
    V.$("[data-baixar]", el).addEventListener("click", () => {
      const a = document.createElement("a"); a.href = cv.toDataURL("image/png"); a.download = "desenho-" + s.id + ".png"; a.click();
      if (!V.alunoResp(s.id)) { V.alunoResp(s.id, 1); V.ganharAdesivo("Desenho salvo!"); }
    });
  };
})(window);
