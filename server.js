const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static('public'));

// Proxy endpoint
app.use('/proxy', (req, res, next) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url=');

  const proxy = createProxyMiddleware({
    target: target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      return req.originalUrl.replace(/^\/proxy\?url=[^&]*&?/, '');
    },
    onProxyReq: (proxyReq, req, res) => {
      if (req.headers['cookie']) {
        proxyReq.setHeader('Cookie', req.headers['cookie']);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Rewrite HTML to replace absolute links with proxy
      let body = [];
      proxyRes.on('data', chunk => body.push(chunk));
      proxyRes.on('end', () => {
        let content = Buffer.concat(body).toString('utf8');
        const targetBase = new URL(req.query.url).origin;
        content = content.replace(new RegExp(targetBase, 'g'), '');
        res.send(content);
      });
    },
    selfHandleResponse: true,
  });

  proxy(req, res, next);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Proxy running on port ${PORT}`);
});
