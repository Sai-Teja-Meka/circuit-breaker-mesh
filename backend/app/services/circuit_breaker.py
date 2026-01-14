import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Tuple, Optional, Any

from redis.asyncio import Redis

from app.models import CircuitBreakerState, CircuitStatus
from app.services.cost_tracker import CostTracker

class CircuitBreaker:
    def __init__(self, redis_client: Redis, cost_tracker: CostTracker):
        self.redis = redis_client
        self.cost_tracker = cost_tracker
        self.timeout_seconds = 60  # Time before retrying an open circuit

    async def get_state(self, agent_id: str) -> CircuitBreakerState:
        """
        Fetch current circuit state from Redis.
        If not found, initializes a default closed state.
        """
        key = f"circuit_breaker:{agent_id}"
        
        # hgetall returns a dict of byte strings {b'field': b'value'}
        data = await self.redis.hgetall(key)
        
        if not data:
            # Initialize new default state
            new_state = CircuitBreakerState(
                agent_id=agent_id,
                status=CircuitStatus.CLOSED,
                failure_count=0,
                budget_limit_usd=Decimal("5.00"),
                budget_consumed_usd=Decimal("0.00"),
                last_failure_time=None
            )
            await self._save_state(new_state)
            return new_state

        # Decode byte strings to regular strings for processing
        decoded_data = {k.decode('utf-8'): v.decode('utf-8') for k, v in data.items()}

        # Convert string representations back to proper types
        if 'last_failure_time' in decoded_data and decoded_data['last_failure_time']:
            decoded_data['last_failure_time'] = datetime.fromisoformat(decoded_data['last_failure_time'])
        elif 'last_failure_time' in decoded_data:
            decoded_data['last_failure_time'] = None

        # Decimal fields
        for field in ['budget_limit_usd', 'budget_consumed_usd']:
            if field in decoded_data:
                decoded_data[field] = Decimal(decoded_data[field])

        # Integer fields
        if 'failure_count' in decoded_data:
            decoded_data['failure_count'] = int(decoded_data['failure_count'])

        return CircuitBreakerState(**decoded_data)

    async def _save_state(self, state: CircuitBreakerState):
        """
        Persist the Pydantic model to Redis Hash.
        Handles serialization of Decimal and datetime objects.
        """
        key = f"circuit_breaker:{state.agent_id}"
        
        # Convert model to dict
        state_dict = state.model_dump()
        
        # Prepare dict for Redis (convert complex types to strings)
        redis_data = {}
        for k, v in state_dict.items():
            if v is None:
                continue # Redis hashes don't store nulls well, skip or store empty string
            elif isinstance(v, Decimal):
                redis_data[k] = str(v)
            elif isinstance(v, datetime):
                redis_data[k] = v.isoformat()
            elif isinstance(v, CircuitStatus): # Handle Enum
                redis_data[k] = v.value
            else:
                redis_data[k] = str(v)

        await self.redis.hset(key, mapping=redis_data)

    async def record_success(self, agent_id: str) -> CircuitBreakerState:
        """
        Action succeeded. Reset failures. 
        If circuit was half-open, close it fully.
        """
        state = await self.get_state(agent_id)
        
        state.failure_count = 0
        
        if state.status == CircuitStatus.HALF_OPEN:
            state.status = CircuitStatus.CLOSED
            
        await self._save_state(state)
        return state

    async def record_failure(self, agent_id: str, reason: str) -> CircuitBreakerState:
        """
        Action failed. Increment counter.
        Trip to OPEN if threshold reached.
        """
        state = await self.get_state(agent_id)
        
        state.failure_count += 1
        state.last_failure_time = datetime.utcnow()
        
        # Threshold logic: >= 3 failures trips the breaker
        if state.failure_count >= 3:
            state.status = CircuitStatus.OPEN
            
        await self._save_state(state)
        return state

    async def check_budget(self, agent_id: str) -> CircuitBreakerState:
        """
        Sync with CostTracker and check hard budget limits.
        """
        state = await self.get_state(agent_id)
        
        # Sync latest cost from source of truth (CostTracker)
        total_cost = await self.cost_tracker.get_total_cost(agent_id)
        state.budget_consumed_usd = total_cost
        
        # Check if budget exceeded
        if state.budget_consumed_usd >= state.budget_limit_usd:
            state.status = CircuitStatus.OPEN
            
        await self._save_state(state)
        return state

    async def can_execute(self, agent_id: str) -> Tuple[bool, str]:
        """
        Gatekeeper logic. 
        Determines if execution should proceed based on state and timeouts.
        """
        # Sync budget first to ensure circuit opens if over budget
        await self.check_budget(agent_id)

        # Get the fresh state (check_budget might have just changed it to OPEN)
        state = await self.get_state(agent_id)
        
        if state.status == CircuitStatus.CLOSED:
            return True, "Circuit closed"
            
        if state.status == CircuitStatus.HALF_OPEN:
            return True, "Circuit half-open - testing"
            
        if state.status == CircuitStatus.OPEN:
            # Check timeout logic
            if state.last_failure_time:
                elapsed = datetime.utcnow() - state.last_failure_time
                if elapsed.total_seconds() >= self.timeout_seconds:
                    # Time has passed, allow a test run (Half-Open)
                    state.status = CircuitStatus.HALF_OPEN
                    await self._save_state(state)
                    return True, "Timeout elapsed - switching to Half-Open"
            
            return False, "Circuit open - use fallback"
            
        return False, "Unknown state"