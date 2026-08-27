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
- `mes` = mês corrente até ontem; `mesf` = último mês completo.
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
    "faixas": { "ok": 4, "warn": 0, "bad": 0, "mute": 0 }
  },

  "corretores": [ {
    "id": "fittipaldi",                // slug estável, casa com a foto
    "nome": "Fittipaldi",
    "foto": "fittipaldi.jpg",          // arquivo em /assets/corretores/
    "praca": "Bela Vista",             // chip curto
    "pracas": "Bela Vista · Country Club · Sync",   // title do chip
    "spend": 315.95, "leads": 19, "cpl": 16.63,     // cpl null quando leads = 0
    "impr": 8204, "reach": 4160, "freq": 1.97, "ctr": 3.07, "cpm": 38.51,
    "cliques": 252,                    // round(impr * ctr / 100) — cliques todos
    "taxaConversa": 7.5,               // leads / cliques * 100; 0 quando cliques = 0
    "status": "ok" | "warn" | "bad" | "mute",       // mute = sem lead no período
    "estreia": false,                  // true = sem entrega no período anterior
    "ant": { "spend": 329.14, "leads": 8, "cpl": 41.14 }    // ou null
  } ],

  "meses": [                           // CONTA INTEIRA, inclusive corretores que saíram:
    { "rot": "mai", "spend": 1713.66, "leads": 20, "cpl": 85.68 },
    { "rot": "ago", "spend": 3610.96, "leads": 143, "cpl": 25.25, "parcial": true }
  ],                                   // filtrar aqui apagaria a curva de aprendizado —
                                       // os que saíram concentram R$ 10.244 de R$ 12.492

  "criativos": {                       // por corretor, ordenado por leads desc, spend desc
    "fittipaldi": [ { "adId": "…", "nome": "IMG - …", "spend": 41.73,
                      "impr": 1140, "ctr": 7.37, "leads": 5, "cpl": 8.35 } ]
  },

  "leitura": [ "frase 1 (a mais importante)", "..." ],
  "aprofundar": [ "..." ]
}
```

## Roster — travado nos 4 atuais

O vínculo campanha ↔ corretor é um MAPA EXPLÍCITO, nunca heurística de substring
(um "Rafael Souza" futuro quebraria a heurística; o mapa não). Casar contra o nome
da campanha normalizado (minúsculas, sem acento):

| id | nome | casa com | foto |
|---|---|---|---|
| `fittipaldi` | Fittipaldi | `[fittipaldi]` | fittipaldi.jpg |
| `birk` | Rafael Birk | `[rafael birk]` | birk.jpg |
| `adriano` | Adriano | `[adriano]` | adriano.jpg |
| `sandra` | Sandra | `[sandra]` | sandra.jpg |

Campanha da conta que não casa com o roster: fora dos cartões e dos agregados
(`rede`, `criativos`) — mas DENTRO de `meses`. Corretor do roster sem entrega no
período: entra com zeros e `status: "mute"` (o cartão precisa dizer que ele sumiu,
não fingir que ele não existe).

## Régua e status

`verde`/`amarelo` de `REGUA_VERDE`/`REGUA_AMARELO` (padrão 40/60), teto visual 100.
`status`: cpl < verde → ok; < amarelo → warn; ≥ amarelo → bad; leads = 0 → mute.

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
