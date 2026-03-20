import React, { useState } from 'react';
import { Shield, Building2, Users, User, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { EntityType, UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const ENTITY_OPTIONS: {
  type: EntityType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    type: 'insurance_company',
    label: 'Insurance Company',
    description: 'Life, General, or Health insurer licensed by IRDAI',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    type: 'corporate_agent',
    label: 'Corporate Agent / Bank',
    description: 'Banks, NBFCs, or entities acting as corporate agents for insurance distribution',
    icon: <Users className="w-5 h-5" />,
  },
  {
    type: 'specified_person',
    label: 'Specified Person / Agent',
    description: 'Individual agents, brokers, or specified persons under a corporate agent',
    icon: <User className="w-5 h-5" />,
  },
  {
    type: 'general',
    label: 'General Enquiry',
    description: 'General compliance queries without a specific regulatory entity context',
    icon: <HelpCircle className="w-5 h-5" />,
  },
];

const PLACEHOLDER: Record<EntityType, string> = {
  insurance_company: 'e.g. HDFC Life Insurance Co. Ltd.',
  corporate_agent: 'e.g. State Bank of India',
  specified_person: 'e.g. John Doe',
  general: '',
};

export default function OnboardingModal({ onComplete }: Props) {
  const [selected, setSelected] = useState<EntityType | null>(null);
  const [name, setName] = useState('');

  const canSubmit = selected !== null && (selected === 'general' || name.trim().length > 0);

  const handleSubmit = () => {
    if (!selected) return;
    onComplete({
      entityType: selected,
      entityName: selected === 'general' ? 'General User' : name.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">InsurGuard Compliance</h1>
            <p className="text-xs text-zinc-400">IRDAI & RBI Regulatory Intelligence</p>
          </div>
        </div>

        <h2 className="text-base font-semibold text-zinc-900 mb-1">Who are you?</h2>
        <p className="text-sm text-zinc-500 mb-6">
          Select your entity type so we can tailor compliance guidance to your specific regulatory obligations.
        </p>

        <div className="space-y-3 mb-6">
          {ENTITY_OPTIONS.map((opt) => (
            <button
              key={opt.type}
              onClick={() => { setSelected(opt.type); setName(''); }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3",
                selected === opt.type
                  ? "border-zinc-900 bg-zinc-50"
                  : "border-zinc-200 hover:border-zinc-300"
              )}
            >
              <div className={cn(
                "mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                selected === opt.type ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-500"
              )}>
                {opt.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-900">{opt.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>

        {selected && selected !== 'general' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6"
          >
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">Organisation / Name</label>
            <input
              type="text"
              placeholder={PLACEHOLDER[selected]}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
              autoFocus
            />
          </motion.div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full bg-zinc-900 text-white py-3 rounded-xl font-medium text-sm hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continue to InsurGuard
        </button>

        <p className="text-[10px] text-zinc-400 text-center mt-4">
          Your profile is stored locally in your browser. No personal data is sent to external servers.
        </p>
      </motion.div>
    </div>
  );
}
