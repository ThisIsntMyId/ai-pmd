'use client';

import React, { useState, useRef } from 'react';
import {
  User,
  Files,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Check,
  ShieldAlert,
  Stethoscope,
  FileEdit,
  CheckCircle,
  Loader2,
  X,
  Upload
} from 'lucide-react';

interface ReviewResponse {
  patient_profile: string;
  eligibility_status: string;
  confidence_score: number;
  confidence_tier: string;
  documentation_status: string;
  diagnosis_match: boolean;
  diagnosis_match_notes: string | null;
  decline: boolean;
  decline_reason: string | null;
  review_pass: boolean;
  review_pass_reason: string;
  warnings: string[];
  qualifying_criteria: string[];
  recommendations: string[];
  patient_followup: string | null;
  admin_summary: string;
  provider_summary: string | null;
  provider_visit_note: string | null;
  analysis: string;
}

// File size limit: 3MB
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes

// Helper function to format file size
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Note: Default prompt and criteria are loaded from server-side modules
// If left empty, the API will use defaults from @/app/prompt.ts and @/app/criteria.ts
const defaultSystemPrompt = ''; // Empty = use server defaults
const defaultCriteriaMatrix = ''; // Empty = use server defaults

export default function ReviewPage() {
  const [patientName, setPatientName] = useState('');
  const [patientState, setPatientState] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt);
  const [criteriaMatrix, setCriteriaMatrix] = useState(defaultCriteriaMatrix);
  const [llmModel, setLlmModel] = useState('claude-sonnet-4-5');
  
  const [intakeFiles, setIntakeFiles] = useState<File[]>([]);
  const [medicalRecordsFiles, setMedicalRecordsFiles] = useState<File[]>([]);
  const [idProofFiles, setIdProofFiles] = useState<File[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  
  const intakeFileRef = useRef<HTMLInputElement>(null);
  const medicalRecordsFileRef = useRef<HTMLInputElement>(null);
  const idProofFileRef = useRef<HTMLInputElement>(null);

  const handleResetSystemPrompt = () => {
    setSystemPrompt(defaultSystemPrompt);
  };

  const handleResetCriteria = () => {
    setCriteriaMatrix(defaultCriteriaMatrix);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file sizes
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(2);
        setError(`File "${file.name}" exceeds 3MB limit. Size: ${sizeMB}MB`);
        // Reset input value
        if (e.target) {
          e.target.value = '';
        }
        return;
      }
    }
    
    // Clear any previous errors
    setError(null);
    
    if (files.length > 0) {
      setter((prev) => [...prev, ...files]);
    }
    // Reset input value so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRemoveFile = (
    index: number,
    files: File[],
    setter: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    setter(files.filter((_, i) => i !== index));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    const startTime = Date.now();

    try {
      const formData = new FormData();
      
      // Add form fields
      formData.append('patientName', patientName);
      formData.append('patientState', patientState);
      formData.append('patientAge', patientAge);
      formData.append('systemPrompt', systemPrompt);
      formData.append('criteriaMatrix', criteriaMatrix);
      formData.append('llmModel', llmModel);
      
      // Add files (multiple files per category)
      intakeFiles.forEach((file) => {
        formData.append('intakeFiles', file);
      });
      medicalRecordsFiles.forEach((file) => {
        formData.append('medicalRecordsFiles', file);
      });
      idProofFiles.forEach((file) => {
        formData.append('idProofFiles', file);
      });

      const response = await fetch('/api/review', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to process review (${response.status})`);
      }

      const data = await response.json();
      const endTime = Date.now();
      setLatency(endTime - startTime);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getEligibilityColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'eligible' || statusLower.includes('eligible')) {
      return {
        bg: 'bg-emerald-50/50',
        border: 'border-emerald-200',
        icon: 'text-emerald-600',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 border-emerald-200 text-emerald-800'
      };
    }
    return {
      bg: 'bg-rose-50/50',
      border: 'border-rose-200',
      icon: 'text-rose-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 border-rose-200 text-rose-800'
    };
  };

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2 font-bold text-lg text-slate-900">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          AI Model Playground
        </div>
        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Status: Online
          </span>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-5 space-y-6 h-[calc(100vh-100px)] overflow-y-auto pr-2">
          {/* Patient Context */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Patient Context
            </h2>
            <div className="space-y-3">
              <input
                type="text"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Patient Name"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  value={patientState}
                  onChange={(e) => setPatientState(e.target.value)}
                  className="w-2/3 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="State"
                />
                <input
                  type="number"
                  value={patientAge}
                  onChange={(e) => setPatientAge(e.target.value)}
                  className="w-1/3 text-sm border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Age"
                />
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Files className="w-4 h-4" />
                Documents
              </h2>
              <span className="text-xs text-slate-500">Max 3MB per file</span>
            </div>
            <div className="space-y-4">
              {/* Intake Files */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Intake Documents (JSON/PDF)</label>
                <input
                  ref={intakeFileRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(e, setIntakeFiles)}
                  className="hidden"
                  id="intakeFiles"
                  accept=".pdf,.json"
                />
                <label
                  htmlFor="intakeFiles"
                  className="block w-full text-xs text-slate-500 border border-slate-200 rounded-lg p-2.5 cursor-pointer hover:bg-slate-50 transition mb-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Click to add files</span>
                    <Upload className="w-4 h-4 text-slate-400" />
                  </div>
                </label>
                {intakeFiles.length > 0 && (
                  <div className="space-y-2">
                    {intakeFiles.map((file, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-2.5 flex items-center justify-between bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{file.name}</div>
                          <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <button
                            onClick={() => handleRemoveFile(index, intakeFiles, setIntakeFiles)}
                            className="text-slate-400 hover:text-slate-600"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Medical Records Files */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Medical Records (PDF)</label>
                <input
                  ref={medicalRecordsFileRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(e, setMedicalRecordsFiles)}
                  className="hidden"
                  id="medicalRecordsFiles"
                  accept=".pdf"
                />
                <label
                  htmlFor="medicalRecordsFiles"
                  className="block w-full text-xs text-slate-500 border border-slate-200 rounded-lg p-2.5 cursor-pointer hover:bg-slate-50 transition mb-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Click to add files</span>
                    <Upload className="w-4 h-4 text-slate-400" />
                  </div>
                </label>
                {medicalRecordsFiles.length > 0 && (
                  <div className="space-y-2">
                    {medicalRecordsFiles.map((file, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-2.5 flex items-center justify-between bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{file.name}</div>
                          <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <button
                            onClick={() => handleRemoveFile(index, medicalRecordsFiles, setMedicalRecordsFiles)}
                            className="text-slate-400 hover:text-slate-600"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ID Proof Files */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">ID Proof (Image/PDF)</label>
                <input
                  ref={idProofFileRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(e, setIdProofFiles)}
                  className="hidden"
                  id="idProofFiles"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <label
                  htmlFor="idProofFiles"
                  className="block w-full text-xs text-slate-500 border border-slate-200 rounded-lg p-2.5 cursor-pointer hover:bg-slate-50 transition mb-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Click to add files</span>
                    <Upload className="w-4 h-4 text-slate-400" />
                  </div>
                </label>
                {idProofFiles.length > 0 && (
                  <div className="space-y-2">
                    {idProofFiles.map((file, index) => (
                      <div key={index} className="border border-slate-200 rounded-lg p-2.5 flex items-center justify-between bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate">{file.name}</div>
                          <div className="text-xs text-slate-500">{formatBytes(file.size)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <button
                            onClick={() => handleRemoveFile(index, idProofFiles, setIdProofFiles)}
                            className="text-slate-400 hover:text-slate-600"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Model Configuration */}
          <div className="bg-white rounded-xl border border-indigo-100 shadow-sm overflow-hidden">
            <div className="bg-indigo-50/50 px-5 py-3 border-b border-indigo-100 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-indigo-900 text-sm">Model Configuration</h3>
            </div>
            
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                  SYSTEM PROMPT
                  <button
                    onClick={handleResetSystemPrompt}
                    className="text-indigo-600 cursor-pointer hover:underline"
                  >
                    Reset Default
                  </button>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full h-32 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                  spellCheck="false"
                  placeholder="Leave empty to use default prompt from server..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2 flex justify-between">
                  CRITERIA MATRIX
                  <button
                    onClick={handleResetCriteria}
                    className="text-indigo-600 cursor-pointer hover:underline"
                  >
                    Reset Default
                  </button>
                </label>
                <textarea
                  value={criteriaMatrix}
                  onChange={(e) => setCriteriaMatrix(e.target.value)}
                  className="w-full h-32 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
                  spellCheck="false"
                  placeholder="Leave empty to use default criteria from server..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">LLM MODEL</label>
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="claude-sonnet-4-5">Claude Sonnet 4.5 (Vertex AI)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Run Analysis Button */}
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 rounded-lg shadow-md transition flex items-center justify-center gap-2 group"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 group-hover:animate-ping" />
                Run Analysis
              </>
            )}
          </button>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-7 h-[calc(100vh-100px)] overflow-y-auto pr-2 pb-10">
          {!results && !loading && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 mt-10">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Terminal className="w-8 h-8 text-slate-300" />
              </div>
              <p className="font-medium">Waiting for analysis...</p>
              <p className="text-xs mt-1">Configure inputs and click Run</p>
            </div>
          )}

          {loading && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl h-96 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 mt-10">
              <div className="flex flex-col items-center animate-pulse py-20">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Sending prompt to LLM...</p>
                <p className="text-xs text-slate-400 mt-1">Processing documents</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-10">
              <p className="text-sm text-red-800">Error: {error}</p>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Patient Profile */}
              {results.patient_profile && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Patient Profile</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{results.patient_profile}</p>
                </div>
              )}

              {/* Decline Banner */}
              {results.decline && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-red-800 text-sm mb-2">Application Declined</h3>
                      {results.decline_reason && (
                        <p className="text-sm text-red-700 leading-relaxed">{results.decline_reason}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Eligibility Status */}
              <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${getEligibilityColor(results.eligibility_status).border}`}>
                <div className={`p-5 ${getEligibilityColor(results.eligibility_status).bg} flex items-center justify-between`}>
                  <div className="flex items-center gap-5">
                    <div className={`p-3 bg-white border ${getEligibilityColor(results.eligibility_status).border} rounded-full shadow-sm`}>
                      <Check className={`w-6 h-6 ${getEligibilityColor(results.eligibility_status).icon}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Determination</div>
                      <h2 className={`text-2xl font-bold ${getEligibilityColor(results.eligibility_status).text} tracking-tight`}>
                        {results.eligibility_status.toUpperCase()}
                      </h2>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Confidence</div>
                      <span className={`${getEligibilityColor(results.eligibility_status).badge} text-sm font-bold px-3 py-1 rounded-full`}>
                        {results.confidence_score}%
                      </span>
                    </div>
                    {results.confidence_tier && (
                      <div>
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Tier</div>
                        <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full">
                          {results.confidence_tier}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="grid grid-cols-2 gap-3">
                {/* Documentation Status */}
                {results.documentation_status && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Documentation Status</div>
                    <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      results.documentation_status === 'sufficient' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                      results.documentation_status === 'partial' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                      results.documentation_status === 'outdated' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {results.documentation_status}
                    </div>
                  </div>
                )}

                {/* Diagnosis Match */}
                {results.diagnosis_match !== undefined && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Diagnosis Match</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      results.diagnosis_match ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {results.diagnosis_match ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Match
                        </>
                      ) : (
                        <>
                          <X className="w-4 h-4" />
                          No Match
                        </>
                      )}
                    </div>
                    {results.diagnosis_match_notes && (
                      <p className="text-xs text-slate-600 mt-2">{results.diagnosis_match_notes}</p>
                    )}
                  </div>
                )}

                {/* Review Pass */}
                {results.review_pass !== undefined && (
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Review Status</div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                      results.review_pass ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-orange-100 text-orange-700 border border-orange-200'
                    }`}>
                      {results.review_pass ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Pass
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-4 h-4" />
                          Hold
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Review Pass Reason */}
              {results.review_pass_reason && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Review Pass Reason</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{results.review_pass_reason}</p>
                </div>
              )}

              {/* Qualifying Criteria */}
              {results.qualifying_criteria && results.qualifying_criteria.length > 0 && (
                <div className="bg-white rounded-xl border border-emerald-200 shadow-sm overflow-hidden">
                  <div className="bg-emerald-50/50 px-5 py-3 border-b border-emerald-100 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-emerald-900 text-sm">Qualifying Criteria</h3>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2">
                      {results.qualifying_criteria.map((criterion, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{criterion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results.recommendations && results.recommendations.length > 0 && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                  <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex items-center gap-2">
                    <FileEdit className="w-4 h-4 text-blue-600" />
                    <h3 className="font-bold text-blue-900 text-sm">Recommendations</h3>
                  </div>
                  <div className="p-5">
                    <ul className="space-y-2">
                      {results.recommendations.map((recommendation, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Warnings */}
              {results.warnings && results.warnings.length > 0 && (
                <div className="bg-white rounded-xl border border-orange-200 shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-400"></div>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-sm mb-2">Warnings</h3>
                      <ul className="space-y-1">
                        {results.warnings.map((warning, index) => (
                          <li key={index} className="text-sm text-slate-600">{warning}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Patient Followup */}
              {results.patient_followup && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl shadow-sm p-4 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400"></div>
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-amber-900 text-sm mb-2">Patient Followup Required</h3>
                      <p className="text-sm text-amber-800 leading-relaxed">{results.patient_followup}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Summary */}
              {results.admin_summary && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-4">
                  <h3 className="font-bold text-slate-800 text-sm mb-2">Admin Summary</h3>
                  <p className="text-sm text-slate-700 leading-relaxed">{results.admin_summary}</p>
                </div>
              )}

              {/* Provider Summary */}
              {results.provider_summary && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-bold text-slate-700 text-sm">Provider Summary</h3>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-slate-700 leading-relaxed">{results.provider_summary}</p>
                  </div>
                </div>
              )}

              {/* Provider Visit Note */}
              {results.provider_visit_note && (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                  <div className="bg-blue-50/50 px-5 py-3 border-b border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileEdit className="w-4 h-4 text-blue-600" />
                      <h3 className="font-bold text-blue-900 text-sm">Generated Provider Visit Note</h3>
                    </div>
                    <button
                      onClick={() => results.provider_visit_note && copyToClipboard(results.provider_visit_note)}
                      className="text-xs bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 transition"
                    >
                      Copy Text
                    </button>
                  </div>
                  <div className="p-5">
                    <textarea
                      value={results.provider_visit_note}
                      readOnly
                      className="w-full h-48 text-sm text-slate-600 bg-white border-none focus:ring-0 resize-none font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}

              {/* Analysis (HTML) */}
              {results.analysis && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-slate-50 px-5 py-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-700 text-sm">Detailed Analysis</h3>
                  </div>
                  <div
                    className="p-5 text-sm text-slate-700 [&_h3]:font-bold [&_h3]:text-base [&_h3]:mb-2 [&_h3]:mt-4 [&_ul]:list-disc [&_ul]:ml-6 [&_ul]:space-y-1 [&_p]:mb-3 [&_p]:leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:px-2 [&_th]:py-1 [&_th]:bg-slate-50 [&_td]:border [&_td]:border-slate-300 [&_td]:px-2 [&_td]:py-1"
                    dangerouslySetInnerHTML={{ __html: results.analysis }}
                  />
                </div>
              )}

              {/* Raw JSON Response */}
              <div className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Debug: Raw JSON Response</h3>
                  {latency && (
                    <span className="text-xs text-slate-400 font-mono">{latency}ms latency</span>
                  )}
                </div>
                <div className="bg-slate-900 rounded-xl p-5 shadow-inner overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}