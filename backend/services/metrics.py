from datetime import datetime, timedelta

from config.database import metrics_collection


def record_event(payload: dict) -> None:
    token_usage = payload.get("token_usage") or {}
    metrics_collection.insert_one({
        "created_at": datetime.utcnow(),
        "conversation_id": payload.get("conversation_id"),
        "user_id": payload.get("user_id"),
        "model_name": payload.get("model_name"),
        "status": payload.get("status", "success"),
        "error_type": payload.get("error_type"),
        "latency_ms": payload.get("latency_ms"),
        "pipeline_ms": payload.get("pipeline_ms"),
        "total_tokens": token_usage.get("total_token_count") or 0,
    })


def _percentile(values: list, pct: float):
    if not values:
        return None
    values = sorted(values)
    k = (len(values) - 1) * pct
    f = int(k)
    c = min(f + 1, len(values) - 1)
    if f == c:
        return round(values[f], 2)
    return round(values[f] + (values[c] - values[f]) * (k - f), 2)


def get_summary(window_minutes: int = 60) -> dict:
    since = datetime.utcnow() - timedelta(minutes=window_minutes)
    docs = list(metrics_collection.find({"created_at": {"$gte": since}}))

    total = len(docs)
    errors = sum(1 for d in docs if d.get("status") == "error")
    success = total - errors
    latencies = [d["latency_ms"] for d in docs if d.get("latency_ms") is not None]

    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else None
    throughput = round(total / window_minutes, 2) if window_minutes else 0

    per_model: dict[str, dict] = {}
    for d in docs:
        name = d.get("model_name") or "unknown"
        bucket = per_model.setdefault(
            name, {"model_name": name, "requests": 0, "errors": 0, "total_tokens": 0, "_lat": []}
        )
        bucket["requests"] += 1
        if d.get("status") == "error":
            bucket["errors"] += 1
        bucket["total_tokens"] += d.get("total_tokens") or 0
        if d.get("latency_ms") is not None:
            bucket["_lat"].append(d["latency_ms"])

    models = []
    for b in per_model.values():
        lat = b.pop("_lat")
        b["avg_latency_ms"] = round(sum(lat) / len(lat), 2) if lat else None
        models.append(b)
    models.sort(key=lambda m: m["requests"], reverse=True)

    return {
        "window_minutes": window_minutes,
        "total_requests": total,
        "success": success,
        "errors": errors,
        "error_rate": round(errors / total, 4) if total else 0,
        "avg_latency_ms": avg_latency,
        "p95_latency_ms": _percentile(latencies, 0.95),
        "throughput_per_min": throughput,
        "models": models,
    }
