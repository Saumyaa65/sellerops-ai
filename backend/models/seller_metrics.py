from sqlalchemy import String, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, List, Dict, Any

class SellerMetric(Base):
    __tablename__ = "seller_metrics"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), nullable=False, unique=True)

    seller_rating: Mapped[float] = mapped_column(Float, default=0.0)
    total_orders: Mapped[int] = mapped_column(Integer, default=0)
    total_returns: Mapped[int] = mapped_column(Integer, default=0)
    return_rate: Mapped[float] = mapped_column(Float, default=0.0)
    active_listings: Mapped[int] = mapped_column(Integer, default=0)
    inactive_listings: Mapped[int] = mapped_column(Integer, default=0)
    draft_listings: Mapped[int] = mapped_column(Integer, default=0)
    total_revenue_30d: Mapped[float] = mapped_column(Float, default=0.0)
    total_payouts_30d: Mapped[float] = mapped_column(Float, default=0.0)
    pending_payouts: Mapped[float] = mapped_column(Float, default=0.0)
    account_health: Mapped[str] = mapped_column(String(64), default="healthy")
    cancellation_rate: Mapped[float] = mapped_column(Float, default=0.0)
    late_shipment_rate: Mapped[float] = mapped_column(Float, default=0.0)
    on_time_delivery_rate: Mapped[float] = mapped_column(Float, default=0.0)
    fraud_flags: Mapped[int] = mapped_column(Integer, default=0)

    violations: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    top_categories: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)
    performance_trend: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    last_updated: Mapped[str] = mapped_column(String(64), nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="metrics")

    def __repr__(self) -> str:
        return f"<SellerMetric id={self.id} seller_id={self.seller_id}>"
