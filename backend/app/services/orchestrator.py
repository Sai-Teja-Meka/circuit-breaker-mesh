from typing import Dict, Any, Optional, Tuple, List
from decimal import Decimal
from app.services.llm_service import LLMService
from app.models import CostEvent

class MultiAgentOrchestrator:
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
        self.agent_configs = {
            "coordinator": {
                "role": "Query Analyzer",
                "prompt": "Analyze user query and decide which agents to invoke"
            },
            "researcher": {
                "role": "Information Retriever",
                "prompt": "Search and provide factual information"
            },
            "coder": {
                "role": "Code Generator",
                "prompt": "Generate Python code solutions"
            }
        }

    async def execute_query(self, user_query: str, requesting_agent_id: str, force_all_agents: bool = False) -> Dict[str, Any]:
        """
        Orchestrates the multi-agent workflow:
        1. Coordinator analyzes the intent.
        2. Dispatches tasks to Researcher and/or Coder (Conditioned on analysis).
        3. Synthesizes the final response or returns direct answer.
        """
        results = {
            "coordinator_analysis": "",
            "researcher_response": None,
            "coder_response": None,
            "final_answer": "",
            "total_cost": Decimal("0.00"),
            "agents_used": [],
            "routing_decision": {}
        }

        # --- Step 1: Coordinator Analysis ---
        # We use the 'coordinator' identity for cost tracking here
        coord_response, coord_cost = await self._invoke_coordinator(user_query, "coordinator")
        
        results["coordinator_analysis"] = coord_response
        results["total_cost"] += coord_cost.cost_usd
        results["agents_used"].append("coordinator")

        # --- Logic to determine next steps ---
        needs_research = False
        needs_code = False

        if force_all_agents:
            needs_research = True
            needs_code = True
            results["routing_decision"] = {
                "reason": "forced_all_agents", 
                "research": True, 
                "code": True
            }
        else:
            # Smart Routing
            routing = self._parse_coordinator_decision(coord_response)
            needs_research = routing["research"]
            needs_code = routing["code"]
            results["routing_decision"] = {
                "reason": "coordinator_analysis", 
                "research": needs_research, 
                "code": needs_code
            }

        # --- Step 2: Specialized Execution (Conditional) ---
        if needs_research:
            res_response, res_cost = await self._invoke_researcher(user_query, "researcher")
            results["researcher_response"] = res_response
            results["total_cost"] += res_cost.cost_usd
            results["agents_used"].append("researcher")

        if needs_code:
            code_response, code_cost = await self._invoke_coder(user_query, "coder")
            results["coder_response"] = code_response
            results["total_cost"] += code_cost.cost_usd
            results["agents_used"].append("coder")

        # --- Step 3: Synthesis or Direct Answer ---
        if needs_research or needs_code:
            # The coordinator synthesizes the final answer if sub-agents were used
            final_answer, synth_cost = await self._synthesize_results(
                user_query, 
                results["coordinator_analysis"], 
                results["researcher_response"], 
                results["coder_response"], 
                "coordinator"
            )
            results["final_answer"] = final_answer
            results["total_cost"] += synth_cost.cost_usd
        else:
            # Save money: Use the analysis as the answer for simple queries
            results["final_answer"] = self._extract_direct_answer(coord_response, user_query)

        return results

    def _parse_coordinator_decision(self, analysis: str) -> Dict[str, bool]:
        """
        Parses the LLM's natural language analysis to determine routing.
        """
        text = analysis.lower()
        
        # 1. Check for explicit "Neither" or "Simple" patterns (Short-circuit)
        negative_patterns = ["requires neither", "needs neither", "not needed", "simple", "immediately", "no research", "no code"]
        
        # If explicitly stated that nothing is needed
        if "requires neither" in text or "needs neither" in text:
            return {"research": False, "code": False}

        # 2. Check for "Both"
        if "both" in text:
            return {"research": True, "code": True}

        # 3. keyword detection
        research = False
        code = False
        
        # Research keywords
        if any(w in text for w in ["research", "information", "facts", "data", "search"]):
            research = True
            
        # Code keywords
        if any(w in text for w in ["code", "function", "python", "script", "program", "implement"]):
            code = True
            
        # If "no research" or "no code" appeared in text, we might want to ensure false,
        # but usually the positive keywords won't appear in that context unless negating.
        # This simple heuristic relies on the prompt structure.
        
        return {"research": research, "code": code}

    def _extract_direct_answer(self, coordinator_analysis: str, query: str) -> str:
        """
        Formats a direct answer when no sub-agents were required.
        """
        return (
            f"**Direct Answer:**\n\n"
            f"Based on the query \"{query}\", the answer can be provided immediately:\n\n"
            f"{coordinator_analysis}\n\n"
            f"*Note: This query did not require specialized research or code generation agents.*"
        )

    async def _invoke_coordinator(self, user_query: str, agent_id: str) -> Tuple[str, CostEvent]:
        prompt = f"""
        Analyze this query and determine if it needs: research, code, both, or neither.
        Be specific in your reasoning.
        
        For simple queries (basic math, definitions, yes/no questions), explicitly state "requires neither research nor code".
        For research queries (explanations, facts, information), state "requires research".
        For coding queries (functions, scripts, implementations), state "requires code".
        For complex queries needing both, state "requires both research and code".
        
        Query: {user_query}
        """
        messages = [
            {"role": "system", "content": self.agent_configs["coordinator"]["prompt"]},
            {"role": "user", "content": prompt}
        ]
        return await self.llm_service.invoke_with_tracking(agent_id, messages)

    async def _invoke_researcher(self, query: str, agent_id: str) -> Tuple[str, CostEvent]:
        prompt = f"Research and provide information about: {query}"
        messages = [
            {"role": "system", "content": self.agent_configs["researcher"]["prompt"]},
            {"role": "user", "content": prompt}
        ]
        return await self.llm_service.invoke_with_tracking(agent_id, messages)

    async def _invoke_coder(self, query: str, agent_id: str) -> Tuple[str, CostEvent]:
        prompt = f"Generate Python code for: {query}"
        messages = [
            {"role": "system", "content": self.agent_configs["coder"]["prompt"]},
            {"role": "user", "content": prompt}
        ]
        return await self.llm_service.invoke_with_tracking(agent_id, messages)

    async def _synthesize_results(
        self, 
        user_query: str, 
        coordinator: str, 
        researcher: Optional[str], 
        coder: Optional[str], 
        agent_id: str
    ) -> Tuple[str, CostEvent]:
        
        content_parts = [f"Original Query: {user_query}", f"Coordinator Plan: {coordinator}"]
        
        if researcher:
            content_parts.append(f"Researcher Findings: {researcher}")
        if coder:
            content_parts.append(f"Generated Code: {coder}")
            
        content_parts.append("Please synthesize these results into a helpful, final answer for the user.")
        
        messages = [
            {"role": "system", "content": "Synthesize the provided information into a clear final answer."},
            {"role": "user", "content": "\n\n".join(content_parts)}
        ]
        return await self.llm_service.invoke_with_tracking(agent_id, messages)