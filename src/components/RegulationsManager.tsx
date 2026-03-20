import React, { useState } from 'react';
import { Plus, Trash2, Edit2, ExternalLink, Check, X, RefreshCw, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GuidelineSource } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  sources: GuidelineSource[];
  isExtracting: boolean;
  onAdd: (source: Omit<GuidelineSource, 'id' | 'status'>) => void;
  onEdit: (id: string, updates: Partial<GuidelineSource>) => void;
  onDelete: (id: string) => void;
  onExtract: () => void;
}

const REGULATORS = ['IRDAI', 'RBI', 'Other'] as const;
const CATEGORIES = [
  'General', 'Corporate Agent', 'Specified Person', 'Bancassurance',
  'Claims', 'Underwriting', 'Privacy & Data', 'Disclosures',
  'Grievance', 'Solvency', 'Product',
];

interface FormState {
  url: string;
  title: string;
  regulator: 'IRDAI' | 'RBI' | 'Other';
  category: string;
  description: string;
  effectiveDate: string;
}

const emptyForm = (): FormState => ({
  url: '',
  title: '',
  regulator: 'IRDAI',
  category: 'General',
  description: '',
  effectiveDate: '',
});

const REGULATOR_STYLES = {
  IRDAI: 'bg-blue-50 text-blue-700 border-blue-100',
  RBI: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  Other: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

const REGULATOR_LABELS = {
  IRDAI: 'Insurance Regulatory and Development Authority of India',
  RBI: 'Reserve Bank of India',
  Other: 'Other Sources',
};

export default function RegulationsManager({ sources, isExtracting, onAdd, onEdit, onDelete, onExtract }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    IRDAI: true, RBI: true, Other: true,
  });

  const grouped = {
    IRDAI: sources.filter(s => s.regulator === 'IRDAI'),
    RBI: sources.filter(s => s.regulator === 'RBI'),
    Other: sources.filter(s => s.regulator === 'Other'),
  };

  const handleSubmit = () => {
    if (!form.url.startsWith('http') || !form.title.trim()) return;
    if (editingId) {
      onEdit(editingId, {
        url: form.url,
        title: form.title,
        regulator: form.regulator,
        category: form.category,
        description: form.description || undefined,
        effectiveDate: form.effectiveDate || undefined,
      });
      setEditingId(null);
    } else {
      onAdd({
        url: form.url,
        title: form.title,
        regulator: form.regulator,
        category: form.category,
        description: form.description || undefined,
        effectiveDate: form.effectiveDate || undefined,
      });
    }
    setForm(emptyForm());
    setShowForm(false);
  };

  const startEdit = (source: GuidelineSource) => {
    setEditingId(source.id);
    setForm({
      url: source.url,
      title: source.title,
      regulator: source.regulator,
      category: source.category,
      description: source.description || '',
      effectiveDate: source.effectiveDate || '',
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isFormValid = form.url.startsWith('http') && form.title.trim().length > 0;

  return (
    <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Regulation Sources</h2>
          <p className="text-zinc-500 text-sm mt-1">
            Manage IRDAI and RBI regulatory documents used for compliance analysis.
            Changes take effect on the next sync.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onExtract}
            disabled={isExtracting || sources.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 transition-all"
          >
            <RefreshCw className={cn("w-4 h-4", isExtracting && "animate-spin")} />
            {isExtracting ? 'Syncing...' : 'Sync & Extract'}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm()); }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Add / Edit Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm"
          >
            <h3 className="text-sm font-semibold text-zinc-900 mb-5">
              {editingId ? 'Edit Regulation Source' : 'Add New Regulation Source'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">URL *</label>
                <input
                  type="url"
                  placeholder="https://irdai.gov.in/..."
                  value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. IRDAI Corporate Agents Regulations 2015"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Regulator</label>
                <select
                  value={form.regulator}
                  onChange={e => setForm(f => ({ ...f, regulator: e.target.value as 'IRDAI' | 'RBI' | 'Other' }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  {REGULATORS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Effective Date</label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={e => setForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Description</label>
                <input
                  type="text"
                  placeholder="Brief description (optional)"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={cancelForm}
                className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid}
                className="px-4 py-2 bg-zinc-900 text-white text-sm rounded-xl hover:bg-zinc-800 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {editingId ? 'Save Changes' : 'Add Source'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Source Groups */}
      {((['IRDAI', 'RBI', 'Other'] as const)).map(regulator => {
        const group = grouped[regulator];
        if (group.length === 0) return null;
        const isExpanded = expandedGroups[regulator];

        return (
          <section key={regulator} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
            <button
              onClick={() => toggleGroup(regulator)}
              className="w-full flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold border",
                  REGULATOR_STYLES[regulator]
                )}>
                  {regulator}
                </span>
                <span className="text-sm font-semibold text-zinc-900">
                  {REGULATOR_LABELS[regulator]}
                </span>
                <span className="text-xs text-zinc-400">
                  {group.length} source{group.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isExpanded && "rotate-180")} />
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-zinc-100 divide-y divide-zinc-100">
                    {group.map(source => (
                      <div
                        key={source.id}
                        className="p-5 flex items-start gap-4 group hover:bg-zinc-50 transition-colors"
                      >
                        {/* Status dot */}
                        <div className={cn(
                          "mt-1.5 w-2 h-2 rounded-full shrink-0",
                          source.status === 'parsed' ? "bg-emerald-500" :
                          source.status === 'error' ? "bg-red-500" :
                          "bg-amber-400"
                        )} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-zinc-900">{source.title}</span>
                            <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[10px] rounded-full font-medium border border-zinc-200">
                              {source.category}
                            </span>
                            {source.effectiveDate && (
                              <span className="text-[10px] text-zinc-400">eff. {source.effectiveDate}</span>
                            )}
                            <span className={cn(
                              "text-[10px] font-medium",
                              source.status === 'parsed' ? "text-emerald-600" :
                              source.status === 'error' ? "text-red-500" :
                              "text-amber-500"
                            )}>
                              {source.status === 'parsed' ? '● Synced' :
                               source.status === 'error' ? '● Error' : '● Pending'}
                            </span>
                          </div>
                          {source.description && (
                            <p className="text-xs text-zinc-500 mb-1.5">{source.description}</p>
                          )}
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span className="truncate max-w-xs">{source.url}</span>
                          </a>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => startEdit(source)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {deleteConfirm === source.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { onDelete(source.id); setDeleteConfirm(null); }}
                                className="px-2.5 py-1 text-[10px] font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="p-1.5 text-zinc-400 hover:bg-zinc-100 rounded-lg"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(source.id)}
                              className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}

      {sources.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-zinc-200 rounded-2xl">
          <p className="text-zinc-400 text-sm">No regulation sources added yet. Click "Add Source" to get started.</p>
        </div>
      )}
    </div>
  );
}
