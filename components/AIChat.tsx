import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { chatWithAI } from '../services/geminiService';
import { Itinerary, TripFormData } from '../types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  itinerary: Itinerary | null;
  formData: TripFormData | null;
}

export const AIChat: React.FC<AIChatProps> = ({ itinerary, formData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I am RoadTripPro AI. How can I help with your route or market analysis today?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input, { itinerary: itinerary || undefined, formData: formData || undefined });
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              height: isMinimized ? '60px' : '500px'
            }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden mb-4 flex flex-col w-[calc(100vw-48px)] sm:w-[350px]"
          >
            {/* Header */}
            <div className="bg-[#FF385C] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span className="font-bold">RoadTripPro AI</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-gray-50">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-[#FF385C] text-white rounded-tr-none'
                            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tl-none'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-bold uppercase tracking-wider">
                          {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                          {msg.role === 'user' ? 'You' : 'AI Assistant'}
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm rounded-tl-none">
                        <Loader2 className="w-5 h-5 animate-spin text-[#FF385C]" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      placeholder="Ask about your route..."
                      className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-[#FF385C] transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#FF385C] text-white rounded-lg disabled:opacity-50 hover:shadow-lg transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all ${
          isOpen ? 'bg-white text-[#FF385C]' : 'bg-[#FF385C] text-white'
        }`}
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>
    </div>
  );
};
