import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div 
        className={`max-w-[85%] rounded-lg p-5 shadow-sm overflow-hidden ${
          isUser 
            ? 'bg-blue-600 text-white rounded-br-none' 
            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
        }`}
      >
        {/* Markdown Content */}
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-slate'}`}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    {...props}
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md my-2 shadow-inner"
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code 
                    {...props} 
                    className={`${className} ${
                      isUser 
                        ? 'bg-blue-700 text-white' 
                        : 'bg-gray-100 text-red-600'
                    } px-1.5 py-0.5 rounded text-xs font-mono`}
                  >
                    {children}
                  </code>
                );
              },
              // Custom element styling to match Tailwind prose
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-4" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-4 space-y-1" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-1" {...props} />,
              li: ({node, ...props}) => <li className="pl-1" {...props} />,
              p: ({node, ...props}) => <p className="mb-3 leading-relaxed last:mb-0" {...props} />,
              a: ({node, ...props}) => (
                <a 
                  className={`underline decoration-1 underline-offset-2 ${
                    isUser ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                  }`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  {...props} 
                />
              ),
              blockquote: ({node, ...props}) => (
                <blockquote 
                  className={`border-l-4 pl-4 italic my-4 ${
                    isUser ? 'border-blue-400 text-blue-100' : 'border-gray-300 text-gray-600'
                  }`} 
                  {...props} 
                />
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Metadata Footer (Assistant Only) */}
        {!isUser && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
            {/* Agents Used */}
            {message.agents_used && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Agents:</span>
                <div className="flex gap-1">
                  {message.agents_used.map((agent, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                      {agent}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Routing Decision */}
            {message.routing_decision && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Routing:</span>
                <span>
                  {message.routing_decision.reason === "forced_all_agents" ? "🔒 Forced all agents" : "🧠 Smart routing"}
                  {message.routing_decision.research && " | 🔍 Research"}
                  {message.routing_decision.code && " | 💻 Code"}
                </span>
              </div>
            )}
            
            {/* Cost */}
            {message.cost !== undefined && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Cost:</span>
                <span className="font-mono text-green-600">${parseFloat(message.cost).toFixed(5)}</span>
              </div>
            )}
            
            {/* Model Used (for simple chat) */}
            {message.model_used && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Model:</span>
                <span className="font-mono">{message.model_used}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;