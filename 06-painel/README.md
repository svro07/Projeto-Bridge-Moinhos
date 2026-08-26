# Painel de corretores — Bridge Moinhos

Réplica do painel de rede da Elite Futevôlei, adaptada para a operação digital do
Carlos Carvalho. Esta pasta é a área de trabalho do painel: por enquanto contém o
**mockup navegável** com dado real, antes de virar aplicação.

- `mockup/rede.html` — o painel, arquivo único e autossuficiente (abre offline).
- `mockup/rede.template.html` — a fonte, com marcadores no lugar dos assets embutidos.
- `assets/` — fontes Satoshi, logos Case e os retratos tratados dos corretores.

Para regerar o `rede.html` depois de editar o template, veja `build.py`.

---

## Decisões tomadas

**A unidade do painel é o corretor.** Na Elite cada cartão é uma praça; aqui é uma
pessoa. Cada campanha do Meta aponta para um corretor, e o projeto do Carlos é sobre
escolher corretores que se destacam para receber o investimento — então o rosto no
cartão não é enfeite, é o assunto.

**Lead é a conversa iniciada no WhatsApp.** A métrica no Meta é
`onsite_conversion.messaging_conversation_started_7d`. Como a operação não tem site
nem landing page, a conversa aberta com o corretor *é* o lead — não há etapa entre uma
coisa e outra. É a mesma métrica que o painel da Elite usa, o que tornou a réplica
quase direta.

**Régua de custo por lead:** verde até R$ 40, amarelo de R$ 40 a R$ 60, vermelho acima
de R$ 60. O teto visual da barra é R$ 100, escolhido para caber o pior mês real da
conta (maio/2026, R$ 85,68) sem cortar a barra.

**Roster travado nos quatro atuais** — Fittipaldi, Rafael Birk, Adriano e Sandra. As
campanhas pausadas (Karoline, Camille, Ricardo Osorio, Daniela Alban) são de corretores
que saíram do projeto e ficam fora dos cartões. Como o projeto prevê rotação, o roster
mora em `D.corretores` e é a única coisa que muda quando alguém entra ou sai.

**Exceção deliberada ao roster:** o gráfico "A operação mês a mês" usa a conta inteira,
incluindo as campanhas encerradas. Filtrar ali apagaria a curva de aprendizado — os
corretores que saíram concentram R$ 10.244 dos R$ 12.492 já investidos, e maio a julho
ficariam vazios. O gráfico diz isso na própria legenda.

**Retratos:** 256×256, quadrados, preto e branco, com ponto de preto e branco
normalizado para os quatro casarem em tom. 256px é o teto que a menor foto de origem
(Fittipaldi, 227px) sustenta sem borrar — o avatar é exibido a 56px, com folga de
sobra em tela retina.

**Vínculo foto ↔ campanha.** O nome do arquivo não bate exato com o da campanha
(`Birk.jpg` contra `[ENGAJAMENTO] [Rafael Birk] Whats`). O vínculo é um mapa explícito
no código, não heurística de substring: um "Rafael Souza" futuro quebraria a heurística
e o mapa não.

## Pendente

- **CPL qualificado.** O painel mede o lead que chegou, não o que prestou. A camada de
  qualificação (planilha dos corretores → Stape) entra numa v2, com régua própria e
  taxa de qualificação. Ainda não há dado.
- **Conferir 371 × 392 leads.** Somando por campanha dá 371; somando por mês dá 392.
  A diferença de 21 é provavelmente janela de atribuição entre níveis de agregação.
  Fechar antes de qualquer número ir para produção.
- **API, período ajustável e miniaturas** dos anúncios — dependem do token do Meta na
  hospedagem. Hoje o botão "Ver anúncio" leva ao Gerenciador.

## Fonte dos números

Conta `CA - Bridge Moinhos 01` (`1718135052525631`), via Graph API. A janela do mockup
é 13/08 a 26/08/2026, comparada com 30/07 a 12/08/2026.
