// Casamento campanha ↔ corretor. Roda com `npm test` (runner nativo do Node,
// sem dependência). O alvo é o ponto mais silencioso do painel: se uma campanha
// casar com o corretor errado, ninguém vê um erro — vê um número plausível.

const { test } = require('node:test');
const assert = require('node:assert');
const { corretorDaCampanha, ROSTER } = require('../lib/corretores.js');

const quem = nome => {
  const c = corretorDaCampanha(nome);
  return c && c.id;
};

test('cada campanha no ar casa com o seu corretor', () => {
  const esperado = {
    '[ENGAJAMENTO] [Fittipaldi] Whats': 'fittipaldi',
    '[ENGAJAMENTO] [Rafael Birk] Whats': 'birk',
    '[ENGAJAMENTO] [Adriano] Whats': 'adriano',
    '[ENGAJAMENTO] [Karoline Aguiar] Whats': 'karoline',
    '[ENGAJAMENTO] [Eduardo Serrano] Whats': 'eduardo'
  };
  for (const [campanha, id] of Object.entries(esperado))
    assert.strictEqual(quem(campanha), id, `"${campanha}" deveria casar com ${id}`);
});

// Toda campanha que já existiu na conta e NÃO é de alguém do roster atual. É a
// trava mais importante do arquivo: uma chave nova curta demais (o caso que
// aconteceu com `[karoline]`) passa a casar com uma destas e o painel soma o
// período de outra pessoa — ou de outra passagem — ao cartão, sem erro nenhum.
// Quem entrar no roster daqui pra frente roda contra esta lista.
const FORA_DO_ROSTER = [
  '[ENGAJAMENTO] [Karoline] Whats',        // passagem antiga da Karoline (jun–ago/2026)
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

// Quem entrou antes de a campanha subir: a chave tem que casar quando ela subir,
// em qualquer das grafias previstas.
test('as chaves de quem ainda não tem campanha casam quando ela subir', () => {
  assert.strictEqual(quem('[ENGAJAMENTO] [Bianca] Whats'), 'bianca');
  assert.strictEqual(quem('[ENGAJAMENTO] [Ursula] Whats'), 'ursula');
  for (const g of ['[Suzy]', '[Suzi]', '[Susy]'])
    assert.strictEqual(quem(`[ENGAJAMENTO] ${g} Whats`), 'suzy', `grafia ${g}`);
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
