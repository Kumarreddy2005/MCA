import React, { useState } from 'react';
import { genAiService, IVolunteerStructureResult } from '../../services/api/genai.service';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  MapPin,
  Flame,
  ClipboardList,
  Loader2,
  Copy,
  ArrowRight
} from 'lucide-react';

interface VolunteerStructuringDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (structured: {
    title: string;
    description: string;
    category?: string;
    urgency?: string;
  }) => void;
  initialNotes?: string;
}

export const VolunteerStructuringDrawer: React.FC<VolunteerStructuringDrawerProps> = ({
  isOpen,
  onClose,
  onApply,
  initialNotes = ''
}) => {
  const [rawNotes, setRawNotes] = useState(initialNotes);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structured, setStructured] = useState<IVolunteerStructureResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStructure = async () => {
    if (!rawNotes.trim()) {
      setError('Please enter field notes or paste speech transcript to structure.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await genAiService.structureVolunteerNotes({
        rawNotes: rawNotes.trim(),
        language: 'en'
      });
      setStructured(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to structure notes';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleApplyToForm = () => {
    if (!structured) return;

    onApply({
      title: structured.structured_title,
      description: structured.structured_description,
      category: structured.detected_category,
      urgency: structured.recommended_priority
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-amber-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-100" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Field Note Structuring Assistant</h2>
              <p className="text-xs text-amber-100">Convert voice notes & informal dialect into formal 4-part petitions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
            title="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Raw Input Card */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Raw Field Notes / Spoken Transcript
              </label>
              <span className="text-xs text-slate-400">Kannada or English informal text</span>
            </div>
            <textarea
              value={rawNotes}
              onChange={(e) => setRawNotes(e.target.value)}
              placeholder="e.g., Ward 4 near Maramma temple sewage pipeline burst 2 days back, water entering 15 houses, foul smell, ward officer didn't pick call..."
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all resize-none shadow-xs"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleStructure}
                disabled={isLoading || !rawNotes.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Structuring Petition...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                    Structure into 4-Part Petition
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Structured Output */}
          {structured && (
            <div className="space-y-4 pt-2 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Structured 4-Part Formal Petition
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  Verified Structure
                </span>
              </div>

              {/* Title & Metadata pill */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase">Suggested Formal Title</span>
                  <button
                    onClick={() => handleCopy(structured.structured_title, 'title')}
                    className="text-[11px] text-amber-600 hover:text-amber-700 flex items-center gap-1 font-medium"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedSection === 'title' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-sm font-semibold text-slate-900">{structured.structured_title}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800">
                    Dept: {structured.detected_department || structured.detected_category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-rose-100 text-rose-800">
                    Priority: {structured.recommended_priority}
                  </span>
                </div>
              </div>

              {/* 4-Part Breakdown */}
              <div className="space-y-3 text-xs">
                {/* 1. Incident Summary */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      1. Incident Summary
                    </span>
                    <button
                      onClick={() => handleCopy(structured.incident_summary, 'summary')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{structured.incident_summary}</p>
                </div>

                {/* 2. Location Clues */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      2. Location Clues & Landmarks
                    </span>
                    <button
                      onClick={() => handleCopy(structured.location_clues, 'location')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{structured.location_clues}</p>
                </div>

                {/* 3. Observed Impact */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-600" />
                      3. Observed Citizen & Civic Impact
                    </span>
                    <button
                      onClick={() => handleCopy(structured.observed_impact, 'impact')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">{structured.observed_impact}</p>
                </div>

                {/* 4. Priority & Category Summary */}
                <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-1">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-rose-600" />
                      4. Full Formatted Formal Petition
                    </span>
                    <button
                      onClick={() => handleCopy(structured.structured_description, 'full')}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{structured.structured_description}</p>
                </div>
              </div>

              {/* Missing Information Checklist */}
              {structured.missing_info_checklist && structured.missing_info_checklist.length > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Recommended On-Site Verifications
                  </div>
                  <ul className="space-y-1.5 text-xs text-amber-950 pl-2">
                    {structured.missing_info_checklist.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.is_critical ? 'bg-red-500' : 'bg-amber-500'}`} />
                        <div>
                          <strong className="font-semibold">{item.item}:</strong> {item.question}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {structured && (
              <button
                type="button"
                onClick={handleApplyToForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:shadow-lg"
              >
                Apply to Registration Form
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
