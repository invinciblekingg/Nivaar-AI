from celery import Celery
import os
from backend.app.config import settings

celery_app = Celery(
    "machineguard_workers",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_default_retry_delay=5,
    worker_prefetch_multiplier=1,
    worker_send_task_events=True,
)
