# Site Aula Viva — 2º ADM (Informática Empresarial)

Aulas 29, 30 e 31, feitas com o Kit Aula Viva 1.4.0.

## Publicar
1. Crie um repositório no GitHub (sugestão: `aula-viva-2adm`) e suba **todo o conteúdo desta pasta**. Se preferir, pode ser uma subpasta de um repositório que já existe.
2. Settings → Pages → Branch `main`, pasta `/ (root)` → Save.
3. Link dos alunos: `https://charltonjulio-sudo.github.io/aulas2ano3tri/` (não tem link para o professor).
   Área do professor: `https://charltonjulio-sudo.github.io/aulas2ano3tri/professor.html` (pede a frase do professor; lista painéis, TVs e links para o Classroom).

## Aula do dia
O `aulas.js` lista todas as aulas. A página dos alunos mostra todas em **Aulas** e destaca a que tem `hoje: true` em **Aula de hoje**. Para trocar a aula do dia, mude o `hoje: true` de linha.

## Códigos dos blocos (para quem estiver sem internet)
| aula | bloco 2 | bloco 3 | bloco 4 | bloco 5 | libera tudo |
|---|---|---|---|---|---|
| 29 | lapis17 | radar78 | estoque87 | ideia68 | revisao29 |
| 30 | foco99 | lapis37 | mouse85 | mouse73 | revisao29 |
| 31 | trilha43 | pixel10 | janela77 | cores12 | revisao15 |

Os códigos também aparecem no painel, no botão 📱 Alunos. Eles controlam o ritmo da aula; não protegem nada.

## No painel do professor
- **🔎 Auditoria**: erros do slide original, referências checadas e a % de confiança de cada slide desta aula.
- Em cada slide: a % de confiança do conteúdo, a base e as fontes, e os erros do slide original correspondente.
- No quadro: 🔍−/🔍+ muda o tamanho da letra na TV e ✏️ edita o texto ao vivo (TV e celulares).

## Chamada e "saiu da tela" (👥 no painel)
Precisa de 2 ajustes no Firebase, uma vez só (passo a passo no `docs/FIREBASE.md` do kit):
1. Autenticação (Authentication) → Método de login (Sign-in method) → Adicionar novo provedor (Add new provider) → Anônimo (Anonymous) → Ativar → Salvar.
2. Realtime Database → Regras (Rules): colar as regras novas, com o seu UID nas 3 posições, e Publicar.

Sem isso, a aula funciona igual; só o 👥 fica vazio.

## Tema do celular
O botão 🌓 no celular alterna claro → escuro → alto contraste. Começa pelo tema do aparelho.
