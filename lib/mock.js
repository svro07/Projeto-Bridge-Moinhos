// Modo demonstração: o retrato real da conta CA - Bridge Moinhos 01, congelado
// em 26/08/2026 (06-painel/dados/snapshot-2026-08-26.json). É o que
// /api/corretores responde enquanto o token do Meta não existir na hospedagem.
//
// O snapshot vira linhas com a MESMA cara da resposta da Graph API, de
// propósito: demo e ao vivo passam pelo mesmo monta() de lib/corretores.js —
// derivados (cpl, cliques, taxaConversa, status, faixas) e leitura saem da
// mesma função nos dois modos. Nenhum caminho paralelo: o que a demo mostra é
// exatamente o que o ao vivo mostraria com estes números.

const corretores = require('./corretores.js');
const snap = require('../06-painel/dados/snapshot-2026-08-26.json');

const { CONVERSA, fmt, dias } = corretores;

const acoes = leads => leads > 0
  ? [{ action_type: CONVERSA, value: String(leads) }] : [];

// Linhas de campanha do período — uma por corretor, como a conta roda hoje.
// Sem `clicks` de propósito: o snapshot não guardou, e o monta() deriva
// round(impr * ctr / 100), como o contrato manda.
const linhas = Object.values(snap.corretores).map(c => ({
  campaign_id: c.campanhaId, campaign_name: c.campanha,
  spend: c.spend, impressions: c.impressions, reach: c.reach,
  frequency: c.frequency, ctr: c.ctr, cpm: c.cpm,
  actions: acoes(c.leads)
}));

// Período anterior: o snapshot só guardou spend e leads (é só o que o `ant`
// do contrato carrega). Birk e Sandra não têm anterior — viram estreia.
const linhasAnt = Object.values(snap.corretores)
  .filter(c => c.anterior)
  .map(c => ({
    campaign_id: c.campanhaId, campaign_name: c.campanha,
    spend: c.anterior.spend,
    actions: acoes(c.anterior.leads)
  }));

// Anúncios, no nível que a Graph API devolveria com level:'ad'. O nome da
// campanha vem do corretor dono — é por ele que o monta() casa com o roster.
const criativos = Object.entries(snap.criativos).flatMap(([id, ads]) =>
  ads.map(a => ({
    ad_id: a.adId, ad_name: a.nome,
    campaign_id: snap.corretores[id].campanhaId,
    campaign_name: snap.corretores[id].campanha,
    spend: a.spend, impressions: a.impressions, ctr: a.ctr,
    actions: acoes(a.leads)
  })));

// Série mensal da conta inteira, já no formato do contrato (só falta o cpl).
const meses = snap.meses.map(m => {
  const mes = { rot: m.rot, spend: m.spend, leads: m.leads,
                cpl: m.leads > 0 ? m.spend / m.leads : null };
  if (m.parcial) mes.parcial = true;
  return mes;
});

const periodo = {
  id: '14d', titulo: 'Últimos 14 dias',
  desde: snap.periodo.desde, ate: snap.periodo.ate,
  dias: dias(snap.periodo.desde, snap.periodo.ate),
  nota: `${fmt(snap.periodo.desde)} a ${fmt(snap.periodo.ate)} · retrato de ${fmt(snap.geradoEm)}`
};

const anterior = {
  titulo: `${fmt(snap.anterior.desde)} a ${fmt(snap.anterior.ate)}`,
  desde: snap.anterior.desde, ate: snap.anterior.ate,
  dias: dias(snap.anterior.desde, snap.anterior.ate),
  modo: 'auto', nota: 'mesma quantidade de dias, imediatamente antes'
};

// O payload completo do contrato, com modo:"demo" — qualquer que seja o
// período que o navegador pediu (o frontend desabilita as datas na demo).
function pacote() {
  return corretores.monta(linhas, linhasAnt, {
    modo: 'demo', geradoEm: snap.geradoEm,
    periodo, anterior, criativos, serieMensal: meses
  });
}

module.exports = { pacote, linhas, linhasAnt, criativos, meses, periodo, anterior,
  geradoEm: snap.geradoEm };
