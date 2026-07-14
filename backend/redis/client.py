import json
import os
import asyncio
from datetime import datetime
from typing import Optional, Callable
from collections import deque
from utils.logger import setup_logger

logger = setup_logger("redis_client")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

CHANNEL_ALERTS = "sentinelai:alerts"
CHANNEL_RISK = "sentinelai:risk"
CHANNEL_SENSORS = "sentinelai:sensors"
CHANNEL_PERMITS = "sentinelai:permits"
CHANNEL_EMERGENCY = "sentinelai:emergency"

QUEUE_ALERTS = "sentinelai:alerts:queue"

class RedisClient:
    def __init__(self):
        self._client = None
        self._pubsub = None
        self._available = False
        self._in_memory = InMemoryQueue()
        self._connect()

    def _connect(self):
        try:
            import redis as redis_module
            self._client = redis_module.from_url(REDIS_URL, decode_responses=True, socket_timeout=2)
            self._client.ping()
            self._pubsub = self._client.pubsub()
            self._available = True
            logger.info(f"Connected to Redis at {REDIS_URL}")
        except Exception as e:
            self._client = None
            self._pubsub = None
            self._available = False
            logger.warning(f"Redis unavailable, using in-memory queue: {e}")

    @property
    def available(self) -> bool:
        return self._available

    def publish(self, channel: str, data: dict):
        message = json.dumps({"data": data, "timestamp": datetime.now().isoformat()})
        if self._available and self._client:
            try:
                self._client.publish(channel, message)
            except Exception as e:
                logger.warning(f"Redis publish failed: {e}")
        self._in_memory.publish(channel, data)

    def push_alert(self, alert: dict):
        message = json.dumps({"data": alert, "timestamp": datetime.now().isoformat()})
        if self._available and self._client:
            try:
                self._client.lpush(QUEUE_ALERTS, message)
                self._client.ltrim(QUEUE_ALERTS, 0, 99)
            except Exception as e:
                logger.warning(f"Redis push alert failed: {e}")
        self._in_memory.push("alert", alert)

    def get_pending_alerts(self, count: int = 10) -> list:
        if self._available and self._client:
            try:
                messages = self._client.rpop(QUEUE_ALERTS, count)
                if messages:
                    return [json.loads(m)["data"] for m in messages]
            except Exception as e:
                logger.warning(f"Redis pop alerts failed: {e}")
        return self._in_memory.pop("alert", count)

    def get_alert_queue_length(self) -> int:
        if self._available and self._client:
            try:
                return self._client.llen(QUEUE_ALERTS)
            except Exception:
                pass
        return self._in_memory.length("alert")

    def subscribe(self, channel: str, callback: Callable):
        if self._available and self._pubsub:
            try:
                self._pubsub.subscribe(**{channel: lambda m: callback(json.loads(m["data"])["data"])})
                return True
            except Exception as e:
                logger.warning(f"Redis subscribe failed: {e}")
        self._in_memory.subscribe(channel, callback)
        return True

    def listen_loop(self):
        if self._available and self._pubsub:
            try:
                self._pubsub.run_in_thread(sleep_time=0.01)
            except Exception as e:
                logger.warning(f"Redis listen loop failed: {e}")

    def close(self):
        if self._available and self._client:
            try:
                self._client.close()
            except Exception:
                pass

class InMemoryQueue:
    def __init__(self):
        self._queues = {}
        self._subscribers = {}
        self._history = {}

    def publish(self, channel: str, data: dict):
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        for cb in self._subscribers[channel]:
            try:
                cb(data)
            except Exception:
                pass

    def push(self, queue_name: str, item: dict):
        if queue_name not in self._queues:
            self._queues[queue_name] = deque(maxlen=100)
        self._queues[queue_name].appendleft(item)

    def pop(self, queue_name: str, count: int = 10) -> list:
        q = self._queues.get(queue_name, deque())
        result = []
        for _ in range(min(count, len(q))):
            result.append(q.pop())
        return result

    def length(self, queue_name: str) -> int:
        return len(self._queues.get(queue_name, []))

    def subscribe(self, channel: str, callback: Callable):
        if channel not in self._subscribers:
            self._subscribers[channel] = []
        self._subscribers[channel].append(callback)

redis_client = RedisClient()
