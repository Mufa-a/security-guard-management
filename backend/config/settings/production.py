from .base import *
from decouple import config, Csv
import dj_database_url
import os

DEBUG = False

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL")
    )
}

# No default on purpose — production must set this explicitly or it fails loudly.
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

# WhiteNoise serves static files (including Django admin's CSS/JS) directly
# from the app process, since DEBUG=False disables Django's built-in static
# file serving.
MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=Csv())

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'