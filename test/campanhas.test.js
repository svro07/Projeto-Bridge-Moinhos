// O cartão tem que bater, linha por linha, com o Gerenciador. Roda com
// `npm test`. Os números abaixo são os reais da janela 01/11–11/11/2026, os
// mesmos do print que expôs o problema: o painel mostrava a Karoline a
// R$ 59,96 com 6 leads — a soma de duas campanhas, um número que não existe em
// nenhuma linha do Gerenciador (lá: 3 a R$ 92,24 e 3 a R$ 27,68).

const { test } = require('node:test');
const assert = require('node:assert');
const { monta } = require('../lib/corretores.js');
const { ACAO_CONVERSA: W } = require('../lib/meta.js');

// Formulário no FORMATO REAL da lista de ações do insights: o mesmo número em
// `onsite_conversion.lead_grouped` e em `lead`, e nenhum `leadgen.other`. A
// primeira versão destes testes montava `leadgen.other` — o mesmo palpite errado
// do código — e passou enquanto o painel publicado mostrava Karoline e Adriano
// com zero lead. Dado de teste tem que ter a cara da API, não a do código.
const acoes = (w, f) => [].concat(w ? [{ action_type: W, value: String(w) }] : [],
  f ? [{ action_type: 'onsite_conversion.lead_grouped', value: String(f) },
       { action_type: 'lead', value: String(f) }] : []);
// [id, nome, objective, status, spend, conversas, formulários]
const CAMP = [
  ['120249435838810135', '[Leads Forms Nativo] [Karoline] Whats', 'OUTCOME_LEADS', 'ACTIVE', 276.73, 0, 3],
  ['120249354252090135', '[Leads Forms Nativo] [Adriano] Whats', 'OUTCOME_LEADS', 'ACTIVE', 320.75, 0, 11],
  ['120249354061010135', '[ENGAJAMENTO] [Susi] Whats', 'OUTCOME_ENGAGEMENT', 'ACTIVE', 330.70, 7, 0],
  ['120247681064840135', '[ENGAJAMENTO] [Fittipaldi] Whats', 'OUTCOME_ENGAGEMENT', 'ACTIVE', 357.45, 17, 0],
  ['120249016313560135', '[ENGAJAMENTO] [Karoline Aguiar] Whats', 'OUTCOME_ENGAGEMENT', 'PAUSED', 83.04, 3, 0]
];
const linhas = CAMP.map(([campaign_id, campaign_name, , , spend, w, f]) => ({
  campaign_id, campaign_name, spend, impressions: 5000, reach: 2500, ctr: 2, cpm: 40,
  clicks: 100, actions: acoes(w, f) }));
const campanhas = new Map(CAMP.map(([id, , objective, effective_status]) =>
  [id, { objective, effective_status }]));
const ctx = (extra = {}) => ({ modo: 't', geradoEm: '2026-11-11',
  periodo: { id: 'custom', desde: '2026-11-01', ate: '2026-11-11', dias: 11 },
  anterior: { desde: '2026-10-21', ate: '2026-10-31', dias: 11, modo: 'auto' },
  criativos: [], serieMensal: [], campanhas, ...extra });
const cartao = (d, id) => d.corretores.find(c => c.id === id);
const centavos = x => Math.round(x * 100);

test('Karoline: o cartão é a campanha ativa, e a pausada vem à parte', () => {
  const k = cartao(monta(linhas, [], ctx()), 'karoline');
  assert.strictEqual(k.objetivo, 'form');
  assert.strictEqual(k.leads, 3);
  assert.strictEqual(centavos(k.cpl), 9224, 'Gerenciador: R$ 92,24 por lead (formulário)');
  assert.strictEqual(k.outras.length, 1);
  const o = k.outras[0];
  assert.strictEqual(o.objetivo, 'whats');
  assert.strictEqual(o.ativa, false);
  assert.strictEqual(o.leads, 3);
  assert.strictEqual(centavos(o.cpl), 2768, 'Gerenciador: R$ 27,68 por conversa');
});

test('Adriano bate com o Gerenciador', () => {
  const a = cartao(monta(linhas, [], ctx()), 'adriano');
  assert.strictEqual(a.leads, 11);
  assert.strictEqual(centavos(a.cpl), 2916);
});

// O placar é sobre dinheiro investido: a campanha pausada no meio da janela
// também gastou, e não pode sumir do total só porque não é a principal.
test('o total da operação soma TODAS as campanhas, inclusive a pausada', () => {
  const d = monta(linhas, [], ctx());
  const spend = CAMP.reduce((s, c) => s + c[4], 0);
  const leads = CAMP.reduce((s, c) => s + c[5] + c[6], 0);
  assert.strictEqual(centavos(d.rede.spend), centavos(spend));
  assert.strictEqual(d.rede.leads, leads);
});

// Quem preenche o formulário pode abrir a conversa no WhatsApp em seguida. Se a
// campanha de formulário contasse as duas ações, essa pessoa valeria 2 leads.
test('campanha de formulário conta só formulário — sem contar duas vezes', () => {
  const comConversa = linhas.map(l => l.campaign_id === '120249354252090135'
    ? { ...l, actions: acoes(4, 11) } : l);
  const a = cartao(monta(comConversa, [], ctx()), 'adriano');
  assert.strictEqual(a.leads, 11, 'as 4 conversas que vieram do formulário não somam');
});

test('trocar de WhatsApp para formulário some com a comparação', () => {
  const antes = [{ campaign_id: '120249016313560135',
    campaign_name: '[ENGAJAMENTO] [Karoline Aguiar] Whats', spend: 300,
    actions: acoes(15, 0) }];
  const k = cartao(monta(linhas, antes, ctx()), 'karoline');
  assert.strictEqual(k.mudouObjetivo, true);
  assert.strictEqual(k.ant.objetivo, 'whats');
  // e a leitura explica, em vez de anunciar uma "alta" de 361%
  const d = monta(linhas, antes, ctx());
  assert.ok(d.leitura.some(l => /trocou a campanha de WhatsApp pela de formulário/.test(l)),
    'a leitura precisa dizer que a campanha trocou');
});

// Sem o status da conta (a chamada falhou, ou modo demo), o objetivo sai da
// convenção de nome e a principal cai na que mais investiu — menos preciso,
// mas nunca o número inventado de antes.
test('sem o status das campanhas, a convenção de nome segura o objetivo', () => {
  const k = cartao(monta(linhas, [], ctx({ campanhas: null })), 'karoline');
  assert.strictEqual(k.objetivo, 'form');
  assert.strictEqual(k.leads, 3);
  assert.strictEqual(k.outras[0].objetivo, 'whats');
});

// "Caiu 39%" contra uma base de 1 lead é ruído, não destaque. A regra do ruído
// olhava só o período atual — a Susi virou "destaque" com 7 leads contra 1.
test('destaque exige volume nos dois períodos', () => {
  const antes = [{ campaign_id: '120249354061010135', campaign_name: '[ENGAJAMENTO] [Susi] Whats',
                   spend: 77.28, actions: acoes(1, 0) }];
  const d = monta(linhas, antes, ctx());
  assert.ok(!d.leitura.some(l => /Susi é o destaque/.test(l)),
    'base de 1 lead não sustenta destaque');
});

// A média de conversão só compara quem tem o mesmo objetivo, e só com grupo de 3
// ou mais: com 2 campanhas de formulário, "acima da média" seria comparar com 1.
test('média de conversão não mistura WhatsApp com formulário', () => {
  const d = monta(linhas, [], ctx());
  for (const l of d.leitura.filter(x => /de cada 100 cliques em/.test(x)))
    assert.ok(/média das campanhas de (WhatsApp|formulário)/.test(l),
      'a comparação precisa dizer contra qual objetivo: ' + l);
  assert.ok(!d.leitura.some(l => /formulário preenchido, contra .* média das campanhas de formulário/.test(l)),
    'com 2 campanhas de formulário não existe média de formulário que preste');
});

// Campanha que nasceu no fim da janela anterior: comparar volume dá "▲600%",
// que é calendário, não desempenho. As setas do cartão seguem a regra do ruído.
test('setas do cartão exigem mesmo objetivo e volume no período anterior', () => {
  const antes = [
    { campaign_id: '120249354061010135', campaign_name: '[ENGAJAMENTO] [Susi] Whats',
      spend: 77.28, actions: acoes(1, 0) },              // 1 lead: ruído
    { campaign_id: '120247681064840135', campaign_name: '[ENGAJAMENTO] [Fittipaldi] Whats',
      spend: 382.89, actions: acoes(12, 0) },            // 12 leads: compara
    { campaign_id: '120249016313560135', campaign_name: '[ENGAJAMENTO] [Karoline Aguiar] Whats',
      spend: 306.65, actions: acoes(11, 0) }             // trocou de objetivo
  ];
  const d = monta(linhas, antes, ctx());
  assert.strictEqual(cartao(d, 'susi').comparavel, false, 'base de 1 lead');
  assert.strictEqual(cartao(d, 'fittipaldi').comparavel, true);
  assert.strictEqual(cartao(d, 'karoline').comparavel, false, 'WhatsApp → formulário');
});

// O caso exato de 11/11/2026: formulário com os leads em `lead` e
// `onsite_conversion.lead_grouped`. Tem que dar 11 — nem 0 (nome errado), nem 22
// (os dois nomes somados, quando são os MESMOS leads).
test('lead de formulário vem pelos nomes que a API realmente devolve', () => {
  const { leadsForm } = require('../lib/meta.js');
  assert.strictEqual(leadsForm([
    { action_type: 'onsite_conversion.lead_grouped', value: '11' },
    { action_type: 'lead', value: '11' },
    { action_type: 'link_click', value: '176' }]), 11);
  assert.strictEqual(leadsForm([{ action_type: 'lead', value: '3' }]), 3);
  assert.strictEqual(leadsForm([{ action_type: 'leadgen.other', value: '3' }]), 3);
  assert.strictEqual(leadsForm([{ action_type: 'link_click', value: '9' }]), 0);
  const a = cartao(monta(linhas, [], ctx()), 'adriano');
  assert.strictEqual(a.leads, 11, 'o cartão do Adriano não pode zerar');
});
