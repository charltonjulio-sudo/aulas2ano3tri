/* Kit Aula Viva — jogo guiado: em cada fase o aluno VÊ um exemplo e depois FAZ o mesmo tipo de coisa.
   Desafios: escolha, lacuna, ordenar, classificar, planilha, python, carta.
   Estrelas da fase: 0 erro = 3, até 2 erros = 2, mais = 1 (nunca zero: quem terminou aprendeu).
   Nota da fase = estrelas da PRIMEIRA vez completa; dá para treinar de novo. */
(function (g) {
  "use strict";
  const V = g.Viva, md = V.md, esc = V.esc;

  V.Jogo = function (raiz, J) {
    const CH = "viva:jogo:" + V.aulaId();
    let st = Object.assign({ aluno: null, fases: {}, atual: null, prof: false }, V.store.get(CH, {}));
    const salvar = () => V.store.set(CH, st);
    const F = J.fases;
    const estrelas = (e) => (e === 0 ? 3 : e <= 2 ? 2 : 1);
    const turmas = (g.AULA && g.AULA.turmas) || (g.VIVA_CONFIG && g.VIVA_CONFIG.turmas) || [];
    let gen = 0;

    function tela(html) { gen++; raiz.innerHTML = html; g.scrollTo({ top: 0 }); return gen; }
    const totalEstrelas = () => F.reduce((s, f) => s + ((st.fases[f.id] || {}).primeira || 0), 0);
    function pintaTopo() { const b = V.$("#estrelas"); if (b) b.textContent = "⭐ " + totalEstrelas() + "/" + F.length * 3; }

    /* ---------- identificação ---------- */
    function identificacao() {
      tela('<div class="slide ctx-aluno"><div class="s-hero" style="color:var(--texto)"><div class="hero-emoji">' + esc(J.emoji || "🎮") + '</div><h1 class="s-titulo">' + md(J.titulo) + '</h1></div>' +
        '<p>Em cada fase você <b>vê um exemplo</b> e depois <b>faz igual</b>. Pode errar: errar faz parte do treino.</p>' +
        '<label class="rot" for="j-nome">Nome e sobrenome</label><input id="j-nome" class="resp-texto" autocomplete="name">' +
        '<label class="rot" for="j-num">Número da chamada</label><input id="j-num" class="resp-texto" type="number" min="1" max="60" inputmode="numeric">' +
        (turmas.length ? '<label class="rot" for="j-turma">Turma</label><select id="j-turma" class="resp-texto"><option value="">Escolha…</option>' + turmas.map((t) => "<option>" + esc(t) + "</option>").join("") + "</select>" : "") +
        '<p id="j-msg" style="color:var(--vermelho)" aria-live="polite"></p><p><button class="btn" type="button" id="j-ok">Começar ▶</button></p></div>');
      V.$("#j-ok").onclick = () => {
        const nome = V.$("#j-nome").value.trim().replace(/\s+/g, " "), num = +V.$("#j-num").value, tu = turmas.length ? V.$("#j-turma").value : "";
        if (nome.split(" ").length < 2) return (V.$("#j-msg").textContent = "Escreva nome e sobrenome.");
        if (!(num >= 1 && num <= 60)) return (V.$("#j-msg").textContent = "Coloque seu número da chamada.");
        if (turmas.length && !tu) return (V.$("#j-msg").textContent = "Escolha sua turma.");
        st.aluno = { nome, numero: num, turma: tu }; salvar(); mapa();
      };
    }

    /* ---------- mapa de fases ---------- */
    function liberada(k) { return st.prof || k === 0 || ((st.fases[F[k - 1].id] || {}).primeira > 0); }
    function mapa() {
      pintaTopo();
      if (st.atual) { const f = F.find((x) => x.id === st.atual.fase); if (f) return fase(f); }
      const tudo = F.every((f) => (st.fases[f.id] || {}).primeira > 0);
      tela('<div class="slide ctx-aluno"><h2 class="s-titulo">🗺️ Fases</h2><p>Olá, ' + esc(st.aluno.nome.split(" ")[0]) + "! " + (st.prof ? "<b>Modo professor:</b> tudo liberado." : "Termine uma fase para abrir a próxima.") + "</p>" +
        '<div class="quiz-ops">' + F.map((f, k) => {
          const r = st.fases[f.id] || {}, lib = liberada(k);
          return '<button type="button" class="op" data-fase="' + k + '"' + (lib ? "" : " disabled") + '><b>' + (lib ? esc(f.emoji || k + 1) : "🔒") + "</b> " + md(f.nome) + " <span style=\"float:right\">" + (r.primeira ? "⭐".repeat(r.primeira) : lib ? "▶" : "") + "</span></button>";
        }).join("") + "</div>" +
        (tudo ? '<p><button class="btn ok" type="button" id="j-fim">🏁 Ver meu resultado</button></p>' : "") + "</div>");
      V.$$("[data-fase]", raiz).forEach((b) => (b.onclick = () => { st.atual = { fase: F[+b.dataset.fase].id, etapa: -1, erros: 0 }; salvar(); fase(F[+b.dataset.fase]); }));
      const fim = V.$("#j-fim"); if (fim) fim.onclick = resultado;
    }

    /* ---------- fase: exemplo → desafios ---------- */
    function fase(f) {
      const a = st.atual;
      if (a.etapa < 0) return exemplo(f);
      if (a.etapa >= f.desafios.length) return fimFase(f);
      desafio(f, f.desafios[a.etapa]);
    }

    function exemplo(f, voltarPara) {
      tela('<div id="j-ex"></div><div class="demo-repetir"><button class="btn sec" type="button" id="j-rep">↺ Ver de novo</button><button class="btn" type="button" id="j-vai">' + (voltarPara ? "Voltar ao desafio ▶" : "Entendi, quero tentar ▶") + "</button></div>");
      const box = V.$("#j-ex"), s = Object.assign({ id: f.id + "-ex", tipo: "demo", titulo: f.nome }, f.exemplo);
      const n = s.tipo === "demo" ? V.passos(s) : 0;
      const tocar = () => {
        const meu = ++gen; let k = 0; box._prev = null;
        const um = () => { if (meu !== gen) return; V.render(s, box, "aluno", { passo: k }); if (k < n) { k++; setTimeout(um, k === 1 ? 300 : 2400); } };
        um();
      };
      tocar();
      V.$("#j-rep").onclick = tocar;
      V.$("#j-vai").onclick = () => { if (voltarPara) return voltarPara(); st.atual.etapa = 0; salvar(); fase(f); };
    }

    function desafio(f, d) {
      const a = st.atual, k = a.etapa;
      const meu = tela('<div class="slide ctx-aluno"><div class="j-cab" style="display:flex;justify-content:space-between;gap:.5em;font-size:.8em;color:var(--texto2)"><span>' + esc(f.emoji || "") + " " + esc(f.nome) + " · desafio " + (k + 1) + " de " + f.desafios.length + '</span><span title="Cite este código se achar um erro">#' + esc(d.id) + "</span></div>" +
        '<p class="s-pergunta-q" style="font-size:1.15em;font-weight:600">' + md(d.pergunta || "Complete:") + ' <button type="button" class="btn sec" id="j-ouvir" aria-label="Ouvir a pergunta" style="padding:.1em .5em">🔊</button></p>' +
        (d.codigo ? '<pre class="codigo">' + V.realce(d.codigo) + "</pre>" : "") + '<div id="j-area"></div><p id="j-fb" aria-live="polite"></p>' +
        '<div class="demo-repetir"><button class="btn sec" type="button" id="j-ver">👀 Ver o exemplo de novo</button><button class="btn" type="button" id="j-prox" hidden>Próximo ▶</button></div></div>');
      const area = V.$("#j-area"), fb = V.$("#j-fb");
      V.$("#j-ouvir").onclick = () => V.falar(V.textoDe(raiz.querySelector(".slide")));
      V.$("#j-ver").onclick = () => exemplo(f, () => desafio(f, d));
      if (!V.podeFalar()) V.$("#j-ouvir").hidden = true;
      if (document.documentElement.classList.contains("modo-apoio") && V.podeFalar()) setTimeout(() => meu === gen && V.falar(d.pergunta || ""), 400);
      const certo = () => {
        fb.innerHTML = '<span class="s-resposta" style="display:block">✅ ' + V.fraseOk() + (d.explica ? " " + md(d.explica) : "") + "</span>";
        V.$("#j-prox").hidden = false; V.$("#j-prox").focus();
        V.$("#j-prox").onclick = () => { st.atual.etapa++; salvar(); fase(f); };
        V.$$("button[data-x]", area).forEach((b) => (b.disabled = true));
      };
      const errado = (dica) => {
        st.atual.erros++; salvar();
        fb.innerHTML = '<span class="balao" style="display:block">' + V.fraseQuase() + (dica || d.dica ? " " + md(dica || d.dica) : "") + "</span>";
      };
      const profMarca = (ok) => (st.prof && ok ? " ✔" : "");
      const D = DESAFIOS[d.tipo];
      if (!D) { area.textContent = "Tipo de desafio desconhecido: " + d.tipo; return; }
      D(area, d, certo, errado, profMarca);
    }

    /* ---------- tipos de desafio ---------- */
    const apoioOps = (d, ops) => {
      if (!document.documentElement.classList.contains("modo-apoio") || !d.apoio_opcoes || d.apoio_opcoes >= ops.length) return ops;
      const er = ops.filter((o) => o.i !== d.correta).slice(0, d.apoio_opcoes - 1);
      return ops.filter((o) => o.i === d.correta || er.includes(o));
    };
    const DESAFIOS = {
      escolha(area, d, certo, errado, pm) {
        const ops = V.embaralhar(apoioOps(d, d.opcoes.map((t, i) => ({ t, i }))));
        area.innerHTML = '<div class="quiz-ops">' + ops.map((o) => '<button type="button" class="op" data-x="' + o.i + '">' + md(o.t) + pm(o.i === d.correta) + "</button>").join("") + "</div>";
        V.$$("[data-x]", area).forEach((b) => (b.onclick = () => {
          if (+b.dataset.x === d.correta) { b.classList.add("certa"); certo(); } else { b.classList.add("errada"); b.disabled = true; errado(); }
        }));
      },
      lacuna(area, d, certo, errado, pm) {
        const ops = V.embaralhar(apoioOps(d, d.opcoes.map((t, i) => ({ t, i }))));
        area.innerHTML = '<p style="font-size:1.25em">' + md(d.frase).replace("___", '<span class="chip" id="j-slot" style="min-width:3em;border-style:dashed">&nbsp;?&nbsp;</span>') + '</p><div class="classif-itens">' +
          ops.map((o) => '<button type="button" class="chip" data-x="' + o.i + '">' + md(o.t) + pm(o.i === d.correta) + "</button>").join("") + "</div>";
        V.$$("[data-x]", area).forEach((b) => (b.onclick = () => {
          const slot = V.$("#j-slot", area); slot.innerHTML = md(d.opcoes[+b.dataset.x]);
          if (+b.dataset.x === d.correta) { slot.classList.add("fixo"); certo(); } else { b.disabled = true; errado(); }
        }));
      },
      ordenar(area, d, certo, errado) {
        const ordem = [];
        const ops = V.embaralhar(d.itens.map((t, i) => ({ t, i })));
        const pinta = () => {
          area.innerHTML = '<ol class="ativ-itens" style="min-height:2em">' + ordem.map((i) => "<li><span class=\"chip fixo\">" + md(d.itens[i]) + "</span></li>").join("") + "</ol>" +
            '<div class="classif-itens">' + ops.filter((o) => !ordem.includes(o.i)).map((o) => '<button type="button" class="chip" data-x="' + o.i + '">' + md(o.t) + (st.prof ? " (" + (o.i + 1) + ")" : "") + "</button>").join("") + "</div>" +
            (ordem.length ? '<button type="button" class="btn sec" id="j-desfaz">↺ Recomeçar a ordem</button>' : "");
          V.$$("[data-x]", area).forEach((b) => (b.onclick = () => {
            ordem.push(+b.dataset.x);
            if (ordem.length === d.itens.length) {
              const txt = ordem.join(","), aceitas = d.aceitas || [d.itens.map((_, i) => i).join(",")];
              pinta();
              if (aceitas.includes(txt)) certo(); else { errado("A ordem ainda não está certa. Toque em Recomeçar."); }
            } else pinta();
          }));
          const r = V.$("#j-desfaz", area); if (r) r.onclick = () => { ordem.length = 0; pinta(); };
        };
        pinta();
      },
      classificar(area, d, certo, errado) {
        const feitos = {}; let sel = null;
        const pinta = () => {
          area.innerHTML = '<div class="classif-itens">' + d.itens.map((it, i) => (feitos[i] !== undefined ? "" : '<button type="button" class="chip' + (sel === i ? " sel" : "") + '" data-i="' + i + '">' + md(it.texto) + (st.prof ? " → " + (it.grupo + 1) : "") + "</button>")).join("") + "</div>" +
            '<div class="classif-grupos">' + d.grupos.map((gr, gi) => '<div class="grupo" data-g="' + gi + '"><div class="grupo-nome">' + md(gr) + '</div><div class="grupo-itens">' + d.itens.map((it, i) => (feitos[i] === gi ? '<span class="chip fixo">' + md(it.texto) + "</span>" : "")).join("") + "</div></div>").join("") + "</div>";
          V.$$("[data-i]", area).forEach((b) => (b.onclick = () => { sel = +b.dataset.i; pinta(); }));
          V.$$("[data-g]", area).forEach((gr) => (gr.onclick = () => {
            if (sel === null) return V.toast("Primeiro toque num cartão. 👆");
            if (d.itens[sel].grupo === +gr.dataset.g) { feitos[sel] = +gr.dataset.g; sel = null; pinta(); if (Object.keys(feitos).length === d.itens.length) certo(); }
            else { errado(d.itens[sel].dica); gr.classList.add("treme"); }
          }));
        };
        pinta();
      },
      planilha(area, d, certo, errado) {
        area.innerHTML = '<div class="pl-box"></div>';
        V.planilhaInterativa(V.$(".pl-box", area), Object.assign({ editaveis: [d.alvo.cel] }, d), { aoAcertar: certo, aoErrar: () => errado(), silencioso: true });
        if (st.prof && d.resposta) area.insertAdjacentHTML("beforeend", "<p>✔ Resposta: <code>" + esc(d.resposta) + "</code></p>");
      },
      python(area, d, certo, errado) {
        area.innerHTML = '<div class="py-box"><textarea class="py-editor" rows="' + Math.max(4, (d.inicial || "").split("\n").length + 1) + '" aria-label="Seu código"></textarea><div class="py-botoes"><button type="button" class="btn" id="j-rodar">▶ Rodar</button></div><pre class="py-saida" aria-live="polite"></pre></div>' +
          (st.prof && d.solucao ? '<p>✔ Solução:</p><pre class="codigo">' + V.realce(d.solucao) + "</pre>" : "");
        const ed = V.$(".py-editor", area), out = V.$(".py-saida", area), b = V.$("#j-rodar", area);
        ed.value = V.alunoResp(d.id + ":py") ?? (d.inicial || "");
        ed.addEventListener("input", () => V.alunoResp(d.id + ":py", ed.value));
        const rodar = async () => {
          b.disabled = true; out.className = "py-saida"; out.textContent = V.Python.pronto() ? "Rodando…" : "Baixando o Python (só na primeira vez)…";
          try {
            const r = await V.Python.rodar(ed.value, { entradas: d.entradas });
            out.textContent = r.saida + (r.erro ? (r.saida ? "\n" : "") + r.erro : "");
            if (!r.erro && V.Python.normalizar(r.saida) === V.Python.normalizar(d.esperado)) { out.classList.add("ok"); certo(); }
            else { if (r.erro) out.classList.add("erro"); errado(r.erro ? "Leia a linha do erro acima." : "A saída precisa ser: " + d.esperado); }
          } catch (e) { out.textContent = e.message; out.classList.add("erro"); }
          b.disabled = false;
        };
        V.Python.editor(ed, rodar); b.onclick = rodar;
      },
      carta(area, d, certo, errado) {
        const esc2 = {};
        const ops = d.partes.map((p) => V.embaralhar(p.opcoes.map((t, i) => ({ t, i }))));
        area.innerHTML = '<div class="demo-carta email">' + d.partes.map((p, k) => '<div class="ct-campo" data-k="' + k + '"><span class="ct-rot">' + esc(p.rotulo) + '</span><span class="classif-itens" style="margin:0">' +
          ops[k].map((o) => '<button type="button" class="chip" data-p="' + k + '" data-o="' + o.i + '">' + md(o.t) + (st.prof && o.i === p.correta ? " ✔" : "") + "</button>").join("") + "</span></div>").join("") + '</div><p><button type="button" class="btn" id="j-conf">Conferir ✔</button></p>';
        V.$$("[data-p]", area).forEach((b) => (b.onclick = () => { esc2[b.dataset.p] = +b.dataset.o; V.$$('[data-p="' + b.dataset.p + '"]', area).forEach((x) => x.classList.toggle("sel", x === b)); }));
        V.$("#j-conf", area).onclick = () => {
          if (Object.keys(esc2).length < d.partes.length) return V.toast("Escolha uma opção em cada parte. 👆");
          const erradas = d.partes.map((p, k) => (esc2[k] === p.correta ? -1 : k)).filter((k) => k >= 0);
          V.$$(".ct-campo", area).forEach((c) => c.classList.toggle("atual", erradas.includes(+c.dataset.k)));
          if (!erradas.length) { V.$("#j-conf", area).disabled = true; certo(); } else errado("Olhe as partes destacadas em amarelo.");
        };
      },
    };

    /* ---------- fim de fase e resultado ---------- */
    function fimFase(f) {
      const e = st.atual.erros, n = estrelas(e), r = st.fases[f.id] || {};
      r.primeira = r.primeira || n; r.melhor = Math.max(r.melhor || 0, n); r.erros = (r.erros || 0) + e;
      st.fases[f.id] = r; st.atual = null; salvar(); pintaTopo();
      tela('<div class="slide ctx-aluno" style="text-align:center"><div style="font-size:3em">' + "⭐".repeat(n) + '</div><h2 class="s-titulo">Fase concluída!</h2><p>' +
        (e === 0 ? "Sem nenhum erro. Excelente!" : "Você errou " + e + (e === 1 ? " vez" : " vezes") + " e foi até o fim. É assim que se aprende.") + "</p>" +
        (r.primeira !== n ? "<p>A nota desta fase continua sendo a da primeira vez (" + "⭐".repeat(r.primeira) + ").</p>" : "") +
        '<p><button class="btn" type="button" id="j-mapa">🗺️ Voltar ao mapa</button></p></div>');
      V.$("#j-mapa").onclick = mapa;
    }

    async function resultado() {
      const tot = totalEstrelas(), max = F.length * 3, a = st.aluno;
      const base = [V.aulaId(), a.nome.toLowerCase(), a.numero, a.turma, F.map((f) => (st.fases[f.id] || {}).primeira || 0).join("")].join("|");
      const cod = (await V.sha256(base)).slice(0, 6).toUpperCase();
      tela('<div class="slide ctx-aluno" style="text-align:center"><h2 class="s-titulo">🏁 ' + md(J.titulo) + '</h2><p style="font-size:1.2em"><b>' + esc(a.nome) + "</b><br>nº " + a.numero + (a.turma ? " · " + esc(a.turma) : "") + "</p>" +
        '<table class="pl" style="max-width:420px;margin:0 auto">' + F.map((f) => "<tr><td>" + esc(f.emoji || "") + " " + md(f.nome) + '</td><td class="num">' + "⭐".repeat((st.fases[f.id] || {}).primeira || 0) + "</td></tr>").join("") + "</table>" +
        '<p style="font-size:1.4em"><b>' + tot + " / " + max + " ⭐</b></p><p>Código de conferência: <b style=\"font:700 1.3em var(--mono)\">" + cod + "</b></p>" +
        '<div class="s-destaque" style="text-align:left">📸 Tire um <b>print desta tela</b> e envie na atividade do Google Classroom.</div>' +
        '<p><button class="btn sec" type="button" id="j-mapa">🗺️ Treinar de novo</button></p></div>');
      V.$("#j-mapa").onclick = mapa;
    }

    /* ---------- modo professor ---------- */
    const hashProf = g.VIVA_CONFIG && g.VIVA_CONFIG.jogoSenhaHash;
    const bp = V.$("#j-prof");
    if (bp) {
      if (!hashProf) bp.hidden = true;
      bp.onclick = async () => {
        if (st.prof) { st.prof = false; salvar(); V.toast("Modo professor desligado."); return mapa(); }
        const f = g.prompt("Frase do professor:");
        if (f && (await V.sha256(V.normCodigo(f))) === hashProf) { st.prof = true; if (!st.aluno) st.aluno = { nome: "Professor Teste", numero: 0, turma: "" }; salvar(); V.toast("Modo professor: tudo liberado.", "ok"); mapa(); }
        else if (f) V.toast("Frase diferente.");
      };
    }

    if (!st.aluno) identificacao(); else mapa();
    return { estado: () => st };
  };
})(window);
