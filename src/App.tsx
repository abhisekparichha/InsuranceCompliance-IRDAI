import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  MessageSquare,
  Menu,
  Settings,
  Building2,
  Users,
  User,
  HelpCircle,
  Database,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Obligation, Message, GuidelineSource, KnowledgeBaseSummary, UserProfile, EntityType } from './types';
import { analyzeGuidelines, queryCompliance } from './services/gemini';
import { storage } from './services/storage';
import OnboardingModal from './components/OnboardingModal';
import RegulationsManager from './components/RegulationsManager';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_SOURCES: GuidelineSource[] = [
  { id: 'irdai-1', url: 'https://irdai.gov.in/document-detail?documentId=384512', title: 'IRDAI Regulation 384512', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-2', url: 'https://irdai.gov.in/document-detail?documentId=3314780', title: 'IRDAI Regulation 3314780', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-3', url: 'https://irdai.gov.in/document-detail?documentId=382590', title: 'IRDAI Regulation 382590', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-4', url: 'https://irdai.gov.in/document-detail?documentId=392974', title: 'IRDAI Regulation 392974', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-5', url: 'https://irdai.gov.in/document-detail?documentId=603060', title: 'IRDAI Regulation 603060', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-6', url: 'https://irdai.gov.in/document-detail?documentId=5083599', title: 'IRDAI Regulation 5083599', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-7', url: 'https://irdai.gov.in/document-detail?documentId=5625747', title: 'IRDAI Regulation 5625747', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-8', url: 'https://irdai.gov.in/document-detail?documentId=6540652', title: 'IRDAI Regulation 6540652', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-9', url: 'https://irdai.gov.in/document-detail?documentId=6571773', title: 'IRDAI Regulation 6571773', regulator: 'IRDAI', category: 'General', status: 'pending' },
  { id: 'irdai-10', url: 'https://agencyportal.irdai.gov.in/RTIContent/102%20GAZETTE.pdf', title: 'IRDAI Gazette 102', regulator: 'IRDAI', category: 'Corporate Agent', status: 'pending' },
  { id: 'irdai-11', url: 'https://agencyportal.irdai.gov.in/RTIContent/20210222_Dos_and_Donts-Corporate_Agents.pdf', title: 'Dos and Donts - Corporate Agents', regulator: 'IRDAI', category: 'Corporate Agent', status: 'pending' },
  { id: 'irdai-12', url: 'https://agencyportal.irdai.gov.in/RTIContent/20210222_Dos_and_Donts-Specified_Persons.pdf', title: 'Dos and Donts - Specified Persons', regulator: 'IRDAI', category: 'Specified Person', status: 'pending' },
  { id: 'rbi-1', url: 'https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=10425', title: 'RBI Master Direction 10425', regulator: 'RBI', category: 'Bancassurance', status: 'pending' },
  { id: 'rbi-2', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12300', title: 'RBI Master Direction 12300', regulator: 'RBI', category: 'Bancassurance', status: 'pending' },
];

const ENTITY_LABELS: Record<EntityType, string> = {
  insurance_company: 'Insurance Company',
  corporate_agent: 'Corporate Agent',
  specified_person: 'Specified Person',
  general: 'General User',
};

const ENTITY_ICONS: Record<EntityType, React.ReactNode> = {
  insurance_company: <Building2 className="w-4 h-4" />,
  corporate_agent: <Users className="w-4 h-4" />,
  specified_person: <User className="w-4 h-4" />,
  general: <HelpCircle className="w-4 h-4" />,
};

const SUGGESTED_QUESTIONS: Record<EntityType, string[]> = {
  insurance_company: [
    'What are the mandatory disclosure requirements in policy documents?',
    'What are the solvency margin requirements under IRDAI?',
    'What are the claims settlement timelines mandated by IRDAI?',
    'How should grievance redressal be structured?',
  ],
  corporate_agent: [
    'What are the corporate agent registration requirements?',
    'How many insurers can a corporate agent partner with?',
    'What are the prohibited activities for corporate agents?',
    'What training is mandatory for specified persons?',
  ],
  specified_person: [
    "What are the dos and don'ts for specified persons?",
    'What customer disclosures am I required to make?',
    'What activities are prohibited for specified persons?',
    'What are the commission and remuneration disclosure rules?',
  ],
  general: [
    'What are the disclosure requirements under IRDAI?',
    'How should claims be processed?',
    'What are the privacy obligations for insurers?',
    'Explain the underwriting standards.',
  ],
};

type Tab = 'chat' | 'obligations' | 'regulations';

export default function App() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sources, setSources] = useState<GuidelineSource[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summary, setSummary] = useState<KnowledgeBaseSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load persisted data on mount
  useEffect(() => {
    const savedProfile = storage.getProfile();
    const savedSources = storage.getSources();
    const savedObligations = storage.getObligations();
    const savedSummary = storage.getSummary();

    setSources(savedSources ?? DEFAULT_SOURCES);
    if (savedObligations) setObligations(savedObligations);
    if (savedSummary) setSummary(savedSummary);

    if (savedProfile) {
      setProfile(savedProfile);
    } else {
      setShowOnboarding(true);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleProfileComplete = (newProfile: UserProfile) => {
    setProfile(newProfile);
    storage.setProfile(newProfile);
    setShowOnboarding(false);
  };

  const updateSources = (newSources: GuidelineSource[]) => {
    setSources(newSources);
    storage.setSources(newSources);
  };

  const handleAddSource = (source: Omit<GuidelineSource, 'id' | 'status'>) => {
    const newSource: GuidelineSource = {
      ...source,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
    };
    updateSources([...sources, newSource]);
  };

  const handleEditSource = (id: string, updates: Partial<GuidelineSource>) => {
    updateSources(sources.map(s => s.id === id ? { ...s, ...updates, status: 'pending' as const } : s));
  };

  const handleDeleteSource = (id: string) => {
    updateSources(sources.filter(s => s.id !== id));
  };

  const handleExtract = async () => {
    if (sources.length === 0 || isExtracting) return;
    setIsExtracting(true);
    const urls = sources.map(s => s.url);
    const result = await analyzeGuidelines(urls);
    setObligations(result.obligations);
    setSummary(result.summary);
    storage.setObligations(result.obligations);
    storage.setSummary(result.summary);
    updateSources(sources.map(s => ({ ...s, status: 'parsed' as const })));
    setIsExtracting(false);
    setActiveTab('obligations');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isQuerying) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsQuerying(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const urls = sources.map(s => s.url);
    const response = await queryCompliance(input, urls, history, profile?.entityType ?? 'general');

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsQuerying(false);
  };

  const suggested = SUGGESTED_QUESTIONS[profile?.entityType ?? 'general'];
  const syncedCount = sources.filter(s => s.status === 'parsed').length;
  const irdaiCount = sources.filter(s => s.regulator === 'IRDAI').length;
  const rbiCount = sources.filter(s => s.regulator === 'RBI').length;

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'chat', label: 'Ask Compliance', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { key: 'obligations', label: 'Key Obligations', icon: <Shield className="w-3.5 h-3.5" /> },
    { key: 'regulations', label: 'Manage Sources', icon: <Database className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {showOnboarding && <OnboardingModal onComplete={handleProfileComplete} />}

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-64 bg-white border-r border-zinc-200 flex flex-col z-20 shrink-0"
          >
            <div className="p-5 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="font-semibold text-zinc-900 text-sm leading-tight">InsurGuard</h1>
                  <p className="text-[10px] text-zinc-400 leading-tight">Compliance Intelligence</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <section>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Compliance Status
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="block text-xl font-bold text-zinc-900">{sources.length}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Sources</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="block text-xl font-bold text-zinc-900">{obligations.length}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Obligations</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="block text-xl font-bold text-red-600">
                      {obligations.filter(o => o.priority === 'High').length}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase">High Risk</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="block text-xl font-bold text-emerald-600">{syncedCount}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Synced</span>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                  Regulators
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">IRDAI</span>
                    <span className="text-xs text-zinc-500">{irdaiCount} source{irdaiCount !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">RBI</span>
                    <span className="text-xs text-zinc-500">{rbiCount} source{rbiCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </section>
            </div>

            {profile && (
              <div className="p-4 border-t border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white shrink-0">
                    {ENTITY_ICONS[profile.entityType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-900 truncate">{profile.entityName}</p>
                    <p className="text-[10px] text-zinc-500">{ENTITY_LABELS[profile.entityType]}</p>
                  </div>
                  <button
                    onClick={() => setShowOnboarding(true)}
                    className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors"
                    title="Change profile"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                </div>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        <header className="h-14 bg-white border-b border-zinc-200 flex items-center justify-between px-5 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(v => !v)}
              className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Menu className="w-4 h-4 text-zinc-600" />
            </button>
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              {TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5',
                    activeTab === tab.key
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-medium border',
            obligations.length > 0
              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
              : 'bg-amber-50 text-amber-600 border-amber-100'
          )}>
            {obligations.length > 0
              ? <CheckCircle2 className="w-3 h-3" />
              : <AlertCircle className="w-3 h-3" />}
            {obligations.length > 0 ? 'Knowledge Base Ready' : 'Not Synced'}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {activeTab === 'chat' && (
              <motion.div
                key="chat"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-3xl mx-auto w-full p-6"
              >
                {messages.length === 0 ? (
                  <div className="h-[65vh] flex flex-col items-center justify-center text-center space-y-4 px-4">
                    <div className="w-14 h-14 bg-zinc-100 rounded-2xl flex items-center justify-center">
                      <Shield className="w-7 h-7 text-zinc-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">Compliance Advisory</h3>
                      {profile && (
                        <p className="text-zinc-400 text-xs mt-1">
                          Tailored for{' '}
                          <span className="font-medium text-zinc-600">
                            {ENTITY_LABELS[profile.entityType]}
                          </span>
                        </p>
                      )}
                      <p className="text-zinc-500 text-sm mt-2 max-w-md leading-relaxed">
                        Ask any question about your IRDAI and RBI regulatory obligations.
                        I'll provide authoritative, cited guidance from the loaded sources.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-xl mt-4">
                      {suggested.map(q => (
                        <button
                          key={q}
                          onClick={() => setInput(q)}
                          className="p-3 text-left text-xs bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 hover:shadow-sm transition-all text-zinc-600"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6 pb-28">
                    {messages.map(m => (
                      <div
                        key={m.id}
                        className={cn('flex gap-3', m.role === 'user' ? 'justify-end' : 'justify-start')}
                      >
                        <div className={cn(
                          'max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed',
                          m.role === 'user'
                            ? 'bg-zinc-900 text-zinc-50 shadow-lg'
                            : 'bg-white border border-zinc-200 text-zinc-900 shadow-sm'
                        )}>
                          <div className={cn('markdown-body', m.role === 'user' && 'text-zinc-50')}>
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isQuerying && (
                      <div className="flex justify-start">
                        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                          <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'obligations' && (
              <motion.div
                key="obligations"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="max-w-6xl mx-auto w-full p-6 space-y-8"
              >
                {summary && (
                  <section className="bg-white border border-zinc-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-zinc-900">Knowledge Base Summary</h2>
                        <p className="text-xs text-zinc-500">Overview of the parsed regulatory landscape</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Overview</h3>
                        <p className="text-sm text-zinc-600 leading-relaxed">{summary.overview}</p>
                        <div className="pt-4">
                          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                            Key Themes
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {summary.keyThemes.map((theme, i) => (
                              <span
                                key={i}
                                className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-medium border border-zinc-200"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                          Regulatory Scope
                        </h3>
                        <p className="text-xs text-zinc-500 leading-relaxed italic">"{summary.regulatoryScope}"</p>
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-900">Itemized Obligations</h2>
                    <p className="text-zinc-500 text-sm mt-1">
                      A line-by-line extraction of every numbered clause and requirement.
                    </p>
                  </div>
                  {obligations.length > 0 && (
                    <button
                      onClick={handleExtract}
                      disabled={isExtracting}
                      className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 disabled:opacity-50 transition-all"
                    >
                      {isExtracting
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <FileText className="w-4 h-4" />}
                      {isExtracting ? 'Extracting...' : 'Re-extract'}
                    </button>
                  )}
                </div>

                {obligations.length === 0 ? (
                  <div className="h-[40vh] flex flex-col items-center justify-center text-center p-12 bg-white border border-dashed border-zinc-200 rounded-3xl">
                    <FileText className="w-12 h-12 text-zinc-200 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900">No obligations extracted yet</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mt-2 mb-4">
                      Go to "Manage Sources" and click Sync & Extract to analyse all regulations.
                    </p>
                    <button
                      onClick={() => setActiveTab('regulations')}
                      className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-xl hover:bg-zinc-800 transition-all"
                    >
                      Manage Sources
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {obligations.map(obl => (
                      <motion.div
                        layout
                        key={obl.id}
                        className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                            obl.priority === 'High'
                              ? 'bg-red-50 text-red-600 border border-red-100'
                              : obl.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-600 border border-amber-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          )}>
                            {obl.priority}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">{obl.category}</span>
                        </div>
                        <h4 className="font-semibold text-zinc-900 mb-2 text-sm">{obl.title}</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-4">{obl.description}</p>
                        <div className="mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">
                            Action Item
                          </h5>
                          <p className={cn(
                            'text-xs font-medium',
                            obl.actionItem === 'Not applicable'
                              ? 'text-zinc-400 italic'
                              : 'text-zinc-900'
                          )}>
                            {obl.actionItem}
                          </p>
                        </div>
                        <div className="pt-3 border-t border-zinc-50 flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400 truncate max-w-[140px]">
                            {new URL(obl.sourceUrl).hostname}
                          </span>
                          <a
                            href={obl.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-zinc-900 hover:underline"
                          >
                            View Source
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'regulations' && (
              <motion.div
                key="regulations"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
              >
                <RegulationsManager
                  sources={sources}
                  isExtracting={isExtracting}
                  onAdd={handleAddSource}
                  onEdit={handleEditSource}
                  onDelete={handleDeleteSource}
                  onExtract={handleExtract}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Chat Input */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={
                    sources.length === 0
                      ? 'Add sources first...'
                      : 'Ask about your compliance obligations...'
                  }
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  disabled={sources.length === 0 || isQuerying}
                  className="w-full bg-white border border-zinc-200 rounded-2xl pl-5 pr-14 py-4 text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isQuerying || sources.length === 0}
                  className="absolute right-2 p-2.5 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-all"
                >
                  {isQuerying
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 text-center mt-2">
                AI guidance is based on loaded regulatory documents. Always verify with official IRDAI/RBI sources.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
