from typing import Any, Dict, List, Optional
from sqlalchemy.future import select
from models.database import AsyncSessionLocal
from models.listing import Listing
from models.order import Order
from models.payout import Payout
from models.seller_metrics import SellerMetric
from models.review import Review
from models.customer_chat import CustomerChat
from models.support_ticket import SupportTicket
from models.scenario import InvestigationScenario
from models.seller import Seller

def model_to_dict(model) -> Dict[str, Any]:
    if model is None:
        return {}
    d = {}
    for col in model.__table__.columns:
        val = getattr(model, col.name)
        d[col.name] = val
    return d

async def get_listings(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(Listing).where(Listing.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(l) for l in result.scalars().all()]

async def get_orders(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(Order).where(Order.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(o) for o in result.scalars().all()]

async def get_payouts(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(Payout).where(Payout.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(p) for p in result.scalars().all()]

async def get_seller_metrics(seller_id: str) -> Dict[str, Any]:
    async with AsyncSessionLocal() as session:
        query = select(SellerMetric).where(SellerMetric.seller_id == seller_id)
        result = await session.execute(query)
        metric = result.scalars().first()
        if not metric:
            return {}
        
        seller_query = select(Seller).where(Seller.id == seller_id)
        s_result = await session.execute(seller_query)
        seller = s_result.scalars().first()
        
        d = model_to_dict(metric)
        if seller:
            d["seller_name"] = seller.name
            d["seller_tier"] = seller.tier
            d["marketplace"] = seller.marketplace
        return d

async def get_reviews(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(Review).where(Review.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(r) for r in result.scalars().all()]

async def get_customer_chats(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(CustomerChat).where(CustomerChat.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(c) for c in result.scalars().all()]

async def get_support_tickets(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(SupportTicket).where(SupportTicket.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(t) for t in result.scalars().all()]

async def get_investigation_scenarios(seller_id: str) -> List[Dict[str, Any]]:
    async with AsyncSessionLocal() as session:
        query = select(InvestigationScenario).where(InvestigationScenario.seller_id == seller_id)
        result = await session.execute(query)
        return [model_to_dict(s) for s in result.scalars().all()]


# --- Derived / filtered helpers ---

async def get_returns(seller_id: str) -> List[Dict[str, Any]]:
    """Filter orders that are returns."""
    async with AsyncSessionLocal() as session:
        query = select(Order).where(Order.seller_id == seller_id, Order.is_return == True)
        result = await session.execute(query)
        return [model_to_dict(o) for o in result.scalars().all()]

async def get_payout_anomalies(seller_id: str) -> List[Dict[str, Any]]:
    """Filter payouts flagged as anomalous."""
    async with AsyncSessionLocal() as session:
        query = select(Payout).where(Payout.seller_id == seller_id, Payout.is_anomaly == True)
        result = await session.execute(query)
        return [model_to_dict(p) for p in result.scalars().all()]

async def get_flagged_listings(seller_id: str) -> List[Dict[str, Any]]:
    """Return listings that have one or more violations."""
    listings = await get_listings(seller_id)
    return [lst for lst in listings if lst.get("violations")]

async def get_flagged_reviews(seller_id: str) -> List[Dict[str, Any]]:
    """Return reviews that have been flagged."""
    async with AsyncSessionLocal() as session:
        query = select(Review).where(Review.seller_id == seller_id, Review.flagged == True)
        result = await session.execute(query)
        return [model_to_dict(r) for r in result.scalars().all()]

async def get_open_tickets(seller_id: str) -> List[Dict[str, Any]]:
    """Return support tickets that are open or under review."""
    async with AsyncSessionLocal() as session:
        query = select(SupportTicket).where(
            SupportTicket.seller_id == seller_id,
            SupportTicket.status.in_(["open", "under_review", "escalated", "pending_response"])
        )
        result = await session.execute(query)
        return [model_to_dict(t) for t in result.scalars().all()]

async def get_scenario_by_id(scenario_id: str, seller_id: str) -> Optional[Dict[str, Any]]:
    """Return a specific investigation scenario by ID."""
    async with AsyncSessionLocal() as session:
        query = select(InvestigationScenario).where(
            InvestigationScenario.scenario_id == scenario_id,
            InvestigationScenario.seller_id == seller_id
        )
        result = await session.execute(query)
        scenario = result.scalars().first()
        return model_to_dict(scenario) if scenario else None

async def get_orders_for_product(product_id: str, seller_id: str) -> List[Dict[str, Any]]:
    """Return all orders for a specific product listing."""
    async with AsyncSessionLocal() as session:
        query = select(Order).where(Order.seller_id == seller_id, Order.product_id == product_id)
        result = await session.execute(query)
        return [model_to_dict(o) for o in result.scalars().all()]

async def get_return_rate_for_product(product_id: str, seller_id: str) -> float:
    """Calculate return rate for a specific product."""
    product_orders = await get_orders_for_product(product_id, seller_id)
    if not product_orders:
        return 0.0
    returns = [o for o in product_orders if o.get("is_return")]
    return len(returns) / len(product_orders)

async def get_fraud_suspected_orders(seller_id: str) -> List[Dict[str, Any]]:
    """Return orders with fraud flags."""
    async with AsyncSessionLocal() as session:
        query = select(Order).where(
            Order.seller_id == seller_id,
            (Order.fraud_suspected == True) | (Order.suspicious == True)
        )
        result = await session.execute(query)
        return [model_to_dict(o) for o in result.scalars().all()]
