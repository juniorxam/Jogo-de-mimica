# Imagem & Ação — Mímica

Jogo estático para jogar em grupo no celular, sem cadastro e sem banco de dados.

## Recursos
- 394 palavras em 10 categorias.
- 2 a 4 equipes, com nomes editáveis.
- Clássico: uma palavra por turno.
- Contra o relógio: várias palavras até o tempo acabar.
- Fácil (1 ponto), média (2 pontos), difícil (3 pontos) ou misturada.
- No modo misturado, cada rodada completa usa o mesmo nível para todas as equipes.
- Revelar palavra, pausar com a palavra escondida, passar e desfazer resultados.
- Cronômetro por prazo real, proteção contra toques repetidos e acertos após o prazo.
- Placar, classificação final e revanche.
- Música, efeitos e voz do placar configuráveis.
- Salvamento automático no localStorage do mesmo navegador. Ao restaurar, um turno ativo volta pausado.
- Se o baralho de um nível acaba, ele é reembaralhado, com aviso.

## Executar
Sirva a pasta por um servidor HTTP estático ou publique como site estático. Não exige instalação ou build.

## Verificação da lógica
Com Node.js instalado:

```sh
node tests.cjs
```

Os testes cobrem validação das configurações, equipes, filtro de palavras, pontuação, vitória, repetição de palavras, prazo do cronômetro, pausa, restauração, snapshots de desfazer e bloqueio de toques repetidos.

Os testes da lógica foram executados em um runtime JavaScript hospedado durante a atualização. A interface e o áudio ainda precisam de conferência em navegador/celular.

## Publicar no Vercel
Importe este repositório, use a raiz como diretório do projeto e selecione **Other** como framework. Não configure comando de build; sirva a raiz do projeto.

## Arquivos
- `index.html`: telas e conteúdo.
- `styles.css`: interface responsiva com fontes de fallback.
- `app.js`: interface, áudio e salvamento.
- `engine.js`: regras de jogo, independentes do navegador.
- `data.js`: banco de palavras e níveis editoriais.
- `tests.cjs`: verificações da lógica.

As dificuldades são classificações editoriais e podem ser ajustadas conforme o público. O áudio depende das permissões e dos recursos do navegador. A voz nunca lê a palavra sorteada.
