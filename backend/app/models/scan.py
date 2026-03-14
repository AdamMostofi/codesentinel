from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
import uuid
from datetime import datetime
from app.database import Base


class Scan(Base):
    __tablename__ = "scans"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_name = Column(String(255), nullable=False)
    status = Column(
        String(50), default="pending"
    )  # pending, scanning, completed, failed
    risk_score = Column(Integer, nullable=True)
    file_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)


class Vulnerability(Base):
    __tablename__ = "vulnerabilities"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey("scans.id"))
    tool = Column(String(50))  # 'bandit' or 'safety'
    severity = Column(String(20))  # low, medium, high, critical
    title = Column(String(255))
    description = Column(Text)
    file_path = Column(String(500))
    line_number = Column(Integer, nullable=True)
    code_snippet = Column(Text, nullable=True)
    remediation = Column(Text, nullable=True)
    raw_output = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
