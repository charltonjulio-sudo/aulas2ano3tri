/* Kit Aula Viva — Python no navegador (Pyodide 0.27.8, carregado só no primeiro "Rodar").
   input() abre uma caixa de diálogo e ecoa "pergunta + resposta" como no Colab.
   Erro mostra a linha do código do aluno e a mensagem exata do Python.
   Limite de 5 s sem input() (laço infinito). */
(function (g) {
  "use strict";
  const V = g.Viva;
  const URL_PADRAO = "https://cdn.jsdelivr.net/pyodide/v0.27.8/full/";
  let promessa = null;

  const PREPARO = `
import sys, builtins, time, traceback, io
class _VivaTempo(Exception): pass
def _viva_exec(src, entradas, limite):
    import js
    buf = io.StringIO()
    fila = None if entradas is None else [str(x) for x in entradas.to_py()]
    t = [time.time()]
    def _inp(msg=""):
        msg = str(msg)
        if fila is not None:
            v = fila.pop(0) if fila else ""
        else:
            sys.stdout = antigo
            r = js.prompt(buf.getvalue()[-300:] + msg if buf.getvalue() else msg)
            sys.stdout = buf
            v = "" if r is None else str(r)
        buf.write(msg + v + "\\n")
        t[0] = time.time()
        return v
    def _tr(frame, ev, arg):
        if time.time() - t[0] > limite:
            raise _VivaTempo()
        return _tr
    antigo = sys.stdout
    sys.stdout = buf
    builtins.input = _inp
    erro = None
    try:
        cod = compile(src, "<seu código>", "exec")
        sys.settrace(_tr)
        exec(cod, {"__name__": "__main__"})
    except _VivaTempo:
        erro = "Seu programa passou de %d segundos rodando. Será que tem um laço que nunca termina?" % limite
    except SyntaxError as e:
        erro = "Linha %s: %s: %s" % (e.lineno, type(e).__name__, e.msg)
    except BaseException as e:
        linhas = [f.lineno for f in traceback.extract_tb(e.__traceback__) if f.filename == "<seu código>"]
        erro = "Linha %s: %s: %s" % (linhas[-1] if linhas else "?", type(e).__name__, e)
    finally:
        sys.settrace(None)
        sys.stdout = antigo
    return [buf.getvalue(), erro]
`;

  function carregarScript(src) {
    return new Promise((ok, falha) => {
      const s = document.createElement("script");
      s.src = src; s.onload = ok; s.onerror = () => falha(new Error("Não consegui baixar o Python. Confira a internet."));
      document.head.appendChild(s);
    });
  }

  V.Python = {
    pronto: () => !!promessa,
    carregar() {
      if (promessa) return promessa;
      const base = (g.VIVA_CONFIG && g.VIVA_CONFIG.pyodideURL) || URL_PADRAO;
      promessa = (async () => {
        if (typeof g.loadPyodide !== "function") await carregarScript(base + "pyodide.js");
        const py = await g.loadPyodide({ indexURL: base });
        py.runPython(PREPARO);
        return py;
      })();
      promessa.catch(() => (promessa = null));
      return promessa;
    },
    /* rodar(codigo, {entradas: [..] | undefined, limite: 5}) -> {saida, erro} */
    async rodar(codigo, op) {
      const o = op || {};
      const py = await this.carregar();
      const fn = py.globals.get("_viva_exec");
      const ent = Array.isArray(o.entradas) ? py.toPy(o.entradas) : null;
      const r = fn(String(codigo).replace(/\t/g, "    "), ent, o.limite || 5);
      const [saida, erro] = r.toJs();
      r.destroy(); fn.destroy(); if (ent) ent.destroy();
      return { saida, erro: erro || null };
    },
    normalizar: (s) => String(s || "").replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").replace(/\n+$/, ""),
  };

  /* Editor simples: textarea com Tab = 4 espaços e Ctrl+Enter roda */
  V.Python.editor = function (ta, aoRodar) {
    ta.setAttribute("spellcheck", "false"); ta.setAttribute("autocapitalize", "off"); ta.setAttribute("autocomplete", "off"); ta.setAttribute("autocorrect", "off");
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Tab") { e.preventDefault(); const i = ta.selectionStart; ta.setRangeText("    ", i, ta.selectionEnd, "end"); }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); aoRodar && aoRodar(); }
    });
  };
})(window);
