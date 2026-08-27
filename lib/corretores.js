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

const { graph, somaAcao, ACAO_CONVERSA, CONTA } = require('./meta.js');

// A conversa aberta no WhatsApp É o lead desta operação: não existe site nem
// landing page entre o anúncio e o corretor. A ação e a conta moram em
// ./meta.js — fonte única; aqui só ganham o nome da casa.
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
// `casa` é o colchete do nome da campanha, normalizado (minúsculas, sem
// acento). Rotação de corretor = mexer SÓ nesta lista.
const ROSTER = [
  { id: 'fittipaldi', nome: 'Fittipaldi',  casa: '[fittipaldi]',  foto: 'fittipaldi.jpg',
    praca: 'Bela Vista', pracas: 'Bela Vista · Country Club · Sync' },
  { id: 'birk',       nome: 'Rafael Birk', casa: '[rafael birk]', foto: 'birk.jpg',
    praca: 'Ben', pracas: 'Empreendimento Ben' },
  { id: 'adriano',    nome: 'Adriano',     casa: '[adriano]',     foto: 'adriano.jpg',
    praca: 'Moinhos de Vento', pracas: 'Moinhos de Vento · Chácara das Pedras' },
  { id: 'sandra',     nome: 'Sandra',      casa: '[sandra]',      foto: 'sandra.jpg',
    praca: 'Bela Vista', pracas: 'Bela Vista · Rio Branco' }
];

const semAcento = s => String(s || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function corretorDaCampanha(nomeCampanha) {
  // espaço encostado no colchete ("[ Sandra ]") não pode virar mute silencioso
  const n = semAcento(nomeCampanha).replace(/\s+/g, ' ')
    .replace(/\[\s+/g, '[').replace(/\s+\]/g, ']');
  return ROSTER.find(c => n.includes(c.casa)) || null;
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

// Série mensal da CONTA INTEIRA, sem filtro de roster — de propósito. Os
// corretores que saíram concentram R$ 10.244 dos R$ 12.492 já investidos:
// filtrar aqui apagaria a curva de aprendizado da conta e deixaria maio a
// julho vazios (o contrato explica; o gráfico avisa na legenda).
const MESES_ROT = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

async function serieMensal(ate, quantos = 12) {
  const [a, m] = ate.split('-').map(Number);
  const desde = iso(new Date(Date.UTC(a, m - 1 - (quantos - 1), 1)));
  const j = await graph(`act_${CONTA}/insights`, {
    fields: 'spend,actions',
    time_range: JSON.stringify({ since: desde, until: ate }),
    time_increment: 'monthly',
    limit: '100'
  });
  return (j.data || [])
    .filter(r => num(r.spend) > 0)
    .sort((x, y) => String(x.date_start).localeCompare(String(y.date_start)))
    .map(r => {
      const ym = String(r.date_start).slice(0, 7);
      const spend = num(r.spend), leads = somaAcao(r.actions, CONVERSA);
      const mes = { rot: MESES_ROT[Number(ym.slice(5, 7)) - 1], spend, leads,
                    cpl: leads > 0 ? spend / leads : null };
      const fim = `${ym}-${String(ultimoDiaDoMes(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)))).padStart(2, '0')}`;
      if (ym === ate.slice(0, 7) && ate < fim) mes.parcial = true;
      return mes;
    });
}

/* ============ montagem ============ */
const faixa = (cpl, leads) =>
  leads === 0 || cpl == null ? 'mute'
    : cpl < REGUA.verde ? 'ok' : cpl < REGUA.amarelo ? 'warn' : 'bad';

// Agrega as linhas de campanha de UM corretor. Uma campanha por corretor é a
// regra da conta — nesse caso os números da API valem crus; com mais de uma,
// deriva das somas. `cliques` segue o contrato: round(impr * ctr / 100) quando
// a API não mandou `clicks` (o snapshot do modo demo não tem).
function agrega(rows) {
  const soma = f => rows.reduce((s, r) => s + f(r), 0);
  const spend = soma(r => num(r.spend));
  const leads = soma(r => somaAcao(r.actions, CONVERSA));
  const impr = soma(r => num(r.impressions));
  const reach = soma(r => num(r.reach));
  const cliques = soma(r => num(r.clicks) || Math.round(num(r.impressions) * num(r.ctr) / 100));
  const um = rows.length === 1 ? rows[0] : null;
  return {
    spend, leads, impr, reach, cliques,
    freq: (um && num(um.frequency)) || (reach > 0 ? impr / reach : 0),
    ctr:  (um && num(um.ctr))       || (impr > 0 ? cliques / impr * 100 : 0),
    cpm:  (um && num(um.cpm))       || (impr > 0 ? spend / impr * 1000 : 0)
  };
}

function porCorretor(rows) {
  const grupos = new Map();
  for (const row of rows || []) {
    const c = corretorDaCampanha(row.campaign_name);
    if (!c) continue;   // fora do roster: fora dos cartões e dos agregados
    if (!grupos.has(c.id)) grupos.set(c.id, []);
    grupos.get(c.id).push(row);
  }
  const out = new Map();
  for (const [id, g] of grupos) out.set(id, agrega(g));
  return out;
}

function criativosPorCorretor(rows) {
  const out = {};
  for (const c of ROSTER) out[c.id] = [];
  for (const r of rows || []) {
    const c = corretorDaCampanha(r.campaign_name);
    if (!c) continue;
    const spend = num(r.spend), leads = somaAcao(r.actions, CONVERSA);
    out[c.id].push({
      adId: r.ad_id, nome: String(r.ad_name || '').trim() || 'Sem nome',
      spend, impr: num(r.impressions), ctr: num(r.ctr), leads,
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
  const agora = porCorretor(linhas);
  const antes = porCorretor(linhasAnt);

  const corretores = ROSTER.map(c => {
    // sem entrega no período: entra zerado e "mute" — o cartão precisa dizer
    // que o corretor sumiu, não fingir que ele não existe
    const m = agora.get(c.id) ||
      { spend: 0, leads: 0, impr: 0, reach: 0, cliques: 0, freq: 0, ctr: 0, cpm: 0 };
    const a = antes.get(c.id) || null;
    const cpl = m.leads > 0 ? m.spend / m.leads : null;
    return {
      id: c.id, nome: c.nome, foto: c.foto, praca: c.praca, pracas: c.pracas,
      spend: m.spend, leads: m.leads, cpl,
      impr: m.impr, reach: m.reach, freq: m.freq, ctr: m.ctr, cpm: m.cpm,
      cliques: m.cliques,
      taxaConversa: m.cliques > 0 ? m.leads / m.cliques * 100 : 0,
      status: faixa(cpl, m.leads),
      estreia: !a,
      ant: a ? { spend: a.spend, leads: a.leads,
                 cpl: a.leads > 0 ? a.spend / a.leads : null } : null
    };
  }).sort((x, y) => {   // do lead mais barato para o mais caro; sem lead, no fim
    if ((x.cpl == null) !== (y.cpl == null)) return x.cpl == null ? 1 : -1;
    return (x.cpl || 0) - (y.cpl || 0);
  });

  const soma = f => corretores.reduce((s, c) => s + f(c), 0);
  const spend = soma(c => c.spend), leads = soma(c => c.leads);
  const impr = soma(c => c.impr), cliques = soma(c => c.cliques);
  // a comparação agregada usa só quem TEM período anterior (estreante não
  // entra: compararia alguém com ninguém)
  const comAnt = corretores.filter(c => c.ant);
  const spendAnt = comAnt.reduce((s, c) => s + c.ant.spend, 0);
  const leadsAnt = comAnt.reduce((s, c) => s + c.ant.leads, 0);
  const faixas = { ok: 0, warn: 0, bad: 0, mute: 0 };
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
    criativos: criativosPorCorretor(ctx.criativos)
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
const listaE = ns => ns.length <= 1 ? String(ns[0] || '')
  : ns.slice(0, -1).join(', ') + ' e ' + ns[ns.length - 1];

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

  // 2 · destaque: a maior queda de CPL com volume que sustenta a leitura
  const quedas = cs
    .filter(c => c.leads >= T.ruidoLeads && c.cpl != null && c.ant && c.ant.cpl != null && c.cpl < c.ant.cpl)
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
  const estreantes = cs.filter(c => c.estreia && c.spend > 0);
  if (estreantes.length) {
    const dentro = estreantes.filter(c => c.cpl != null && c.cpl < p.regua.verde);
    const fora = estreantes.filter(c => !(c.cpl != null && c.cpl < p.regua.verde));
    let t = `${listaE(estreantes.map(c => c.nome))} ${estreantes.length > 1 ? 'estrearam' : 'estreou'} ` +
            `nesta janela, então ainda ${estreantes.length > 1 ? 'não têm' : 'não tem'} comparação.`;
    if (!fora.length)
      t += estreantes.length > 1
        ? ` ${estreantes.length === 2 ? 'Os dois' : 'Todos'} já entraram dentro da régua verde.`
        : ` E já entrou dentro da régua verde.`;
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

  // 5 · conversão: quem transforma clique em conversa muito acima (ou abaixo)
  // da média da operação
  const media = r.cliques > 0 ? r.leads / r.cliques * 100 : 0;
  if (media > 0) for (const c of cs) {
    // o elogio pede volume de leads (ruído neutraliza juízo); a queixa de
    // conversa pede volume de cliques — pouco clique é onde a taxa mais mente
    if (c.leads >= T.ruidoLeads && c.cliques > 0 && c.taxaConversa >= media * T.conversaForte) {
      const f = formatoPredominante(p.criativos[c.id] || []);
      let t = `${c.nome} transforma ${Math.round(c.taxaConversa)} de cada 100 cliques em conversa, ` +
              `contra ${Math.round(media)} da média da operação.`;
      if (f) t += ` Os anúncios dessa campanha são ${f.todos ? 'todos' : 'na maior parte'} em ` +
                  `${f.rotulo} — é um sinal, não uma conclusão: vale olhar o que o formato ` +
                  `filtra antes do clique.`;
      linhas.push(t);
    } else if (c.cliques >= T.ruidoCliques && c.leads > 0 &&
               c.taxaConversa <= media * T.conversaFraca && c.ctr >= r.ctr) {
      linhas.push(`${c.nome} atrai clique na média ou acima (CTR ${dec1(c.ctr)}%), mas só ` +
        `${dec1(c.taxaConversa)} de cada 100 cliques viram conversa, metade da média ou menos. ` +
        `Clique que não vira conversa costuma apontar promessa no anúncio que o WhatsApp não sustenta.`);
    }
  }

  // 6 · CPM: quem paga bem mais caro para aparecer — e se compensa na conversa
  if (r.cpm > 0) for (const c of cs) {
    if (c.impr <= 0 || c.cpm < r.cpm * T.cpmCaro) continue;
    let t = `O CPM de ${c.nome} (${brl(c.cpm)}) está bem acima da média da operação ` +
            `(${brl(r.cpm)}) — custa mais para aparecer`;
    t += c.leads < T.ruidoLeads
      ? `; ainda são poucos leads para dizer se compensa.`
      : c.taxaConversa >= media
        ? `, o que por ora compensa: a conversão de clique em conversa está acima da média.`
        : ` — e a conversão abaixo da média sugere que, por ora, não está compensando.`;
    linhas.push(t);
  }

  // 7 · quem sumiu ou ficou mudo — o cartão diz, a leitura reforça
  for (const c of cs.filter(x => x.leads === 0)) {
    if (c.spend > 0)
      linhas.push(`${c.nome} investiu ${brl0(c.spend)} no período e não registrou nenhum lead — ` +
        `antes de mexer em criativo, vale conferir se a campanha rodou a janela inteira.`);
    else if (c.ant)
      linhas.push(`${c.nome} ficou sem entrega nesta janela — no período anterior tinha ` +
        `investido ${brl0(c.ant.spend)}. Razão não confirmada: pode ser pausa planejada ou verba.`);
    else
      linhas.push(`${c.nome} segue sem entrega — a campanha não investiu nesta janela.`);
  }

  // 8 · ruído estatístico neutraliza juízo: com poucos leads, direção, não conclusão
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
  insights, insightsCriativos, serieMensal,
  monta, leitura, corretorDaCampanha,
  hojeSP, janelas, comTitulo, anteriorDe, fmt, dias
};
