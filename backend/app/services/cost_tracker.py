# backend/app/services/cost_tracker.py
import json
import uuid
from decimal import Decimal, getcontext
from typing import Dict, Optional
from datetime import datetime
from redis.asyncio import Redis
from app.models import CostEvent

# Set precision for financial calculations
getcontext().prec = 10

class CostTracker:
    """
    Financial controller for the Agent Mesh.
    Tracks token usage, calculates costs based on Model pricing,
    and persists both cumulative totals and event history to Redis.
    """
    
    # Pricing per 1 MILLION tokens
    MODEL_PRICING: Dict[str, Dict[str, Decimal]] = {
        # High Intelligence Model (Groq)
        "llama-3.3-70b-versatile": {
            "input": Decimal("0.59"),   # $0.59 per 1M
            "output": Decimal("0.79")   # $0.79 per 1M
        },
        # Fast/Budget Model (Groq)
        "llama-3.1-8b-instant": {
            "input": Decimal("0.05"),   # $0.05 per 1M
            "output": Decimal("0.08")   # $0.08 per 1M
        },
        # Local Fallback (Ollama) - Free
        "ollama/llama3.1:8b": {
            "input": Decimal("0.00"),
            "output": Decimal("0.00")
        }
    }

    def __init__(self, redis_client: Redis):
        """
        Initialize with a Redis connection.
        """
        self.redis = redis_client
        self.cost_prefix = "agent_cost:"
        self.event_prefix = "cost_events:"

    def calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
        """
        Calculates the USD cost of an inference event based on the model pricing registry.
        Handles partial matching (e.g. "groq/llama..." matches "llama...").
        
        Args:
            model: The model identifier string
            prompt_tokens: Number of tokens in the input
            completion_tokens: Number of tokens in the output
            
        Returns:
            Decimal: The calculated cost in USD
        """
        rates = None
        
        # 1. Exact match check
        if model in self.MODEL_PRICING:
            rates = self.MODEL_PRICING[model]
        else:
            # 2. Fuzzy/Partial match check
            # e.g., "groq/llama-3.3-70b-versatile" should match "llama-3.3-70b-versatile"
            for key, pricing in self.MODEL_PRICING.items():
                if key in model:
                    rates = pricing
                    break
        
        # 3. Fallback to most expensive model if unknown (Conservative Fail-safe)
        if not rates:
            rates = self.MODEL_PRICING["llama-3.3-70b-versatile"]

        # Formula: (Tokens / 1,000,000) * Price_Per_Million
        input_cost = (Decimal(prompt_tokens) / Decimal("1000000")) * rates["input"]
        output_cost = (Decimal(completion_tokens) / Decimal("1000000")) * rates["output"]

        return input_cost + output_cost

    async def accumulate_cost(self, agent_id: str, cost: Decimal) -> Decimal:
        """
        Atomically updates the cumulative cost for an agent in Redis.
        
        Args:
            agent_id: The unique ID of the agent
            cost: The cost to add to the total
            
        Returns:
            Decimal: The new total cumulative cost
        """
        key = f"{self.cost_prefix}{agent_id}"
        
        # Redis incrbyfloat handles the atomic addition
        new_total = await self.redis.incrbyfloat(key, float(cost))
        
        return Decimal(str(new_total))

    async def track_cost_event(
        self, 
        agent_id: str, 
        model: str, 
        tokens_prompt: int, 
        tokens_completion: int
    ) -> CostEvent:
        """
        Records a complete cost transaction. Calculates cost, saves the event 
        history, and updates the cumulative total.
        
        Args:
            agent_id: The unique ID of the agent
            model: The model identifier
            tokens_prompt: Input token count
            tokens_completion: Output token count
            
        Returns:
            CostEvent: The populated event model
        """
        # 1. Calculate the financial impact
        cost_usd = self.calculate_cost(model, tokens_prompt, tokens_completion)
        
        # 2. Create the immutable event record
        event = CostEvent(
            event_id=str(uuid.uuid4()),
            agent_id=agent_id,
            model_used=model,
            tokens_prompt=tokens_prompt,
            tokens_completion=tokens_completion,
            cost_usd=cost_usd,
            timestamp=datetime.utcnow()
        )
        
        # 3. Store event in Redis List (History)
        # Using model_dump_json() for Pydantic v2 compliance
        list_key = f"{self.event_prefix}{agent_id}"
        await self.redis.rpush(list_key, event.model_dump_json())
        
        # 4. Update the Balance (Cumulative)
        await self.accumulate_cost(agent_id, cost_usd)
        
        return event

    async def get_total_cost(self, agent_id: str) -> Decimal:
        """
        Retrieves the current total spend for an agent.
        """
        key = f"{self.cost_prefix}{agent_id}"
        total = await self.redis.get(key)
        
        if total is None:
            return Decimal("0.00")
            
        return Decimal(total.decode('utf-8'))