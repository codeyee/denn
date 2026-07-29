#!/bin/sh
set -eu

python manage.py migrate --noinput

exec gunicorn --bind 0.0.0.0:8000 core.wsgi:application
