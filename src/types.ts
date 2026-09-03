export type Role = 'user' | 'assistant';

export interface FileAttachment {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  attachment?: FileAttachment;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  model: string;
  createdAt: number;
}

export type ModelId =
  | 'auto'
  | 'gemini-3.6-flash'
  | 'gpt-4o-mini'
  | 'claude-3.5-sonnet'
  | 'perplexity';

export interface ModelOption {
  id: ModelId;
  label: string;
  desc: string;
  badge: string;
}

export type TabId = 'chat' | 'image' | 'video' | 'script';
