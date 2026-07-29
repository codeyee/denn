#!/bin/sh
set -eu

python manage.py migrate --noinput

echo "Starting one-off game duration backfill"
python manage.py rehydrate_content_details \
  --content-type GAME \
  --include-no-data \
  --limit 500 \
  --workers 4 &

exec gunicorn --bind 0.0.0.0:8000 core.wsgi:application
