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

### [2026-11-11] Formulário zerado no painel publicado — nome da ação errado

- **Sintoma:** filtrando novembro no painel publicado, Karoline e Adriano apareciam
  com "sem lead" e o investimento certo (R$ 248 e R$ 303). No Gerenciador: 3 e 11.
- **Causa:** o painel contava o lead de formulário pela ação `leadgen.other`, nome
  tirado do "Resultado" do Gerenciador. A lista de ações que o insights devolve não
  traz esse nome — traz os mesmos leads como `onsite_conversion.lead_grouped` e
  `lead` (conferido: 3 e 11). Os testes passavam porque os dados de teste foram
  montados com o mesmo palpite errado do código.
- **Correção:** `leadsForm()` aceita os três nomes e usa o primeiro que vier — são
  nomes diferentes para os mesmos leads, então nunca soma. Os dados de teste agora
  têm o formato real da API, e um teste trava este caso: com o bug reintroduzido,
  seis testes caem.

### [2026-11-11] A campanha vira a unidade do painel — os números passam a bater com o Gerenciador

- **O que motivou:** filtrando o Gerenciador de 01/11 a 11/11, Karoline e Adriano
  não batiam com o painel. A API devolvia os números certos, centavo por centavo; o
  erro estava no que o painel fazia com eles.
- **Duas causas, confirmadas com número antes da correção:**
  1. **O painel somava as campanhas do corretor num número só.** A Karoline aparecia
     a R$ 59,96 com 6 leads — soma da campanha de formulário (3 a R$ 92,24) com a de
     WhatsApp pausada (3 a R$ 27,68). Um custo que não existe em nenhuma linha do
     Gerenciador. A decisão de somar e "rotular o tipo", tomada na entrega anterior
     no mesmo dia, foi a errada para quem confere contra o Gerenciador.
  2. **Janelas diferentes.** "Últimos 14 dias" do painel termina ontem (28/10 a
     10/11); o filtro do print ia de 01/11 até hoje. O Adriano batia na mesma janela
     e não batia na padrão, que pegava o fim da campanha de WhatsApp dele.
- **Agora:** cada campanha conta só o resultado do próprio objetivo (a coluna
  "Resultados" do Gerenciador) e o cartão mostra a **campanha principal** do corretor
  — a ativa que mais investiu. As demais com entrega na janela aparecem embaixo, cada
  uma com os próprios números. O total da operação continua somando todas. Todo
  cartão diz o objetivo, e a seção dos cartões diz as datas por extenso com a
  instrução de filtrar as mesmas no Gerenciador.
- **Status e objetivo de cada campanha** passam a vir de `/campaigns` (a chamada de
  insights não traz nenhum dos dois). Se falhar, vale a convenção de nome.
- **Não somar as duas ações numa campanha de formulário:** quem preenche e depois
  abre a conversa valeria dois leads. A série mensal da conta passou a ser montada
  por campanha pelo mesmo motivo.
- **Três regras da leitura que a revisão pegou contrariando o que foi combinado:**
  - o "destaque" comparava contra base de 1 lead (a Susi virou destaque com 7 contra
    1) — agora os dois períodos precisam de volume;
  - a média de conversão misturava taxa de conversa com taxa de formulário — agora
    compara só o mesmo objetivo, com no mínimo 3 campanhas no grupo;
  - o aviso de troca de campanha vinha no fim da fila e era o primeiro cortado pelo
    limite de 8 linhas — subiu para logo depois da abertura, e quem ficou sem
    entrega virou uma frase só (cada pausado ocupava uma vaga).
- **Setas do cartão** só com mesmo objetivo e volume no período anterior: Adriano e
  Susi mostravam "▲450%" e "▲600%" porque as campanhas nasceram 3 dias antes do fim
  da janela anterior. Crescimento de calendário, não de desempenho.
- **Gráficos de "Leitura visual", que a mudança de unidade deixaria errados:**
  - "Onde foi a verba" passou a usar o total do corretor (todas as campanhas). Com
    a principal só, as fatias somariam 96,3% do placar e a campanha pausada da
    Karoline sumiria do gráfico.
  - "De cada 100 cliques" separava nada: punha taxa de formulário e taxa de
    conversa na mesma régua, contra uma média que misturava as duas, com título
    dizendo "conversa no WhatsApp" para todo mundo. Agora são dois grupos, cada um
    com cabeçalho e média própria — média só com 3 corretores ou mais no grupo, a
    mesma régua da leitura. Grupo sem média fica com barra neutra, sem juízo.
  - Nomes longos eram cortados no começo, no celular ("Eduardo Serrano" perdia 9 px,
    desde out/2026). O nome agora se mede depois de desenhado e, se não couber,
    fica o primeiro nome. Conferido por medição em 360, 390, 768 e 1280 px.
- **O resumo para WhatsApp** leva as datas por extenso, não só "Últimos 14 dias" —
  quem recebe precisa conseguir conferir no Gerenciador.
- **Conferido** com os números reais de 01/11–11/11: os oito cartões batem com o
  print do Gerenciador (diferenças de centavos são do horário da leitura — com hoje
  no intervalo, o Meta segue atualizando), e o total da operação fecha em R$ 2.232,86
  e 67 leads, igual à soma das linhas de lá. 20 testes, incluindo esses números.

### [2026-11-11] Campanhas de formulário: o painel passa a ter dois tipos de lead

- **O que mudou na operação:** Karoline e Adriano migraram de campanha de
  ENGAJAMENTO (conversa no WhatsApp) para `[Leads Forms Nativo]`, com formulário
  qualificatório do Meta. Úrsula e Bianca devem seguir. A ação no Meta é outra
  (`leadgen.other`, não `onsite_conversion.messaging_conversation_started_7d`),
  então o painel **contava zero lead** para quem migrou.
- **Decisão:** somar as duas ações e **guardar a divisão** (`leadsWhats`,
  `leadsForm`, `tipoLead`). Nenhum lead fica invisível, e nada é misturado em
  silêncio: a frase do cartão diz de que tipo foi ("viraram conversa no
  WhatsApp" / "preencheram o formulário"), uma tag aparece para quem foge do
  padrão da conta, e a leitura avisa quando o tipo mudou entre os períodos —
  porque aí a variação de CPL compara unidades diferentes.
- **Calibragem pendente, consciente:** a régua 40/60 foi definida sobre a
  conversa de WhatsApp. O formulário filtra antes e tende a custar mais caro e
  chegar mais qualificado. Enquanto não houver volume, as duas usam a mesma
  régua. Anotado aqui para não virar esquecimento.
- **Susi entrou com a grafia errada em out/2026.** O roster tinha `[suzy]`,
  `[suzi]`, `[susy]` — três palpites — e o Gerenciador escreveu `[Susi]`. A
  campanha dela ficou fora do painel. Agora casa, com as quatro grafias.
- **Novo status `parado`.** Rafael Birk teve a campanha pausada e o cartão dele
  passou a dizer "ainda sem campanha", como se fosse novato — `espera` estava
  cobrindo dois casos opostos. `parado` é quem já rodou e parou; a frase diz
  que os números voltam sozinhos quando a campanha for reativada.
- **`jaRodou` no roster (mesmo dia, depois de confirmado que a pausa do Birk é
  temporária):** `parado` dependia só da janela anterior, então uma pausa de mais
  de 28 dias zerava as duas janelas consultadas e o cartão voltava a dizer "ainda
  sem campanha" — a mesma mentira, 28 dias depois. A marca fica no roster, que é
  a memória explícita do projeto; quem entra antes da primeira campanha entra sem
  ela.
- **`exceto` no roster.** A campanha de formulário da Karoline subiu como
  `[Leads Forms Nativo] [Karoline]`, o que obrigou a usar a chave curta
  `[karoline]` — justamente a que foi evitada em out/2026 por casar com a
  passagem de jun–ago. Agora as duas de hoje casam pelo nome e a de junho é
  excluída pelo id. Coberto por teste, inclusive um que confere que todo id de
  `exceto` realmente exclui alguma coisa.
- **Praças lidas dos anúncios:** Úrsula (Petrópolis), Bianca (Moinhos de Vento),
  Susi (Bela Vista), e Karoline e Adriano atualizados para os empreendimentos
  das campanhas novas.

### [2026-10-19] Rotação de out/2026: saem quatro, entram quatro

- **Saíram:** Flavia e Ismael (um cartão), Roseli e Jaqueline. As campanhas foram
  pausadas no Gerenciador entre 16 e 18/10. Os retratos saíram dos assets, como
  foi com a Sandra.
- **Entraram:** Eduardo Serrano (campanha `[Eduardo Serrano]` criada em 18/10,
  praça Moinhos de Vento pelos anúncios), Bianca, Úrsula e Suzy — estas três sem
  campanha no Gerenciador, em "aguardando campanha". Suzy ainda sem retrato, com a
  silhueta neutra.
- **Mantidos:** Fittipaldi, Rafael Birk, Adriano e Karoline Aguiar — campanhas
  ativas e com entrega; ninguém pediu a saída deles.
- **Novo status `cedo`.** O Eduardo subiu em 18/10 e, na janela seguinte, tinha
  R$ 6,30 gastos e nenhum lead: o painel o pintava de vermelho com "sem lead",
  acusando de ruim quem estava no ar havia um dia. `cedo` separa "mal começou" de
  "começou e não funcionou"; o limite é a própria régua verde, porque abaixo do
  custo de um lead saudável zero lead é o resultado esperado. É a mesma classe do
  `espera` criado para a Jaqueline em set/2026 — o dado é igual (zero lead) e a
  leitura é oposta.
- **Duas correções na leitura automática que a rotação expôs:** a frase de estreia
  classificava o Eduardo como "fora da régua verde", contradizendo a linha seguinte
  que dizia ser cedo para julgar (quem está em `cedo` saiu do cálculo de estreias);
  e "aguardando campanha" virou uma frase só com todos os nomes, em vez de uma
  linha por pessoa — com três entrando juntas, viravam três linhas idênticas.
- **Retratos dos novos:** Bianca, Eduardo e Úrsula no padrão de sempre. A da Úrsula
  vinha com máscara circular e cantos brancos, então o corte ficou dentro do círculo
  dela para o branco não invadir o do painel. O Eduardo tinha média 153 contra 99 do
  grupo (parede clara ao fundo) e levou gama 1,40, que o trouxe para 133 — na faixa
  de Roseli e Jaqueline.
- **Testes:** o arquivo passou a rodar toda chave do roster contra a lista de
  campanhas de quem já saiu da conta, que é a trava para a classe de erro do
  `[karoline]`. Também confere que toda foto declarada existe nas duas pastas.

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
