from .base import *
from decouple import config, Csv

DEBUG = False
import dj_database_url
import os

DATABASES = {
    "default": dj_database_url.config(
        default=os.getenv("DATABASE_URL")
    )
}
# No default on purpose — production must set this explicitly or it fails loudly.
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())

SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'