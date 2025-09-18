'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  X,
  HelpCircle,
  Lightbulb,
  Target
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isGuided?: boolean;
}

interface TutoringChatProps {
  questionId: string;
  questionText: string;
  subject: string;
  onClose: () => void;
  onNotifyParent?: (message: string) => void;
}

export default function TutoringChat({
  questionId,
  questionText,
  subject,
  onClose,
  onNotifyParent
}: TutoringChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm here to help guide you through this ${subject} question. Instead of giving you the direct answer, I'll help you think through it step by step. What part are you finding challenging?`,
      timestamp: new Date(),
      isGuided: true
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateTutoringResponse = async (userQuestion: string) => {
    try {
      const response = await fetch('/api/tutoring/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          questionText,
          subject,
          userMessage: userQuestion,
          conversationHistory: messages
        })
      });

      if (!response.ok) throw new Error('Failed to get tutoring response');
      
      const data = await response.json();
      return data.message;
    } catch (error) {
      console.error('Tutoring error:', error);
      return "I apologize, but I'm having trouble connecting right now. Can you try rephrasing your question?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Generate AI tutoring response
    const aiResponse = await generateTutoringResponse(inputMessage);
    
    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
      isGuided: true
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);

    // Notify parent about tutoring session
    onNotifyParent?.(
      `Student requested help with: "${questionText.substring(0, 50)}..."`
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickHelp = (type: string) => {
    let helpMessage = '';
    switch (type) {
      case 'understand':
        helpMessage = "I don't understand what this question is asking for";
        break;
      case 'start':
        helpMessage = "I know what to do but don't know how to start";
        break;
      case 'stuck':
        helpMessage = "I started working on this but I'm stuck";
        break;
      default:
        helpMessage = inputMessage;
    }
    setInputMessage(helpMessage);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto h-[500px] flex flex-col">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-blue-600" />
            AI Tutor - {subject}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-600 bg-white rounded p-2 mt-2">
          <strong>Question:</strong> {questionText.substring(0, 100)}...
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.isGuided
                    ? 'bg-green-50 text-green-900 border border-green-200'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start gap-2">
                  {message.role === 'assistant' ? (
                    <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.isGuided && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        <Lightbulb className="h-3 w-3 mr-1" />
                        Guided Learning
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Help Buttons */}
        <div className="px-4 py-2 border-t bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickHelp('understand')}
              className="text-xs"
            >
              <HelpCircle className="h-3 w-3 mr-1" />
              Don't Understand
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickHelp('start')}
              className="text-xs"
            >
              <Target className="h-3 w-3 mr-1" />
              How to Start
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickHelp('stuck')}
              className="text-xs"
            >
              <MessageCircle className="h-3 w-3 mr-1" />
              I'm Stuck
            </Button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me for guidance... (I won't give direct answers)"
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            💡 I'm designed to guide your thinking, not give you answers directly
          </p>
        </div>
      </CardContent>
    </Card>
  );
}