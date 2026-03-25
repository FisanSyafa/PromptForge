from pydantic import BaseModel
from typing import Optional, Any, Dict
from datetime import datetime

class APIEndpointCreate(BaseModel):
    name: str
    route_name: str
    http_method: str = "POST"
    prompt_template: str

class APIEndpointResponse(BaseModel):
    id: int
    name: str
    route_name: str
    http_method: str
    prompt_template: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class APILogResponse(BaseModel):
    id: int
    endpoint_id: int
    request_payload: Optional[Dict[str, Any]]
    response_payload: Optional[str]
    tokens_used: int
    response_time_ms: float
    cost: float
    created_at: datetime

    class Config:
        from_attributes = True

class DashboardStats(BaseModel):
    total_endpoints: int
    total_calls: int
    total_tokens: int
    total_cost: float
    avg_response_time_ms: float

class EndpointGenerateRequest(BaseModel):
    description: str
    model_name: str = "gemini-2.5-flash"
