// Casamento campanha ↔ corretor. Roda com `npm test` (runner nativo do Node,
// sem dependência). O alvo é o ponto mais silencioso do painel: se uma campanha
// casar com o corretor errado, ninguém vê um erro — vê um número plausível.

const { test } = require('node:test');
const assert = require('node:assert');
const { corretorDaCampanha, ROSTER } = require('../lib/corretores.js');

const quem = (nome, id) => {
  const c = corretorDaCampanha(nome, id);
  return c && c.id;
};

test('cada campanha no ar casa com o seu corretor', () => {
  const esperado = {
    '[ENGAJAMENTO] [Fittipaldi] Whats': 'fittipaldi',
    '[ENGAJAMENTO] [Rafael Birk] Whats': 'birk',
    '[ENGAJAMENTO] [Adriano] Whats': 'adriano',
    '[ENGAJAMENTO] [Karoline Aguiar] Whats': 'karoline',
    '[ENGAJAMENTO] [Eduardo Serrano] Whats': 'eduardo',
    '[ENGAJAMENTO] [Bianca] Whats': 'bianca',
    '[ENGAJAMENTO] [Ursula] Whats': 'ursula',
    '[ENGAJAMENTO] [Susi] Whats': 'susi',
    // campanhas de Leads com formulário, de nov/2026: outro prefixo, mesmo dono
    '[Leads Forms Nativo] [Adriano] Whats': 'adriano',
    '[Leads Forms Nativo] [Karoline] Whats': 'karoline'
  };
  for (const [campanha, id] of Object.entries(esperado))
    assert.strictEqual(quem(campanha), id, `"${campanha}" deveria casar com ${id}`);
});

// Toda campanha que já existiu na conta e NÃO é de alguém do roster atual. É a
// trava mais importante do arquivo: uma chave nova curta demais (o caso que
// aconteceu com `[karoline]`) passa a casar com uma destas e o painel soma o
// período de outra pessoa ao cartão, sem erro nenhum. Quem entrar no roster
// daqui pra frente roda contra esta lista. A campanha de jun/2026 da Karoline
// não está aqui porque o nome dela não a separa das de hoje: ela é excluída
// pelo id, e tem teste próprio logo abaixo.
const FORA_DO_ROSTER = [
  '[ENGAJAMENTO] [Flavia/Ismael] Whats',   // saíram em out/2026
  '[ENGAJAMENTO] [Roselil] Whats',
  '[ENGAJAMENTO] [Jaqueline] Whats',
  '[ENGAJAMENTO] [Sandra] Whats',          // saiu em set/2026
  '[ENGAJAMENTO] [CAMILLE] Whats',         // saíram antes do painel existir
  '[ENGAJAMENTO] [RICARDO OSORIO] Whats',
  '[ENGAJAMENTO] [DANIELA ALBAN] Whats',
  '[TRÁFEGO] [PERFIL]'
];

test('nenhuma campanha fora do roster casa com alguém', () => {
  for (const nome of FORA_DO_ROSTER)
    assert.strictEqual(quem(nome), null,
      `"${nome}" não é de ninguém do roster, mas casou com ${quem(nome)}`);
});

// O Gerenciador já escreveu "[ Fittipaldi ]" e grafias com acento; o matcher
// normaliza os dois antes de comparar. É o que permite `[ursula]` casar com
// `[Úrsula]`, que é como a campanha dela deve subir.
test('tolera espaço dentro do colchete e acento', () => {
  assert.strictEqual(quem('[ENGAJAMENTO] [ Fittipaldi ] Whats'), 'fittipaldi');
  assert.strictEqual(quem('[ENGAJAMENTO] [Karoline Aguiár] Whats'), 'karoline');
  assert.strictEqual(quem('[ENGAJAMENTO] [Úrsula] Whats'), 'ursula');
});

// O Gerenciador escreveu "[Susi]". As quatro grafias ficam previstas porque o
// nome apareceu escrito de outras formas no projeto — e porque, em out/2026, o
// roster tinha só [suzy]/[suzi]/[susy] e a campanha dela ficou fora do painel.
test('todas as grafias previstas de Susi casam com ela', () => {
  for (const g of ['[Susi]', '[Suzi]', '[Suzy]', '[Susy]'])
    assert.strictEqual(quem(`[ENGAJAMENTO] ${g} Whats`), 'susi', `grafia ${g}`);
});

// A chave curta `[karoline]` virou necessária quando a campanha de formulário
// subiu como "[Leads Forms Nativo] [Karoline]". Com ela, só o id separa a
// campanha de hoje da passagem de jun–ago, que tem exatamente a mesma grafia.
test('a passagem antiga de Karoline é separada pelo id, não pelo nome', () => {
  const ANTIGA = '120246474830860135';
  assert.strictEqual(quem('[ENGAJAMENTO] [Karoline] Whats', ANTIGA), null,
    'a campanha de jun/2026 não pode entrar no cartão de hoje');
  assert.strictEqual(quem('[Leads Forms Nativo] [Karoline] Whats', '120249435838810135'), 'karoline');
  assert.strictEqual(quem('[ENGAJAMENTO] [Karoline Aguiar] Whats', '120249016313560135'), 'karoline');
});

// Todo id em `exceto` tem que ser de uma campanha que, SEM a exclusão, casaria
// com o corretor — senão é entrada morta que dá falsa sensação de proteção.
test('cada exclusão do roster realmente exclui alguma coisa', () => {
  for (const c of ROSTER)
    for (const id of (c.exceto || [])) {
      const semId = corretorDaCampanha('[ENGAJAMENTO] [Karoline] Whats');
      assert.ok(semId, `exclusão ${id} de ${c.nome} não protege nada`);
      assert.strictEqual(corretorDaCampanha('[ENGAJAMENTO] [Karoline] Whats', id), null);
    }
});

test('nenhuma chave do roster casa com a campanha de outro corretor', () => {
  for (const c of ROSTER)
    for (const chave of c.casa) {
      const dono = corretorDaCampanha(`[ENGAJAMENTO] ${chave} Whats`);
      assert.strictEqual(dono && dono.id, c.id,
        `a chave "${chave}" (de ${c.nome}) casou com ${dono && dono.nome}`);
    }
});

test('todo corretor do roster tem id, nome e ao menos uma chave', () => {
  const ids = new Set();
  for (const c of ROSTER) {
    assert.ok(c.id && c.nome, `entrada sem id ou nome: ${JSON.stringify(c)}`);
    assert.ok(Array.isArray(c.casa) && c.casa.length, `${c.nome} sem chave de campanha`);
    assert.ok(Array.isArray(c.fotos), `${c.nome}: fotos precisa ser lista`);
    assert.ok(!ids.has(c.id), `id repetido: ${c.id}`);
    ids.add(c.id);
  }
});

// Um nome de arquivo errado no roster só aparece como avatar quebrado no cartão
// do cliente — e a silhueta de reserva disfarça. Melhor falhar aqui.
test('toda foto declarada no roster existe nas duas pastas de assets', () => {
  const fs = require('node:fs'), path = require('node:path');
  const pastas = ['public/assets/corretores', '06-painel/assets/corretores']
    .map(d => path.join(__dirname, '..', d));
  for (const c of ROSTER)
    for (const f of c.fotos)
      for (const pasta of pastas)
        assert.ok(fs.existsSync(path.join(pasta, f)),
          `${c.nome}: ${f} não existe em ${path.basename(path.dirname(pasta))}/${path.basename(pasta)}`);
});

// Uma pausa longa zera as DUAS janelas que o painel consulta. Sem `jaRodou`, o
// cartão do veterano voltava a dizer "ainda sem campanha" — a mesma mentira que
// o status `parado` existe para evitar, só que 28 dias depois.
test('veterano com campanha pausada fica em "parado", não em "espera"', () => {
  const { monta, CONVERSA } = require('../lib/corretores.js');
  const linha = (nome, spend, leads) => ({
    campaign_id: 'x', campaign_name: nome, spend, impressions: 1000, reach: 800,
    frequency: 1.2, ctr: 2, cpm: 30, clicks: 20,
    actions: leads > 0 ? [{ action_type: CONVERSA, value: String(leads) }] : [] });
  const ctx = { modo: 't', geradoEm: '2026-11-11',
    periodo: { id: '14d', desde: '2026-10-28', ate: '2026-11-10', dias: 14 },
    anterior: { desde: '2026-10-14', ate: '2026-10-27', dias: 14, modo: 'auto' },
    criativos: [], serieMensal: [] };
  const atual = [linha('[ENGAJAMENTO] [Fittipaldi] Whats', 400, 20)];
  const statusDe = (id, ant) => monta(atual, ant, ctx).corretores.find(c => c.id === id).status;

  assert.strictEqual(statusDe('birk', [linha('[ENGAJAMENTO] [Rafael Birk] Whats', 560, 24)]),
    'parado', 'pausa curta');
  assert.strictEqual(statusDe('birk', []), 'parado',
    'pausa longa: as duas janelas zeradas não podem transformar veterano em novato');
});

// O outro lado da mesma moeda: quem entra no roster antes de ter campanha
// precisa continuar caindo em "espera", senão a marca vira carimbo automático.
test('quem nunca teve campanha fica em "espera"', () => {
  const { corretorDaCampanha, ROSTER } = require('../lib/corretores.js');
  const novato = { id: 'novato', nome: 'Novato', casa: ['[novato]'], fotos: [],
                   praca: '', pracas: '' };
  assert.ok(!novato.jaRodou, 'entrada nova não nasce com jaRodou');
  assert.ok(ROSTER.every(c => c.jaRodou),
    'todos do roster atual já rodaram — se alguém entrar sem campanha, esta linha muda');
  assert.strictEqual(corretorDaCampanha('[ENGAJAMENTO] [Novato] Whats'), null);
});
