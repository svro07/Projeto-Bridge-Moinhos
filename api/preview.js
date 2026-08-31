// GET /api/preview?ad=<id do anúncio>&c=<código>
// Redireciona para a prévia OFICIAL do anúncio no Meta (imagem ou vídeo,
// como aparece no feed), gerada na hora do clique. O link de prévia do Meta
// expira em poucas horas, então gerar fresco a cada clique é o que o mantém
// sempre funcionando. Sem modo ao vivo, cai no Gerenciador de Anúncios.

const meta = require('../lib/meta.js');
const { autorizado, negar } = require('../lib/acesso.js');
const CONTA = meta.CONTA;   // fonte única em lib/meta.js

module.exports = async (req, res) => {
  if (!autorizado(req)) return negar(res);
  const ad = new URL(req.url, 'http://x').searchParams.get('ad') || '';
  if (!/^\d+$/.test(ad)) { res.statusCode = 400; return res.end('anúncio inválido'); }

  const fallback =
    `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${CONTA}&selected_ad_ids=${ad}`;
  let destino = fallback;
  if (meta.aoVivo()) {
    try { destino = (await meta.urlPreview(ad)) || fallback; } catch { destino = fallback; }
  }
  res.statusCode = 302;
  res.setHeader('location', destino);
  res.setHeader('cache-control', 'no-store');
  res.end();
};
