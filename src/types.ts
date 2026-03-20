export type EntityType = 'insurance_company' | 'corporate_agent' | 'specified_person' | 'general';

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
  regulator: 'IRDAI' | 'RBI' | 'Other';
  category: string;
  description?: string;
  effectiveDate?: string;
  status: 'pending' | 'parsed' | 'error';
}

export interface UserProfile {
  entityType: EntityType;
  entityName: string;
}
