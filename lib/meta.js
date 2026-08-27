// Cliente da Graph API do Meta (modo AO VIVO).
// Só entra em ação quando a variável de ambiente META_TOKEN existe.
// Sem ela, a API responde com o snapshot de lib/mock.js (modo demonstração).
//
// IMPORTANTE: este módulo roda APENAS no servidor (função da Vercel).
// O token nunca chega ao navegador de quem abre o painel.

const GRAPH = 'https://graph.facebook.com/v21.0';
const CONTA = process.env.META_CONTA || '1718135052525631';

// Aqui não existe mapa fixo de campanhas: o vínculo campanha ↔ corretor é um
// mapa explícito em lib/corretores.js, casado contra o NOME da campanha
// (fonte de verdade: 06-painel/contrato-payload.md).

// Ação que conta como "lead" nestas campanhas de mensagem: a pessoa
// abriu conversa no WhatsApp do corretor.
const ACAO_CONVERSA = 'onsite_conversion.messaging_conversation_started_7d';

async function graph(caminho, params) {
  const url = new URL(`${GRAPH}/${caminho}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('access_token', process.env.META_TOKEN);
  const r = await fetch(url);
  const j = await r.json();
  if (j.error) throw new Error(`Meta API: ${j.error.message} (código ${j.error.code})`);
  return j;
}

const somaAcao = (actions, tipo) =>
  Number((actions || []).find(a => a.action_type === tipo)?.value || 0);

// Miniatura do criativo de um anúncio (o servidor busca a imagem no CDN do
// Meta e repassa — o navegador do corretor nunca precisa de credencial).
async function thumbCriativo(adId) {
  const c = await graph(adId, { fields: 'creative{thumbnail_url}' });
  const url = c.creative && c.creative.thumbnail_url;
  if (!url) return null;
  // pede a versão maior no lugar da miniatura 64x64
  const grande = url.replace(/p64x64/g, 'p600x600');
  let r = await fetch(grande);
  if (!r.ok) r = await fetch(url);
  if (!r.ok) return null;
  return {
    tipo: r.headers.get('content-type') || 'image/jpeg',
    corpo: Buffer.from(await r.arrayBuffer())
  };
}

// Link de prévia oficial do anúncio (feed do celular). O Meta devolve um
// iframe assinado; extraímos o src e mandamos o navegador direto para ele.
async function urlPreview(adId) {
  const j = await graph(`${adId}/previews`, { ad_format: 'MOBILE_FEED_STANDARD' });
  const corpo = (j.data && j.data[0] && j.data[0].body) || '';
  const m = corpo.match(/src="([^"]+)"/);
  return m ? m[1].replace(/&amp;/g, '&') : null;
}

module.exports = { ACAO_CONVERSA, CONTA, thumbCriativo, urlPreview, graph, somaAcao,
  aoVivo: () => !!process.env.META_TOKEN };
