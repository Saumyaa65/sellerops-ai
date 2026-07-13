"""
Investigation ORM model — stores root cause analyses and outcomes.
"""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from models.base import Base
from utils.helpers import utc_now


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    run_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    issue_type: Mapped[str] = mapped_column(String(128), nullable=False)
    marketplace: Mapped[str] = mapped_column(String(64), default="meesho")
    severity: Mapped[str] = mapped_column(String(32), default="medium")  # low | medium | high | critical
    root_cause: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    action_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    generated_appeal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resolution_status: Mapped[str] = mapped_column(String(32), default="open")  # open | resolved | dismissed
    stored_in_memory: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    def __repr__(self) -> str:
        return f"<Investigation id={self.id} type={self.issue_type} severity={self.severity}>"
