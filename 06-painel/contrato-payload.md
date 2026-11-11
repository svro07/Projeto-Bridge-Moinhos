# Contrato do payload — `GET /api/corretores`

Este documento é a fonte de verdade entre `lib/corretores.js` (produz) e
`public/index.html` (consome). Quem mudar um lado, muda este arquivo e o outro lado.

## Requisição

```
GET /api/corretores?p=14d            períodos prontos: fechada | 14d | mes | mesf
GET /api/corretores?desde=YYYY-MM-DD&ate=YYYY-MM-DD          período custom
  &cdesde=YYYY-MM-DD&cate=YYYY-MM-DD                          comparação manual (opcional)
  &fresh=1                                                    ignora cache (opcional)
Cabeçalho: x-codigo  (ou ?c= para <img>)                      gate de acesso
```

- `fechada` = última semana completa de segunda a domingo.
- `14d` = últimos 14 dias fechados (padrão).
- `mes` = mês corrente até ontem (exceção: no dia 1º não existe "ontem" dentro do mês,
  então a janela é o próprio dia — dado parcial, marcado como tal); `mesf` = último mês completo.
- Comparação automática: mesmo número de dias imediatamente anteriores ao período.
- Fuso: America/Sao_Paulo (o fuso da conta de anúncios).
- Espelhar as regras de `api/periodo.js` da Elite onde fizer sentido.

## Resposta

```jsonc
{
  "modo": "ao-vivo" | "demo",          // demo = sem token do Meta na hospedagem
  "geradoEm": "2026-08-26",
  "periodo":  { "titulo": "Últimos 14 dias", "desde": "2026-08-13", "ate": "2026-08-26", "nota": "" },
  "anterior": { "titulo": "30/07 a 12/08", "desde": "...", "ate": "...", "modo": "auto" | "manual" },
  "regua": { "verde": 40, "amarelo": 60, "teto": 100 },
  "prontos": [ { "id": "fechada", "botao": "Semana fechada" }, ... ],

  "rede": {                            // agregado dos 4 corretores do roster
    "spend": 1645.24, "leads": 67, "cpl": 24.56,
    "impr": 50548, "cliques": 976, "ctr": 1.93, "cpm": 32.55,
    "ant": { "spend": 404.55, "leads": 10, "cpl": 40.46 },   // ou null
    "faixas": { "ok": 3, "warn": 0, "bad": 0, "mute": 0, "cedo": 0, "parado": 1, "espera": 0 }
    // spend/leads da rede somam TODAS as campanhas de cada corretor (`total`),
    // não só a principal: a campanha pausada no meio da janela também gastou
  },

  "corretores": [ {
    "id": "fittipaldi",                // slug estável, casa com a foto
    "nome": "Fittipaldi",
    "fotos": ["fittipaldi.jpg"],       // arquivos em /assets/corretores/; a dupla
                                       // que atende junta traz dois e divide um cartão
    "praca": "Bela Vista",             // chip curto
    "pracas": "Bela Vista · Country Club · Sync",   // title do chip
    // TODOS os números abaixo são da CAMPANHA PRINCIPAL do corretor — iguais,
    // número por número, à linha dela no Gerenciador
    "spend": 315.95, "leads": 19, "cpl": 16.63,     // cpl null quando leads = 0
    "impr": 8204, "reach": 4160, "freq": 1.97, "ctr": 3.07, "cpm": 38.51,
    "cliques": 252,                    // round(impr * ctr / 100) — cliques todos
    "taxaConversa": 7.5,               // leads / cliques * 100; 0 quando cliques = 0
    "status": "ok" | "warn" | "bad" | "mute" | "cedo" | "parado" | "espera",
    "objetivo": "whats" | "form" | null,            // da campanha principal
    "campanha": { "id": "…", "nome": "[ENGAJAMENTO] [Fittipaldi] Whats",
                  "objetivo": "whats", "ativa": true, "spend": 315.95,
                  "leads": 19, "cpl": 16.63 },      // ou null (sem entrega)
    "outras": [ /* mesmas chaves de "campanha": as outras campanhas do corretor
                   com entrega na janela — tipicamente a antiga, pausada na troca */ ],
    "total": { "spend": 399, "leads": 22, "impr": 9500, "cliques": 300 },
    "mudouObjetivo": false,            // principal de agora ≠ objetivo da anterior
    "comparavel": true,                // setas do cartão: mesmo objetivo E
                                       // ant.leads >= T.ruidoLeads
    //   mute   = a campanha entregou, gastou e ninguém abriu conversa (alarme)
    //   espera = não há campanha entregando no período; corretor novo cujo
    //            anúncio ainda não subiu no Gerenciador (neutro, não é alarme)
    "estreia": false,                  // entregou agora e não existia no período anterior
                                       // (nunca true para quem está em "espera")
    "ant": { "spend": 329.14, "leads": 8, "cpl": 41.14,     // principal do período
             "objetivo": "whats", "total": { … } }               // anterior; ou null
  } ],

  "meses": [                           // CONTA INTEIRA, inclusive corretores que saíram:
    { "rot": "mai", "spend": 1713.66, "leads": 20, "cpl": 85.68 },
    { "rot": "ago", "spend": 3610.96, "leads": 143, "cpl": 25.25, "parcial": true }
  ],                                   // filtrar aqui apagaria a curva de aprendizado —
                                       // os que saíram concentram R$ 10.244 de R$ 12.492

  "criativos": {                       // por corretor, ordenado por leads desc, spend desc
    "fittipaldi": [ { "adId": "…", "nome": "IMG - …", "objetivo": "whats",
                      "spend": 41.73, "impr": 1140, "ctr": 7.37, "leads": 5, "cpl": 8.35 } ]
    // o anúncio herda o objetivo da campanha, e `leads` é o resultado DELE
  },

  "leitura": [ "frase 1 (a mais importante)", "..." ],
  "aprofundar": [ "..." ]
}
```

## Roster — travado nos 4 atuais

O vínculo campanha ↔ corretor é um MAPA EXPLÍCITO, nunca heurística de substring
(um "Rafael Souza" futuro quebraria a heurística; o mapa não). Casar contra o nome
da campanha normalizado (minúsculas, sem acento):

| id | nome | casa com (qualquer uma) | fotos |
|---|---|---|---|
| `fittipaldi` | Fittipaldi | `[fittipaldi]` | fittipaldi.jpg |
| `birk` | Rafael Birk | `[rafael birk]` | birk.jpg |
| `adriano` | Adriano | `[adriano]` | adriano.jpg |
| `karoline` | Karoline Aguiar | `[karoline aguiar]`, `[karoline]` (menos o id `120246474830860135`) | karoline.jpg |
| `eduardo` | Eduardo Serrano | `[eduardo serrano]`, `[eduardo]` | eduardo.jpg |
| `bianca` | Bianca | `[bianca]` | bianca.jpg |
| `ursula` | Úrsula | `[ursula]` | ursula.jpg |
| `susi` | Susi | `[susi]`, `[suzi]`, `[suzy]`, `[susy]` | susi.jpg |

`casa` é LISTA de grafias, não texto: o nome no Gerenciador diverge do nome real
(`[Roselil]` lá, "Roseli" aqui) e pode ser renomeado. Qualquer grafia prevista casa;
nenhuma some em silêncio. Saíram do roster: **Sandra** (set/2026) e **Flavia e Ismael,
Roseli e Jaqueline** (out/2026, campanhas pausadas entre 16 e 18/10).

**`exceto` é uma lista de ids de campanha que NÃO casam, mesmo que o nome case.**
Existe por causa da Karoline: ela tem três campanhas com a grafia `[Karoline]` na conta
— a passagem de jun–ago/2026 (pausada), a de ENGAJAMENTO de out e a de formulário de
nov. As duas de agora precisam da chave curta `[karoline]`, porque a de formulário subiu
como `[Leads Forms Nativo] [Karoline] Whats`; e aí só o id separa a de junho, que o nome
não separa. Sem isso, a passagem antiga entraria no cartão em qualquer intervalo que
alcançasse jun–ago. A campanha antiga segue contando só em `meses`, como as demais de
quem saiu. `npm test` confere que cada id de `exceto` realmente exclui alguma coisa.

`fotos` pode vir vazio (`[]`): corretor no ar antes de a foto chegar. O cartão desenha
a silhueta neutra em vez de pedir um arquivo que não existe.

Campanha da conta que não casa com o roster: fora dos cartões e dos agregados
(`rede`, `criativos`) — mas DENTRO de `meses`. Corretor do roster sem entrega no
período: entra com zeros e `status: "mute"` (o cartão precisa dizer que ele sumiu,
não fingir que ele não existe).

## Campanha, objetivo e resultado

A unidade do painel é a **campanha**, como no Gerenciador. Desde nov/2026 a conta
tem dois objetivos, e cada campanha conta **só a ação do próprio objetivo** — é a
coluna "Resultados" de lá:

| objetivo | como o Meta chama | resultado (ação) | o cartão diz |
|---|---|---|---|
| `whats` | `OUTCOME_ENGAGEMENT` · `[ENGAJAMENTO] [Nome] Whats` | `onsite_conversion.messaging_conversation_started_7d` | "por conversa no WhatsApp" |
| `form` | `OUTCOME_LEADS` · `[Leads Forms Nativo] [Nome] Whats` | `leadgen.other` | "por formulário preenchido" |

O objetivo vem de `GET /act_{conta}/campaigns?fields=objective,effective_status`
(`campanhasDaConta`), buscado junto com os insights. Se a chamada falhar, vale a
convenção de nome — e, em último caso, a ação que a campanha registrou.

**Somar as duas ações numa campanha de formulário estaria errado:** quem preenche
o formulário pode abrir a conversa em seguida, e valeria dois leads.

**Campanha principal** = a ativa que mais investiu na janela; sem ativa, a que mais
investiu. O cartão mostra a principal; as demais com entrega na janela aparecem em
`outras`, cada uma com os próprios números. Antes disto o painel somava as campanhas
do corretor num número só, e a Karoline aparecia a R$ 59,96 com 6 leads — um número
que não existe no Gerenciador (lá: formulário 3 a R$ 92,24; WhatsApp pausada 3 a
R$ 27,68).

**Para conferir com o Gerenciador**, a janela precisa ser a mesma. "Últimos 14 dias"
termina ontem (o dia corrente está incompleto); o seletor de datas aceita incluir
hoje. A seção dos cartões diz as datas por extenso logo acima deles.

## Régua e status

`verde`/`amarelo` de `REGUA_VERDE`/`REGUA_AMARELO` (padrão 40/60), teto visual 100.
`status`, na ordem em que é decidido:

| status | condição | o que o cartão diz |
|---|---|---|
| `espera` | sem entrega e sem histórico | "ainda sem campanha" — entrou no projeto, campanha não subiu |
| `parado` | sem entrega, mas já rodou | "campanha pausada" — já rodou e parou, não é novato |
| `cedo` | leads = 0 e spend < régua verde | "começando" — gastou menos que um lead saudável; zero lead ainda é o esperado |
| `mute` | leads = 0 (gastou acima da régua verde) | "sem lead" — gastou de verdade e ninguém abriu conversa |
| `ok` / `warn` / `bad` | cpl < verde / < amarelo / ≥ amarelo | o CPL, na cor da régua |

`espera`, `parado`, `cedo` e `mute` parecem iguais no dado (zero lead) e são quatro
coisas diferentes na leitura: não começou, começou e parou, mal começou, e começou e
não funcionou. Sem `parado`, um veterano com a campanha pausada era descrito como
"ainda sem campanha" — que foi o que aconteceu com o Rafael Birk em nov/2026.

"Já rodou" vem de `!!ant` **ou** do `jaRodou` do roster. Só o período anterior não
basta: uma pausa de mais de 28 dias zera as duas janelas que o painel consulta e o
veterano voltaria a `espera`. `jaRodou` marca, no roster, quem já teve campanha no ar
alguma vez; quem entra antes da primeira campanha entra sem a marca e ganha a marca
quando ela subir. Coberto por teste nos dois sentidos. Sem
essa separação o painel acusa de caro quem subiu ontem — que foi o que aconteceu
com o Eduardo Serrano, no ar havia um dia com R$ 6,30 gastos. `cedo` conta como
"no ar" no placar; `espera` não. O limite de `cedo` sai da própria régua verde:
abaixo do custo de um lead saudável, zero lead é o resultado esperado, não um sinal.

## Leitura automática — sinais com threshold nomeado (método Case)

Gerada no servidor, tom de consideração (hipótese, nunca ordem). Thresholds numa
constante `T` nomeada no topo de `lib/corretores.js`:

- `ruidoLeads: 5` — abaixo disso o juízo é neutralizado ("poucos leads para concluir").
- Abertura: CPL da operação vs anterior; se spend subiu ≥ 20% E cpl caiu ≥ 10%,
  registrar que investir mais com custo caindo é sinal de aprendizado do algoritmo.
- Destaque: corretor com maior queda de CPL (leads ≥ ruidoLeads).
- Estreias: corretores com `estreia: true`, citando se entraram dentro da régua.
- Desperdício: anúncios com spend ≥ 25 e 0 leads — somar por corretor, citar o maior.
- Conversão: taxaConversa ≥ 2× a média da operação → sinal positivo (citar formato
  predominante dos criativos, ex. vídeo); ≤ 0,5× média com CTR ≥ média → "clique que
  não vira conversa".
- CPM ≥ 1,5× média → "custa mais para aparecer" (e dizer se compensa pela conversão).
- `aprofundar`: padrões de criativo (ex.: anúncios com CPL < verde/2 — nomear e sugerir
  testar o padrão nos demais), criativos irmãos com resultado divergente.

## Variáveis de ambiente

| Var | Uso | Padrão |
|---|---|---|
| token do Meta | mesmo nome usado em `lib/meta.js` da Elite | ausente → modo demo |
| `META_CONTA` | conta de anúncios | `1718135052525631` |
| `CODIGO_ACESSO` | gate do painel | ausente → acesso aberto (dev) |
| `REGUA_VERDE` / `REGUA_AMARELO` | régua de CPL | 40 / 60 |

## Modo demo

Sem token, `api/corretores` responde o snapshot real de
`06-painel/dados/snapshot-2026-08-26.json` via `lib/mock.js`, com `modo: "demo"`,
qualquer que seja o período pedido. O frontend desabilita datas e "Atualizar dados"
e mostra a nota de demonstração, como na Elite.
