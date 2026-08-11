const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.static('public'));

// Proxy all requests to the target
app.use('/proxy', (req, res, next) => {
  // Extract the real URL from query parameter
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing ?url= parameter');

  // Create a proxy middleware dynamically
  const proxy = createProxyMiddleware({
    target: target,
    changeOrigin: true,
    pathRewrite: (path, req) => {
      // Remove the /proxy prefix and the query string
      return req.originalUrl.replace(/^\/proxy\?url=[^&]*&?/, '');
    },
    onProxyReq: (proxyReq, req, res) => {
      // Forward important headers
      if (req.headers['cookie']) {
        proxyReq.setHeader('Cookie', req.headers['cookie']);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Rewrite HTML content to replace original domain with our proxy
      let body = [];
      proxyRes.on('data', chunk => body.push(chunk));
      proxyRes.on('end', () => {
        let content = Buffer.concat(body).toString('utf8');
        // Replace absolute URLs with proxy URLs
        const targetBase = new URL(req.query.url).origin;
        content = content.replace(new RegExp(targetBase, 'g'), '');
        // Rewrite relative URLs to absolute
        // (simplified – for production use a full HTML rewriter)
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
