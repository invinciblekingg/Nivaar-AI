import pytest
from unittest.mock import MagicMock, patch
from backend.app.config import settings
from backend.app.supabase_client import (
    get_supabase_client, is_supabase_configured,
    upload_file_to_supabase, sync_record_to_supabase,
    test_supabase_connection
)

def test_supabase_config_resolution():
    assert is_supabase_configured() is True
    assert settings.SUPABASE_URL.startswith("https://")
    assert "supabase.co" in settings.SUPABASE_URL
    assert len(settings.SUPABASE_KEY) > 20

def test_supabase_storage_url_builder():
    with patch("backend.app.supabase_client.get_supabase_client") as mock_get:
        mock_client = MagicMock()
        mock_from = MagicMock()
        mock_from.upload.return_value = {"Key": "machine-images/raw/test.jpg"}
        mock_client.storage.from_.return_value = mock_from
        mock_get.return_value = mock_client

        url = upload_file_to_supabase(
            bucket_name="machine-images",
            remote_path="raw/test.jpg",
            file_bytes=b"dummy-image-bytes",
            content_type="image/jpeg"
        )
        assert url is not None
        assert "storage/v1/object/public/machine-images/raw/test.jpg" in url

def test_supabase_sync_record():
    with patch("backend.app.supabase_client.get_supabase_client") as mock_get:
        mock_client = MagicMock()
        mock_table = MagicMock()
        mock_upsert = MagicMock()
        mock_table.upsert.return_value = mock_upsert
        mock_client.table.return_value = mock_table
        mock_get.return_value = mock_client

        ok = sync_record_to_supabase("machines", {
            "id": "m-test-101",
            "name": "Test Turbine",
            "category": "Power Turbines",
            "asset_tag": "TAG-TEST-101",
            "location_label": "Plant A",
            "status": "HEALTHY",
            "health_index": 99.0
        })
        assert ok is True
        mock_client.table.assert_called_with("machines")
        mock_table.upsert.assert_called_once()

def test_diagnostics_supabase_status_endpoint():
    from fastapi.testclient import TestClient
    from backend.app.main import app

    client = TestClient(app)
    res = client.get("/api/diagnostics/supabase-status")
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "url" in data
    assert "storage" in data
