// Servidor local de desenvolvimento: node dev.js
// Serve public/ e monta as funções de api/ nas mesmas rotas da Vercel.
// Na Vercel isso não é usado — lá, cada arquivo de api/ vira uma função
// serverless automaticamente e public/ é servido como estático.

const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = { '.html':'text/html; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.woff2':'font/woff2',
  '.js':'text/javascript', '.css':'text/css', '.json':'application/json; charset=utf-8' };

http.createServer(async (req, res) => {
  const rota = req.url.split('?')[0];

  // /api/<nome> -> api/<nome>.js, como a Vercel faz. Sem lista fixa:
  // arquivo novo em api/ já responde sem mexer aqui.
  const m = rota.match(/^\/api\/([\w-]+)$/);
  if (m) {
    const fn = path.join(__dirname, 'api', `${m[1]}.js`);
    if (!fs.existsSync(fn)) { res.statusCode = 404; return res.end('não encontrado'); }
    try { await require(fn)(req, res); } catch (e) {
      res.statusCode = 500; res.end(String(e)); }
    return;
  }

  const alvo = rota === '/' ? '/index.html' : rota;
  const arq = path.join(__dirname, 'public', path.normalize(alvo));
  if (arq.startsWith(path.join(__dirname, 'public')) && fs.existsSync(arq) && fs.statSync(arq).isFile()) {
    res.setHeader('content-type', MIME[path.extname(arq)] || 'application/octet-stream');
    fs.createReadStream(arq).pipe(res);
  } else { res.statusCode = 404; res.end('não encontrado'); }
}).listen(3000, () => console.log('Painel em http://localhost:3000'));
