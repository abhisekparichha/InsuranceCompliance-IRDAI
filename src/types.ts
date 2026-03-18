export interface KnowledgeBaseSummary {
  overview: string;
  keyThemes: string[];
  regulatoryScope: string;
}

export interface Obligation {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  actionItem: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface GuidelineSource {
  id: string;
  url: string;
  title: string;
  status: 'pending' | 'parsed' | 'error';
}
