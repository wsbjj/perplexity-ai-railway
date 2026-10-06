"""超长上下文应截断降级，而不是直接返回 400。"""

import asyncio

from perplexity.server import chat_input
from perplexity.server.utils import sanitize_query


class FakePool:
    def get_model_subscription_tiers(self):
        return {"pro"}


def parse(messages):
    body = {"model": "perplexity-search", "messages": messages}
    return asyncio.run(chat_input.parse_chat_body(body, FakePool(), origin="oai"))


def test_long_context_is_truncated_not_rejected(monkeypatch):
    monkeypatch.setattr(chat_input, "MAX_QUERY_CHARS", 120)
    result = parse([
        {"role": "system", "content": "S" * 500},
        {"role": "user", "content": "最新问题：北京天气"},
    ])
    query = result["query"]
    assert query.startswith("[earlier context truncated]")
    assert query.endswith("最新问题：北京天气")
    assert len(query) <= 120
    # 截断结果必须能通过下游校验
    assert sanitize_query(query) == query.strip()


def test_short_context_is_untouched(monkeypatch):
    monkeypatch.setattr(chat_input, "MAX_QUERY_CHARS", 10000)
    result = parse([{"role": "user", "content": "你好"}])
    assert result["query"] == "[User]: 你好"


def test_truncated_query_keeps_latest_user_turn(monkeypatch):
    monkeypatch.setattr(chat_input, "MAX_QUERY_CHARS", 60)
    result = parse([
        {"role": "user", "content": "A" * 300},
        {"role": "assistant", "content": "B" * 300},
        {"role": "user", "content": "结尾提问"},
    ])
    assert result["query"].endswith("结尾提问")
    assert len(result["query"]) <= 60
