#!/usr/bin/env python3
import json
import os
import sqlite3
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "app" / "src" / "main" / "python" / "ventas.db"


def env(name, default=""):
    return os.environ.get(name, default).strip()


def load_rows(db_path):
    with sqlite3.connect(db_path) as con:
        con.row_factory = sqlite3.Row
        return [
            dict(row)
            for row in con.execute(
                """
                SELECT
                    m.id,
                    p.name AS product_name,
                    m.model_name,
                    ROUND(m.sale_price, 2) AS sale_price,
                    m.quantity,
                    m.image_filename,
                    m.entry_date
                FROM models m
                JOIN products p ON p.id = m.product_id
                ORDER BY p.name, m.model_name
                """
            ).fetchall()
        ]


def public_image_url(image_base_url, filename):
    if not image_base_url or not filename:
        return ""
    return f"{image_base_url.rstrip('/')}/{filename}"


def sync(rows, supabase_url, service_key, image_base_url):
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/store_products?on_conflict=id"
    payload = [
        {
            "id": row["id"],
            "product_name": row["product_name"],
            "model_name": row["model_name"],
            "sale_price": row["sale_price"],
            "quantity": row["quantity"],
            "image_url": public_image_url(image_base_url, row["image_filename"]),
            "entry_date": row["entry_date"] or None,
        }
        for row in rows
    ]
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    clear_request = urllib.request.Request(
        f"{supabase_url.rstrip('/')}/rest/v1/store_products?id=gte.0",
        data=json.dumps({"quantity": 0}).encode("utf-8"),
        method="PATCH",
        headers=headers,
    )
    urllib.request.urlopen(clear_request, timeout=30).close()
    upsert_headers = dict(headers)
    upsert_headers["Prefer"] = "resolution=merge-duplicates,return=minimal"
    request = urllib.request.Request(endpoint, data=data, method="POST", headers=upsert_headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.status


def main():
    supabase_url = env("SUPABASE_URL")
    service_key = env("SUPABASE_SERVICE_ROLE_KEY")
    image_base_url = env("RACING_IMAGE_BASE_URL")
    db_path = Path(env("RACING_DB_PATH", str(DEFAULT_DB)))
    if not supabase_url or not service_key:
        print("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.", file=sys.stderr)
        return 2
    if not db_path.exists():
        print(f"No existe la base de datos: {db_path}", file=sys.stderr)
        return 2
    rows = load_rows(db_path)
    try:
        status = sync(rows, supabase_url, service_key, image_base_url)
    except urllib.error.HTTPError as exc:
        print(exc.read().decode("utf-8", errors="replace"), file=sys.stderr)
        return 1
    available = sum(1 for row in rows if row["quantity"] > 0)
    print(f"Sincronizados {len(rows)} modelos. Disponibles en tienda: {available}. HTTP {status}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
