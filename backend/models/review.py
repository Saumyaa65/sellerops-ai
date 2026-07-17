from sqlalchemy import String, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional

class Review(Base):
    __tablename__ = "reviews"

    review_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    product_id: Mapped[str] = mapped_column(String(64), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_id: Mapped[str] = mapped_column(String(64), nullable=False)
    rating: Mapped[int] = mapped_column(Integer, default=5)
    title: Mapped[str] = mapped_column(String(255), default="")
    body: Mapped[str] = mapped_column(String(1000), default="")
    date: Mapped[str] = mapped_column(String(64), nullable=False)
    helpful_votes: Mapped[int] = mapped_column(Integer, default=0)
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    verified_purchase: Mapped[bool] = mapped_column(Boolean, default=True)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    flag_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    seller: Mapped["Seller"] = relationship("Seller", back_populates="reviews")

    def __repr__(self) -> str:
        return f"<Review id={self.review_id} rating={self.rating}>"
