import toast from 'react-hot-toast';

// UPDATED: Use environment variable with fallback
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const TIMEOUT_MS = 10000; // 10 seconds

/**
 * internal helper to handle fetch requests with timeout and error parsing
 */
const apiFetch = async (endpoint, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    // Handle non-200 responses
    if (!response.ok) {
      let errorMessage = "An unexpected error occurred";
      
      // Attempt to parse specific error message from backend
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch (e) {
        // Fallback for non-JSON error responses
      }

      // Map status codes to user-friendly messages
      switch (response.status) {
        case 404:
          errorMessage = "Resource not found (404)";
          break;
        case 429:
          errorMessage = "Rate limit exceeded. Please wait a moment.";
          break;
        case 500:
        case 502:
        case 503:
          errorMessage = "Server error. Please try again later.";
          break;
        default:
          errorMessage = `Error: ${errorMessage}`;
      }

      throw new Error(errorMessage);
    }

    // Success
    const data = await response.json();
    return { success: true, data };

  } catch (error) {
    clearTimeout(timeoutId);

    let errorMsg = error.message;

    // Handle Timeout specifically
    if (error.name === 'AbortError') {
      errorMsg = "Request timed out. Backend is slow or unreachable.";
    } 
    // Handle Network Connection Refused
    else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
      errorMsg = "Cannot connect to backend. Is the server running?";
    }

    // Trigger UI notification
    toast.error(errorMsg);

    return { success: false, error: errorMsg };
  }
};

export const api = {
  // Execute the multi-agent workflow
  sendQuery: async (query, agentId = "user_agent", forceAllAgents = false) => {
    const toastId = toast.loading("Processing query...");
    
    const result = await apiFetch("/api/query", {
      method: "POST",
      body: JSON.stringify({ 
        query, 
        agent_id: agentId,
        force_all_agents: forceAllAgents 
      }),
    });

    toast.dismiss(toastId);
    
    if (result.success) {
      toast.success("Response received!");
    }
    
    return result;
  },

  // Simple chat endpoint (no orchestration)
  sendSimpleChat: async (query, agentId = "default_agent") => {
    const toastId = toast.loading("Sending message...");
    
    const result = await apiFetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ query, agent_id: agentId }),
    });

    toast.dismiss(toastId);
    
    if (result.success) {
      toast.success("Response received!");
    }
    
    return result;
  },

  // Get circuit breaker state
  getAgentStatus: async (agentId) => {
    return apiFetch(`/api/agents/${agentId}/circuit`);
  },

  // Get current cost usage
  getAgentCost: async (agentId) => {
    return apiFetch(`/api/agents/${agentId}/cost`);
  },

  // Direct chat with a specific agent
  sendChat: async (agentId, messages) => {
    const toastId = toast.loading(`Chatting with ${agentId}...`);
    
    const result = await apiFetch(`/api/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ messages }),
    });

    toast.dismiss(toastId);
    return result;
  },
};

// ADDED: Export configuration for debugging/reference
export const API_CONFIG = {
  BASE_URL,
  TIMEOUT_MS,
  ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING === 'true'
};