"""reasoning_effort 兼容性：客户端带该字段时应映射为 thinking 而不是报 400。"""

import asyncio

import pytest

from perplexity.server.chat_input import parse_chat_body


class FakePool:
    def get_model_subscription_tiers(self):
        return {"pro"}


def base_body(**extra):
    body = {
        "model": "perplexity-search",
        "messages": [{"role": "user", "content": "hi"}],
    }
    body.update(extra)
    return body


def parse(**extra):
    return asyncio.run(
        parse_chat_body(base_body(**extra), FakePool(), origin="oai")
    )


def test_default_keeps_plain_model():
    assert parse()["model_id"] == "perplexity-search"


@pytest.mark.parametrize("effort", ["minimal", "low", "medium", "high", "xhigh", "max", "ultra"])
def test_reasoning_effort_enables_thinking(effort):
    assert parse(reasoning_effort=effort)["model_id"].endswith("-thinking")


def test_reasoning_effort_none_disables_thinking():
    assert parse(reasoning_effort="none")["model_id"] == "perplexity-search"


def test_reasoning_object_effort_is_honoured():
    assert parse(reasoning={"effort": "high"})["model_id"].endswith("-thinking")
    assert parse(reasoning={"effort": "none"})["model_id"] == "perplexity-search"


def test_explicit_thinking_wins_over_effort():
    assert parse(thinking=False, reasoning_effort="high")["model_id"] == "perplexity-search"
    assert parse(thinking=True)["model_id"].endswith("-thinking")


def test_blank_or_unknown_effort_is_ignored():
    assert parse(reasoning_effort="")["model_id"] == "perplexity-search"
    assert parse(reasoning_effort=None)["model_id"] == "perplexity-search"
    assert parse(reasoning={"unsupported": 1})["model_id"] == "perplexity-search"
