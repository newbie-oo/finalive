#!/usr/bin/env bash
set -euo pipefail

# Finalive database backup → R2
# Usage: CRON_SECRET=xxx DATABASE_URL=xxx S3_*=xxx ./scripts/backup.sh

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${S3_ACCESS_KEY_ID:?S3_ACCESS_KEY_ID is required}"
: "${S3_SECRET_ACCESS_KEY:?S3_SECRET_ACCESS_KEY is required}"
: "${S3_BUCKET_PRIVATE:?S3_BUCKET_PRIVATE is required}"

TIMESTAMP=$(date -u +%Y%m%d_%H%M%S)
DUMP_FILE="finalive_backup_${TIMESTAMP}.sql.gz"
TMPDIR=${TMPDIR:-/tmp}
LOCAL_PATH="${TMPDIR}/${DUMP_FILE}"

echo "[backup] Starting pg_dump..."
pg_dump "${DATABASE_URL}" | gzip > "${LOCAL_PATH}"

echo "[backup] Uploading to R2..."
aws s3 cp "${LOCAL_PATH}" "s3://${S3_BUCKET_PRIVATE}/backups/${DUMP_FILE}" \
  --endpoint-url "${S3_ENDPOINT}" \
  --region "${S3_REGION:-auto}"

rm -f "${LOCAL_PATH}"

echo "[backup] Done: ${DUMP_FILE}"
