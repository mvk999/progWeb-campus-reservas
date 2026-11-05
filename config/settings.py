"""Configurações do projeto Campus Reservas."""

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent

# Esta chave de fallback serve apenas para desenvolvimento local.
# Defina DJANGO_SECRET_KEY fora do repositório para outros ambientes.
SECRET_KEY = os.environ.get(
    "DJANGO_SECRET_KEY", "dev-only-campus-reservas-change-before-deploy"
)
DEBUG = os.environ.get("DJANGO_DEBUG", "1").lower() in {"1", "true", "yes", "on"}
ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get(
        "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]"
    ).split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "jazzmin",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "usuarios.apps.UsuariosConfig",
    "ambientes.apps.AmbientesConfig",
    "reservas.apps.ReservasConfig",
]

# Modelo customizado definido antes das primeiras migrations de autenticação.
AUTH_USER_MODEL = "usuarios.Usuario"

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "pt-br"
TIME_ZONE = "America/Sao_Paulo"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

JAZZMIN_SETTINGS = {
    "site_title": "Administração — Campus Reservas",
    "site_header": "Campus Reservas",
    "site_brand": "Campus Reservas",
    "welcome_sign": "Sistema de Reservas de Ambientes e Equipamentos",
    "copyright": "Campus Reservas · UFLA",
    "order_with_respect_to": ["usuarios", "ambientes", "reservas", "auth"],
    "icons": {
        "usuarios": "fas fa-users",
        "usuarios.usuario": "fas fa-user",
        "ambientes": "fas fa-building",
        "ambientes.categoriaambiente": "fas fa-tags",
        "ambientes.ambiente": "fas fa-door-open",
        "ambientes.categoriaequipamento": "fas fa-tags",
        "ambientes.equipamento": "fas fa-cube",
        "reservas": "fas fa-calendar-alt",
        "reservas.reserva": "fas fa-calendar-check",
        "reservas.reservaequipamento": "fas fa-cubes",
        "reservas.bloqueioambiente": "fas fa-ban",
        "auth": "fas fa-users-cog",
        "auth.group": "fas fa-user-shield",
    },
    "show_sidebar": True,
    "navigation_expanded": True,
    "show_theme_chooser": True,
    "use_google_fonts_cdn": False,
}

JAZZMIN_UI_TWEAKS = {
    "theme": "flatly",
    "default_theme_mode": "light",
}
