# Bridge Moinhos de Vento — Carlos Carvalho Imóveis

Repositório de projeto da conta **Bridge Moinhos de Vento** (operação digital sob o nome "Carlos Carvalho Imóveis"), cliente da Case Marketing de Performance.

Este repositório concentra o contexto de negócio, a estratégia vigente, a operação de campanhas e os materiais de apresentação do projeto. Foi montado a partir da migração de um histórico de conversa com IA, consolidado e reorganizado.

---

## Painel de corretores (aplicação)

Além da documentação, este repositório hospeda o **painel de corretores** — a
aplicação web que mostra, por corretor, custo por lead, leads, anúncios com prévia
e leitura automática do período, com dado ao vivo da conta `CA - Bridge Moinhos 01`.
Mesma arquitetura do painel da Elite: funções serverless na Vercel, sem dependências.

```
api/       endpoints (corretores, preview, thumb)
lib/       Graph API do Meta, roster, régua, leitura automática, mock
public/    o painel em si (index.html) + fontes, logos e retratos
dev.js     servidor local: `npm run dev` e abra http://localhost:3000
```

### Colocar no ar (Vercel, ~5 min)

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importe
   `svro07/Projeto-Bridge-Moinhos`.
2. Em **Environment Variables**, defina:
   - `META_TOKEN` — token do Meta com `ads_read` (sem ele o painel abre em modo
     demonstração, com o retrato real de 13–26/08/2026);
   - `CODIGO_ACESSO` — o código que o time da Bridge vai digitar (ex.: `bridge2026`);
   - opcionais: `META_CONTA` (padrão `1718135052525631`), `REGUA_VERDE`/`REGUA_AMARELO`
     (padrão 40/60).
3. **Deploy.** A URL gerada + o código de acesso é tudo que o time precisa. No celular,
   "Adicionar à tela de início" transforma o painel num aplicativo.

Detalhes de arquitetura e decisões: [`06-painel/README.md`](06-painel/README.md) e o
contrato de dados em [`06-painel/contrato-payload.md`](06-painel/contrato-payload.md).

---

## Início rápido

Se você (ou um agente) está entrando neste projeto agora, leia nesta ordem:

1. **[`00-contexto/inteligencia-de-negocio.md`](00-contexto/inteligencia-de-negocio.md)** — o dossiê completo. É a fonte de verdade sobre o cliente.
2. **[`00-contexto/perfil-do-cliente.md`](00-contexto/perfil-do-cliente.md)** — como o Carlos funciona e como se comunicar com ele.
3. **[`01-estrategia/estrategia-vigente.md`](01-estrategia/estrategia-vigente.md)** — o que está decidido e rodando.
4. **[`01-estrategia/pendencias-e-decisoes.md`](01-estrategia/pendencias-e-decisoes.md)** — o que ainda precisa ser resolvido.

---

## Estrutura

```
bridge-moinhos/
├── README.md                       ← você está aqui
├── api/ · lib/ · public/ · dev.js  ← aplicação do painel de corretores
├── 06-painel/                      ← contrato de dados, mockup e decisões do painel
├── CONTEXTO.md                     ← briefing curto para agentes de IA
├── CHANGELOG.md                    ← histórico de mudanças de estratégia
│
├── 00-contexto/                    ← quem é o cliente
│   ├── inteligencia-de-negocio.md  ← DOSSIÊ PRINCIPAL (fonte de verdade)
│   ├── perfil-do-cliente.md        ← perfil do Carlos + como comunicar
│   └── stakeholders.md             ← quem é quem (cliente + agência)
│
├── 01-estrategia/                  ← o que vamos fazer
│   ├── estrategia-vigente.md       ← estrutura de funil, públicos, verba
│   ├── kpis-e-metas.md             ← métricas, metas e curva de aprendizado
│   ├── fase-2-google-youtube.md    ← canal em stand-by (médio prazo)
│   └── pendencias-e-decisoes.md    ← em aberto + contradições a resolver
│
├── 02-operacao/                    ← como executa no dia a dia
│   ├── estrutura-de-campanhas.md   ← nomenclatura, cadência, verba/campanha
│   ├── tracking-e-conversions.md   ← Stape, planilha, loop de qualificação
│   └── governanca-e-rituais.md     ← reuniões, relatórios, comunicação
│
├── 03-apresentacoes/               ← materiais para o cliente
│   ├── prompt-slides-meta.md       ← prompt de geração da apresentação
│   ├── prompt-slides-fase2.md      ← slide complementar Google/YouTube
│   └── objecoes-e-respostas.md     ← perguntas do Carlos + respostas prontas
│
├── 04-fontes/                      ← material bruto de origem
│   ├── historico-chat-original.pdf ← export da conversa que originou tudo
│   └── README.md
│
└── 05-templates/                   ← modelos reutilizáveis
    └── planilha-de-leads.md        ← estrutura da planilha de qualificação
```

---

## Convenções

- **Idioma:** português (BR) em todo o repositório.
- **Fonte de verdade:** `00-contexto/inteligencia-de-negocio.md`. Se houver conflito entre documentos, esse prevalece — e a divergência deve ser registrada no `CHANGELOG.md`.
- **Datas:** o histórico original vai até 13–14/05/2026. Tudo posterior a isso precisa ser confirmado antes de virar decisão.
- **Nada de dado sensível:** este repositório não deve conter CNPJ, credenciais, tokens de acesso a gerenciador, telefones de leads ou qualquer PII. Ver `.gitignore`.

---

## Status do projeto

| Item | Status |
|---|---|
| Diagnóstico digital | Concluído (simples — só Meta/Instagram) |
| Estratégia definida | Sim — Meta first, R$ 5.000/mês |
| Apresentação ao cliente | Marcada para 14/05/2026, 9h — **resultado não registrado** |
| Setup técnico (gerenciador, Stape, planilha) | Em configuração |
| 4 empreendimentos + 4 corretores | **Pendente** — bloqueia o fundo de funil |
| 1ª campanha no ar | Não rodou |
| Planilha de leads alimentada | Não |

> ⚠️ O histórico de origem termina antes do resultado da reunião de 14/05. Atualize este README e o `CHANGELOG.md` assim que houver informação nova.
