from sqlalchemy import String, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional

class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    order_value: Mapped[float] = mapped_column(Float, default=0.0)
    order_date: Mapped[str] = mapped_column(String(64), nullable=False)
    delivery_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="delivered")
    is_return: Mapped[bool] = mapped_column(Boolean, default=False)
    return_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    return_date: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    customer_id: Mapped[str] = mapped_column(String(64), nullable=False)
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    payment_mode: Mapped[str] = mapped_column(String(64), default="prepaid")
    shipping_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cancel_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    high_value: Mapped[bool] = mapped_column(Boolean, default=False)
    repeat_buyer: Mapped[bool] = mapped_column(Boolean, default=False)
    suspicious: Mapped[bool] = mapped_column(Boolean, default=False)
    fraud_suspected: Mapped[bool] = mapped_column(Boolean, default=False)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="orders")

    def __repr__(self) -> str:
        return f"<Order id={self.order_id} val={self.order_value}>"
