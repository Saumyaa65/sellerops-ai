from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password: Mapped[str] = mapped_column(String(255), nullable=False)  # cleartext password for demo
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), nullable=False)

    seller: Mapped["Seller"] = relationship(back_populates="users")

    def __repr__(self) -> str:
        return f"<User email={self.email} seller_id={self.seller_id}>"
