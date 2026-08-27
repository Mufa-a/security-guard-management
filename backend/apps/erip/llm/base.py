from abc import ABC, abstractmethod


class LLMProvider(ABC):
    """Every provider adapter implements this. service.py talks only to this
    interface — it never imports a provider SDK directly."""

    @abstractmethod
    def run(self, *, system_prompt, history, message_text, tool_schemas, dispatch_tool, max_iterations=6):
        """
        system_prompt: str
        history: list[{"role": "user"|"assistant", "content": str}], oldest first —
                 same shape service.py already builds from ErpMessage rows.
        message_text: str — the new user message.
        tool_schemas: Anthropic-shaped tool schemas from tools.TOOL_SCHEMAS
                      (name/description/input_schema). Providers translate to
                      their own tool format internally — tools.py never changes.
        dispatch_tool: callable(tool_name: str, tool_input: dict) -> dict.
                       Already does authorization + audit logging. Providers
                       must route every tool call through this — never execute
                       tools themselves, never skip logging.
        Returns: final assistant reply text (str).
        """
        raise NotImplementedError
    