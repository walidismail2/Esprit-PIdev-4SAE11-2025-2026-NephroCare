#!/bin/sh
set -eu

api_url="${API_URL:-http://localhost:8070}"
keycloak_url="${KEYCLOAK_URL:-http://localhost:8180}"

find /usr/share/nginx/html -type f -name '*.js' -exec sed -i \
  -e "s|__API_URL__|${api_url}|g" \
  -e "s|__KEYCLOAK_URL__|${keycloak_url}|g" {} +

exec nginx -g 'daemon off;'
