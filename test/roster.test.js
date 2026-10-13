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
    '[ENGAJAMENTO] [Flavia/Ismael] Whats': 'flavia-ismael',
    '[ENGAJAMENTO] [Roselil] Whats': 'roseli',
    '[ENGAJAMENTO] [Jaqueline] Whats': 'jaqueline',
    '[ENGAJAMENTO] [Karoline Aguiar] Whats': 'karoline'
  };
  for (const [campanha, id] of Object.entries(esperado))
    assert.strictEqual(quem(campanha), id, `"${campanha}" deveria casar com ${id}`);
});

// O caso que motivou o teste: Karoline teve duas passagens pelo projeto, e a
// campanha da primeira continua pausada na conta. Ela só pode aparecer em `meses`.
test('a campanha da passagem antiga de Karoline NÃO casa com o cartão atual', () => {
  assert.strictEqual(quem('[ENGAJAMENTO] [Karoline] Whats'), null);
});

test('campanha fora do roster não casa com ninguém', () => {
  for (const nome of ['[ENGAJAMENTO] [CAMILLE] Whats',
                      '[ENGAJAMENTO] [RICARDO OSORIO] Whats',
                      '[ENGAJAMENTO] [DANIELA ALBAN] Whats',
                      '[ENGAJAMENTO] [Sandra] Whats',
                      '[TRÁFEGO] [PERFIL]'])
    assert.strictEqual(quem(nome), null, `"${nome}" não deveria casar`);
});

// O Gerenciador já escreveu "[ Fittipaldi ]" e grafias com acento; o matcher
// normaliza os dois antes de comparar.
test('tolera espaço dentro do colchete e acento', () => {
  assert.strictEqual(quem('[ENGAJAMENTO] [ Fittipaldi ] Whats'), 'fittipaldi');
  assert.strictEqual(quem('[ENGAJAMENTO] [Karoline Aguiár] Whats'), 'karoline');
});

test('nenhuma chave do roster casa com a campanha de outro corretor', () => {
  for (const c of ROSTER)
    for (const chave of c.casa) {
      const dono = corretorDaCampanha(`[ENGAJAMENTO] ${chave} Whats`);
      assert.strictEqual(dono && dono.id, c.id,
        `a chave "${chave}" (de ${c.nome}) casou com ${dono && dono.nome}`);
    }
});
