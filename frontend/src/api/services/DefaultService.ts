import type { AgentState } from '../models/AgentState';
import type { ChatRequest } from '../models/ChatRequest';
import type { CircuitBreakerState } from '../models/CircuitBreakerState';
import type { CostEvent } from '../models/CostEvent';
import type { CreateCostEventRequest } from '../models/CreateCostEventRequest';
import type { QueryRequest } from '../models/QueryRequest';
import type { SimpleChatRequest } from '../models/SimpleChatRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export type TDataRecordCostEventApiCostEventsPost = {
                requestBody: CreateCostEventRequest
            }
export type TDataGetAgentCostApiAgentsAgentIdCostGet = {
                agentId: string
            }
export type TDataGetAgentCircuitStateApiAgentsAgentIdCircuitGet = {
                agentId: string
            }
export type TDataCheckAgentBudgetApiAgentsAgentIdCircuitCheckBudgetPost = {
                agentId: string
            }
export type TDataChatAgentApiAgentsAgentIdChatPost = {
                agentId: string
requestBody: ChatRequest
            }
export type TDataSimpleChatApiChatPost = {
                requestBody: SimpleChatRequest
            }
export type TDataExecuteComplexQueryApiQueryPost = {
                requestBody: QueryRequest
            }

export class DefaultService {

	/**
	 * Health Check
	 * @returns unknown Successful Response
	 * @throws ApiError
	 */
	public static healthCheckHealthGet(): CancelablePromise<unknown> {
				return __request(OpenAPI, {
			method: 'GET',
			url: '/health',
		});
	}

	/**
	 * Get Agents
	 * Returns the current state of all agents.
 * (Mock data for Contract Validation)
	 * @returns AgentState Successful Response
	 * @throws ApiError
	 */
	public static getAgentsApiAgentsGet(): CancelablePromise<Array<AgentState>> {
				return __request(OpenAPI, {
			method: 'GET',
			url: '/api/agents',
		});
	}

	/**
	 * Record Cost Event
	 * Ingests usage data, calculates financial cost using Groq pricing,
 * records the event in history, and updates the agent's total balance.
	 * @returns CostEvent Successful Response
	 * @throws ApiError
	 */
	public static recordCostEventApiCostEventsPost(data: TDataRecordCostEventApiCostEventsPost): CancelablePromise<CostEvent> {
		const {
requestBody,
} = data;
		return __request(OpenAPI, {
			method: 'POST',
			url: '/api/cost-events',
			body: requestBody,
			mediaType: 'application/json',
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Get Agent Cost
	 * Returns the total cumulative cost for a specific agent.
	 * @returns unknown Successful Response
	 * @throws ApiError
	 */
	public static getAgentCostApiAgentsAgentIdCostGet(data: TDataGetAgentCostApiAgentsAgentIdCostGet): CancelablePromise<unknown> {
		const {
agentId,
} = data;
		return __request(OpenAPI, {
			method: 'GET',
			url: '/api/agents/{agent_id}/cost',
			path: {
				agent_id: agentId
			},
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Get Agent Circuit State
	 * Returns the current circuit breaker state (Open/Closed/Half-Open) for an agent.
 * Initializes default state if none exists.
	 * @returns CircuitBreakerState Successful Response
	 * @throws ApiError
	 */
	public static getAgentCircuitStateApiAgentsAgentIdCircuitGet(data: TDataGetAgentCircuitStateApiAgentsAgentIdCircuitGet): CancelablePromise<CircuitBreakerState> {
		const {
agentId,
} = data;
		return __request(OpenAPI, {
			method: 'GET',
			url: '/api/agents/{agent_id}/circuit',
			path: {
				agent_id: agentId
			},
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Check Agent Budget
	 * Manually triggers a budget check against the CostTracker.
 * If the budget is exceeded, this will trip the circuit to OPEN.
	 * @returns CircuitBreakerState Successful Response
	 * @throws ApiError
	 */
	public static checkAgentBudgetApiAgentsAgentIdCircuitCheckBudgetPost(data: TDataCheckAgentBudgetApiAgentsAgentIdCircuitCheckBudgetPost): CancelablePromise<CircuitBreakerState> {
		const {
agentId,
} = data;
		return __request(OpenAPI, {
			method: 'POST',
			url: '/api/agents/{agent_id}/circuit/check-budget',
			path: {
				agent_id: agentId
			},
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Chat Agent
	 * Sends a chat message to the agent (requires full message history).
 * Automatically handles:
 * 1. Circuit Breaker check (switches to Ollama if Open)
 * 2. Cost Tracking (records usage if using Groq)
 * 3. Error handling (updates failure count)
	 * @returns unknown Successful Response
	 * @throws ApiError
	 */
	public static chatAgentApiAgentsAgentIdChatPost(data: TDataChatAgentApiAgentsAgentIdChatPost): CancelablePromise<unknown> {
		const {
agentId,
requestBody,
} = data;
		return __request(OpenAPI, {
			method: 'POST',
			url: '/api/agents/{agent_id}/chat',
			path: {
				agent_id: agentId
			},
			body: requestBody,
			mediaType: 'application/json',
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Simple Chat
	 * Simple conversational chat endpoint.
 * No orchestration, just direct LLM interaction.
 * Faster and cheaper for basic queries.
	 * @returns unknown Successful Response
	 * @throws ApiError
	 */
	public static simpleChatApiChatPost(data: TDataSimpleChatApiChatPost): CancelablePromise<unknown> {
		const {
requestBody,
} = data;
		return __request(OpenAPI, {
			method: 'POST',
			url: '/api/chat',
			body: requestBody,
			mediaType: 'application/json',
			errors: {
				422: `Validation Error`,
			},
		});
	}

	/**
	 * Execute Complex Query
	 * Executes a multi-agent workflow:
 * 1. Coordinator analyzes query
 * 2. Smart routing to Researcher/Coder (or neither)
 * 3. Final synthesis (if needed)
 * 
 * Set force_all_agents=true to always invoke all agents.
	 * @returns unknown Successful Response
	 * @throws ApiError
	 */
	public static executeComplexQueryApiQueryPost(data: TDataExecuteComplexQueryApiQueryPost): CancelablePromise<unknown> {
		const {
requestBody,
} = data;
		return __request(OpenAPI, {
			method: 'POST',
			url: '/api/query',
			body: requestBody,
			mediaType: 'application/json',
			errors: {
				422: `Validation Error`,
			},
		});
	}

}