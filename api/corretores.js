// GET /api/corretores                        -> últimos 14 dias fechados (padrão)
// GET /api/corretores?p=fechada|14d|mes|mesf -> um dos períodos prontos
// GET /api/corretores?desde=&ate=            -> intervalo do calendário
// GET /api/corretores?...&cdesde=&cate=      -> comparação escolhida na mão
// GET /api/corretores?...&fresh=1            -> ignora o cache
// Cabeçalho x-codigo (ou ?c=)                -> gate de acesso
//
// Sem token do Meta na hospedagem, responde o snapshot de lib/mock.js — pelo
// MESMO monta() do modo ao vivo, com modo:"demo", qualquer que seja o período.

const corretores = require('../lib/corretores.js');
const meta = require('../lib/meta.js');
const mock = require('../lib/mock.js');
const { autorizado, negar } = require('../lib/acesso.js');

const CACHE_MIN = 15;
const cache = new Map();

const DATA = /^\d{4}-\d{2}-\d{2}$/;

module.exports = async (req, res) => {
  if (!autorizado(req)) return negar(res);
  res.setHeader('content-type', 'application/json; charset=utf-8');

  const q = new URL(req.url, 'http://x').searchParams;
  const hoje = corretores.hojeSP();
  const prontos = corretores.janelas(hoje).map(corretores.comTitulo);

  // qual intervalo o navegador pediu
  let periodo;
  const de = q.get('desde'), ate = q.get('ate');
  if (de || ate) {
    if (!DATA.test(de || '') || !DATA.test(ate || '') || de > ate) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ erro: 'datas_invalidas' }));
    }
    periodo = corretores.comTitulo({ id: 'custom', desde: de, ate,
                                     parcial: ate >= hoje });
  } else {
    periodo = prontos.find(p => p.id === (q.get('p') || '14d')) ||
              prontos.find(p => p.id === '14d');
  }

  // comparação: manual se vieram as duas datas, senão a régua automática de
  // "mesmo número de dias, imediatamente antes"
  const cd = q.get('cdesde'), ca = q.get('cate');
  let manual = null;
  if (cd || ca) {
    if (!DATA.test(cd || '') || !DATA.test(ca || '') || cd > ca) {
      res.statusCode = 400;
      return res.end(JSON.stringify({ erro: 'datas_comparacao_invalidas' }));
    }
    manual = { desde: cd, ate: ca };
  }
  const anterior = corretores.anteriorDe(periodo, manual);

  try {
    if (!meta.aoVivo()) {
      const pacote = mock.pacote();
      pacote.prontos = prontos.map(p => ({ id: p.id, botao: p.botao }));
      return res.end(JSON.stringify(pacote));
    }

    // id e modo entram na chave: "fechada" e um custom com as MESMAS datas devolvem
    // metadados diferentes (titulo/nota), e cache não pode misturar os dois
    const chave = `${periodo.id}|${periodo.desde}|${periodo.ate}|${anterior.modo}|${anterior.desde}|${anterior.ate}`;
    const quente = cache.get(chave);
    if (!q.get('fresh') && quente && Date.now() - quente.em < CACHE_MIN * 60_000)
      return res.end(JSON.stringify(quente.pacote));

    // quatro chamadas em paralelo: período, comparação, criativos e série
    // mensal. Criativos e série não derrubam o painel se falharem sozinhos.
    const [linhas, linhasAnt, criativos, serieMensal] = await Promise.all([
      corretores.insights(periodo.desde, periodo.ate),
      corretores.insights(anterior.desde, anterior.ate),
      corretores.insightsCriativos(periodo.desde, periodo.ate).catch(() => []),
      corretores.serieMensal(periodo.ate).catch(() => [])
    ]);

    const pacote = corretores.monta(linhas, linhasAnt, {
      modo: 'ao-vivo', geradoEm: hoje, periodo, anterior, criativos, serieMensal
    });
    pacote.prontos = prontos.map(p => ({ id: p.id, botao: p.botao }));

    cache.set(chave, { em: Date.now(), pacote });
    res.end(JSON.stringify(pacote));
  } catch (e) {
    // erro do Meta vira JSON com status e detalhe — padrão Elite
    res.statusCode = 502;
    res.end(JSON.stringify({ erro: 'meta_indisponivel', detalhe: String(e.message || e) }));
  }
};
