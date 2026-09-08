
export type View = 'chat';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  source?: 'text' | 'voice_call';
  callDuration?: string;
  legalArticles?: string[];
}

export interface CallTurn {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface LegalDecree {
  id: string;
  number: string;
  year: string;
  title: string;
  summary: string;
  category: string;
}

