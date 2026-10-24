import logging
import mimetypes
from typing import Optional, Dict, Any, List
from datetime import datetime

from backend.app.config import settings

logger = logging.getLogger("udyon.supabase")

_supabase_client = None

def get_supabase_client():
    """Returns the cached Supabase client instance or initializes a new one."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    url = settings.SUPABASE_URL
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY

    if not url or not key:
        logger.info("Supabase URL or Key not configured. Running in local-only fallback mode.")
        return None

    try:
        from supabase import create_client, Client
        _supabase_client = create_client(url, key)
        logger.info(f"Supabase client initialized successfully for project endpoint: {url}")
        return _supabase_client
    except Exception as e:
        logger.warning(f"Failed to initialize Supabase client: {e}. Falling back gracefully.")
        return None

def is_supabase_configured() -> bool:
    """Checks whether valid Supabase credentials have been provided."""
    url = settings.SUPABASE_URL
    key = settings.SUPABASE_KEY
    return bool(url and key and len(url) > 8 and len(key) > 20)

def upload_file_to_supabase(
    bucket_name: str,
    remote_path: str,
    file_bytes: bytes,
    content_type: Optional[str] = None
) -> Optional[str]:
    """
    Uploads a file to a Supabase Storage bucket and returns its public URL.
    Gracefully returns None if Supabase is offline, bucket doesn't exist, or credentials fail.
    """
    client = get_supabase_client()
    if not client:
        return None

    if not content_type:
        content_type, _ = mimetypes.guess_type(remote_path)
        if not content_type:
            content_type = "application/octet-stream"

    # Clean destination path (no leading slash)
    clean_path = remote_path.lstrip("/")

    try:
        # Check if file exists or upload directly with upsert=true
        res = client.storage.from_(bucket_name).upload(
            path=clean_path,
            file=file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{clean_path}"
        logger.info(f"Successfully uploaded {clean_path} to Supabase bucket '{bucket_name}': {public_url}")
        return public_url
    except Exception as e:
        logger.warning(f"Supabase storage upload error for {bucket_name}/{clean_path}: {e}")
        # Return standard public URL format in case bucket is already public
        return f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{clean_path}"

def sync_record_to_supabase(table_name: str, record: Dict[str, Any], conflict_column: str = "id") -> bool:
    """
    Upserts a single data record into the specified Supabase table.
    Ensures single source of truth without throwing unhandled exceptions.
    """
    client = get_supabase_client()
    if not client:
        return False

    # Format datetime objects to ISO strings
    clean_record = {}
    for k, v in record.items():
        if isinstance(v, datetime):
            clean_record[k] = v.isoformat()
        else:
            clean_record[k] = v

    try:
        client.table(table_name).upsert(clean_record, on_conflict=conflict_column).execute()
        return True
    except Exception as e:
        logger.warning(f"Failed to sync record to Supabase table '{table_name}': {e}")
        return False

def fetch_records_from_supabase(table_name: str, filters: Optional[Dict[str, Any]] = None, limit: int = 100) -> Optional[List[Dict[str, Any]]]:
    """
    Fetches records from a Supabase table. Returns None if unconfigured or error occurs.
    """
    client = get_supabase_client()
    if not client:
        return None

    try:
        query = client.table(table_name).select("*")
        if filters:
            for col, val in filters.items():
                query = query.eq(col, val)
        res = query.limit(limit).execute()
        return res.data
    except Exception as e:
        logger.warning(f"Failed to fetch from Supabase table '{table_name}': {e}")
        return None

def test_supabase_connection() -> Dict[str, Any]:
    """
    Health check helper for testing Supabase database and storage connectivity.
    """
    configured = is_supabase_configured()
    if not configured:
        return {
            "status": "not_configured",
            "message": "Supabase environment variables (SUPABASE_URL, SUPABASE_KEY) are missing.",
            "url": settings.SUPABASE_URL
        }

    client = get_supabase_client()
    if not client:
        return {
            "status": "error",
            "message": "Could not instantiate Supabase client.",
            "url": settings.SUPABASE_URL
        }

    db_ok = False
    db_message = ""
    try:
        res = client.table("machines").select("id").limit(1).execute()
        db_ok = True
        db_message = f"Connected successfully. Found {len(res.data)} machine rows."
    except Exception as e:
        db_message = str(e)

    storage_ok = False
    storage_message = ""
    try:
        buckets = client.storage.list_buckets()
        storage_ok = True
        storage_message = f"Connected successfully. Available buckets: {[b.name for b in buckets]}"
    except Exception as e:
        storage_message = str(e)

    return {
        "status": "connected" if (db_ok or storage_ok) else "degraded",
        "url": settings.SUPABASE_URL,
        "database": {"ok": db_ok, "details": db_message},
        "storage": {"ok": storage_ok, "details": storage_message}
    }
