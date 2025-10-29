
import React, { useState, useRef, useEffect } from 'react';
import { Document, ChatMessage } from '../types';
import { api } from '../services/api-production';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Spinner from '../components/ui/Spinner';

interface ChatPageProps {
  document: Document;
}

const ChatPage: React.FC<ChatPageProps> = ({ document }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load session on mount
    const loadSession = async () => {
      try {
        const session = await api.getQASession(document.id);
        setSessionId(session.id);
        if (session.messages) {
          setMessages(session.messages);
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    };
    loadSession();
  }, [document.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsStreaming(true);

    const assistantMessageId = `msg-${Date.now() + 1}`;
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      citations: [],
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      let fullAnswer = '';
      for await (const chunk of api.askQuestion(document.id, currentInput, sessionId || undefined)) {
        fullAnswer += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: fullAnswer }
            : msg
        ));
      }
    } catch (error) {
      console.error("Streaming failed:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}` }
          : msg
      ));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto fade-in">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Grounded Q&A</h1>
        <p className="text-gray-600">Ask questions about: <span className="font-semibold">{document.name}</span></p>
      </div>
      <Card className="flex-1 flex flex-col p-0">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
            {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-start">
                <div className="bg-gray-200 rounded-lg p-3 max-w-lg">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <div className="border-t border-gray-200 p-4 bg-white">
          <form onSubmit={handleSendMessage} className="flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about clauses, risks, or legal terms..."
              className="flex-1 block w-full px-4 py-2 text-base text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isStreaming}
            />
            <Button type="submit" disabled={isStreaming || !input.trim()}>
              {isStreaming ? 'Thinking...' : 'Send'}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
};

const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`rounded-lg px-4 py-3 max-w-xl shadow-sm ${isUser ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'}`}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 border-t border-gray-200 pt-2">
            <h4 className="text-xs font-semibold text-gray-500 mb-1">Sources:</h4>
            <div className="space-y-1">
              {message.citations.map((citation, index) => (
                <a
                  key={index}
                  href={citation.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-blue-600 hover:underline"
                >
                  <LinkIcon />
                  <span className="ml-1.5">{citation.title}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const LinkIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>;

export default ChatPage;
