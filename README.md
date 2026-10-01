# Qissa

## Running with AI

Qissa calls AI providers from the server to generate stories, so API keys must never use a `VITE_` prefix or be placed in frontend code.

1. Copy `.env.example` to `.env` and set either `GROQ_API_KEY`, `GEMINI_API_KEY`, or both.
2. Install dependencies with `npm install`.
3. Start the frontend and local API together with `npm run dev:full`.
4. Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

The `api/story.ts` handler tries providers in the order specified by `AI_PROVIDER_ORDER` (default: Groq first, then Gemini). If all providers fail, the browser uses the built-in template story. **For a Vercel deployment, use `vercel dev` locally and configure the same environment variables in Vercel; Vercel automatically serves `api/story.ts` as a serverless function.** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Vercel setup.

The API currently uses in-memory rate limiting and caching. For production across multiple serverless instances, replace these maps with a shared Upstash Redis or other Redis-compatible store.

The API currently uses in-memory rate limiting and caching. For production across multiple serverless instances, replace these maps with a shared Upstash Redis or other Redis-compatible store.

AI scene images are optional. Set `GEMINI_IMAGE_MODEL` to an image-capable Gemini/Imagen model to enable the optional image step; image requests use only the scene key and illustration type, are cached locally and in memory, and fall back to Qissa's built-in SVG scenes when unavailable.

### API Restart Requirement

**Important**: After modifying `api/story.ts`, `server/dev.ts`, or environment variables, you must restart the API server:

- If running with `npm run dev:full`, stop and restart the terminal command.
- Alternatively, for faster development, use `tsx watch server/dev.ts` which auto-restarts on file changes.
- The browser will reconnect automatically once the server is back online.

### Story Lengths

Qissa supports three story lengths selected by the user during story creation:

- **Short (📖)**: 6 pages with 1 branching point, 3 quiz questions
- **Medium (📚)**: 12 pages with 1 branching point, 4 quiz questions
- **Long (📕)**: 20 pages with 2 branching points, 5 quiz questions

The API validates that the AI-generated story matches the requested length and page count. If the generated story has the wrong number of pages, the API automatically retries with a corrected prompt. All story metadata (page count, quiz count) is logged to help debug generation issues.

### Using Groq

Groq is the default primary provider and is fast and cost-effective for story generation. To use Groq:

1. Get a free API key from [console.groq.com](https://console.groq.com).
2. Set `GROQ_API_KEY` in `.env`.
3. Optionally, customize `GROQ_MODEL` (default: `llama-3.3-70b-versatile`) or `GROQ_FALLBACK_MODELS` (default: `openai/gpt-oss-120b,llama-3.1-8b-instant`).
4. Run `npm run check:ai` to test all configured models.

**Test Groq from PowerShell:**

```powershell
$groqKey = $env:GROQ_API_KEY
$model = 'llama-3.3-70b-versatile'
$body = @{
    model = $model
    messages = @(
        @{ role = 'system'; content = 'You are a helpful assistant.' }
        @{ role = 'user'; content = 'Return valid JSON: {"test": true}' }
    )
    temperature = 0.8
    max_tokens = 256
    response_format = @{ type = 'json_object' }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod `
  -Uri 'https://api.groq.com/openai/v1/chat/completions' `
  -Method Post `
  -Headers @{
    'Content-Type' = 'application/json'
    'Authorization' = "Bearer $groqKey"
  } `
  -Body $body
```

**Troubleshooting Groq:**

- Model not found (404): Check available models at [console.groq.com/docs/models](https://console.groq.com/docs/models).
- Rate limited (429): Qissa respects the `Retry-After` header and retries automatically.
- Invalid API key: Verify your API key in `.env` and ensure it's not in quotes.
- Response format error: Some older Groq models don't support `response_format`; try a newer model.

### Gemini Configuration

Gemini is available as a fallback provider. To use Gemini:

1. Get an API key from [ai.google.dev](https://ai.google.dev).
2. Set `GEMINI_API_KEY` in `.env`.
3. Optionally, customize `GEMINI_MODEL`, `GEMINI_FALLBACK_MODELS`, or `GEMINI_THINKING_LEVEL`.

**Troubleshooting Gemini:**

- `503`: Gemini is overloaded or temporarily unavailable. Qissa retries each configured model with backoff, then tries the next model.
- `429`: Gemini rate limiting is retried automatically, honoring `Retry-After` when provided.
- Timeouts: increase `GEMINI_TIMEOUT_MS` only when needed; `GENERATION_TOTAL_TIMEOUT_MS` still prevents an indefinitely hanging request.

### Testing the Story API

**Test the local API from PowerShell:**

```powershell
$body = @{ settingId = 'swat'; lessonId = 'courage'; language = 'urdu'; gender = 'girl' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3001/api/story' -Method Post -ContentType 'application/json' -Body $body
```

**Test the local API directly:**

```powershell
curl.exe -X POST http://localhost:3001/api/story -H "Content-Type: application/json" -d '{"settingId":"swat","lessonId":"courage","parentPurpose":"darkness","language":"urdu","gender":"girl"}'
```

**Diagnose all configured AI providers:**

```powershell
npm run check:ai
```

## Read Aloud (Text-to-Speech)

Qissa includes a robust "read aloud" feature powered by the browser's native Web Speech API, with an optional server-side voice via Gemini API.

### Browser TTS (Default)

The app uses the browser's SpeechSynthesis API to read stories aloud without sending any data to a server. Features include:

- **Language support**: English, Urdu, and Pashto voices (device-dependent).
- **Controls**: Play, Pause, Resume, Stop buttons with child-friendly styling.
- **Speed control**: Three preset speeds (0.7x, 0.85x, 1.0x) for better comprehension.
- **Voice picker**: Select from available voices on the device.
- **Auto-read toggle**: Automatically read each page when enabled (respects `prefers-reduced-motion`).
- **Sentence highlighting**: The current sentence being read is highlighted for visual learners.
- **Accessibility**: Keyboard-operable, ARIA-labeled, and respects system motion preferences.
- **RTL support**: Full right-to-left layout for Urdu and Pashto.

### Server Voice (Optional, Off by Default)

The optional Gemini API TTS is available as a parent-mode toggle. When enabled:

- A privacy notice clearly states: _"The story text, including your child's name, is sent to a voice service to create audio."_
- Qissa caches audio by content hash to minimize API calls.
- Rate limiting (default: 30 requests per minute per IP) prevents abuse.
- If the request fails, the app falls back silently to browser TTS with a small status badge.
- The child's name is **never sent** to the server unless the parent explicitly enables this option.

### Configuration

Add these environment variables to `.env` to customize TTS:

- `GEMINI_TTS_MODEL`: Gemini model ID for TTS (default: `gemini-2.0-flash-exp`). Do not use `gemini-2.5-*` models as they are being retired.
- `TTS_RATE_LIMIT_PER_MIN`: Max TTS requests per minute per IP (default: `30`).
- `TTS_TIMEOUT_MS`: Request timeout in milliseconds (default: `15000`).

### How to Use

1. **Browser TTS (no setup needed)**: Open a story and click the "Read to me" button.
2. **Server voice (opt-in)**:
   - Ensure `GEMINI_API_KEY` is set in `.env`.
   - In the app, click the "Use AI voice" toggle (parent mode only).
   - Read the privacy notice and confirm.
   - Stories will now use the Gemini API voice if available, or fall back to browser TTS.

### Troubleshooting

- **No voice available for this language**: Your device doesn't have the language voice installed. Try Microsoft Edge or install the language via system settings. Alternatively, enable the server voice option.
- **"Read to me" button is disabled**: Your browser doesn't support the Web Speech API (very rare). Try a modern browser like Chrome, Edge, or Firefox.
- **Server voice not working**: Verify `GEMINI_API_KEY` is set. Check the browser console and server logs for errors.
- **Audio is too fast/slow**: Use the speed selector to adjust the playback rate.
