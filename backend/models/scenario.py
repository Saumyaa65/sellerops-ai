from sqlalchemy import String, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from models.base import Base
from typing import Optional, List, Dict, Any

class InvestigationScenario(Base):
    __tablename__ = "investigation_scenarios"

    scenario_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seller_id: Mapped[str] = mapped_column(String(64), ForeignKey("sellers.id"), primary_key=True)
    
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(500), default="")
    trigger_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True)
    expected_issues: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    expected_severity: Mapped[str] = mapped_column(String(64), default="medium")
    context: Mapped[str] = mapped_column(String(1000), default="")

    seller: Mapped["Seller"] = relationship("Seller", back_populates="investigation_scenarios")

    def __repr__(self) -> str:
        return f"<InvestigationScenario id={self.scenario_id} name={self.name}>"
