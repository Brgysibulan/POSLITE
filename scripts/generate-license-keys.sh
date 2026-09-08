#!/usr/bin/env bash
set -euo pipefail

output_dir="${1:-.}"
mkdir -p "$output_dir"
private_key="$output_dir/saripos-license-private.pem"
public_key="$output_dir/saripos-license-public.pem"
public_base64="$output_dir/saripos-license-public.base64"

if [[ -e "$private_key" || -e "$public_key" || -e "$public_base64" ]]; then
  echo "Refusing to overwrite an existing SariPOS license key file." >&2
  exit 1
fi

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out "$private_key"
openssl pkey -in "$private_key" -pubout -out "$public_key"
awk 'BEGIN { ORS="" } !/-----/ { print } END { print "\n" }' "$public_key" > "$public_base64"
chmod 600 "$private_key"

echo "Created a private signing key and Android public verification key in: $output_dir"
echo "Keep saripos-license-private.pem secret and never commit it."
echo "Use saripos-license-public.base64 as SARIPOS_LICENSE_PUBLIC_KEY."
