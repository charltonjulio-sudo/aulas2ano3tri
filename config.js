/* Configuração do site (preenchida UMA vez pelo professor; a skill nunca sobrescreve este arquivo).
   Tudo aqui é público: não coloque senha em texto. */
window.VIVA_CONFIG = {
  /* Firebase Realtime Database: deixa os celulares seguirem o painel ao vivo.
     Vazio = os alunos avançam com os códigos dos blocos. Passo a passo: docs/FIREBASE.md do kit. */
  firebase: {
    apiKey: "",          // "Chave de API da Web" do projeto
    databaseURL: "",     // ex.: https://meu-projeto-default-rtdb.firebaseio.com
  },
  /* Formulário de feedback (Google Forms) com os marcadores AULA, NOTA, APRENDI, DIFICIL.
     Gerado pelo ferramentas/formularios.gs. Vazio = sem botão de feedback. */
  feedback: { url: "" },
  /* SHA-256 da frase do professor no jogo (libera todas as fases). Gere com: node ferramentas/hash.mjs "sua frase" */
  jogoSenhaHash: "",
  /* Para testes locais apenas; não mexa. */
  pyodideURL: "",
};
