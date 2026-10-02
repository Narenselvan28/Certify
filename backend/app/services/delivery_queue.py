"""
Certify Backend — Delivery Queue
Asynchronous in-memory queue with rate control, concurrency limit, and dynamic 429 backoff.
"""

import asyncio
import logging
from typing import Callable, Any

from app.config import settings
from app.services.delivery_worker import execute_delivery_job

logger = logging.getLogger(__name__)


class DeliveryQueue:
    def __init__(
        self,
        concurrency: int = 1,
        delay_ms: int = 500,
        on_job_update: Callable[[dict], Any] | None = None,
        on_complete: Callable[[], Any] | None = None,
    ):
        self.concurrency = max(1, concurrency)
        self.delay_sec = max(0.05, delay_ms / 1000.0)
        self.semaphore = asyncio.Semaphore(self.concurrency)
        self.on_job_update = on_job_update
        self.on_complete = on_complete
        self._is_paused = False
        self._pause_lock = asyncio.Lock()

    async def pause_for_rate_limit(self, seconds: float = 5.0):
        """Temporarily pause all workers when a 429 Rate Limit is detected."""
        async with self._pause_lock:
            if not self._is_paused:
                self._is_paused = True
                logger.warning("DeliveryQueue: Rate limit encountered. Pausing queue for %.1fs...", seconds)
                await asyncio.sleep(seconds)
                self._is_paused = False
                logger.info("DeliveryQueue: Resuming processing after rate limit pause.")

    async def process_jobs(self, jobs: list[dict], channels: list[str], enable_fallback: bool):
        """Process a list of delivery jobs in the background."""
        for job in jobs:
            # Check pause
            while self._is_paused:
                await asyncio.sleep(0.5)

            async with self.semaphore:
                try:
                    await execute_delivery_job(
                        job=job,
                        channels=channels,
                        enable_fallback=enable_fallback,
                        on_update=self.on_job_update,
                    )
                except Exception as exc:
                    logger.exception("Unexpected error in delivery queue for job %s: %s", job.get("id"), exc)
                    job["status"] = "FAILED"
                    job["error"] = str(exc)
                    job["retryable"] = False
                    if self.on_job_update:
                        self.on_job_update(job)

                # Rate control inter-job delay
                await asyncio.sleep(self.delay_sec)

        if self.on_complete:
            self.on_complete()
