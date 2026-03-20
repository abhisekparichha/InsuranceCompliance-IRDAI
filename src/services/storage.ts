import type { GuidelineSource, Obligation, KnowledgeBaseSummary, UserProfile } from '../types';

const KEYS = {
  SOURCES: 'insurguard_sources',
  OBLIGATIONS: 'insurguard_obligations',
  SUMMARY: 'insurguard_summary',
  PROFILE: 'insurguard_profile',
};

function safeGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded or private mode */ }
}

export const storage = {
  getSources: () => safeGet<GuidelineSource[]>(KEYS.SOURCES),
  setSources: (v: GuidelineSource[]) => safeSet(KEYS.SOURCES, v),
  getObligations: () => safeGet<Obligation[]>(KEYS.OBLIGATIONS),
  setObligations: (v: Obligation[]) => safeSet(KEYS.OBLIGATIONS, v),
  getSummary: () => safeGet<KnowledgeBaseSummary>(KEYS.SUMMARY),
  setSummary: (v: KnowledgeBaseSummary) => safeSet(KEYS.SUMMARY, v),
  getProfile: () => safeGet<UserProfile>(KEYS.PROFILE),
  setProfile: (v: UserProfile) => safeSet(KEYS.PROFILE, v),
};
