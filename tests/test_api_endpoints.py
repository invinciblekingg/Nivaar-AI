import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

def test_health_check_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] in ["Nivaar AI", "MachineGuard AI"]

def test_get_machines_endpoint():
    with TestClient(app) as client:
        response = client.get("/api/machines")
        assert response.status_code == 200
        machines = response.json()
        assert len(machines) >= 8, "Expected all 8 equipment categories represented"

def test_get_dashboard_stats():
    with TestClient(app) as client:
        response = client.get("/api/demo/stats")
        assert response.status_code == 200
        stats = response.json()
        assert stats["total_machines"] >= 8
        assert stats["active_workers"] >= 2
        assert "avg_health_index" in stats

def test_get_distributed_fleet_status():
    with TestClient(app) as client:
        response = client.get("/api/distributed/status")
        assert response.status_code == 200
        fleet = response.json()
        assert fleet["active_workers_count"] >= 2
        assert len(fleet["workers"]) >= 2
