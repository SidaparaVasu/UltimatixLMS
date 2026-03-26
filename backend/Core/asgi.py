"""
ASGI config for core project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from dotenv import load_dotenv
load_dotenv()

env = os.getenv('ENVIRONMENT', 'development')
if env == 'production':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Core.settings.prod')
else:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Core.settings.dev')


application = get_asgi_application()
