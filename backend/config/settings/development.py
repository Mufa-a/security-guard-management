from .base import *

DEBUG = True

ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver']
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    }
}


REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '1000/minute',
    'user': '1000/minute',
    'login': '1000/minute',
    'reports': '1000/minute',
    'password_reset': '1000/minute',
}