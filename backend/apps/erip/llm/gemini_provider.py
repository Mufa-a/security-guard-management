import json
from django.conf import settings
from google import genai

from .base import LLMProvider


def _to_gemini_tools(tool_schemas):
    """Anthropic-shaped tool schema (name/description/input_schema) -> Gemini's
    function-declaration shape (name/description/parameters). Both are plain
    JSON Schema underneath, so this is just a key rename."""
    return [
        {
            "type": "function",
            "name": t["name"],
            "description": t["description"],
            "parameters": t["input_schema"],
        }
        for t in tool_schemas
    ]


def _text_step(step_type, text):
    """Every item in `input` must be an explicitly typed step object — this
    SDK version rejects the simpler {"role": ..., "content": ...} shorthand
    some docs/examples show. Confirmed against a live 400/validation error,
    not just documentation."""
    return {"type": step_type, "content": [{"type": "text", "text": text}]}


class GeminiProvider(LLMProvider):
    """Stateless adapter — every call passes store=False and rebuilds context
    from our own ErpMessage history, the same way AnthropicProvider does."""

    def __init__(self):
        self._client = genai.Client(api_key=settings.GEMINI_API_KEY)
        self._model = getattr(settings, "GEMINI_MODEL", "gemini-3.6-flash")

    def run(self, *, system_prompt, history, message_text, tool_schemas, dispatch_tool, max_iterations=6):
        gemini_tools = _to_gemini_tools(tool_schemas)

        conversation = [
            _text_step("user_input" if m["role"] == "user" else "model_output", m["content"])
            for m in history
        ]
        conversation.append(_text_step("user_input", message_text))

        for _ in range(max_iterations):
            interaction = self._client.interactions.create(
                model=self._model,
                system_instruction=system_prompt,
                store=False,
                input=conversation,
                tools=gemini_tools,
            )

            function_calls = [s for s in interaction.steps if s.type == "function_call"]

            # Feed the model's own steps back in verbatim before doing anything
            # else with them — required so the next call in this same loop has
            # the full turn context, per Gemini's stateless function-calling docs.
            for step in interaction.steps:
                conversation.append(step.model_dump())

            if not function_calls:
                return interaction.output_text

            for call in function_calls:
                result = dispatch_tool(call.name, call.arguments or {})
                conversation.append({
                    "type": "function_result",
                    "name": call.name,
                    "call_id": call.id,
                    "result": [{"type": "text", "text": json.dumps(result)}],
                })

        return ("I wasn't able to finish that within my tool-call limit — could you narrow "
                "the request down a bit?")