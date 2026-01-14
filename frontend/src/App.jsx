import React, { useState, useEffect, useRef } from 'react';
import { api } from './services/api';
import AgentCard from './components/AgentCard';
import ChatMessage from './components/ChatMessage';
import CircuitMesh3D from './components/CircuitMesh3D';
import ToastProvider from './components/Toast';
import { AgentCardSkeleton, MessageSkeleton } from "./components/Skeleton";

const AGENT_IDS = ['coordinator', 'researcher', 'coder'];

function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [agents, setAgents] = useState({});
  const [loading, setLoading] = useState(false);
  
  // State variables for loading and backend status
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // New State variables for Chat Modes & Advanced Options
  const [chatMode, setChatMode] = useState("multi-agent"); // "multi-agent" or "simple"
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [forceAllAgents, setForceAllAgents] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(AGENT_IDS[0]);
  
  const messagesEndRef = useRef(null);

  // --- Stats Calculation ---
  const totalCost = Object.values(agents).reduce((sum, agent) => sum + (agent.cost || 0), 0);
  const totalQueries = messages.filter(m => m.role === 'user').length;
  const avgCost = totalQueries > 0 ? totalCost / totalQueries : 0;
  
  const mostUsedAgent = AGENT_IDS.reduce((prev, current) => {
    return (agents[current]?.cost || 0) > (agents[prev]?.cost || 0) ? current : prev;
  }, AGENT_IDS[0]);

  // --- Data Fetching ---
  const refreshAgentData = async () => {
    // Only set loading true on initial fetch (when we have no agents)
    if (Object.keys(agents).length === 0) setLoadingAgents(true);

    const newAgentData = {};
    let successCount = 0;

    for (const id of AGENT_IDS) {
      try {
        const [statusRes, costRes] = await Promise.all([
          api.getAgentStatus(id),
          api.getAgentCost(id)
        ]);

        if (statusRes.success && costRes.success) {
          newAgentData[id] = {
            name: id,
            circuitStatus: statusRes.data.status,
            budgetLimit: parseFloat(statusRes.data.budget_limit_usd),
            cost: costRes.data.total_cost_usd,
          };
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing data for ${id}`, error);
      }
    }

    if (successCount > 0) {
      setAgents(prev => ({ ...prev, ...newAgentData }));
      setBackendOnline(true);
    } else {
      setBackendOnline(false);
    }
    
    setLoadingAgents(false);
  };

  useEffect(() => {
    refreshAgentData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Handlers ---
  const handleSend = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let result;
      
      if (chatMode === "simple") {
        // Simple chat mode
        result = await api.sendSimpleChat(trimmed, selectedAgent);
        if (result.success) {
          const assistantMsg = {
            role: 'assistant',
            content: result.data.response,
            cost: result.data.cost_usd,
            model_used: result.data.model_used,
            agent_id: result.data.agent_id
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      } else {
        // Multi-agent mode
        result = await api.sendQuery(trimmed, "user_agent", forceAllAgents);
        if (result.success) {
          const assistantMsg = {
            role: 'assistant',
            content: result.data.final_answer,
            cost: result.data.total_cost,
            agents_used: result.data.agents_used,
            routing_decision: result.data.routing_decision
          };
          setMessages(prev => [...prev, assistantMsg]);
        }
      }
      
      if (!result.success) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `⚠️ Error: ${result.error || "Failed to get response."}` 
        }]);
      }
      
      await refreshAgentData(); 
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Critical Error: Client failed to process request." 
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <ToastProvider />  
      
      {/* --- Left Panel: Agent Dashboard (30%) --- */}
      <div className="w-[30%] bg-gray-100 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Agent Status</h2>
            {!backendOnline && <span className="text-xs text-red-500 font-bold">OFFLINE</span>}
          </div>
          <button 
            onClick={refreshAgentData}
            className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            disabled={loadingAgents}
          >
            {loadingAgents ? "Refreshing..." : "↻ Refresh Status"}
          </button>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1">
          {AGENT_IDS.map(id => {
            if (loadingAgents && !agents[id]) {
              return <AgentCardSkeleton key={id} />;
            }

            const agent = agents[id];
            if (!agent) return null; 
            
            return (
              <AgentCard
                key={id}
                agentId={id}
                name={agent.name}
                budgetUsed={agent.cost}
                budgetLimit={agent.budgetLimit}
                circuitStatus={agent.circuitStatus}
              />
            );
          })}
        </div>
      </div>

      {/* --- Center Panel: Chat Interface (50%) --- */}
      <div className="w-[50%] flex flex-col bg-white relative">
        <div className="p-4 border-b border-gray-200 shadow-sm z-10">
          <h1 className="text-lg font-semibold text-gray-700">Orchestrator Chat</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p>Ask a question to trigger the multi-agent system.</p>
              <p className="text-sm mt-2">Example: "Write a python script to scrape data"</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          
          {loading && <MessageSkeleton />}
          
          <div ref={messagesEndRef} />
        </div>

        {/* --- New Advanced Form Section --- */}
        <form onSubmit={handleSend} className="p-4 border-t border-gray-200 bg-white relative">
          
          {/* Backend Offline Banner */}
          {!backendOnline && (
             <div className="absolute -top-12 left-0 right-0 mx-4 p-2 bg-red-50 border border-red-200 text-red-700 text-sm flex justify-between items-center rounded-md shadow-sm">
               <div className="flex items-center gap-2">
                 <span>⚠️ Backend unavailable</span>
               </div>
               <button 
                 type="button"
                 onClick={refreshAgentData} 
                 className="text-red-800 hover:text-red-950 underline font-medium text-xs"
               >
                 Retry
               </button>
             </div>
          )}

          {/* Mode Toggle & Advanced Options Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChatMode("multi-agent")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  chatMode === "multi-agent"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                🤖 Multi-Agent
              </button>
              <button
                type="button"
                onClick={() => setChatMode("simple")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  chatMode === "simple"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                💬 Simple Chat
              </button>
            </div>
            
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
            >
              {showAdvanced ? "Hide Options ▲" : "Advanced Options ▼"}
            </button>
          </div>

          {/* Advanced Options Panel */}
          {showAdvanced && (
            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm animate-in fade-in slide-in-from-top-2 duration-200">
              {chatMode === "multi-agent" ? (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceAllAgents}
                    onChange={(e) => setForceAllAgents(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Force all agents (Override smart routing)</span>
                </label>
              ) : (
                <div className="flex items-center gap-3">
                  <label className="font-medium text-gray-700">Target Agent:</label>
                  <select
                    value={selectedAgent}
                    onChange={(e) => setSelectedAgent(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {AGENT_IDS.map(id => (
                      <option key={id} value={id}>{id.charAt(0).toUpperCase() + id.slice(1)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Input Area */}
          <div className="flex gap-2 items-end">
            
            {/* ✅ Input wrapper (relative) */}
            <div className="relative flex-1">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={1000}
                placeholder={
                  chatMode === "simple"
                    ? `Chat directly with ${selectedAgent}...`
                    : "Ask a question to trigger the multi-agent system..."
                }
                className="w-full px-4 py-3 pr-20 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                disabled={loading || !backendOnline}
              />

              {/* ✅ Character Counter pinned inside input */}
              <div className="absolute right-3 bottom-2 text-[10px] text-gray-400 font-mono">
                <span className={input.length > 1000 ? "text-red-500 font-bold" : ""}>
                  {input.length}
                </span>
                /1000
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !backendOnline || !input.trim()}
              className={`px-6 py-2 font-medium rounded-xl transition-all shadow-sm
                ${loading || !backendOnline || !input.trim()
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:transform active:scale-95"
                }`}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                "Send"
              )}
            </button>
          </div>
        </form>
      </div>

      {/* --- Right Panel: 3D Visualization & Stats (20%) --- */}
      <div className="w-[20%] bg-gray-900 border-l border-gray-800 flex flex-col">
        {/* 3D Header */}
        <div className="p-3 border-b border-gray-800 bg-gray-900">
            <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wider">3D Circuit Mesh</h2>
        </div>

        {/* 3D Component Container (Takes 50% height) */}
        <div className="h-1/2 w-full border-b border-gray-800">
            <CircuitMesh3D />
        </div>

        {/* Stats Section (Takes remaining height) */}
        <div className="flex-1 bg-gray-50 p-6 overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-6">System Stats</h2>
            
            <div className="space-y-6">
            <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Cost</p>
                <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(4)}</p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Total Queries</p>
                <p className="text-2xl font-bold text-gray-900">{totalQueries}</p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Avg. Cost / Query</p>
                <p className="text-xl font-bold text-gray-900">${avgCost.toFixed(4)}</p>
            </div>

            <div className="bg-white p-4 rounded shadow-sm border border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Most Active Agent</p>
                <p className="text-lg font-bold text-blue-600 capitalize">
                {mostUsedAgent || "—"}
                </p>
            </div>
            </div>
        </div>
      </div>

    </div>
  );
}

export default App;