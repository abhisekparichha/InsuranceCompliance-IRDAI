import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Send, 
  Loader2, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  MessageSquare, 
  ExternalLink,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Obligation, Message, GuidelineSource, KnowledgeBaseSummary } from './types';
import { analyzeGuidelines, queryCompliance } from './services/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [sources, setSources] = useState<GuidelineSource[]>([
    { id: 'irdai-1', url: 'https://irdai.gov.in/document-detail?documentId=384512', title: 'IRDAI Regulation 384512', status: 'pending' },
    { id: 'irdai-2', url: 'https://irdai.gov.in/document-detail?documentId=3314780', title: 'IRDAI Regulation 3314780', status: 'pending' },
    { id: 'irdai-3', url: 'https://irdai.gov.in/document-detail?documentId=382590', title: 'IRDAI Regulation 382590', status: 'pending' },
    { id: 'irdai-4', url: 'https://irdai.gov.in/document-detail?documentId=392974', title: 'IRDAI Regulation 392974', status: 'pending' },
    { id: 'irdai-5', url: 'https://irdai.gov.in/document-detail?documentId=603060', title: 'IRDAI Regulation 603060', status: 'pending' },
    { id: 'irdai-6', url: 'https://irdai.gov.in/document-detail?documentId=5083599', title: 'IRDAI Regulation 5083599', status: 'pending' },
    { id: 'irdai-7', url: 'https://irdai.gov.in/document-detail?documentId=5625747', title: 'IRDAI Regulation 5625747', status: 'pending' },
    { id: 'irdai-8', url: 'https://irdai.gov.in/document-detail?documentId=6540652', title: 'IRDAI Regulation 6540652', status: 'pending' },
    { id: 'irdai-9', url: 'https://irdai.gov.in/document-detail?documentId=6571773', title: 'IRDAI Regulation 6571773', status: 'pending' },
    { id: 'irdai-10', url: 'https://agencyportal.irdai.gov.in/RTIContent/102%20GAZETTE.pdf', title: 'IRDAI Gazette 102', status: 'pending' },
    { id: 'irdai-11', url: 'https://agencyportal.irdai.gov.in/RTIContent/20210222_Dos_and_Donts-Corporate_Agents.pdf', title: 'Dos and Donts - Corporate Agents', status: 'pending' },
    { id: 'irdai-12', url: 'https://agencyportal.irdai.gov.in/RTIContent/20210222_Dos_and_Donts-Specified_Persons.pdf', title: 'Dos and Donts - Specified Persons', status: 'pending' },
    { id: 'rbi-1', url: 'https://rbi.org.in/scripts/BS_ViewMasDirections.aspx?id=10425', title: 'RBI Direction 10425', status: 'pending' },
    { id: 'rbi-2', url: 'https://www.rbi.org.in/Scripts/BS_ViewMasDirections.aspx?id=12300', title: 'RBI Direction 12300', status: 'pending' },
  ]);
  const [newUrl, setNewUrl] = useState('');
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [summary, setSummary] = useState<KnowledgeBaseSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'obligations'>('chat');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (sources.length > 0 && obligations.length === 0 && !isExtracting) {
      handleExtract();
    }
  }, []);

  const addSource = () => {
    if (!newUrl || !newUrl.startsWith('http')) return;
    const id = Math.random().toString(36).substr(2, 9);
    setSources([...sources, { id, url: newUrl, title: newUrl, status: 'pending' }]);
    setNewUrl('');
  };

  const removeSource = (id: string) => {
    setSources(sources.filter(s => s.id !== id));
  };

  const handleExtract = async () => {
    if (sources.length === 0) return;
    setIsExtracting(true);
    const urls = sources.map(s => s.url);
    const result = await analyzeGuidelines(urls);
    setObligations(result.obligations);
    setSummary(result.summary);
    setSources(sources.map(s => ({ ...s, status: 'parsed' })));
    setIsExtracting(false);
    setActiveTab('obligations');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isQuerying) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsQuerying(true);

    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const urls = sources.map(s => s.url);
    
    const response = await queryCompliance(input, urls, history);

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsQuerying(false);
  };

  return (
    <div className="flex h-screen bg-zinc-50 overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 bg-white border-r border-zinc-200 flex flex-col z-20"
          >
            <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="font-semibold text-zinc-900 tracking-tight">InsurGuard</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-zinc-100 rounded-md transition-colors lg:hidden"
              >
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* URL Sources */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Guideline Sources</h2>
                  <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full">{sources.length}</span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/guidelines"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addSource()}
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                    />
                    <button
                      onClick={addSource}
                      className="p-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sources.map((source) => (
                      <div 
                        key={source.id}
                        className="group flex items-center justify-between p-3 bg-zinc-50 border border-zinc-200 rounded-xl hover:border-zinc-300 transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            source.status === 'parsed' ? "bg-emerald-500" : "bg-amber-500"
                          )} />
                          <span className="text-xs text-zinc-600 truncate">{source.url}</span>
                        </div>
                        <button 
                          onClick={() => removeSource(source.id)}
                          className="p-1 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {sources.length > 0 && (
                  <button
                    onClick={handleExtract}
                    disabled={isExtracting}
                    className="w-full mt-4 flex items-center justify-center gap-2 bg-zinc-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isExtracting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    Extract Itemized List
                  </button>
                )}
              </section>

              {/* Quick Stats */}
              <section className="pt-4 border-t border-zinc-100">
                <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Compliance Status</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <span className="block text-lg font-semibold text-zinc-900">{obligations.length}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Obligations</span>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200">
                    <span className="block text-lg font-semibold text-zinc-900">
                      {obligations.filter(o => o.priority === 'High').length}
                    </span>
                    <span className="text-[10px] text-zinc-500 uppercase text-red-500">High Risk</span>
                  </div>
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-zinc-100">
              <div className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-medium">AP</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-900 truncate">Compliance Officer</p>
                  <p className="text-[10px] text-zinc-500 truncate">abhisekparichha@gmail.com</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-zinc-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5 text-zinc-600" />
              </button>
            )}
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('chat')}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                  activeTab === 'chat' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Compliance Chat
              </button>
              <button
                onClick={() => setActiveTab('obligations')}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2",
                  activeTab === 'obligations' ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                )}
              >
                <Shield className="w-3.5 h-3.5" />
                Key Obligations
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-medium border border-emerald-100">
              <CheckCircle2 className="w-3 h-3" />
              System Active
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'chat' ? (
              <motion.div 
                key="chat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-4xl mx-auto w-full p-6 space-y-6"
              >
                {messages.length === 0 ? (
                  <div className="h-[60vh] flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-100 rounded-2xl flex items-center justify-center mb-2">
                      <Shield className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-zinc-900">Compliance Advisory</h3>
                    <p className="text-zinc-500 max-w-md text-sm leading-relaxed">
                      Ask any question about insurance compliance guidelines. I'll refer to your sources and provide expert recommendations.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg mt-8">
                      {[
                        "What are the disclosure requirements?",
                        "How should we handle claims processing?",
                        "What are the privacy obligations?",
                        "Explain the underwriting standards."
                      ].map((q) => (
                        <button
                          key={q}
                          onClick={() => setInput(q)}
                          className="p-3 text-left text-xs bg-white border border-zinc-200 rounded-xl hover:border-zinc-400 transition-all text-zinc-600"
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8 pb-32">
                    {messages.map((m) => (
                      <div 
                        key={m.id}
                        className={cn(
                          "flex gap-4",
                          m.role === 'user' ? "justify-end" : "justify-start"
                        )}
                      >
                        <div className={cn(
                          "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed",
                          m.role === 'user' 
                            ? "bg-zinc-900 text-zinc-50 shadow-lg" 
                            : "bg-white border border-zinc-200 text-zinc-900 shadow-sm"
                        )}>
                          <div className={cn(
                            "markdown-body",
                            m.role === 'user' && "prose-invert text-zinc-50"
                          )}>
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    {isQuerying && (
                      <div className="flex gap-4 justify-start">
                        <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm">
                          <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="obligations"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto w-full p-6 space-y-8"
              >
                {/* Summary Section */}
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
                        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider">Overview</h3>
                        <p className="text-sm text-zinc-600 leading-relaxed">{summary.overview}</p>
                        
                        <div className="pt-4">
                          <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">Key Themes</h3>
                          <div className="flex flex-wrap gap-2">
                            {summary.keyThemes.map((theme, i) => (
                              <span key={i} className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-medium border border-zinc-200">
                                {theme}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100">
                        <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wider mb-3">Regulatory Scope</h3>
                        <p className="text-xs text-zinc-500 leading-relaxed italic">"{summary.regulatoryScope}"</p>
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-900">Itemized Obligations</h2>
                    <p className="text-zinc-500 text-sm mt-1">A line-by-line extraction of every numbered clause and requirement.</p>
                  </div>
                </div>

                {obligations.length === 0 ? (
                  <div className="h-[50vh] flex flex-col items-center justify-center text-center p-12 bg-white border border-zinc-200 border-dashed rounded-3xl">
                    <FileText className="w-12 h-12 text-zinc-200 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900">No obligations extracted yet</h3>
                    <p className="text-zinc-500 text-sm max-w-xs mt-2">Add guideline URLs in the sidebar and click "Extract Obligations" to begin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {obligations.map((obl) => (
                      <motion.div
                        layout
                        key={obl.id}
                        className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                            obl.priority === 'High' ? "bg-red-50 text-red-600 border border-red-100" :
                            obl.priority === 'Medium' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          )}>
                            {obl.priority}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">{obl.category}</span>
                        </div>
                        <h4 className="font-semibold text-zinc-900 mb-2 group-hover:text-zinc-700 transition-colors">{obl.title}</h4>
                        <p className="text-xs text-zinc-500 leading-relaxed mb-4">{obl.description}</p>
                        
                        <div className="mb-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                          <h5 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">Action Item</h5>
                          <p className={cn(
                            "text-xs font-medium",
                            obl.actionItem === 'Not applicable' ? "text-zinc-400 italic" : "text-zinc-900"
                          )}>
                            {obl.actionItem}
                          </p>
                        </div>

                        <div className="pt-4 border-t border-zinc-50 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">{new URL(obl.sourceUrl).hostname}</span>
                          </div>
                          <button className="text-[10px] font-semibold text-zinc-900 hover:underline">View Source</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Area */}
        {activeTab === 'chat' && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent">
            <div className="max-w-4xl mx-auto">
              <div className="relative flex items-center">
                <input
                  type="text"
                  placeholder={sources.length === 0 ? "Add sources first..." : "Ask about compliance requirements..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sources.length === 0 || isQuerying}
                  className="w-full bg-white border border-zinc-200 rounded-2xl pl-12 pr-16 py-4 text-sm shadow-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all disabled:opacity-50"
                />
                <div className="absolute left-4">
                  <MessageSquare className="w-5 h-5 text-zinc-400" />
                </div>
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim() || isQuerying || sources.length === 0}
                  className="absolute right-2 p-2 bg-zinc-900 text-white rounded-xl hover:bg-zinc-800 disabled:opacity-50 transition-all"
                >
                  {isQuerying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-zinc-400 text-center mt-3">
                AI can make mistakes. Always verify with official regulatory documents.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
