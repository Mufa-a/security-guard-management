"""
Thread-local storage for the current request, so signal handlers (which
run outside request/view scope) can work out who triggered them.

We store the request itself, not a resolved user, and re-read
`request.user` lazily on each `get_current_user()` call. That matters
because most API auth here is JWT via SimpleJWT: DRF only resolves
`request.user` once its authentication runs inside the view's
`dispatch()`, which happens *after* this middleware has already called
`get_response()`. Snapshotting `request.user` up front would always see
the pre-DRF-auth value (usually AnonymousUser). By the time a view calls
`.save()`/`.delete()` on a model, DRF auth has already run and mutated
this same request object, so a fresh read here picks it up correctly.
"""
import threading

_local = threading.local()


def get_current_user():
    request = getattr(_local, "request", None)
    if request is None:
        return None
    return getattr(request, "user", None)


class CurrentUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _local.request = request
        try:
            response = self.get_response(request)
        finally:
            _local.request = None
        return response
