#!/bin/sh
# wait-for-db.sh
# ใช้รอให้ database พร้อมก่อนเริ่ม backend

set -e

host="$1"
shift
cmd="$@"

until nc -z "$host" 5432; do
  echo "Waiting for database at $host:5432..."
  sleep 2
done

echo "Database is up. Starting command..."
exec $cmd
