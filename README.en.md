# Perplexity MCP Server (Railway Edition)

[中文](README.md) ｜ **English**

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/perplexity-ai)

Self-host an OpenAI-compatible API plus an MCP server on top of your own Perplexity
subscription, with a built-in token-pool dashboard.

> This is a fork of [escapeWu/perplexity-ai](https://github.com/escapeWu/perplexity-ai)
> adapted for Railway, with a few compatibility fixes. Upstream logic is untouched apart
> from the patches listed below.

---

## What it does

It performs no inference itself. It reuses your logged-in Perplexity web session
(session cookies) and translates Perplexity's internal search/RPC endpoints into
standard protocols:

| Capability | Details |
| --- | --- |
| OpenAI-compatible API | `/v1/models`, `/v1/chat/completions` (streaming, thinking models, files) |
| MCP server | `/mcp`, consumable by Claude Code, Codex and other MCP clients |
| Account pool | Multiple Perplexity accounts with weighted rotation, backoff and automatic cookie renewal |
| Admin dashboard | `/admin/` to add/remove accounts, inspect weights and request counts, read logs |
| Playground | `/playground/` to try models in the browser, with sources and thinking output |

👉 **It consumes your subscription's web quota** (Pro Searches, Deep Research), not
official API credits. Proxying does not add quota — it only changes the entry point.

---

## Differences from upstream

| Change | Notes |
| --- | --- |
| `railway.toml` | Builds with the repo Dockerfile, health-checks `/ready`, restarts on failure |
| Bilingual admin UI | `EN / 中文` switch in the dashboard header, stored in localStorage, defaults to the browser language |
| `reasoning_effort` support | Codex/opencodex requests no longer fail with HTTP 400; the value is mapped to `thinking` |
| Bilingual docs | This file is the English README; the Chinese one is the repository default ([README.md](README.md)) |

---

## Deploy to Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/perplexity-ai)

Template page: <https://railway.com/template/perplexity-ai>

Railway will ask for two variables. **Any random string works** (`openssl rand -hex 32`):

| Variable | Purpose |
| --- | --- |
| `MCP_TOKEN` | Key for `/v1/*` and MCP calls; clients send it as `Authorization: Bearer` |
| `PPLX_ADMIN_TOKEN` | Key for the `/admin/` dashboard and pool management (do not reuse the one above) |

The template creates a persistent volume mounted at `/app/data` (account config, logs,
model cache and the session database all live there — skip the volume and everything is
lost on restart).

### Three steps after deploying

**1. Generate a public domain**

Service → Settings → Networking → Generate Domain, target port `8000`.

> The port is **8000**, not 8080. Railway only exposes 443/80 publicly, so appending
> `:8080` to the URL will never connect.

**2. Verify the service**

```bash
D=https://your-domain
curl -s $D/health                 # {"status":"healthy",...}
curl -s $D/ready                  # {"status":"ready"}
curl -s -H "Authorization: Bearer $MCP_TOKEN" $D/v1/models
```

Before an account is bound you will only see a single downgraded `perplexity-search`
model. That is expected.

**3. Bind your Perplexity account**

Open `https://your-domain/admin/`, sign in with `PPLX_ADMIN_TOKEN` and click **NEW TOKEN**:

- **Identifier**: any recognisable label, e.g. your email
- **Cookies**: log in to perplexity.ai, press F12 → Network → reload → pick any request to
  `www.perplexity.ai` → Request Headers → copy everything after `cookie:`

The dashboard picks out the two cookies that actually matter
(`__Secure-pplx.session.<uuid>` and `__Host-pplx-last-active-account`) and discards
transient fingerprint cookies such as `cf_clearance` and `__cf_bm`.

> Alternatively you can set `PPLX_SESSION_TOKEN` + `PPLX_NEXT_AUTH_CSRF_TOKEN`, but that
> only works while your browser still holds the legacy `__Secure-next-auth.session-token`.

After binding:

```bash
curl -s -H "Authorization: Bearer $MCP_TOKEN" $D/v1/models | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']),'models')"
```

The count jumps from 1 to every model your subscription can reach.

### Manual deployment (without the template)

```bash
git clone https://github.com/wsbjj/perplexity-ai-railway.git
cd perplexity-ai-railway
railway init --name perplexity-ai
railway add -s perplexity-mcp -r wsbjj/perplexity-ai-railway --branch main
railway volume add -m /app/data
printf '%s' "$(openssl rand -hex 32)" | railway variable set MCP_TOKEN --stdin --service perplexity-mcp
printf '%s' "$(openssl rand -hex 32)" | railway variable set PPLX_ADMIN_TOKEN --stdin --service perplexity-mcp
railway domain -s perplexity-mcp -p 8000
```

---

## Usage

### 1. OpenAI-compatible API

```
Base URL:  https://your-domain/v1
API Key:   the value of MCP_TOKEN
```

```bash
curl -s -X POST https://your-domain/v1/chat/completions \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "perplexity-search",
    "messages": [{"role": "user", "content": "What is new in tech today?"}],
    "stream": true
  }'
```

Point any OpenAI-compatible client (Cherry Studio, LobeChat, NextChat, opencodex, …) at
the base URL with that key.

### 2. MCP

```json
{
  "mcpServers": {
    "perplexity": {
      "type": "http",
      "url": "https://your-domain/mcp",
      "headers": { "Authorization": "Bearer YOUR_MCP_TOKEN" }
    }
  }
}
```

| Tool | Use case |
| --- | --- |
| `perplexity_ask_v2` | Live search; accepts a model id, `thinking`, files and `session_id` |
| `perplexity_research_v2` | Deep Research; accepts files and `session_id` |
| `perplexity_task_submit` / `perplexity_task_status` / `perplexity_task_cancel` | Detached long-running jobs |

Omit `session_id` to start a session; the id is returned at the top level of the result
and can be passed back to continue the thread.

### 3. Codex / opencodex

```bash
ocx provider add perplexity \
  --adapter openai-chat \
  --base-url https://your-domain/v1 \
  --api-key YOUR_MCP_TOKEN \
  --default-model perplexity-search
ocx models provider perplexity on
ocx sync
```

Codex CLI can also point straight at the proxy (use `--local-provider lmstudio` to bypass
client-side model-name validation):

```bash
export OPENAI_API_BASE=https://your-domain/v1
export OPENAI_API_KEY=YOUR_MCP_TOKEN
codex -m sonar --local-provider lmstudio
```

### 4. Models

The catalogue is refreshed daily from the upstream catalog, and what you can actually use
depends on your subscription tier (Pro accounts only see Pro models; Max-only models are
routed exclusively to Max accounts). Typical entries:

```
perplexity-search / perplexity-thinking / perplexity-deepsearch
gpt-6-sol(+thinking)          claude-sonnet-5(+thinking)
gemini-3-8-flash(+thinking)   grok-4-7(+thinking)
kimi-k3-thinking              glm-5-3-thinking
nemotron-3-ultra-thinking
```

Pass `thinking: true` or `reasoning_effort: high` to select the paired thinking model;
`reasoning_effort: none` keeps the regular one.

---

## Environment variables

| Variable | Default | Description |
| --- | --- | --- |
| `MCP_TOKEN` | none (required) | API authentication key |
| `PPLX_ADMIN_TOKEN` | empty | Dashboard key; admin features stay disabled without it |
| `PPLX_TOKEN_POOL_CONFIG` | `/app/data/config/token_pool_config.json` | Account pool config path (already the image default) |
| `PPLX_LEGACY_TOKEN_POOL_CONFIG` | `/app/legacy-token-pool.json` | Legacy config imported on first start |
| `PPLX_SESSION_DB` | `/app/data/webui_sessions.sqlite3` | Session database shared by WebUI / OAI / MCP |
| `LOG_LEVEL` | `INFO` | Log level |
| `LOG_FILE` | `/app/data/logs/perplexity.log` | Log file |
| `PPLX_MODELS_CONFIG_URL` | upstream catalog | Model catalogue source |
| `SOCKS_PROXY` | empty | Outbound proxy, e.g. `socks5://127.0.0.1:1080` |
| `PPLX_SESSION_TOKEN` + `PPLX_NEXT_AUTH_CSRF_TOKEN` | empty | Single-account mode (legacy cookies only) |

---

## FAQ

**Only one model in `/v1/models`?**
No account is bound yet and the service runs in anonymous downgrade mode. Follow the
binding steps above.

**Root path returns 404?**
Expected — there is no landing page. Use `/admin/` (pool dashboard) or `/playground/`.

**Client returns 400 `reasoning_effort is unsupported`?**
Fixed in this fork; the field is now mapped to `thinking`. If you deployed upstream
directly, update to this repository.

**Can it drive Codex / Claude Code as an agent?**
No. These models sit behind Perplexity's search interface and **do not support function
calling**; tool definitions sent by clients are ignored. Great for Q&A, retrieval and
research — not for editing files or running commands.

**Do cookies expire?**
The service heartbeats every 6 hours, renews when needed and writes the rotated cookie
back to the config file. If an account turns red in the dashboard, paste a fresh cookie.
You can also set `heart_beat.tg_bot_token` / `tg_chat_id` for Telegram alerts.

**Keeping up with upstream**
```bash
git remote add upstream https://github.com/escapeWu/perplexity-ai.git
git fetch upstream && git merge upstream/main
```
Conflicts may appear in the README and dashboard strings; keep this fork's versions.

---

## Disclaimer

- This project reverse-engineers Perplexity's web endpoints and **violates its Terms of
  Service**; rate limiting or account suspension is a real risk.
- Session cookies are equivalent to your login. Never commit them, never paste them into
  third-party online services — and note the config file on the Railway volume is stored
  in plain text.
- Upstream interfaces can change at any time and break the project; Railway may also take
  related services down under its own policies.
- For personal study and research only. Use at your own risk.

---

## Credits

- Upstream: [escapeWu/perplexity-ai](https://github.com/escapeWu/perplexity-ai)
- Original: [helallao/perplexity-ai](https://github.com/helallao/perplexity-ai)
- Community: [LINUX DO](https://linux.do)
