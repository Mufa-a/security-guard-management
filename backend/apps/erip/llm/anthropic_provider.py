import json
from django.conf import settings
from anthropic import Anthropic

from .base import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self):
        self._client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self._model = getattr(settings, "ERIP_MODEL", "claude-sonnet-4-6")

    def run(self, *, system_prompt, history, message_text, tool_schemas, dispatch_tool, max_iterations=6):
        messages = [{"role": m["role"], "content": m["content"]} for m in history]
        messages.append({"role": "user", "content": message_text})

        for _ in range(max_iterations):
            response = self._client.messages.create(
                model=self._model,
                max_tokens=1500,
                system=system_prompt,
                tools=tool_schemas,
                messages=messages,
            )

            if response.stop_reason != "tool_use":
                return "".join(b.text for b in response.content if b.type == "text")

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue
                result = dispatch_tool(block.name, block.input or {})
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result),
                })
            messages.append({"role": "user", "content": tool_results})

        return ("I wasn't able to finish that within my tool-call limit — could you narrow "
                "the request down a bit?")