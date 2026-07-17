from sqlalchemy import String, Float, Integer, Boolean, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, List

class Listing(Base):
    __tablename__ = "listings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    sku: Mapped[str] = mapped_column(String(128), nullable=False)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    mrp: Mapped[float] = mapped_column(Float, default=0.0)
    images: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    description: Mapped[str] = mapped_column(String(1000), default="")
    size_chart: Mapped[bool] = mapped_column(Boolean, default=False)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    status: Mapped[str] = mapped_column(String(64), default="active")
    rating: Mapped[float] = mapped_column(Float, default=0.0)
    total_reviews: Mapped[int] = mapped_column(Integer, default=0)
    violations: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="listings")

    def __repr__(self) -> str:
        return f"<Listing id={self.id} name={self.name}>"
