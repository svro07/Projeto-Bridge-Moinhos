# Changelog — decisões e mudanças de estratégia

Registro das mudanças de rumo do projeto. Toda alteração de estratégia, meta ou escopo deve ser anotada aqui com data e motivo.

Formato: `[data] — o que mudou — de → para — motivo`

---

## Antes da migração para este repositório

Reconstruído a partir do histórico de conversa original (`04-fontes/historico-chat-original.pdf`). Datas aproximadas conforme o documento.

### Estrutura de canais — mudou duas vezes

- **[v1]** Estratégia inicial: **apenas Meta Ads**, R$ 5.000/mês.
- **[v2]** Expansão proposta: **Meta + Google/YouTube + Performance Max**, com verba dividida (ex.: Meta R$ 3.500 / Google+YouTube R$ 1.500). Motivo: aproveitar o volume de conteúdo em vídeo do Carlos e contornar a ausência de site.
- **[v3 — VIGENTE]** Recuo consciente: **100% Meta (R$ 5.000)**, Google/YouTube em **stand-by** para o médio prazo. Motivo: concentrar verba acelera o aprendizado, reduz variáveis e facilita a explicação para um cliente com pouca familiaridade digital.

> O raciocínio da v2 foi preservado em `01-estrategia/fase-2-google-youtube.md`.

### Formato de conteúdo no YouTube — refinado

- **De:** vídeos longos horizontais clássicos de YouTube.
- **Para:** **YouTube Shorts**, reaproveitando o conteúdo vertical já produzido para Instagram.
- **Motivo:** zero produção extra ("1 produção = 3 canais") e algoritmo de Shorts mais agressivo.

### Idade da filial — dado corrigido

- **De:** "filial nova, ~2 meses" (briefing comercial inicial).
- **Para:** **~4 meses**, aberta no fim de novembro/2025 (confirmado na transcrição do kickoff).

### Meta de corretores — informação complementada

- **De:** 40 corretores até setembro/2026.
- **Para:** 40 até setembro/2026 **+ 50 no longo prazo** (acrescentado no kickoff). Compatíveis.

### Cadência de reuniões de qualificação — negociada

- **Proposta da Case (Lucas):** reuniões semanais.
- **Contraproposta do Carlos:** mensal, para não consumir tempo demais.
- **Acordo final:** mensais com 4 corretores (20–30 min cada) + reunião geral a cada 2–3 meses.

### Meta de taxa de qualificação — ⚠️ NÃO RESOLVIDA

- **Objetivo declarado pelo cliente:** de 10–15% para **30–40%**.
- **KPI dos materiais de apresentação:** **20%**.
- **Status:** contradição aberta. Ver `01-estrategia/pendencias-e-decisoes.md`, item C1.

---

## Após a migração

<!-- Registre aqui as mudanças daqui em diante. Exemplo:
### [2026-05-14] Reunião de apresentação de estratégia
- Estratégia aprovada / ajustada em: ...
- Empreendimentos definidos: ...
- Corretores definidos: ...
-->

### [2026-10-13] Karoline Aguiar volta ao roster; Jaqueline entra no ar

- **Entrou:** Karoline Aguiar, campanha `[ENGAJAMENTO] [Karoline Aguiar] Whats`
  (criada em 05/10), praça Higienópolis. Ela já teve uma passagem no projeto
  (jun–ago/2026).
- **A armadilha que isso criou:** a campanha da passagem antiga
  (`[ENGAJAMENTO] [Karoline] Whats`) continua pausada na conta. O casamento
  campanha↔corretor é por `includes`, então a chave `[karoline]` pegaria as duas e
  somaria o período antigo ao cartão atual sempre que alguém escolhesse um intervalo
  que alcançasse jun–ago (o painel aceita intervalo livre). A chave é
  `[karoline aguiar]`, que casa só com a campanha de agora. Coberto por teste.
- **Jaqueline saiu de "aguardando campanha" sozinha:** a campanha dela subiu em
  30/09 e o cartão passou a medir sem nenhuma alteração de código — era exatamente
  o que o status `espera` foi feito para fazer. Ganhou a praça Moinhos de Vento.
- **`fotos: []`:** novo caso previsto — corretor no ar antes de a foto chegar. O
  cartão desenha a silhueta neutra em vez de pedir um arquivo inexistente (antes o
  `onerror` resolvia, mas gerava um 404 por carregamento). Karoline entrou assim e
  ganhou o retrato no mesmo dia; o caminho fica pronto para a próxima entrada.
- **Retrato da Karoline:** a origem é um plano médio com rua ao fundo, então o
  enquadramento foi pelo rosto e conferido no recorte circular, que é como o painel
  mostra. Além do padrão de sempre (256px, preto e branco, autocontraste, nitidez),
  levou um ombro nas altas luzes: o fundo externo estourava em 255, contra um teto de
  246 no resto do time, e puxava o olho para fora do rosto. Sombra e meio-tom ficam
  intactos — a média dela (95) cai na média do grupo (94,5).
- **Concordância na leitura automática:** a frase de estreia dizia "Os dois já
  entraram dentro da régua verde". Com Karoline e Jaqueline estreando juntas, saiu
  errado — o painel não sabe o gênero de ninguém. A frase perdeu o pronome: "E já
  entraram dentro da régua verde", que serve ao singular e ao plural.
- **Desempenho na janela 29/09–12/10:** operação a R$ 24,14 por lead (eram R$ 17,60
  na quinzena anterior) com 128 leads e R$ 3.090 investidos — custo maior puxado
  pela entrada de duas campanhas novas e pelo dobro de verba. Karoline estreou a
  R$ 16,79 e Jaqueline a R$ 19,78. Fittipaldi passou para a faixa amarela
  (R$ 42,94, +131%), com CTR em 0,94% e frequência 2,82 — a fadiga sinalizada em
  28/09 se confirmou.
- **Documentação que estava desatualizada:** `06-painel/README.md` ainda descrevia o
  roster como "os quatro atuais — Fittipaldi, Rafael Birk, Adriano e Sandra" e
  listava Karoline entre quem saiu. Corrigido junto.

### [2026-09-28] Cartões de corretor — tipografia ampliada

- **Motivo:** o gestor que acompanha os corretores lê o painel junto com o Carlos;
  os rótulos de apoio do cartão estavam em 10–11px, pequenos demais para leitura
  rápida em celular.
- **O que subiu:** nome do corretor 19→21px; tags 10,5→11,5px; custo por lead
  38→41px (topo do clamp); o rótulo "por lead" 10,5→12px; "LEADS"/"INVESTIDO"
  10→11,5px e seus valores 23→26px; a frase em português 11→12,5px. O menor texto
  dentro do cartão passou de 10px para 11px.
- **O que a mudança obrigou a corrigir:** as tags perderam o `white-space:nowrap`.
  Com texto maior, "aguardando campanha" travava 183px de largura mínima e
  empurrava a página para fora da tela em aparelhos de 360px. Como `.u-chips` é
  flex-wrap, a tag pula de linha antes de quebrar o texto — o visual só muda
  quando não há espaço. Isso também eliminou um scroll lateral que já existia
  em 320px.
- **Uma coluna a partir de 860px** (era 760px): com o texto maior, dois cartões
  lado a lado no tablet espremiam nome e tags contra o retrato.

### [2026-09-28] Rotação de corretores no painel

- **Saiu:** Sandra (campanha pausada no Gerenciador em 17/09).
- **Entraram:** Flavia e Ismael (casal, atendem juntos — uma campanha só,
  `[Flavia/Ismael]`, um cartão com os dois rostos), Roseli (campanha `[Roselil]`
  no Gerenciador) e Jaqueline (ainda sem campanha criada).
- **Mantidos:** Adriano, Fittipaldi, Rafael Birk.
- **Consequências no código:** `casa` do roster virou lista de grafias (o nome no
  Gerenciador diverge do nome real e pode ser renomeado); `foto` virou `fotos`
  (lista, para a dupla); e nasceu o status **`espera`**, que separa "gastou e não
  trouxe lead" (alarme) de "ainda não tem campanha no ar" (neutro) — sem ele o
  painel acusaria de caro quem nunca gastou um real.
- **Desempenho na virada (14 dias até 27/09):** operação a R$ 18,76 por lead,
  contra R$ 24,56 em agosto. Flavia e Ismael estrearam a R$ 9,28; Roseli a
  R$ 73,79, mas com apenas 2 leads — dado ainda ralo.

### [2026-08-31] Painel de corretores — publicado na Vercel

- **O que mudou:** o painel está no ar, em projeto Vercel conectado a este repositório
  com deploy automático a cada push na branch principal. `META_TOKEN` e `META_CONTA`
  configurados na hospedagem — modo ao vivo.
- **Decisão de acesso:** painel **sem código de acesso** por decisão do Manuel (Case),
  já que o link será compartilhado com uma única pessoa. O gate por `CODIGO_ACESSO`
  segue construído e pode ser ativado a qualquer momento com uma variável na Vercel.

### [2026-08-27] Painel de corretores — aplicação criada neste repositório

- **O que mudou:** o repositório deixa de ser só documentação e passa a hospedar a
  aplicação do painel de corretores (`api/`, `lib/`, `public/`), réplica adaptada do
  painel de rede da Elite Futevôlei, pronta para deploy na Vercel.
- **De → para:** relatório manual → painel ao vivo por corretor (custo por lead,
  régua 40/60, anúncios com prévia, leitura automática), acessível ao time da Bridge
  por URL + código de acesso.
- **Motivo:** o time precisa ver qual corretor performa melhor, a que custo e com
  quais anúncios — a dinâmica de retenção de corretores que move o Carlos.
- **Dados confirmados na conta real (`CA - Bridge Moinhos 01`):** 4 campanhas ativas
  (Fittipaldi, Rafael Birk, Adriano, Sandra) + 5 pausadas de corretores que saíram
  (Karoline, Camille, Ricardo Osorio, Daniela Alban) — o repo citava "4 corretores
  pendentes", mas a operação já rodou com 8 no total.
- **Decisão de régua:** CPL verde até R$ 40, amarelo 40–60, vermelho acima de 60
  (definida pelo Manuel/Case nesta sessão; régua anterior não existia).

_O histórico de origem termina em 13/05/2026, na véspera da apresentação de estratégia; o resultado daquela reunião segue sem registro._
