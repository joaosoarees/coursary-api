#!/usr/bin/env bash
# Refuses a deploy without the stage values (Q158): the template reads a missing one as
# "not configured" and removes the API domain, the pool's SES sender and the mail sender.
set -euo pipefail

missing=()
for name in API_DOMAIN_NAME ROUTE53_HOSTED_ZONE_ID DISABLE_DEFAULT_APIGW_ENDPOINT COGNITO_EMAILS_FROM SES_ARN; do
  [ -n "${!name:-}" ] || missing+=("${name}")
done

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Deploy refused: ${missing[*]} not set (the CI takes them from the dev Environment secrets)." >&2
  exit 1
fi
