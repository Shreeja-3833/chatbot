"""A tiny in-process event bus (synchronous observer pattern).

Producers call `bus.emit(event_type, payload)` and any number of subscribers
registered via `bus.subscribe(event_type, handler)` get invoked. Handlers are
wrapped in try/except so a misbehaving subscriber can never break the request
path that emitted the event.
"""

import logging
from collections import defaultdict
from typing import Callable

logger = logging.getLogger(__name__)

# Event type constants
MESSAGE_RECEIVED = "message_received"
LLM_COMPLETED = "llm_completed"
LLM_FAILED = "llm_failed"


class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, event_type: str, handler: Callable) -> None:
        self._subscribers[event_type].append(handler)

    def emit(self, event_type: str, payload: dict) -> None:
        for handler in self._subscribers.get(event_type, []):
            try:
                handler(payload)
            except Exception as exc:
                logger.error("Event handler failed for %s: %s", event_type, exc)


# Module-level singleton used across the app.
bus = EventBus()
