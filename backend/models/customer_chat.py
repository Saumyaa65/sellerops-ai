from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, List, Dict, Any

class CustomerChat(Base):
    __tablename__ = "customer_chats"

    chat_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    order_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    customer_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    date: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="resolved")
    category: Mapped[str] = mapped_column(String(128), default="general")
    messages: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON, nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="customer_chats")

    def __repr__(self) -> str:
        return f"<CustomerChat id={self.chat_id} customer={self.customer_id}>"
