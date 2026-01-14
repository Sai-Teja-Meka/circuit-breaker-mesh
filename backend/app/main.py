import json
import os
from contextlib import asynccontextmanager
from typing import List, Dict
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from redis.asyncio import Redis
from pydantic import BaseModel

# Import our rigorous data definitions and services
from .models import AgentState, CostEvent, CircuitBreakerState
from .services.cost_tracker import CostTracker
from .services.circuit_breaker import CircuitBreaker
from .services.llm_service import LLMService
from .services.orchestrator import MultiAgentOrchestrator

# --- LIFESPAN MANAGER (Resource Lifecycle) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages the lifecycle of the application resources (Redis, Services).
    Also ensures the Contract (OpenAPI schema) is exported on every startup.
    """
    # 1. Initialize Infrastructure
    redis_url = os.getenv("REDIS_URL", "redis://redis:6379/0")
    
    # CRITICAL FIX: decode_responses=False ensures we get bytes, 
    # which CircuitBreaker manually decodes.
    redis_client = Redis.from_url(redis_url, decode_responses=False)
    
    # 2. Initialize Logic Services
    # We store these in app.state for dependency injection
    app.state.redis = redis_client
    
    # Initialize CostTracker
    cost_tracker = CostTracker(redis_client)
    app.state.cost_tracker = cost_tracker
    
    # Initialize CircuitBreaker (depends on CostTracker)
    circuit_breaker = CircuitBreaker(redis_client, cost_tracker)
    app.state.circuit_breaker = circuit_breaker

    # Initialize LLMService (depends on CircuitBreaker & CostTracker)
    groq_api_key = os.getenv("GROQ_API_KEY", "")
    llm_service = LLMService(groq_api_key, circuit_breaker, cost_tracker)
    app.state.llm_service = llm_service

    # Initialize Orchestrator (depends on LLMService)
    orchestrator = MultiAgentOrchestrator(llm_service)
    app.state.orchestrator = orchestrator
    
    print(f"✅ Connected to Redis at {redis_url}")
    print("✅ Services initialized: CostTracker, CircuitBreaker, LLMService, Orchestrator")

    # 3. Export Schema (Contract-First)
    # This guarantees that the Frontend (running in dev mode) always sees 
    # the latest types from the Backend.
    try:
        openapi_data = app.openapi()
        output_path = "/app/openapi.json"
        with open(output_path, "w") as f:
            json.dump(openapi_data, f, indent=2)
        print(f"✅ OpenAPI schema exported to {output_path}")
    except Exception as e:
        print(f"⚠️ Schema export skipped (likely running outside Docker): {e}")

    yield

    # 4. Graceful Shutdown
    await redis_client.aclose()
    print("🛑 Redis connection closed")


app = FastAPI(
    title="Circuit Breaker Mesh",
    description="Multi-Agent System with Cost Tracking & 3D Observability",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DEPENDENCY INJECTION ---

def get_tracker(request: Request) -> CostTracker:
    """Injects the CostTracker service instance."""
    return request.app.state.cost_tracker

def get_circuit_breaker(request: Request) -> CircuitBreaker:
    """Injects the CircuitBreaker service instance."""
    return request.app.state.circuit_breaker

def get_llm_service(request: Request) -> LLMService:
    """Injects the LLMService instance."""
    return request.app.state.llm_service

def get_orchestrator(request: Request) -> MultiAgentOrchestrator:
    """Injects the MultiAgentOrchestrator instance."""
    return request.app.state.orchestrator

# --- REQUEST MODELS ---

class CreateCostEventRequest(BaseModel):
    """
    Input payload for recording a cost event.
    The backend calculates the actual cost_usd based on the model.
    """
    agent_id: str
    model: str
    tokens_prompt: int
    tokens_completion: int

class ChatRequest(BaseModel):
    """
    Input payload for sending a chat message to an agent (Structured messages list).
    """
    messages: List[Dict[str, str]]

class SimpleChatRequest(BaseModel):
    """Simple chat input - just a query string."""
    query: str
    agent_id: str = "default_agent"

class QueryRequest(BaseModel):
    """
    Input payload for a complex multi-agent query.
    """
    query: str
    agent_id: str = "user_agent"
    force_all_agents: bool = False

# --- ENDPOINTS ---

@app.get("/health")
async def health_check():
    return {
        "status": "ok", 
        "phase": "3_orchestrator",
        "features": [
            "cost_tracking",
            "circuit_breaker", 
            "llm_routing",
            "multi_agent_orchestration",
            "simple_chat"
        ]
    }

@app.get("/api/agents", response_model=List[AgentState])
async def get_agents():
    """
    Returns the current state of all agents.
    (Mock data for Contract Validation)
    """
    return []

@app.post("/api/cost-events", response_model=CostEvent)
async def record_cost_event(
    event_request: CreateCostEventRequest,
    tracker: CostTracker = Depends(get_tracker)
):
    """
    Ingests usage data, calculates financial cost using Groq pricing,
    records the event in history, and updates the agent's total balance.
    """
    return await tracker.track_cost_event(
        agent_id=event_request.agent_id,
        model=event_request.model,
        tokens_prompt=event_request.tokens_prompt,
        tokens_completion=event_request.tokens_completion
    )

@app.get("/api/agents/{agent_id}/cost")
async def get_agent_cost(
    agent_id: str,
    tracker: CostTracker = Depends(get_tracker)
):
    """
    Returns the total cumulative cost for a specific agent.
    """
    total = await tracker.get_total_cost(agent_id)
    return {"agent_id": agent_id, "total_cost_usd": float(total)}

@app.get("/api/agents/{agent_id}/circuit", response_model=CircuitBreakerState)
async def get_agent_circuit_state(
    agent_id: str,
    circuit_breaker: CircuitBreaker = Depends(get_circuit_breaker)
):
    """
    Returns the current circuit breaker state (Open/Closed/Half-Open) for an agent.
    Initializes default state if none exists.
    """
    return await circuit_breaker.get_state(agent_id)

@app.post("/api/agents/{agent_id}/circuit/check-budget", response_model=CircuitBreakerState)
async def check_agent_budget(
    agent_id: str,
    circuit_breaker: CircuitBreaker = Depends(get_circuit_breaker)
):
    """
    Manually triggers a budget check against the CostTracker.
    If the budget is exceeded, this will trip the circuit to OPEN.
    """
    return await circuit_breaker.check_budget(agent_id)

@app.post("/api/agents/{agent_id}/chat")
async def chat_agent(
    agent_id: str,
    chat_request: ChatRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    Sends a chat message to the agent (requires full message history).
    Automatically handles:
    1. Circuit Breaker check (switches to Ollama if Open)
    2. Cost Tracking (records usage if using Groq)
    3. Error handling (updates failure count)
    """
    try:
        content, cost_event = await llm_service.invoke_with_tracking(
            agent_id, 
            chat_request.messages
        )
        return {
            "response": content,
            "cost_event": cost_event
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def simple_chat(
    request: SimpleChatRequest,
    llm_service: LLMService = Depends(get_llm_service)
):
    """
    Simple conversational chat endpoint.
    No orchestration, just direct LLM interaction.
    Faster and cheaper for basic queries.
    """
    try:
        messages = [{"role": "user", "content": request.query}]
        content, cost_event = await llm_service.invoke_with_tracking(
            request.agent_id, 
            messages
        )
        return {
            "response": content,
            "cost_usd": float(cost_event.cost_usd),
            "model_used": cost_event.model_used,
            "agent_id": request.agent_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/query")
async def execute_complex_query(
    query_request: QueryRequest,
    orchestrator: MultiAgentOrchestrator = Depends(get_orchestrator)
):
    """
    Executes a multi-agent workflow:
    1. Coordinator analyzes query
    2. Smart routing to Researcher/Coder (or neither)
    3. Final synthesis (if needed)
    
    Set force_all_agents=true to always invoke all agents.
    """
    try:
        results = await orchestrator.execute_query(
            query_request.query, 
            query_request.agent_id,
            force_all_agents=query_request.force_all_agents
        )
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))