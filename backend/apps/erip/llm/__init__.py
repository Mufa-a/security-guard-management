from django.conf import settings


def get_llm_provider():
    """Reads settings.LLM_PROVIDER and returns the matching adapter. This is
    the only place that decides which model talks to Erip — swap providers
    by changing LLM_PROVIDER in .env, nothing else in the app needs to know."""
    provider = getattr(settings, "LLM_PROVIDER", "anthropic").lower()
    if provider == "gemini":
        from .gemini_provider import GeminiProvider
        return GeminiProvider()
    if provider == "anthropic":
        from .anthropic_provider import AnthropicProvider
        return AnthropicProvider()
    raise ValueError(f"Unknown LLM_PROVIDER: {provider!r}")