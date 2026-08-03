def get_client_ip(request):
    """
    Prefer X-Forwarded-For since both Render and Netlify sit behind a
    proxy — REMOTE_ADDR alone would just show the proxy's IP, not the
    real client.
    """
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")