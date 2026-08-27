// Porta de entrada do painel.
// Defina CODIGO_ACESSO na Vercel (ex.: "bridge2026") e compartilhe só com quem
// deve ver o painel. O navegador envia o código no cabeçalho "x-codigo".
// Sem a variável definida, o acesso fica aberto (útil em desenvolvimento).

function autorizado(req) {
  const esperado = process.env.CODIGO_ACESSO;
  if (!esperado) return true;
  if ((req.headers['x-codigo'] || '') === esperado) return true;
  // Imagens (<img>) não enviam cabeçalho próprio: aceitam o código na query (?c=).
  try {
    return new URL(req.url, 'http://x').searchParams.get('c') === esperado;
  } catch { return false; }
}

function negar(res) {
  res.statusCode = 401;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ erro: 'codigo_necessario' }));
}

module.exports = { autorizado, negar };
