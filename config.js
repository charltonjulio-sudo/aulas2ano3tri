/* Configuração do site (preenchida UMA vez pelo professor; a skill nunca sobrescreve este arquivo).
   Tudo aqui é público: não coloque senha em texto. */
window.VIVA_CONFIG = {
  /* Firebase Realtime Database: deixa os celulares seguirem o painel ao vivo.
     Vazio = os alunos avançam com os códigos dos blocos. Passo a passo: docs/FIREBASE.md do kit. */
  firebase: {
    apiKey: "AIzaSyCXSRjMduGjg7iKf4dK1gfBkove0pXnxNQ",          // "Chave de API da Web" do projeto
    databaseURL: "https://aula-viva-3f6f0-default-rtdb.firebaseio.com",     // ex.: https://meu-projeto-default-rtdb.firebaseio.com
  },
  /* Formulário de feedback (Google Forms) com os marcadores AULA, NOTA, APRENDI, DIFICIL.
     Gerado pelo ferramentas/formularios.gs. Vazio = sem botão de feedback. */
  feedback: { url: "https://docs.google.com/forms/d/e/1FAIpQLSfjgmgWd9rnfZhyfNJfjNzEOHQtLg3STjshulvN6t69V0cXcQ/viewform?usp=pp_url&entry.1490215935=AULA&entry.191367981=NOTA&entry.981599533=APRENDI&entry.1016856113=DIFICIL" },
  /* SHA-256 da frase do professor no jogo (libera todas as fases). Gere com: node ferramentas/hash.mjs "sua frase" */
  jogoSenhaHash: "dbf92db2580ffd29e696dc183b4be48d5271f853c16d1676d7066d04608cb36f",
  /* Para testes locais apenas; não mexa. */
  pyodideURL: "",
};
