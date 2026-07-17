from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, List

class SupportTicket(Base):
    __tablename__ = "support_tickets"

    ticket_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(64), default="open")
    priority: Mapped[str] = mapped_column(String(32), default="medium")
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="")
    created_date: Mapped[str] = mapped_column(String(64), nullable=False)
    updated_date: Mapped[str] = mapped_column(String(64), nullable=False)
    resolution: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    related_listings: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    recommended_actions: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="support_tickets")

    def __repr__(self) -> str:
        return f"<SupportTicket id={self.ticket_id} subject={self.subject}>"
