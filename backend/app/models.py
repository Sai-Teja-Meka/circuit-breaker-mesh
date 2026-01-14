# backend/app/models.py
from pydantic import BaseModel, Field
from typing import Tuple, Optional
from enum import Enum
from decimal import Decimal
from datetime import datetime
import uuid

# --- 1. Enums (Strict State Definitions) ---

class AgentType(str, Enum):
    COORDINATOR = "coordinator"
    RESEARCH = "research"
    CODE = "code"

class AgentStatus(str, Enum):
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING_TOOL = "executing_tool"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"

class CircuitStatus(str, Enum):
    CLOSED = "closed"       # Normal
    OPEN = "open"           # Tripped (Too many errors or budget exceeded)
    HALF_OPEN = "half_open" # Testing recovery

# --- 2. Atomic Components ---

class AgentMetrics(BaseModel):
    agent_id: str
    tokens_consumed: int = 0
    # Changed decimal_places to ge=0 (non-negative)
    cost_usd: Decimal = Field(default=Decimal("0.00"), ge=0)
    api_calls_total: int = 0
    api_calls_failed: int = 0
    latency_ms: float = 0.0
    latency_p95_ms: float = 0.0

class CircuitBreakerState(BaseModel):
    agent_id: str
    status: CircuitStatus = CircuitStatus.CLOSED
    failure_count: int = 0
    # Changed decimal_places to ge=0
    budget_limit_usd: Decimal = Field(default=Decimal("5.00"), ge=0)
    budget_consumed_usd: Decimal = Field(default=Decimal("0.00"), ge=0)
    fallback_model: str = "ollama-mistral"
    # Added missing fields
    last_failure_time: Optional[datetime] = None
    reset_timeout_seconds: int = 60

class CostEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str
    model_used: str
    tokens_prompt: int
    tokens_completion: int
    # Changed decimal_places to ge=0
    cost_usd: Decimal = Field(ge=0)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# --- 3. Composite States ---

class AgentState(BaseModel):
    agent_id: str
    agent_type: AgentType
    status: AgentStatus = AgentStatus.IDLE
    current_task: Optional[str] = None
    progress: float = Field(default=0.0, ge=0.0, le=1.0)
    # The X, Y, Z coordinates for the 3D Frontend
    position_3d: Tuple[float, float, float] = (0.0, 0.0, 0.0) 
    metrics: AgentMetrics
    circuit_breaker: CircuitBreakerState
    # Added timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Added config for Decimal serialization
    model_config = {"json_encoders": {Decimal: lambda v: float(v)}}

class SystemMetrics(BaseModel):
    total_agents_active: int = 0
    total_cost_usd: Decimal = Field(default=Decimal("0.00"), ge=0)
    total_tokens_consumed: int = 0
    circuit_breakers_open: int = 0

    # Added config for Decimal serialization
    model_config = {"json_encoders": {Decimal: lambda v: float(v)}}