# Perplexity MCP Server（Railway 部署版）

**中文** ｜ [English](README.en.md)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/6Y_92D)

用你自己的 Perplexity 订阅额度，自建一套 OpenAI 兼容 API + MCP 服务，并附带一个号池管理面板。

> 本项目是 [escapeWu/perplexity-ai](https://github.com/escapeWu/perplexity-ai) 的 fork，
> 针对 Railway 部署做了适配与若干兼容性修复。上游代码逻辑未做删改，只在必要处打补丁。

---

## 这是什么

它不做模型推理，而是复用你浏览器里已登录的 Perplexity 会话（cookie 登录态），
把网页版内部的搜索/RPC 接口翻译成标准协议对外提供：

| 能力 | 说明 |
| --- | --- |
| OpenAI 兼容接口 | `/v1/models`、`/v1/chat/completions`（支持流式、思考模型、文件） |
| MCP 服务 | `/mcp`，供 Claude Code、Codex 等支持 MCP 的客户端直接调用 |
| 号池管理 | 支持多个 Perplexity 账号轮询、加权调度、失败退避、Cookie 自动续期 |
| 管理面板 | `/admin/` 可视化增删账号、查看权重与请求计数、翻阅日志 |
| 在线调试台 | `/playground/` 直接在浏览器里试模型、看搜索结果与思考过程 |

👉 **它消耗的是你订阅里的网页版额度**（Pro Search 次数、Deep Research 次数），
不是官方 API 额度；反代不会让额度变多，只是换了个入口。

---

## 与上游的差异

本 fork 只做了这些改动，其余与上游一致：

| 改动 | 说明 |
| --- | --- |
| `railway.toml` | 指定用仓库自带 Dockerfile 构建、以 `/ready` 作为健康检查、失败自动重启 |
| 管理面板中英文切换 | 面板右上角 `EN / 中文` 按钮，偏好记录在浏览器本地，默认跟随浏览器语言 |
| 兼容 `reasoning_effort` | Codex、opencodex 等客户端携带该字段时不再返回 400，而是按语义映射到 `thinking` |
| 中英文文档 | 本文件为中文版并作为仓库默认 README，英文版见 [README.en.md](README.en.md) |

---

## 一键部署到 Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/6Y_92D)

模版地址：<https://railway.com/template/6Y_92D>

部署时 Railway 会要求你填两个变量，**随机字符串即可**（可以用 `openssl rand -hex 32` 生成）：

| 变量 | 用途 |
| --- | --- |
| `MCP_TOKEN` | 调用 `/v1/*` 与 MCP 接口的密钥，客户端用它做 `Authorization: Bearer` |
| `PPLX_ADMIN_TOKEN` | 登录 `/admin/` 管理面板、管理号池的密钥（与上面那个不要混用） |

模版会自动创建持久卷并挂载到 `/app/data`（账号配置、日志、模型缓存、会话数据库都在这里，
不挂卷重启就丢）。

### 部署后三步

**1. 生成公网域名**

Railway 服务 → Settings → Networking → Generate Domain，端口填 `8000`。

> 注意端口是 **8000**，不是 8080；Railway 公网只暴露 443/80，直接在地址后加 `:8080` 是打不开的。

**2. 验证服务**

```bash
D=https://你的域名
curl -s $D/health                 # {"status":"healthy",...}
curl -s $D/ready                  # {"status":"ready"}
curl -s -H "Authorization: Bearer $MCP_TOKEN" $D/v1/models
```

未绑定账号时只会返回一个降级的 `perplexity-search`，这是正常的。

**3. 绑定 Perplexity 账号**

打开 `https://你的域名/admin/`，填入 `PPLX_ADMIN_TOKEN` 登录，点 **NEW TOKEN**：

- **标识**：随便填个好认的，比如你的邮箱
- **Cookies**：登录 perplexity.ai 后按 F12 → Network → 刷新 → 点任意一个发往
  `www.perplexity.ai` 的请求 → Request Headers → 复制 `cookie:` 后面那一整串

面板会自动从中挑出真正需要的两个 cookie（`__Secure-pplx.session.<uuid>` 与
`__Host-pplx-last-active-account`），并丢弃 `cf_clearance`、`__cf_bm` 之类的
临时指纹 cookie。

> 也可以退而求其次用环境变量 `PPLX_SESSION_TOKEN` + `PPLX_NEXT_AUTH_CSRF_TOKEN`，
> 但那只在浏览器仍保留旧版 `__Secure-next-auth.session-token` 时可用。

绑定成功后：

```bash
curl -s -H "Authorization: Bearer $MCP_TOKEN" $D/v1/models | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']),'models')"
```

模型数量会从 1 变成你订阅可用的全部模型（Pro 账号会多出十几个）。

### 不用模版，手动部署

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

## 使用

### 1. OpenAI 兼容接口

```
Base URL:  https://你的域名/v1
API Key:   MCP_TOKEN 的值
```

```bash
curl -s -X POST https://你的域名/v1/chat/completions \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "model": "perplexity-search",
    "messages": [{"role": "user", "content": "今天有什么科技新闻？"}],
    "stream": true
  }'
```

把 Base URL 和 Key 填进任何 OpenAI 兼容客户端（Cherry Studio、LobeChat、NextChat、
opencodex 等）即可使用。

### 2. MCP

```json
{
  "mcpServers": {
    "perplexity": {
      "type": "http",
      "url": "https://你的域名/mcp",
      "headers": { "Authorization": "Bearer 你的MCP_TOKEN" }
    }
  }
}
```

| 工具 | 适用场景 |
| --- | --- |
| `perplexity_ask_v2` | 实时搜索；支持指定模型、`thinking`、文件、`session_id` |
| `perplexity_research_v2` | Deep Research；支持文件和 `session_id` |
| `perplexity_task_submit` / `perplexity_task_status` / `perplexity_task_cancel` | 后台长任务：提交、查询、取消 |

不传 `session_id` 时每次调用会新建会话，并在返回结果顶层带回会话 ID，后续轮次带上它即可延续上下文。

### 3. 接入 Codex / opencodex

opencodex 可以直接把它当成自定义 provider：

```bash
ocx provider add perplexity \
  --adapter openai-chat \
  --base-url https://你的域名/v1 \
  --api-key 你的MCP_TOKEN \
  --default-model perplexity-search
ocx models provider perplexity on
ocx sync
```

Codex CLI 也可直接指向本地反代（记得用 `--local-provider lmstudio` 绕过客户端的模型名校验）：

```bash
export OPENAI_API_BASE=https://你的域名/v1
export OPENAI_API_KEY=你的MCP_TOKEN
codex -m sonar --local-provider lmstudio
```

### 4. 模型

模型清单由服务每天从上游 catalog 自动刷新，实际可用范围取决于你账号的订阅等级
（Pro 账号只会看到 Pro 模型，Max 专属模型只会路由到 Max 账号）。当前常见条目：

```
perplexity-search / perplexity-thinking / perplexity-deepsearch
gpt-6-sol(+thinking)          claude-sonnet-5(+thinking)
gemini-3-8-flash(+thinking)   grok-4-7(+thinking)
kimi-k3-thinking              glm-5-3-thinking
nemotron-3-ultra-thinking
```

传 `thinking: true` 或 `reasoning_effort: high` 会自动选择配对的思考模型；
`reasoning_effort: none` 则使用普通模型。

---

## 环境变量

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `MCP_TOKEN` | 无（必填） | 接口认证密钥 |
| `PPLX_ADMIN_TOKEN` | 空 | 管理面板密钥；不设置则管理功能关闭 |
| `PPLX_TOKEN_POOL_CONFIG` | `/app/data/config/token_pool_config.json` | 号池配置文件路径（镜像内已默认） |
| `PPLX_LEGACY_TOKEN_POOL_CONFIG` | `/app/legacy-token-pool.json` | 首次启动时导入的旧配置文件 |
| `PPLX_SESSION_DB` | `/app/data/webui_sessions.sqlite3` | WebUI / OAI / MCP 共用的会话数据库 |
| `LOG_LEVEL` | `INFO` | 日志级别 |
| `LOG_FILE` | `/app/data/logs/perplexity.log` | 日志文件 |
| `PPLX_MODELS_CONFIG_URL` | 上游 catalog 地址 | 模型清单来源 |
| `SOCKS_PROXY` | 空 | 出站代理，形如 `socks5://127.0.0.1:1080` |
| `PPLX_SESSION_TOKEN` + `PPLX_NEXT_AUTH_CSRF_TOKEN` | 空 | 单账号方式（仅旧版 cookie 可用） |

---

## 常见问题

**`/v1/models` 只有一个模型？**
说明还没绑定账号，服务运行在匿名降级模式。按上面「绑定 Perplexity 账号」操作即可。

**访问根路径 404？**
正常现象。应用没有首页，浏览器入口是 `/admin/`（号池面板）和 `/playground/`（调试台）。

**客户端报 400 `reasoning_effort is unsupported`？**
本 fork 已修复：现在会把该字段映射到 `thinking`。如果你自建的是上游版本，更新到本仓库即可。

**能当 Codex / Claude Code 的主力 agent 模型吗？**
不能。这些模型走的是 Perplexity 的搜索接口，**不支持 function calling / 工具调用**，
客户端发来的工具定义会被忽略。当问答、资料检索、调研用没问题，别指望它读写文件、跑命令。

**cookie 会过期吗？**
服务每 6 小时做一次心跳检查，必要时自动续期并把轮换后的新 cookie 写回配置文件。
如果面板上账号标红，重新粘贴一次 cookie 即可。也可以配 `heart_beat.tg_bot_token` / `tg_chat_id`
让它在失效时发 Telegram 提醒。

**怎么跟上上游更新？**
```bash
git remote add upstream https://github.com/escapeWu/perplexity-ai.git
git fetch upstream && git merge upstream/main
```
README 与面板文案等文件可能产生冲突，按需保留本 fork 的版本即可。

---

## 风险声明

- 本项目通过逆向网页版内部接口实现，**违反 Perplexity 使用条款**，存在被限流或封号的真实风险。
- cookie 等同于账号登录态，泄露即账号被接管。请只在自有服务器上部署，不要提交到仓库、
  不要粘贴给任何第三方在线服务；Railway 卷里的配置文件是明文存储的。
- 上游接口随时可能变动导致项目失效；Railway 也可能依据其政策下架相关服务。
- 仅供个人学习与研究使用，请自行承担后果。

---

## 致谢

- 上游项目：[escapeWu/perplexity-ai](https://github.com/escapeWu/perplexity-ai)
- 更上游：[helallao/perplexity-ai](https://github.com/helallao/perplexity-ai)
- 社区：[LINUX DO](https://linux.do)

## Star History

<a href="https://www.star-history.com/?type=date&repos=wsbjj%2Fperplexity-ai-railway">
  <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=wsbjj/perplexity-ai-railway&type=Date" />
</a>
