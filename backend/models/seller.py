from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import List

class Seller(Base):
    __tablename__ = "sellers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    tier: Mapped[str] = mapped_column(String(64), default="Bronze")
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")

    users: Mapped[List["User"]] = relationship("User", back_populates="seller", cascade="all, delete-orphan")
    metrics: Mapped["SellerMetric"] = relationship("SellerMetric", back_populates="seller", uselist=False, cascade="all, delete-orphan")
    listings: Mapped[List["Listing"]] = relationship("Listing", back_populates="seller", cascade="all, delete-orphan")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="seller", cascade="all, delete-orphan")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="seller", cascade="all, delete-orphan")
    support_tickets: Mapped[List["SupportTicket"]] = relationship("SupportTicket", back_populates="seller", cascade="all, delete-orphan")
    payouts: Mapped[List["Payout"]] = relationship("Payout", back_populates="seller", cascade="all, delete-orphan")
    customer_chats: Mapped[List["CustomerChat"]] = relationship("CustomerChat", back_populates="seller", cascade="all, delete-orphan")
    investigation_scenarios: Mapped[List["InvestigationScenario"]] = relationship("InvestigationScenario", back_populates="seller", cascade="all, delete-orphan")
    investigations: Mapped[List["Investigation"]] = relationship("Investigation", back_populates="seller", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Seller id={self.id} name={self.name}>"
