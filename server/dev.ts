import 'dotenv/config';
import { createServer } from 'node:http';
import { POST as storyPost } from '../api/story';
import { POST as illustrationPost } from '../api/illustration';
import { POST as ttsPost } from '../api/tts';

const port = Number(process.env.API_PORT || 3001);
const postHandlers: Record<string, (request: Request) => Promise<Response>> = {
  '/api/story': storyPost,
  '/api/illustration': illustrationPost,
  '/api/tts': ttsPost,
};

const server = createServer(async (request, response) => {
  // Handle POST requests
  const handler = request.method === 'POST' && request.url ? postHandlers[request.url] : undefined;
  if (!handler) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));

  try {
    const webRequest = new Request(`http://localhost:${port}${request.url}`, {
      method: 'POST',
      headers: { 'content-type': request.headers['content-type'] || 'application/json' },
      body: Buffer.concat(chunks),
    });
    const result = await handler(webRequest);
    response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
    response.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    console.error('[dev-api] request failure', error instanceof Error ? error.message : String(error));
    response.writeHead(500, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(port, () => {
  console.log(`[dev-api] listening on http://localhost:${port}/api/story`);
});