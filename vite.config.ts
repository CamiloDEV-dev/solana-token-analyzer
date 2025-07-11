import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { parse } from 'url'

// We change the export to be a function that receives the mode (e.g., 'development')
export default defineConfig(({ mode }) => {
  // This is the Vite-native way to load environment variables for the server
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // We now define server properties here
    server: {
      // This is needed for the server to start correctly
      host: 'localhost',
      port: 5173,
    },
    plugins: [
      react(),
      {
        name: 'vite-plugin-vercel-api-handler',
        configureServer(server) {
          // This middleware runs for every request
          server.middlewares.use(async (req, res, next) => {
            // Load environment variables and merge them into process.env
            // This makes process.env.VITE_SOLSCAN_PRO_API_KEY available in our API files
            Object.assign(process.env, env);

            const parsedUrl = parse(req.url || '', true);
            const { pathname } = parsedUrl;

            if (pathname && pathname.startsWith('/api/')) {
              const apiFilePath = path.join(__dirname, pathname + '.js');
              
              try {
                const { default: handler } = await import(apiFilePath + `?t=${Date.now()}`);
                Object.assign(req, { query: parsedUrl.query });
                await handler(req, res);
              } catch (error) {
                if (error.code === 'ERR_MODULE_NOT_FOUND') {
                  res.statusCode = 404;
                  res.end(`API route not found: ${pathname}`);
                } else {
                  console.error('Error in API handler:', error);
                  res.statusCode = 500;
                  res.end('Internal Server Error');
                }
              }
              return;
            }
            next();
          });
        }
      }
    ],
  }
})
