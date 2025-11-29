import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message } from '../types';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isBot = message.role === 'model';

  return (
    <div className={`flex w-full mb-6 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex max-w-[85%] ${isBot ? 'flex-row' : 'flex-row-reverse'} gap-3`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot ? 'bg-indigo-600 text-white' : 'bg-slate-600 text-slate-200'
        }`}>
          {isBot ? <Bot size={18} /> : <User size={18} />}
        </div>

        {/* Content Bubble */}
        <div className={`flex flex-col gap-2 p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isBot 
            ? 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700' 
            : 'bg-indigo-600 text-white rounded-tr-none'
        }`}>
          {message.image && (
            <img 
              src={`data:image/jpeg;base64,${message.image}`} 
              alt="User Upload" 
              className="w-full max-w-[200px] h-auto rounded-lg mb-2 object-cover border border-white/20"
            />
          )}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-indigo-400 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
