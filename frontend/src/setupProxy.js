const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy everything except /api (which already goes to 8001) to the Vite server
  app.use(
    '/',
    createProxyMiddleware({
      target: 'http://localhost:8001',
      changeOrigin: true,
      ws: true,
    })
  );
};
