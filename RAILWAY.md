# Railway 部署说明（本 fork 专用）

本仓库是 [escapeWu/perplexity-ai](https://github.com/escapeWu/perplexity-ai) 的 fork，仅额外包含：

- railway.toml：指定用仓库自带的 Dockerfile 构建、以 /ready 作为健康检查、失败自动重启。

上游代码未做任何修改，升级时直接同步上游 main 即可。

## 部署后必做

1. 挂载持久卷：把卷挂到 /app/data。账号配置、日志、模型缓存、会话数据库都写在这里，不挂卷每次重启都会丢。

2. 设置三个变量：

| 变量 | 说明 |
| --- | --- |
| MCP_TOKEN | 调用 /v1/* 与 MCP 接口的密钥，随机生成即可 |
| PPLX_ADMIN_TOKEN | 管理号池的密钥，不设置则 WebUI 管理功能禁用 |
| PPLX_TOKEN_POOL_CONFIG | 固定为 /app/data/config/token_pool_config.json（镜像内已默认） |

3. 绑定 Perplexity 账号（二选一）：

- 推荐：浏览器打开 https://你的域名/admin/ ，填入 PPLX_ADMIN_TOKEN，在号池管理里添加账号 cookie。支持一次添加多个账号做轮询。
- 或者设置环境变量 PPLX_SESSION_TOKEN 与 PPLX_NEXT_AUTH_CSRF_TOKEN（仅当浏览器里仍是旧版 `__Secure-next-auth.session-token` cookie 时可用）。

cookie 取法：登录 perplexity.ai -> F12 -> Application -> Cookies，当前站点用
`__Secure-pplx.session.<account-uuid>` 与 `__Host-pplx-last-active-account`，
旧版用 `__Secure-next-auth.session-token` 与 `next-auth.csrf-token`。

## 验证

```bash
D=https://你的域名
curl -s $D/health                     # {"status":"healthy",...}
curl -s -H "Authorization: Bearer $MCP_TOKEN" $D/v1/models
curl -s -X POST $D/v1/chat/completions \
  -H "Authorization: Bearer $MCP_TOKEN" -H 'Content-Type: application/json' \
  -d '{"model":"perplexity-search","messages":[{"role":"user","content":"hi"}]}'
```

未绑定账号时服务以匿名模式运行，只会暴露 perplexity-search 一个降级模型；
绑定 Pro 账号后 /v1/models 会返回订阅可用的完整模型列表。

## 注意事项

- cookie 等同账号登录态，泄露即账号被接管：不要把 cookie 提交到仓库或填进第三方在线服务。
- 此方式属于非官方的网页接口逆向，违反 Perplexity 使用条款，存在限流或封号风险；官方接口变动时项目可能失效。
- 上游 escapeWu/perplexity-ai 更新较频繁，建议定期同步。
