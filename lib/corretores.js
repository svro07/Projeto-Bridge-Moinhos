// Painel de corretores — Bridge Moinhos. Monta o payload de GET /api/corretores.
//
// O contrato (06-painel/contrato-payload.md) é a lei deste arquivo: cada campo
// que sai daqui está descrito lá. Quem mudar um lado, muda o contrato e o outro.
//
// Diferença central para a rede da Elite (lib/rede.js de lá): aqui NADA é
// descoberta automática. O roster é TRAVADO nos quatro corretores atuais, por
// mapa explícito — o projeto do Carlos é escolher corretores para receber
// investimento, então quem saiu não vira cartão e quem entrar só aparece
// quando alguém atualizar o ROSTER. É decisão, não limitação.
//
// A leitura automática segue o método Case: sinal nomeado com threshold
// declarado, ruído estatístico neutralizando juízo, causa sempre como
// hipótese — tom de consideração, nunca de ordem.
//
// Este módulo só roda no SERVIDOR. O token do Meta nunca chega ao navegador.

const { graph, somaAcao, leadsForm, ACAO_CONVERSA, CONTA } = require('./meta.js');

// Os dois jeitos de um lead chegar nesta operação. Até out/2026 só existia o
// primeiro: a conversa aberta no WhatsApp, já que não há site nem landing page
// entre o anúncio e o corretor. Em nov/2026 entraram campanhas de Leads com
// formulário qualificatório do Meta, que geram outra ação. Cada campanha conta
// só a ação do PRÓPRIO objetivo — é o "Resultado" do Gerenciador.
const CONVERSA = ACAO_CONVERSA;


const REGUA = {
  verde: Number(process.env.REGUA_VERDE || 40),
  amarelo: Number(process.env.REGUA_AMARELO || 60),
  teto: 100   // teto visual da barra: cabe o pior mês real (mai/2026, R$ 85,68)
};

// Thresholds das heurísticas de leitura. Nomeados aqui em cima para poderem
// ser recalibrados sem caçar número solto no meio do código.
const T = {
  ruidoLeads: 5,           // abaixo disso o juízo é neutralizado: poucos leads para concluir
  aprendizadoVerba: 0.20,  // verba subiu 20%+ ...
  aprendizadoCpl: 0.10,    // ... com CPL caindo 10%+ → sinal de aprendizado do algoritmo
  desperdicio: 25,         // anúncio com R$ 25+ gastos e nenhum lead
  conversaForte: 2,        // taxa de conversa 2x+ a média da operação
  conversaFraca: 0.5,      // metade da média ou menos, com CTR na média ou acima
  ruidoCliques: 30,        // "clique que não vira conversa" só com volume de cliques
  cpmCaro: 1.5,            // CPM 1,5x+ a média: custa mais para aparecer
  padraoBarato: 0.5        // CPL abaixo de metade da régua verde: padrão a replicar
};

/* ============ roster ============ */
// O vínculo campanha ↔ corretor é um MAPA EXPLÍCITO, nunca heurística de
// substring: um "Rafael Souza" futuro quebraria a heurística; o mapa não.
// `casa` LISTA as grafias do colchete que identificam o corretor, normalizadas
// (minúsculas, sem acento). É lista, e não texto, porque o nome no Gerenciador
// varia do nome real: "Roselil" lá, "Roseli" aqui; e a dupla pode virar
// "Flavia e Ismael" numa renomeação. Qualquer grafia prevista casa, e nenhuma
// delas some em silêncio do painel.
// `fotos` também é lista: a dupla que atende junta divide um cartão.
// Rotação de corretor = mexer SÓ nesta lista.
// `jaRodou` marca quem já teve campanha no ar alguma vez neste projeto. Sem
// isso, "parado" dependia só da janela anterior: uma pausa que passasse de 28
// dias zerava as duas janelas e o cartão voltava a dizer "ainda sem campanha",
// chamando um veterano de novato. Quem entrar sem campanha ainda entra sem a
// marca, e ganha a marca quando a campanha subir.
const ROSTER = [
  { id: 'fittipaldi', jaRodou: true, nome: 'Fittipaldi', casa: ['[fittipaldi]'], fotos: ['fittipaldi.jpg'],
    praca: 'Bela Vista', pracas: 'Bela Vista · Country Club · Sync' },
  { id: 'birk', jaRodou: true, nome: 'Rafael Birk', casa: ['[rafael birk]'], fotos: ['birk.jpg'],
    praca: 'Ben', pracas: 'Empreendimento Ben' },
  { id: 'adriano', jaRodou: true, nome: 'Adriano', casa: ['[adriano]'], fotos: ['adriano.jpg'],
    praca: 'Moinhos de Vento', pracas: 'Moinhos de Vento · Auxiliadora · Murano' },
  // Karoline tem TRÊS campanhas com a grafia "[Karoline]" na conta: a da
  // passagem antiga (jun–ago, pausada), a de ENGAJAMENTO de out (pausada em
  // nov) e a de Leads Forms Nativo de nov. As duas de agora casam pelo nome;
  // a de junho é excluída pelo id, porque o nome não as separa — sem isso o
  // período da passagem antiga entraria no cartão em qualquer intervalo que
  // alcançasse jun–ago. É a mesma armadilha de out/2026, agora que a chave
  // curta `[karoline]` passou a ser necessária.
  { id: 'karoline', jaRodou: true, nome: 'Karoline Aguiar', casa: ['[karoline aguiar]', '[karoline]'],
    exceto: ['120246474830860135'],
    fotos: ['karoline.jpg'], praca: 'Nova Olaria', pracas: 'Nova Olaria · Rio Branco · Petrópolis' },
  { id: 'eduardo', jaRodou: true, nome: 'Eduardo Serrano', casa: ['[eduardo serrano]', '[eduardo]'],
    fotos: ['eduardo.jpg'], praca: 'Moinhos de Vento', pracas: 'Moinhos de Vento' },
  { id: 'bianca', jaRodou: true, nome: 'Bianca', casa: ['[bianca]'], fotos: ['bianca.jpg'],
    praca: 'Moinhos de Vento', pracas: 'Moinhos de Vento · Jardim Europa · Rio Branco' },
  { id: 'ursula', jaRodou: true, nome: 'Úrsula', casa: ['[ursula]'], fotos: ['ursula.jpg'],
    praca: 'Petrópolis', pracas: 'Petrópolis · Moinhos de Vento · Mont\u2019Serrat' },
  // O Gerenciador escreve "Susi"; as grafias com z/y ficam previstas porque o
  // nome já apareceu escrito de outras formas nas conversas do projeto.
  { id: 'susi', jaRodou: true, nome: 'Susi', casa: ['[susi]', '[suzi]', '[suzy]', '[susy]'],
    fotos: ['susi.jpg'], praca: 'Bela Vista', pracas: 'Bela Vista' }
];

const semAcento = s => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// `campanhaId` é opcional e só serve ao `exceto` do roster: quando a mesma
// grafia entre colchetes aparece em duas campanhas e só uma é do corretor de
// hoje, a outra é excluída pelo id — o nome sozinho não as separa.
function corretorDaCampanha(nomeCampanha, campanhaId) {
  // espaço encostado no colchete ("[ Sandra ]") não pode virar mute silencioso
  const n = semAcento(nomeCampanha).replace(/\s+/g, ' ')
    .replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
  return ROSTER.find(c =>
    c.casa.some(k => n.includes(k)) &&
    !(c.exceto || []).includes(String(campanhaId || ''))) || null;
}

/* ============ calendário ============ */
// Datas em America/Sao_Paulo — o fuso da conta de anúncios. O servidor roda em
// UTC; um "hoje" errado por 3 horas trocaria a janela inteira toda noite.
const hojeSP = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

const iso = d => d.toISOString().slice(0, 10);
const maisDias = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
const fmt = d => d.split('-').reverse().slice(0, 2).join('/');
const ultimoDiaDoMes = (ano, mes) => new Date(Date.UTC(ano, mes, 0)).getUTCDate();  // mes 1-12

// Períodos prontos do contrato: fechada | 14d | mes | mesf. Semana ancorada de
// segunda a domingo, como na Elite; "fechado" = sem o dia de hoje, que ainda
// está contabilizando no Meta.
function janelas(hoje) {
  const h = hoje || hojeSP();
  const ontem = maisDias(h, -1);
  const dow = (new Date(h + 'T00:00:00Z').getUTCDay() + 6) % 7;   // 0 = segunda
  const segAtual = maisDias(h, -dow);
  const [a, m] = h.split('-').map(Number);
  const aF = m === 1 ? a - 1 : a, mF = m === 1 ? 12 : m - 1;      // mês fechado
  const p2 = n => String(n).padStart(2, '0');
  const mes1 = `${h.slice(0, 7)}-01`;
  return [
    { id: 'fechada', botao: 'Semana fechada',  desde: maisDias(segAtual, -7), ate: maisDias(segAtual, -1) },
    { id: '14d',     botao: 'Últimos 14 dias', desde: maisDias(h, -14), ate: ontem },
    // no dia 1º ainda não existe "até ontem" dentro do mês: fica o próprio dia
    { id: 'mes',     botao: 'Mês corrente',    desde: mes1, ate: ontem >= mes1 ? ontem : h, parcial: true },
    { id: 'mesf',    botao: 'Mês fechado',     desde: `${aF}-${p2(mF)}-01`,
      ate: `${aF}-${p2(mF)}-${p2(ultimoDiaDoMes(aF, mF))}` }
  ];
}

function comTitulo(j) {
  const d = dias(j.desde, j.ate);
  return { ...j, dias: d,
    titulo: j.id === 'custom' || !j.botao ? `${fmt(j.desde)} a ${fmt(j.ate)}` : j.botao,
    nota: `${fmt(j.desde)} a ${fmt(j.ate)} · ${d} dia${d === 1 ? '' : 's'}` +
          (j.parcial ? ', ainda contabilizando' : '') };
}

// Comparação automática do contrato: o MESMO número de dias, imediatamente
// antes do período. Regra deliberadamente mais simples que a da Elite (que
// trata mês contra mês inteiro): aqui a cadência é quinzenal e a régua de N
// dias vale para qualquer janela. Quem precisar de outra base usa cdesde/cate.
function anteriorDe(periodo, manual) {
  const a = manual
    ? { desde: manual.desde, ate: manual.ate, modo: 'manual' }
    : { desde: maisDias(periodo.desde, -periodo.dias), ate: maisDias(periodo.desde, -1), modo: 'auto' };
  const d = dias(a.desde, a.ate);
  return { titulo: `${fmt(a.desde)} a ${fmt(a.ate)}`, desde: a.desde, ate: a.ate,
    dias: d, modo: a.modo,
    nota: a.modo === 'manual'
      ? `comparação escolhida na mão · ${d} dia${d === 1 ? '' : 's'}`
      : 'mesma quantidade de dias, imediatamente antes' };
}

/* ============ busca na Graph API ============ */
const num = v => Number(v || 0);

// Uma chamada devolve TODAS as campanhas com entrega no intervalo; o casamento
// com o roster acontece depois, em memória. Mais leve que uma chamada por
// campanha, e campanha fora do roster ainda serve à série mensal.
async function insights(desde, ate) {
  const j = await graph(`act_${CONTA}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,ctr,cpm,actions',
    time_range: JSON.stringify({ since: desde, until: ate }),
    limit: '500'
  });
  return (j.data || []).filter(r => num(r.spend) > 0);
}

// Idem, no nível do anúncio: alimenta os criativos por corretor.
async function insightsCriativos(desde, ate) {
  const j = await graph(`act_${CONTA}/insights`, {
    level: 'ad',
    fields: 'ad_id,ad_name,campaign_id,campaign_name,spend,impressions,ctr,actions',
    time_range: JSON.stringify({ since: desde, until: ate }),
    limit: '600'
  });
  return (j.data || []).filter(r => num(r.spend) > 0);
}

// Status e objetivo de todas as campanhas da conta, numa chamada só. O insights
// não devolve nenhum dos dois, e são eles que dizem qual campanha representa o
// corretor hoje (a ativa) e qual é o "Resultado" dela (formulário ou conversa).
async function campanhasDaConta() {
  const j = await graph(`act_${CONTA}/campaigns`, {
    fields: 'id,name,objective,effective_status', limit: '500'
  });
  return new Map((j.data || []).map(c => [String(c.id), c]));
}

// Série mensal da CONTA INTEIRA, sem filtro de roster — de propósito. Os
// corretores que saíram concentram R$ 10.244 dos R$ 12.492 já investidos:
// filtrar aqui apagaria a curva de aprendizado da conta e deixaria maio a
// julho vazios (o contrato explica; o gráfico avisa na legenda).
const MESES_ROT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

async function serieMensal(ate, quantos = 12) {
  const [a, m] = ate.split('-').map(Number);
  const desde = iso(new Date(Date.UTC(a, m - 1 - (quantos - 1), 1)));
  // Por campanha, não pela conta: desde nov/2026 há dois tipos de resultado, e
  // cada campanha precisa contar o SEU — somar as duas ações no nível da conta
  // contaria duas vezes quem preencheu o formulário e depois abriu a conversa.
  const j = await graph(`act_${CONTA}/insights`, {
    level: 'campaign',
    fields: 'campaign_id,campaign_name,spend,actions',
    time_range: JSON.stringify({ since: desde, until: ate }),
    time_increment: 'monthly',
    limit: '500'
  });
  const porMes = new Map();
  for (const r of j.data || []) {
    const spend = num(r.spend);
    if (spend <= 0) continue;
    const ym = String(r.date_start).slice(0, 7);
    const obj = objetivoDe(r.campaign_name, null, r.actions);
    const m = porMes.get(ym) || { spend: 0, leads: 0 };
    m.spend += spend;
    m.leads += resultadoDe(obj, r.actions);
    porMes.set(ym, m);
  }
  return [...porMes.entries()]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([ym, { spend, leads }]) => {
      const mes = { rot: MESES_ROT[Number(ym.slice(5, 7)) - 1], spend, leads,
                    cpl: leads > 0 ? spend / leads : null };
      const fim = `${ym}-${String(ultimoDiaDoMes(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)))).padStart(2, '0')}`;
      if (ym === ate.slice(0, 7) && ate < fim) mes.parcial = true;
      return mes;
    });
}

/* ============ montagem ============ */
// "espera" e "mute" parecem iguais no dado (zero lead) e são opostos na leitura:
// quem ainda não tem campanha no ar não está indo mal, só não começou. Misturar
// os dois faria o painel acusar de caro quem nunca gastou um real.
// "cedo" separa de "mute" quem acabou de subir: com menos de um lead saudável
// gasto (a régua verde), zero lead é o resultado ESPERADO, não um alarme — era
// o que acontecia com quem estreava no dia anterior, que entrava vermelho com
// "sem lead". O limite sai da própria régua para não virar número solto.
// "parado" é quem JÁ rodou e não entregou nesta janela — campanha pausada. Era
// lido como "espera" ("ainda sem campanha"), que é falso para um veterano: o
// cartão do Rafael Birk dizia que ele nunca tinha começado no dia em que a
// campanha dele foi pausada.
const faixa = (cpl, leads, entregou, spend, jaTeveCampanha) =>
  !entregou ? (jaTeveCampanha ? 'parado' : 'espera')
    : leads === 0 && spend < REGUA.verde ? 'cedo'
      : leads === 0 || cpl == null ? 'mute'
        : cpl < REGUA.verde ? 'ok' : cpl < REGUA.amarelo ? 'warn' : 'bad';

/* ============ campanha: a unidade que o Gerenciador mostra ============ */
// Até nov/2026 o painel somava tudo de um corretor num número só. Funcionava
// enquanto cada corretor tinha UMA campanha de UM tipo. Quando Karoline e
// Adriano trocaram a campanha de WhatsApp pela de formulário, a soma passou a
// produzir um custo por lead que não existe em nenhuma linha do Gerenciador
// (Karoline: R$ 59,96 no painel contra R$ 92,24 e R$ 27,68 lá). Agora a campanha
// é a unidade: cada uma com objetivo, resultado e custo próprios, exatamente
// como o Gerenciador lista.

// Objetivo da campanha. Fonte de verdade: o `objective` que o Meta devolve em
// /campaigns. Sem ele (falha da chamada, modo demo), vale a convenção de nome
// da conta — "[Leads Forms Nativo]" é formulário, o resto é WhatsApp.
function objetivoDe(nome, info, acoes) {
  const obj = String((info && info.objective) || '').toUpperCase();
  if (/LEAD/.test(obj)) return 'form';
  if (/ENGAGEMENT|MESSAGE/.test(obj)) return 'whats';
  if (semAcento(nome).includes('[leads forms')) return 'form';
  // último recurso, para campanha de formulário que alguém nomeie fora da
  // convenção: só formulário e nenhuma conversa é campanha de formulário
  return leadsForm(acoes) > 0 && somaAcao(acoes, CONVERSA) === 0 ? 'form' : 'whats';
}

// O "Resultado" de cada campanha é a ação do SEU objetivo, e só ela — a mesma
// coluna do Gerenciador. Somar as duas ações numa campanha de formulário contaria
// duas vezes quem preencheu e depois abriu a conversa no WhatsApp.
const resultadoDe = (objetivo, acoes) =>
  objetivo === 'form' ? leadsForm(acoes) : somaAcao(acoes, CONVERSA);

function campanhaDe(row, info) {
  const objetivo = objetivoDe(row.campaign_name, info, row.actions);
  const spend = num(row.spend);
  const leads = resultadoDe(objetivo, row.actions);
  const impr = num(row.impressions), reach = num(row.reach);
  // `cliques` segue o contrato: round(impr * ctr / 100) quando a API não mandou
  // `clicks` (o snapshot do modo demo não tem)
  const cliques = num(row.clicks) || Math.round(impr * num(row.ctr) / 100);
  return {
    id: String(row.campaign_id || ''), nome: String(row.campaign_name || '').trim(),
    objetivo,
    // sem a informação de status (demo, ou /campaigns falhou), trata como ativa:
    // aí a principal cai na que mais investiu, que é o melhor palpite possível
    ativa: info ? info.effective_status === 'ACTIVE' : true,
    spend, leads, cpl: leads > 0 ? spend / leads : null,
    impr, reach, cliques,
    freq: num(row.frequency) || (reach > 0 ? impr / reach : 0),
    ctr:  num(row.ctr)       || (impr > 0 ? cliques / impr * 100 : 0),
    cpm:  num(row.cpm)       || (impr > 0 ? spend / impr * 1000 : 0)
  };
}

// As campanhas de UM corretor na janela. A principal é a ATIVA que mais
// investiu — a que representa o corretor hoje; sem nenhuma ativa (janela antiga,
// ou tudo pausado), a que mais investiu. As demais vão para `outras`, cada uma
// com os próprios números. `total` soma todas: é o que entra nos totais da
// operação, para nenhum real investido sumir do placar.
function resumoCampanhas(cs) {
  const ord = cs.slice().sort((a, b) => b.spend - a.spend);
  const principal = ord.find(c => c.ativa) || ord[0];
  const soma = f => cs.reduce((t, c) => t + f(c), 0);
  return {
    principal,
    outras: ord.filter(c => c !== principal),
    total: { spend: soma(c => c.spend), leads: soma(c => c.leads),
             impr: soma(c => c.impr), cliques: soma(c => c.cliques) }
  };
}

function porCorretor(rows, infos) {
  const grupos = new Map();
  for (const row of rows || []) {
    const c = corretorDaCampanha(row.campaign_name, row.campaign_id);
    if (!c) continue;   // fora do roster: fora dos cartões e dos agregados
    if (!grupos.has(c.id)) grupos.set(c.id, []);
    grupos.get(c.id).push(campanhaDe(row, infos && infos.get(String(row.campaign_id))));
  }
  const out = new Map();
  for (const [id, cs] of grupos) out.set(id, resumoCampanhas(cs));
  return out;
}

function criativosPorCorretor(rows, infos) {
  const out = {};
  for (const c of ROSTER) out[c.id] = [];
  for (const r of rows || []) {
    const c = corretorDaCampanha(r.campaign_name, r.campaign_id);
    if (!c) continue;
    // o anúncio herda o objetivo da campanha: resultado de anúncio de formulário
    // é formulário, de anúncio de WhatsApp é conversa — como no Gerenciador
    const objetivo = objetivoDe(r.campaign_name, infos && infos.get(String(r.campaign_id)), r.actions);
    const spend = num(r.spend), leads = resultadoDe(objetivo, r.actions);
    out[c.id].push({
      adId: r.ad_id, nome: String(r.ad_name || '').trim() || 'Sem nome',
      objetivo, spend, impr: num(r.impressions), ctr: num(r.ctr), leads,
      cpl: leads > 0 ? spend / leads : null
    });
  }
  for (const id of Object.keys(out))
    out[id].sort((a, b) => b.leads - a.leads || b.spend - a.spend);
  return out;
}

// Monta o payload do contrato a partir de linhas com a cara da Graph API.
// Demo e ao vivo passam por AQUI — nenhum caminho paralelo.
function monta(linhas, linhasAnt, ctx) {
  const infos = ctx.campanhas || null;   // Map id → { objective, effective_status }
  const agora = porCorretor(linhas, infos);
  const antes = porCorretor(linhasAnt, infos);
  const ZERO = { spend: 0, leads: 0, cpl: null, impr: 0, reach: 0, cliques: 0,
                 freq: 0, ctr: 0, cpm: 0 };
  const curta = c => ({ id: c.id, nome: c.nome, objetivo: c.objetivo, ativa: c.ativa,
                        spend: c.spend, leads: c.leads, cpl: c.cpl });

  const corretores = ROSTER.map(c => {
    // sem entrega no período: entra zerado — o cartão precisa dizer que o
    // corretor sumiu (ou ainda não começou), não fingir que ele não existe
    const r = agora.get(c.id) || null;
    const m = r ? r.principal : ZERO;
    const ra = antes.get(c.id) || null;
    const a = ra ? ra.principal : null;
    const entregou = !!r;
    // trocar de objetivo é trocar de unidade: conversa de WhatsApp e formulário
    // preenchido não se comparam, então a variação do cartão some
    const mudouObjetivo = !!(r && a && m.objetivo !== a.objetivo);
    return {
      id: c.id, nome: c.nome, fotos: c.fotos, praca: c.praca, pracas: c.pracas,
      // o cartão mostra a campanha principal, número por número igual à linha
      // dela no Gerenciador
      spend: m.spend, leads: m.leads, cpl: m.cpl,
      impr: m.impr, reach: m.reach, freq: m.freq, ctr: m.ctr, cpm: m.cpm,
      cliques: m.cliques,
      taxaConversa: m.cliques > 0 ? m.leads / m.cliques * 100 : 0,
      objetivo: r ? m.objetivo : null,
      campanha: r ? curta(m) : null,
      outras: r ? r.outras.map(curta) : [],
      total: r ? r.total : { spend: 0, leads: 0, impr: 0, cliques: 0 },
      status: faixa(m.cpl, m.leads, entregou, m.spend, !!ra || !!c.jaRodou),
      // quem nunca entregou não "estreou" nesta janela: estreia é para quem
      // apareceu agora e não existia antes
      estreia: entregou && !ra,
      mudouObjetivo,
      // As setas do cartão só aparecem quando a comparação significa alguma coisa:
      // mesmo objetivo E volume no período anterior. Campanha que nasceu no fim
      // da janela anterior (3 dias de 11) mostrava "▲600%" de leads — crescimento
      // de calendário, não de desempenho. Mesma regra do ruído da leitura.
      comparavel: !!(a && !mudouObjetivo && a.leads >= T.ruidoLeads),
      ant: a ? { spend: a.spend, leads: a.leads, cpl: a.cpl, objetivo: a.objetivo,
                 total: ra.total } : null
    };
  }).sort((x, y) => {   // do lead mais barato para o mais caro; sem lead, no fim
    if ((x.cpl == null) !== (y.cpl == null)) return x.cpl == null ? 1 : -1;
    return (x.cpl || 0) - (y.cpl || 0);
  });

  // Os totais da operação somam TODAS as campanhas de cada corretor, não só a
  // principal: o placar é sobre o dinheiro investido, e a campanha pausada no
  // meio da janela também gastou.
  const soma = f => corretores.reduce((s, c) => s + f(c), 0);
  const spend = soma(c => c.total.spend), leads = soma(c => c.total.leads);
  const impr = soma(c => c.total.impr), cliques = soma(c => c.total.cliques);
  // a comparação agregada usa só quem TEM período anterior (estreante não
  // entra: compararia alguém com ninguém)
  const comAnt = corretores.filter(c => c.ant);
  const spendAnt = comAnt.reduce((s, c) => s + c.ant.total.spend, 0);
  const leadsAnt = comAnt.reduce((s, c) => s + c.ant.total.leads, 0);
  const faixas = { ok: 0, warn: 0, bad: 0, mute: 0, cedo: 0, parado: 0, espera: 0 };
  corretores.forEach(c => faixas[c.status]++);

  const pacote = {
    modo: ctx.modo, geradoEm: ctx.geradoEm,
    periodo: ctx.periodo, anterior: ctx.anterior,
    regua: REGUA,
    rede: {
      spend, leads, cpl: leads > 0 ? spend / leads : null,
      impr, cliques,
      ctr: impr > 0 ? cliques / impr * 100 : 0,
      cpm: impr > 0 ? spend / impr * 1000 : 0,
      ant: comAnt.length ? { spend: spendAnt, leads: leadsAnt,
                             cpl: leadsAnt > 0 ? spendAnt / leadsAnt : null } : null,
      faixas
    },
    corretores,
    meses: ctx.serieMensal || [],
    criativos: criativosPorCorretor(ctx.criativos, infos)
  };

  const L = leitura(pacote);
  pacote.leitura = L.linhas;
  pacote.aprofundar = L.aprofundar;
  return pacote;
}

/* ============ leitura automática ============ */
// Tom do mockup: frases naturais, causa sempre como hipótese ("costuma ser",
// "vale checar"), nunca ordem. Só sinal com threshold nomeado na constante T.

const brl = v => 'R$ ' + Number(v).toLocaleString('pt-BR',
  { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brl0 = v => 'R$ ' + Math.round(Number(v)).toLocaleString('pt-BR');
const n0 = v => Number(v).toLocaleString('pt-BR');
const dec1 = v => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
// variação sempre em inteiro; abaixo de 1% não muda decisão nenhuma
const pc = v => Math.abs(v) < 0.005 ? 'praticamente nada' : Math.abs(Math.round(v * 100)) + '%';
const dia = d => d.split('-').reverse().slice(0, 2).join('/');
// "Flavia e Ismael" é UM item da lista: com o "e" solto no fim viraria
// "Flavia e Ismael e Roseli", que lê como três pessoas. Quando algum nome já
// traz um "e", a vírgula antes do último separa quem é quem.
const listaE = ns => {
  if (ns.length <= 1) return String(ns[0] || '');
  const fim = ns.some(n => / e /.test(String(n))) ? ', e ' : ' e ';
  return ns.slice(0, -1).join(', ') + fim + ns[ns.length - 1];
};

// Formato do criativo pelo prefixo do nome — padrão de nomenclatura da conta
// (VID/IMG/CAR - ...). Sem prefixo reconhecido, a leitura só não cita formato.
const FORMATO = { vid: 'vídeo', img: 'imagem estática', car: 'carrossel' };
function formatoPredominante(ads) {
  const cont = {};
  for (const a of ads) {
    const m = /^(vid|img|car)\b/.exec(semAcento(a.nome));
    if (m) cont[m[1]] = (cont[m[1]] || 0) + 1;
  }
  const chaves = Object.keys(cont).sort((x, y) => cont[y] - cont[x]);
  if (!chaves.length) return null;
  return { rotulo: FORMATO[chaves[0]], todos: cont[chaves[0]] === ads.length };
}

// "VID - Ben 4" e "VID - Ben" são o mesmo conceito: tira o formato, números de
// variação e "cópia" antes de agrupar irmãos.
const conceito = nome => semAcento(nome)
  .replace(/^\s*(vid|img|car|ad)\s*[-–—]\s*/, '')
  .replace(/\bcopia\b/g, ' ')
  .replace(/[0-9]+([.,][0-9]+)*/g, ' ')
  .replace(/[^a-z]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

// Nome de exibição do conceito: o mais curto do grupo, sem o prefixo de formato.
const rotuloConceito = ads => ads
  .map(a => String(a.nome)
    .replace(/^\s*(vid|img|car|ad)\s*[-–—]\s*/i, '')
    .replace(/\s*[—–-]\s*c[oó]pia\s*$/i, '').trim())
  .sort((x, y) => x.length - y.length)[0];

function leitura(p) {
  const linhas = [], aprofundar = [];
  const r = p.rede, cs = p.corretores;
  const janela = `${dia(p.periodo.desde)} a ${dia(p.periodo.ate)}`;

  if (!r.leads) {
    linhas.push(`Nenhum lead registrado de ${janela}` +
      (r.spend > 0 ? `, com ${brl0(r.spend)} investidos — antes de qualquer outra leitura, vale conferir se as campanhas rodaram a janela inteira.`
                   : ` — as campanhas não investiram nesta janela.`));
    return { linhas, aprofundar };
  }

  // 1 · abertura: o custo da operação contra o período anterior
  if (r.ant && r.ant.cpl != null && r.cpl != null) {
    const dCpl = (r.cpl - r.ant.cpl) / r.ant.cpl;
    const dSpend = r.ant.spend > 0 ? (r.spend - r.ant.spend) / r.ant.spend : null;
    const movimento = dCpl <= -0.005 ? `caiu de ${brl(r.ant.cpl)} para ${brl(r.cpl)}`
      : dCpl >= 0.005 ? `subiu de ${brl(r.ant.cpl)} para ${brl(r.cpl)}`
      : `ficou praticamente estável em ${brl(r.cpl)}`;
    let t = `De ${janela}, o custo por lead da operação ${movimento} — ` +
            `${n0(r.leads)} leads com ${brl0(r.spend)} investidos.`;
    // com estreante gastando na janela, o "a mais de verba" é efeito de gente
    // nova entrando, não de aprendizado — a frase só sai quando não há estreia
    const temEstreante = cs.some(c => c.estreia && c.spend > 0);
    if (!temEstreante && dSpend != null && dSpend >= T.aprendizadoVerba && dCpl <= -T.aprendizadoCpl)
      t += ` Investir ${pc(dSpend)} a mais com o custo caindo ${pc(dCpl)} costuma ser sinal ` +
           `de que o algoritmo aprendeu com quem já entrou.`;
    linhas.push(t);
  } else {
    linhas.push(`A operação fechou ${janela} com ${n0(r.leads)} leads a ${brl(r.cpl)} — ` +
      `${brl0(r.spend)} investidos, sem base de comparação no período anterior.`);
  }

  // 1b · troca de campanha — logo depois da abertura, de propósito: a leitura
  // tem no máximo 8 linhas e este é o aviso que explica por que alguns números
  // não se comparam. No fim da fila, era o primeiro a ser cortado.
  // O número comparado deixou de ser o mesmo. Um
  // formulário qualificatório respondido e uma conversa crua de WhatsApp são
  // unidades diferentes; sem este aviso a variação de CPL parece desempenho
  // quando é troca de régua.
  const ROTULO_OBJ = { whats: 'WhatsApp', form: 'formulário' };
  const trocaram = cs.filter(c => c.mudouObjetivo);
  if (trocaram.length) {
    const ns = listaE(trocaram.map(c => c.nome));
    const de = listaE([...new Set(trocaram.map(c => ROTULO_OBJ[c.ant.objetivo]))]);
    const para = listaE([...new Set(trocaram.map(c => ROTULO_OBJ[c.objetivo]))]);
    const algumaAntigaGastou = trocaram.some(c => c.outras && c.outras.length);
    linhas.push(`${ns} ${trocaram.length > 1 ? 'trocaram' : 'trocou'} a campanha de ${de} pela ` +
      `de ${para}. O cartão mostra a campanha nova, sem comparação com o período anterior: ` +
      `formulário preenchido e conversa de WhatsApp são unidades diferentes — o formulário ` +
      `filtra antes de virar lead, então tende a custar mais e chegar mais qualificado.` +
      (algumaAntigaGastou ? ` A campanha antiga ainda gastou nesta janela e aparece embaixo, ` +
        `com os próprios números, como uma linha à parte no Gerenciador.` : ''));
  }

  // campanha pausada que ainda gastou na janela: o número dela aparece no
  // cartão, embaixo, mas o leitor precisa saber por que existem duas linhas
  const comOutras = cs.filter(c => c.outras && c.outras.length && !c.mudouObjetivo);
  for (const c of comOutras)
    linhas.push(`${c.nome} teve ${c.outras.length + 1} campanhas com entrega nesta janela. O ` +
      `cartão mostra a ${c.campanha.ativa ? 'ativa' : 'que mais investiu'}; ` +
      `${c.outras.length > 1 ? 'as outras aparecem' : 'a outra aparece'} embaixo, ` +
      `com os próprios números — como no Gerenciador.`);

  // 2 · destaque: a maior queda de CPL com volume que sustenta a leitura
  const quedas = cs
    // os DOIS lados precisam de volume: "caiu 39%" contra uma base de 1 lead é
    // ruído, não destaque — a regra do ruído olhava só o período atual
    .filter(c => !c.mudouObjetivo && c.leads >= T.ruidoLeads && c.cpl != null &&
                 c.ant && c.ant.leads >= T.ruidoLeads && c.ant.cpl != null && c.cpl < c.ant.cpl)
    .sort((a, b) => (a.cpl - a.ant.cpl) / a.ant.cpl - (b.cpl - b.ant.cpl) / b.ant.cpl);
  if (quedas.length) {
    const c = quedas[0];
    const dSpend = c.ant.spend > 0 ? (c.spend - c.ant.spend) / c.ant.spend : null;
    let t = `${c.nome} é o destaque da janela: o custo por lead caiu de ${brl(c.ant.cpl)} ` +
            `para ${brl(c.cpl)}, com ${n0(c.leads)} leads contra ${n0(c.ant.leads)}`;
    if (dSpend != null && dSpend <= -0.005) t += ` — gastando ${pc(dSpend)} menos`;
    else if (dSpend != null && dSpend >= 0.005) t += ` — com ${pc(dSpend)} a mais de verba`;
    linhas.push(t + '.');
  }

  // 3 · estreias: quem entrou nesta janela, e se entrou dentro da régua
  const estreantes = cs.filter(c => c.estreia && c.spend > 0 && c.status !== 'cedo');
  if (estreantes.length) {
    const dentro = estreantes.filter(c => c.cpl != null && c.cpl < p.regua.verde);
    const fora = estreantes.filter(c => !(c.cpl != null && c.cpl < p.regua.verde));
    let t = `${listaE(estreantes.map(c => c.nome))} ${estreantes.length > 1 ? 'estrearam' : 'estreou'} ` +
            `nesta janela, então ainda ${estreantes.length > 1 ? 'não têm' : 'não tem'} comparação.`;
    // Sem pronome de propósito: "Os dois"/"Todos" marcam gênero, e o painel não
    // sabe o de ninguém — a frase saía errada assim que duas corretoras estreavam
    // na mesma janela. A mesma construção serve ao singular e ao plural.
    if (!fora.length)
      t += ` E já ${estreantes.length > 1 ? 'entraram' : 'entrou'} dentro da régua verde.`;
    else if (!dentro.length)
      t += ` ${listaE(fora.map(c => c.cpl != null ? `${c.nome} (${brl(c.cpl)})` : `${c.nome} (sem lead)`))} ` +
           `ainda fora da régua verde.`;
    else
      t += ` ${listaE(dentro.map(c => c.nome))} já dentro da régua verde; ` +
           `${listaE(fora.map(c => c.cpl != null ? `${c.nome} (${brl(c.cpl)})` : `${c.nome} (sem lead)`))} ainda não.`;
    linhas.push(t);
  }

  // 4 · desperdício: anúncios com spend ≥ T.desperdicio e nenhum lead, somados
  // por corretor — cita só o maior, que é onde a decisão mora
  const desperdicios = cs.map(c => {
    const ads = (p.criativos[c.id] || []).filter(a => a.leads === 0 && a.spend >= T.desperdicio);
    return { c, ads, total: ads.reduce((s, a) => s + a.spend, 0) };
  }).filter(d => d.ads.length).sort((a, b) => b.total - a.total);
  if (desperdicios.length) {
    const d = desperdicios[0];
    const umConceito = new Set(d.ads.map(a => conceito(a.nome))).size === 1;
    const quem = d.ads.length === 1 ? `O anúncio “${rotuloConceito(d.ads)}”`
      : umConceito ? `Os ${d.ads.length} anúncios de “${rotuloConceito(d.ads)}”`
      : `${d.ads.length} anúncios`;
    linhas.push(`${quem} na campanha de ${d.c.nome} ${d.ads.length === 1 ? 'gastou' : 'gastaram'} ` +
      `${brl(d.total)} e não ${d.ads.length === 1 ? 'trouxe' : 'trouxeram'} nenhum lead — ` +
      `o maior desperdício isolado do período.`);
  }

  // 5 · conversão: quem transforma clique em lead muito acima (ou abaixo) da
  // média da operação. O substantivo acompanha o tipo de campanha: desde
  // nov/2026 "conversa" deixou de valer para todo mundo.
  const alvo = c => c.objetivo === 'form' ? 'formulário preenchido' : 'conversa';
  const destino = c => c.objetivo === 'form' ? 'o formulário' : 'o WhatsApp';
  // A média de comparação é a do MESMO objetivo: taxa de conversa no WhatsApp e
  // taxa de formulário preenchido são unidades diferentes, e misturar as duas
  // move a régua de todo mundo. Grupo com menos de 3 corretores não tem média
  // que preste — o sinal fica calado.
  const mediaDe = obj => {
    const g = cs.filter(x => x.objetivo === obj && x.cliques > 0);
    if (g.length < 3) return 0;
    const l = g.reduce((t, x) => t + x.leads, 0), k = g.reduce((t, x) => t + x.cliques, 0);
    return k > 0 ? l / k * 100 : 0;
  };
  for (const c of cs) {
    const media = mediaDe(c.objetivo);
    if (!(media > 0)) continue;
    // o elogio pede volume de leads (ruído neutraliza juízo); a queixa de
    // conversa pede volume de cliques — pouco clique é onde a taxa mais mente
    if (c.leads >= T.ruidoLeads && c.cliques > 0 && c.taxaConversa >= media * T.conversaForte) {
      const f = formatoPredominante(p.criativos[c.id] || []);
      let t = `${c.nome} transforma ${Math.round(c.taxaConversa)} de cada 100 cliques em ` +
              `${alvo(c)}, contra ${Math.round(media)} da média das campanhas de ` +
              `${c.objetivo === 'form' ? 'formulário' : 'WhatsApp'}.`;
      if (f) t += ` Os anúncios dessa campanha são ${f.todos ? 'todos' : 'na maior parte'} em ` +
                  `${f.rotulo} — é um sinal, não uma conclusão: vale olhar o que o formato ` +
                  `filtra antes do clique.`;
      linhas.push(t);
    } else if (c.cliques >= T.ruidoCliques && c.leads > 0 &&
               c.taxaConversa <= media * T.conversaFraca && c.ctr >= r.ctr) {
      linhas.push(`${c.nome} atrai clique na média ou acima (CTR ${dec1(c.ctr)}%), mas só ` +
        `${dec1(c.taxaConversa)} de cada 100 cliques viram ${alvo(c)}, metade da média ou menos. ` +
        `Clique que não converte costuma apontar promessa no anúncio que ${destino(c)} não sustenta.`);
    }
  }

  // 6 · CPM: quem paga bem mais caro para aparecer — e se compensa na conversa
  if (r.cpm > 0) for (const c of cs) {
    if (c.impr <= 0 || c.cpm < r.cpm * T.cpmCaro) continue;
    let t = `O CPM de ${c.nome} (${brl(c.cpm)}) está bem acima da média da operação ` +
            `(${brl(r.cpm)}) — custa mais para aparecer`;
    const mediaObj = mediaDe(c.objetivo);   // mesma régua do sinal 5: mesmo objetivo
    t += c.leads < T.ruidoLeads
      ? `; ainda são poucos leads para dizer se compensa.`
      : !(mediaObj > 0)
        ? `; ainda há poucas campanhas de ${c.objetivo === 'form' ? 'formulário' : 'WhatsApp'} ` +
          `para comparar a conversão e dizer se compensa.`
      : c.taxaConversa >= mediaObj
        ? `, o que por ora compensa: a conversão de clique em ${alvo(c)} está acima da média.`
        : ` — e a conversão abaixo da média sugere que, por ora, não está compensando.`;
    linhas.push(t);
  }

  // 7 · quem sumiu ou ficou mudo — o cartão diz, a leitura reforça
  for (const c of cs.filter(x => x.leads === 0)) {
    if (c.status === 'cedo')
      linhas.push(`${c.nome} começou a rodar agora: ${brl0(c.spend)} investidos até aqui. ` +
        `É pouco para dizer qualquer coisa sobre custo por lead — a leitura dele entra ` +
        `na próxima janela.`);
    else if (c.spend > 0)
      linhas.push(`${c.nome} investiu ${brl0(c.spend)} no período e não registrou nenhum lead — ` +
        `antes de mexer em criativo, vale conferir se a campanha rodou a janela inteira.`);
  }
  // Sem entrega nesta janela (campanha pausada, ou sem verba): uma frase só, como
  // "aguardando campanha" — com três pausados, eram três das oito vagas da leitura.
  const semEntrega = cs.filter(c => c.leads === 0 && c.spend === 0 && c.status !== 'espera');
  if (semEntrega.length === 1 && semEntrega[0].ant)
    linhas.push(`${semEntrega[0].nome} ficou sem entrega nesta janela — no período anterior ` +
      `tinha investido ${brl0(semEntrega[0].ant.total.spend)}. Razão não confirmada: pode ser ` +
      `pausa planejada ou verba.`);
  else if (semEntrega.length)
    linhas.push(`${listaE(semEntrega.map(c => c.nome))} ${semEntrega.length > 1 ? 'ficaram' : 'ficou'} ` +
      `sem entrega nesta janela — campanha pausada ou sem verba. Os números voltam sozinhos ` +
      `quando a campanha rodar de novo.`);

  // 8 · quem entrou e ainda não tem campanha: aviso de pendência operacional,
  // não diagnóstico de performance. Numa frase só — numa rotação inteira entram
  // três ou quatro de uma vez, e uma linha por pessoa viraria um bloco repetido.
  const naEspera = cs.filter(c => c.status === 'espera');
  if (naEspera.length) {
    const ns = listaE(naEspera.map(c => c.nome));
    linhas.push(naEspera.length > 1
      ? `${ns} entraram no projeto mas ainda não têm campanha no ar — enquanto elas não ` +
        `subirem no gerenciador, não há número para medir.`
      : `${ns} entrou no projeto mas ainda não tem campanha no ar — enquanto ela não ` +
        `subir no gerenciador, não há número para medir.`);
  }

  // 9 · ruído estatístico neutraliza juízo: com poucos leads, direção, não conclusão
  const ruidosos = cs.filter(c => c.leads > 0 && c.leads < T.ruidoLeads);
  if (ruidosos.length)
    linhas.push(`${listaE(ruidosos.map(c => `${c.nome} (${n0(c.leads)})`))} ` +
      `${ruidosos.length > 1 ? 'fecharam' : 'fechou'} com menos de ${T.ruidoLeads} leads — ` +
      `poucos leads para concluir; nessa faixa o custo oscila muito de uma janela para outra.`);

  /* ---- o que vale aprofundar ---- */
  // padrão barato: CPL abaixo de metade da régua verde — nomear e sugerir
  // testar o padrão nos demais corretores
  const grupos = new Map();
  for (const c of cs) for (const a of (p.criativos[c.id] || [])) {
    if (a.cpl == null || a.cpl >= p.regua.verde * T.padraoBarato) continue;
    const k = c.id + '|' + conceito(a.nome);
    if (!grupos.has(k)) grupos.set(k, { c, ads: [] });
    grupos.get(k).ads.push(a);
  }
  const padroes = [...grupos.values()]
    .map(g => ({ ...g, leads: g.ads.reduce((s, a) => s + a.leads, 0) }))
    .filter(g => g.leads >= 2)   // um lead só ainda é sorte, não padrão
    .sort((a, b) => Math.min(...a.ads.map(x => x.cpl)) - Math.min(...b.ads.map(x => x.cpl)));
  for (const g of padroes.slice(0, 2)) {
    const custos = g.ads.map(a => brl(a.cpl));
    aprofundar.push(`${g.ads.length === 1 ? `O anúncio “${rotuloConceito(g.ads)}”`
        : `Os ${g.ads.length} anúncios de “${rotuloConceito(g.ads)}”`} (${g.c.nome}) ` +
      `${g.ads.length === 1 ? 'trouxe' : 'trouxeram'} lead a ${listaE(custos)} — abaixo de ` +
      `metade da régua verde. Vale testar o mesmo padrão nas campanhas dos outros corretores.`);
  }

  // criativos irmãos com resultado divergente, dentro do mesmo corretor: a
  // diferença está no corte ou no público, não no conceito
  const porConc = new Map();
  for (const c of cs) for (const a of (p.criativos[c.id] || [])) {
    const k = c.id + '|' + conceito(a.nome);
    if (!porConc.has(k)) porConc.set(k, { c, ads: [] });
    porConc.get(k).ads.push(a);
  }
  for (const g of porConc.values()) {
    const bons = g.ads.filter(a => a.leads > 0);
    const parados = g.ads.filter(a => a.leads === 0 && a.spend >= T.desperdicio);
    if (!bons.length || !parados.length) continue;
    const gasto = parados.reduce((s, a) => s + a.spend, 0);
    aprofundar.push(`${parados.length === 1 ? 'Um criativo' : `${n0(parados.length)} criativos`} ` +
      `“${rotuloConceito(g.ads)}” de ${g.c.nome} ${parados.length === 1 ? 'gastou' : 'gastaram'} ` +
      `${brl(gasto)} sem nenhum lead, enquanto ${bons.length === 1 ? 'outro do mesmo conceito trouxe'
        : `outros ${bons.length} do mesmo conceito trouxeram`} — vale checar se é variação ` +
      `de corte ou de público.`);
  }

  return { linhas: linhas.slice(0, 8), aprofundar: aprofundar.slice(0, 4) };
}

module.exports = {
  CONTA, CONVERSA, ROSTER, REGUA, T,
  insights, insightsCriativos, serieMensal, campanhasDaConta,
  monta, leitura, corretorDaCampanha,
  hojeSP, janelas, comTitulo, anteriorDe, fmt, dias
};
