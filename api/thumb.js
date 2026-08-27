// GET /api/thumb?ad=<id do anúncio>
// O servidor busca a imagem do criativo no CDN do Meta e repassa ao navegador.
// Assim a miniatura aparece DENTRO do painel, sem o corretor precisar de
// acesso ao Ads Manager. Só no modo ao vivo.

const meta = require('../lib/meta.js');
const { autorizado, negar } = require('../lib/acesso.js');

module.exports = async (req, res) => {
  if (!autorizado(req)) return negar(res);
  const ad = new URL(req.url, 'http://x').searchParams.get('ad') || '';
  if (!/^\d+$/.test(ad) || !meta.aoVivo()) { res.statusCode = 404; return res.end(); }
  try {
    const img = await meta.thumbCriativo(ad);
    if (!img) { res.statusCode = 404; return res.end(); }
    res.setHeader('content-type', img.tipo);
    res.setHeader('cache-control', 'public, max-age=86400');
    res.end(img.corpo);
  } catch { res.statusCode = 404; res.end(); }
};
