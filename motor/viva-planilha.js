/* Kit Aula Viva — mini planilha (simulador didático do Google Planilhas em pt-BR).
   Funções: SOMA, MÉDIA, MÁXIMO, MÍNIMO, SE, E, OU, CONT.SE, SOMASE, MÉDIASE,
   CONT.VALORES, CONT.NÚM, ARRED, CONCATENAR. Separador de argumentos ";" e decimal ",".
   Não é o Google Planilhas: serve para demonstração e treino. Roda no navegador e no Node. */
(function (root, fabrica) {
  if (typeof module === "object" && module.exports) module.exports = fabrica();
  else root.VivaPlanilha = fabrica();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const ERR = (c, dica) => ({ erro: c, dica: dica || "" });
  const ehErro = (v) => v !== null && typeof v === "object" && "erro" in v && !Array.isArray(v);

  const colNum = (s) => s.split("").reduce((n, ch) => n * 26 + (ch.charCodeAt(0) - 64), 0);
  const colLetra = (n) => { let s = ""; while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const parseRef = (r) => { const m = /^\$?([A-Z]{1,3})\$?(\d{1,5})$/.exec(r.toUpperCase()); return m ? { c: colNum(m[1]), l: +m[2] } : null; };
  const refStr = (c, l) => colLetra(c) + l;

  // Converte o que foi digitado numa célula (texto) em valor
  function literal(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" || typeof v === "boolean") return v;
    const s = String(v).trim();
    if (/^VERDADEIRO$/i.test(s)) return true;
    if (/^FALSO$/i.test(s)) return false;
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) || /^-?\d+(,\d+)?$/.test(s)) return +s.replace(/\./g, "").replace(",", ".");
    if (/^R\$\s?-?[\d.]+(,\d+)?$/.test(s)) return +s.replace(/R\$\s?/, "").replace(/\./g, "").replace(",", ".");
    return s;
  }

  /* ---------- Tokenizador ---------- */
  function tokens(src) {
    const t = []; let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '"') {
        let j = i + 1, s = "";
        while (j < src.length) { if (src[j] === '"') { if (src[j + 1] === '"') { s += '"'; j += 2; continue; } break; } s += src[j++]; }
        if (j >= src.length) throw ERR("#ERRO!", "Faltou fechar as aspas.");
        t.push({ k: "str", v: s }); i = j + 1; continue;
      }
      const num = /^\d+(,\d+)?/.exec(src.slice(i));
      if (num) { t.push({ k: "num", v: +num[0].replace(",", ".") }); i += num[0].length; continue; }
      const op2 = src.slice(i, i + 2);
      if (["<=", ">=", "<>"].includes(op2)) { t.push({ k: "op", v: op2 }); i += 2; continue; }
      if ("+-*/^&=<>%".includes(ch)) { t.push({ k: "op", v: ch }); i++; continue; }
      if (ch === "(" || ch === ")" || ch === ";" || ch === ":") { t.push({ k: ch }); i++; continue; }
      if (ch === ",") throw ERR("#ERRO!", "No Planilhas em português os argumentos são separados por ponto e vírgula (;).");
      const id = /^[A-Za-zÀ-ÿ_$][A-Za-zÀ-ÿ0-9_.$]*/.exec(src.slice(i));
      if (id) { t.push({ k: "id", v: id[0] }); i += id[0].length; continue; }
      throw ERR("#ERRO!", "Caractere inesperado: " + ch);
    }
    return t;
  }

  /* ---------- Analisador (descida recursiva) ---------- */
  function analisar(src) {
    const t = tokens(src); let p = 0;
    const ver = () => t[p], come = () => t[p++];
    const espera = (k) => { const x = come(); if (!x || x.k !== k) throw ERR("#ERRO!", k === ")" ? "Faltou fechar parênteses." : "Fórmula incompleta."); return x; };
    const bin = (prox, ops) => () => { let e = prox(); while (ver() && ver().k === "op" && ops.includes(ver().v)) { const o = come().v; e = { k: "bin", o, a: e, b: prox() }; } return e; };
    const prim = () => {
      const x = come();
      if (!x) throw ERR("#ERRO!", "Fórmula incompleta.");
      if (x.k === "num") return { k: "val", v: x.v };
      if (x.k === "str") return { k: "val", v: x.v };
      if (x.k === "(") { const e = comp(); espera(")"); return e; }
      if (x.k === "op" && (x.v === "-" || x.v === "+")) { const e = un(); return x.v === "-" ? { k: "neg", a: e } : e; }
      if (x.k === "id") {
        const nome = x.v.toUpperCase();
        if (ver() && ver().k === "(") {
          come(); const args = [];
          if (ver() && ver().k === ")") { come(); return { k: "fn", nome, args }; }
          for (;;) { args.push(comp()); const s = come(); if (!s) throw ERR("#ERRO!", "Faltou fechar parênteses."); if (s.k === ")") break; if (s.k !== ";") throw ERR("#ERRO!", "Use ; entre os argumentos."); }
          return { k: "fn", nome, args };
        }
        if (nome === "VERDADEIRO") return { k: "val", v: true };
        if (nome === "FALSO") return { k: "val", v: false };
        const r = parseRef(nome);
        if (r) {
          if (ver() && ver().k === ":") {
            come(); const y = come(); const r2 = y && y.k === "id" ? parseRef(y.v) : null;
            if (!r2) throw ERR("#ERRO!", "Intervalo incompleto (ex.: B2:B5).");
            return { k: "rng", a: r, b: r2 };
          }
          return { k: "ref", r };
        }
        return { k: "nome", v: x.v };
      }
      throw ERR("#ERRO!", "Fórmula com algo fora do lugar.");
    };
    const pos = () => { let e = prim(); while (ver() && ver().k === "op" && ver().v === "%") { come(); e = { k: "bin", o: "/", a: e, b: { k: "val", v: 100 } }; } return e; };
    const un = () => { if (ver() && ver().k === "op" && (ver().v === "-" || ver().v === "+")) { const o = come().v; const e = un(); return o === "-" ? { k: "neg", a: e } : e; } return pos(); };
    const pot = bin(un, ["^"]), mult = bin(pot, ["*", "/"]), soma = bin(mult, ["+", "-"]), conc = bin(soma, ["&"]);
    const comp = bin(conc, ["=", "<>", "<", ">", "<=", ">="]);
    const arv = comp();
    if (p < t.length) throw ERR("#ERRO!", t[p].k === ")" ? "Tem parênteses sobrando." : "Fórmula com algo fora do lugar.");
    return arv;
  }

  /* ---------- Coerções ---------- */
  function num(v) {
    if (ehErro(v)) return v;
    if (v === null) return 0;
    if (typeof v === "number") return v;
    if (typeof v === "boolean") return v ? 1 : 0;
    const l = literal(v);
    return typeof l === "number" ? l : ERR("#VALOR!", "Esperava um número e encontrou o texto \"" + v + "\".");
  }
  const texto = (v) => (v === null ? "" : typeof v === "boolean" ? (v ? "VERDADEIRO" : "FALSO") : typeof v === "number" ? fmtNum(v) : String(v));
  const bool = (v) => (ehErro(v) ? v : typeof v === "string" ? (/^VERDADEIRO$/i.test(v) ? true : /^FALSO$/i.test(v) ? false : ERR("#VALOR!")) : !!num(v));
  function cmp(a, b) {
    const ord = (x) => (typeof x === "number" ? 0 : typeof x === "string" ? 1 : 2);
    if (a === null) a = typeof b === "string" ? "" : 0;
    if (b === null) b = typeof a === "string" ? "" : 0;
    if (ord(a) !== ord(b)) return ord(a) - ord(b);
    if (typeof a === "string") { a = a.toLowerCase(); b = b.toLowerCase(); }
    return a < b ? -1 : a > b ? 1 : 0;
  }
  function fmtNum(n) {
    if (!isFinite(n)) return "#NÚM!";
    const r = +n.toPrecision(12);
    return r.toLocaleString("pt-BR", { maximumFractionDigits: 9, useGrouping: false });
  }

  // Critério de CONT.SE / SOMASE: ">10", "<>x", "=x", "x", 5, "a*"
  function criterio(c) {
    let op = "=", alvo = c;
    if (typeof c === "string") {
      const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(c);
      op = m[1] || "="; alvo = literal(m[2]); if (alvo === null) alvo = "";
    }
    if (typeof alvo === "string" && /[*?]/.test(alvo) && (op === "=" || op === "<>")) {
      const re = new RegExp("^" + alvo.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$", "i");
      return (v) => (op === "=") === re.test(texto(v));
    }
    return (v) => {
      if (v === null && op === "=" && alvo !== "") return false;
      if (typeof alvo === "number" && typeof v !== "number") { const l = literal(v); if (typeof l !== "number") return op === "<>"; v = l; }
      const k = cmp(v, alvo);
      return { "=": k === 0, "<>": k !== 0, "<": k < 0, ">": k > 0, "<=": k <= 0, ">=": k >= 0 }[op];
    };
  }

  function arred(n, d) {
    const p = Math.pow(10, d), s = n < 0 ? -1 : 1;
    return (s * Math.round(+(Math.abs(n) * p).toPrecision(15))) / p;
  }

  /* ---------- Planilha ---------- */
  class Planilha {
    constructor(celulas) { this.c = {}; this.cache = {}; Object.entries(celulas || {}).forEach(([k, v]) => (this.c[k.toUpperCase()] = v)); }
    definir(ref, v) { this.c[ref.toUpperCase()] = v; this.cache = {}; }
    bruto(ref) { const v = this.c[ref.toUpperCase()]; return v === undefined ? "" : v; }
    ehFormula(ref) { const v = this.c[ref.toUpperCase()]; return typeof v === "string" && v.trim().startsWith("="); }
    valor(ref, pilha) {
      ref = ref.toUpperCase();
      if (ref in this.cache) return this.cache[ref];
      pilha = pilha || new Set();
      if (pilha.has(ref)) return ERR("#REF!", "Dependência circular: a fórmula usa a própria célula.");
      const bruto = this.c[ref];
      let v;
      if (typeof bruto === "string" && bruto.trim().startsWith("=")) {
        pilha.add(ref);
        try { v = this.avaliar(analisar(bruto.trim().slice(1)), pilha); } catch (e) { v = ehErro(e) ? e : ERR("#ERRO!", String(e && e.message)); }
        pilha.delete(ref);
        if (Array.isArray(v)) v = v.length === 1 ? v[0] : ERR("#VALOR!", "Um intervalo inteiro não cabe numa célula só.");
      } else v = literal(bruto);
      this.cache[ref] = v;
      return v;
    }
    exibir(ref, formato) {
      const v = this.valor(ref);
      if (ehErro(v)) return v.erro;
      if (v === null) return "";
      if (typeof v === "number" && formato === "moeda") return "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (typeof v === "number" && formato === "pct") return (v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
      return texto(v);
    }
    // Células citadas por uma fórmula (para destacar na animação)
    referencias(ref) {
      const b = this.c[ref.toUpperCase()]; const out = [];
      if (typeof b !== "string" || !b.trim().startsWith("=")) return out;
      let arv; try { arv = analisar(b.trim().slice(1)); } catch (e) { return out; }
      const anda = (n) => {
        if (!n) return;
        if (n.k === "ref") out.push(refStr(n.r.c, n.r.l));
        else if (n.k === "rng") { for (let c = Math.min(n.a.c, n.b.c); c <= Math.max(n.a.c, n.b.c); c++) for (let l = Math.min(n.a.l, n.b.l); l <= Math.max(n.a.l, n.b.l); l++) out.push(refStr(c, l)); }
        ["a", "b"].forEach((k) => anda(n[k])); (n.args || []).forEach(anda);
      };
      anda(arv); return out;
    }
    faixa(n, pilha) {
      const out = [];
      for (let l = Math.min(n.a.l, n.b.l); l <= Math.max(n.a.l, n.b.l); l++)
        for (let c = Math.min(n.a.c, n.b.c); c <= Math.max(n.a.c, n.b.c); c++) out.push(this.valor(refStr(c, l), pilha));
      return out;
    }
    avaliar(n, pilha) {
      const ev = (x) => this.avaliar(x, pilha);
      switch (n.k) {
        case "val": return n.v;
        case "ref": return this.valor(refStr(n.r.c, n.r.l), pilha);
        case "rng": return this.faixa(n, pilha);
        case "nome": return ERR("#NOME?", "Não conheço \"" + n.v + "\". Confira se escreveu certo.");
        case "neg": { const a = num(ev(n.a)); return ehErro(a) ? a : -a; }
        case "bin": {
          let a = ev(n.a), b = ev(n.b);
          if (Array.isArray(a)) a = a.length === 1 ? a[0] : ERR("#VALOR!", "Use uma função (como SOMA) para trabalhar com intervalos.");
          if (Array.isArray(b)) b = b.length === 1 ? b[0] : ERR("#VALOR!", "Use uma função (como SOMA) para trabalhar com intervalos.");
          if (ehErro(a)) return a; if (ehErro(b)) return b;
          if (n.o === "&") return texto(a) + texto(b);
          if (["=", "<>", "<", ">", "<=", ">="].includes(n.o)) { const k = cmp(a, b); return { "=": k === 0, "<>": k !== 0, "<": k < 0, ">": k > 0, "<=": k <= 0, ">=": k >= 0 }[n.o]; }
          const x = num(a), y = num(b); if (ehErro(x)) return x; if (ehErro(y)) return y;
          if (n.o === "+") return x + y; if (n.o === "-") return x - y; if (n.o === "*") return x * y;
          if (n.o === "/") return y === 0 ? ERR("#DIV/0!", "Divisão por zero.") : x / y;
          if (n.o === "^") return Math.pow(x, y);
          return ERR("#ERRO!");
        }
        case "fn": return this.funcao(n, pilha);
      }
      return ERR("#ERRO!");
    }
    funcao(n, pilha) {
      const ev = (x) => this.avaliar(x, pilha);
      const nome = n.nome;
      const SEM_ACENTO = { MEDIA: "MÉDIA", MAXIMO: "MÁXIMO", MINIMO: "MÍNIMO", MEDIASE: "MÉDIASE", "CONT.NUM": "CONT.NÚM" };
      const numeros = (args) => {
        const out = [];
        for (const a of args) {
          const v = ev(a);
          if (Array.isArray(v)) { for (const x of v) { if (ehErro(x)) return x; if (typeof x === "number") out.push(x); } }
          else { if (ehErro(v)) return v; if (v === null) continue; const x = num(v); if (ehErro(x)) return x; out.push(x); }
        }
        return out;
      };
      const plano = (args) => args.reduce((acc, a) => { const v = ev(a); return acc.concat(Array.isArray(v) ? v : [v]); }, []);
      const qtd = (min, max) => { if (n.args.length < min || n.args.length > max) throw ERR("#N/D", nome + " recebeu " + n.args.length + " argumento(s); espera " + (min === max ? min : min + " a " + max) + "."); };
      switch (nome) {
        case "SOMA": { const v = numeros(n.args); return ehErro(v) ? v : v.reduce((s, x) => s + x, 0); }
        case "MÉDIA": { const v = numeros(n.args); if (ehErro(v)) return v; return v.length ? v.reduce((s, x) => s + x, 0) / v.length : ERR("#DIV/0!", "Não há números para tirar a média."); }
        case "MÁXIMO": { const v = numeros(n.args); return ehErro(v) ? v : v.length ? Math.max(...v) : 0; }
        case "MÍNIMO": { const v = numeros(n.args); return ehErro(v) ? v : v.length ? Math.min(...v) : 0; }
        case "CONT.NÚM": return plano(n.args).filter((x) => typeof x === "number").length;
        case "CONT.VALORES": return plano(n.args).filter((x) => x !== null && x !== "").length;
        case "ARRED": { qtd(1, 2); const a = num(ev(n.args[0])); const d = n.args[1] ? num(ev(n.args[1])) : 0; if (ehErro(a)) return a; if (ehErro(d)) return d; return arred(a, Math.trunc(d)); }
        case "SE": { qtd(2, 3); const c = bool(ev(n.args[0])); if (ehErro(c)) return c; return c ? ev(n.args[1]) : n.args[2] ? ev(n.args[2]) : false; }
        case "E": case "OU": {
          const v = plano(n.args).filter((x) => x !== null).map(bool);
          const e = v.find(ehErro); if (e) return e;
          return nome === "E" ? v.every(Boolean) : v.some(Boolean);
        }
        case "CONCATENAR": { const v = plano(n.args); const e = v.find(ehErro); return e || v.map(texto).join(""); }
        case "CONT.SE": {
          qtd(2, 2); const fx = ev(n.args[0]); if (!Array.isArray(fx)) return ERR("#VALOR!", "O primeiro argumento precisa ser um intervalo (ex.: B2:B10).");
          const ok = criterio(ev(n.args[1])); return fx.filter((x) => !ehErro(x) && ok(x)).length;
        }
        case "SOMASE": case "MÉDIASE": {
          qtd(2, 3); const fx = ev(n.args[0]); if (!Array.isArray(fx)) return ERR("#VALOR!", "O primeiro argumento precisa ser um intervalo.");
          const alvo = n.args[2] ? ev(n.args[2]) : fx; if (!Array.isArray(alvo) || alvo.length !== fx.length) return ERR("#VALOR!", "Os intervalos precisam ter o mesmo tamanho.");
          const ok = criterio(ev(n.args[1])); const v = [];
          fx.forEach((x, i) => { if (!ehErro(x) && ok(x) && typeof alvo[i] === "number") v.push(alvo[i]); });
          if (nome === "SOMASE") return v.reduce((s, x) => s + x, 0);
          return v.length ? v.reduce((s, x) => s + x, 0) / v.length : ERR("#DIV/0!", "Nenhuma linha atende ao critério.");
        }
      }
      if (SEM_ACENTO[nome]) return ERR("#NOME?", "Quase! O nome certo é " + SEM_ACENTO[nome] + " (com acento).");
      return ERR("#NOME?", "Não conheço a função " + nome + ". Confira se escreveu certo.");
    }
  }

  return { Planilha, analisar, literal, parseRef, colLetra, colNum, refStr, ehErro, fmtNum };
});
