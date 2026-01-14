from typing import List, Tuple, Dict, Any
from langchain_groq import ChatGroq
from langchain_ollama import ChatOllama
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage, BaseMessage
from app.models import CostEvent
from app.services.circuit_breaker import CircuitBreaker
from app.services.cost_tracker import CostTracker

class LLMService:
    def __init__(self, groq_api_key: str, circuit_breaker: CircuitBreaker, cost_tracker: CostTracker):
        self.groq_api_key = groq_api_key
        self.circuit_breaker = circuit_breaker
        self.cost_tracker = cost_tracker
        self.default_model = "llama-3.3-70b-versatile"

    async def get_llm_for_agent(self, agent_id: str) -> BaseChatModel:
        """
        Determines which LLM to return based on the Circuit Breaker state.
        - Closed/Half-Open: Returns paid Groq model (High performance).
        - Open (Budget Exceeded/Errors): Returns free local Ollama model (Fallback).
        """
        is_allowed, reason = await self.circuit_breaker.can_execute(agent_id)

        if not is_allowed:
            print(f"⚠️ Circuit Open for Agent {agent_id}: {reason}. Switching to Free Fallback (Ollama).")
            # Return Free Local Fallback
            return ChatOllama(
                model="llama3.1:8b",
                base_url="http://host.docker.internal:11434",
                temperature=0.7
            )

        # Return Paid High-Performance API
        return ChatGroq(
            temperature=0.7,
            model_name=self.default_model,
            groq_api_key=self.groq_api_key,
            max_retries=2
        )

    async def invoke_with_tracking(self, agent_id: str, messages: List[Dict[str, str]]) -> Tuple[str, CostEvent]:
        """
        Invokes the assigned LLM and handles cost tracking and circuit state updates.
        """
        # Convert dictionary messages to LangChain Message objects
        langchain_messages: List[BaseMessage] = []
        for msg in messages:
            if msg.get("role") == "system":
                langchain_messages.append(SystemMessage(content=msg["content"]))
            else:
                langchain_messages.append(HumanMessage(content=msg["content"]))

        try:
            # 1. Get the appropriate LLM (Groq or Ollama)
            llm = await self.get_llm_for_agent(agent_id)
            
            # 2. Invoke the model
            response = await llm.ainvoke(langchain_messages)
            content = str(response.content)

            # 3. Handle Success & Tracking based on provider
            if isinstance(llm, ChatGroq):
                # Extract token usage from Groq metadata
                usage = response.response_metadata.get("token_usage", {})
                prompt_tokens = usage.get("prompt_tokens", 0)
                completion_tokens = usage.get("completion_tokens", 0)

                # Record financial cost
                cost_event = await self.cost_tracker.track_cost_event(
                    agent_id=agent_id,
                    model=self.default_model,
                    tokens_prompt=prompt_tokens,
                    tokens_completion=completion_tokens
                )
                
                # Record success to keep circuit closed
                await self.circuit_breaker.record_success(agent_id)
                
                return content, cost_event
            
            else:
                # Fallback (Ollama) - No financial cost
                # We log a 0-cost event for audit history
                cost_event = await self.cost_tracker.track_cost_event(
                    agent_id=agent_id,
                    model="ollama/llama3.1:8b",
                    tokens_prompt=0,
                    tokens_completion=0
                )
                return content, cost_event

        except Exception as e:
            # 4. Handle Failure
            # Record the failure to potentially trip the circuit
            await self.circuit_breaker.record_failure(agent_id, str(e))
            raise e