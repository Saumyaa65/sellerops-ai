from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, Dict, Any

class Payout(Base):
    __tablename__ = "payouts"

    payout_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    period: Mapped[str] = mapped_column(String(128), nullable=False)
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    gross_amount: Mapped[float] = mapped_column(Float, default=0.0)
    deductions: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)
    expected_amount: Mapped[float] = mapped_column(Float, default=0.0)
    variance: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(64), default="settled")
    settlement_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_anomaly: Mapped[bool] = mapped_column(Boolean, default=False)
    orders_count: Mapped[int] = mapped_column(Integer, default=0)
    deduction_breakdown: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    anomaly_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="payouts")

    def __repr__(self) -> str:
        return f"<Payout id={self.payout_id} net={self.net_amount}>"
