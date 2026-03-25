from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.sql import func
from app.database import Base

class APIEndpoint(Base):
    __tablename__ = "api_endpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    route_name = Column(String(255), unique=True, index=True, nullable=False)
    http_method = Column(String(10), nullable=False, default="POST")
    prompt_template = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class APILog(Base):
    __tablename__ = "api_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    endpoint_id = Column(Integer, ForeignKey("api_endpoints.id"), nullable=True)
    request_payload = Column(JSON, nullable=True)
    response_payload = Column(Text, nullable=True)
    tokens_used = Column(Integer, default=0)
    response_time_ms = Column(Float, default=0.0)
    cost = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
