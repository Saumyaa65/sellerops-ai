"""
Mock data service — loads seller simulation data from /data/mock/.
In production this would be replaced with real marketplace API adapters.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

from config.settings import get_settings
from utils.logger import logger

settings = get_settings()

_DATA_DIR = Path(settings.mock_data_dir)


def _load(filename: str) -> Any:
    path = _DATA_DIR / filename
    if not path.exists():
        logger.warning(f"Mock data file not found: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def get_listings() -> List[Dict[str, Any]]:
    return _load("listings.json")


@lru_cache(maxsize=1)
def get_orders() -> List[Dict[str, Any]]:
    return _load("orders.json")


@lru_cache(maxsize=1)
def get_payouts() -> List[Dict[str, Any]]:
    return _load("payouts.json")


@lru_cache(maxsize=1)
def get_seller_metrics() -> Dict[str, Any]:
    return _load("seller_metrics.json")


@lru_cache(maxsize=1)
def get_reviews() -> List[Dict[str, Any]]:
    return _load("reviews.json")


@lru_cache(maxsize=1)
def get_customer_chats() -> List[Dict[str, Any]]:
    return _load("customer_chats.json")


@lru_cache(maxsize=1)
def get_support_tickets() -> List[Dict[str, Any]]:
    return _load("support_tickets.json")


@lru_cache(maxsize=1)
def get_investigation_scenarios() -> List[Dict[str, Any]]:
    return _load("investigation_scenarios.json")


# --- Derived / filtered helpers ---

def get_returns() -> List[Dict[str, Any]]:
    """Filter orders that are returns."""
    orders = get_orders()
    return [o for o in orders if o.get("is_return", False)]


def get_payout_anomalies() -> List[Dict[str, Any]]:
    """Filter payouts flagged as anomalous."""
    payouts = get_payouts()
    return [p for p in payouts if p.get("is_anomaly", False)]


def get_flagged_listings() -> List[Dict[str, Any]]:
    """Return listings that have one or more violations."""
    listings = get_listings()
    return [lst for lst in listings if lst.get("violations")]


def get_flagged_reviews() -> List[Dict[str, Any]]:
    """Return reviews that have been flagged."""
    reviews = get_reviews()
    return [r for r in reviews if r.get("flagged", False)]


def get_open_tickets() -> List[Dict[str, Any]]:
    """Return support tickets that are open or under review."""
    tickets = get_support_tickets()
    return [t for t in tickets if t.get("status") in ("open", "under_review", "escalated", "pending_response")]


def get_scenario_by_id(scenario_id: str) -> Dict[str, Any] | None:
    """Return a specific investigation scenario by ID."""
    scenarios = get_investigation_scenarios()
    return next((s for s in scenarios if s["scenario_id"] == scenario_id), None)


def get_orders_for_product(product_id: str) -> List[Dict[str, Any]]:
    """Return all orders for a specific product listing."""
    orders = get_orders()
    return [o for o in orders if o.get("product_id") == product_id]


def get_return_rate_for_product(product_id: str) -> float:
    """Calculate return rate for a specific product."""
    product_orders = get_orders_for_product(product_id)
    if not product_orders:
        return 0.0
    returns = [o for o in product_orders if o.get("is_return")]
    return len(returns) / len(product_orders)


def get_fraud_suspected_orders() -> List[Dict[str, Any]]:
    """Return orders with fraud flags."""
    orders = get_orders()
    return [o for o in orders if o.get("fraud_suspected", False) or o.get("suspicious", False)]
