from django.middleware.csrf import CsrfViewMiddleware
from rest_framework import exceptions
from rest_framework_simplejwt.authentication import JWTAuthentication


class _CSRFCheck(CsrfViewMiddleware):
    """
    CsrfViewMiddleware is designed to run as real middleware and returns an
    HttpResponseForbidden on rejection (for short-circuiting the request).
    We just want the plain-text reason, so override _reject to hand that
    back instead — same trick DRF's own SessionAuthentication uses.
    """
    def _reject(self, request, reason):
        return reason


class CookieJWTAuthentication(JWTAuthentication):
    """
    Reads the JWT access token from an httpOnly cookie instead of the
    Authorization header.

    Because the token itself is no longer readable by JS (that's the whole
    point of the httpOnly cookie), it can no longer act as its own CSRF
    defense the way a manually-attached Bearer header could. So any
    state-changing request authenticated this way must carry a valid
    CSRF token too (double-submit cookie pattern, same mechanism Django's
    SessionAuthentication uses) — enforced below via Django's own
    CsrfViewMiddleware.check.
    """

    def authenticate(self, request):
        raw_token = request.COOKIES.get('access_token')
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        self.enforce_csrf(request)
        user = self.get_user(validated_token)
        return user, validated_token

    def enforce_csrf(self, request):
        if request.method in ('GET', 'HEAD', 'OPTIONS', 'TRACE'):
            return

        check = _CSRFCheck(lambda r: None)
        check.process_request(request)  # populates request.META['CSRF_COOKIE']
        reason = check.process_view(request, None, (), {})
        if reason:
            raise exceptions.PermissionDenied(f'CSRF Failed: {reason}')