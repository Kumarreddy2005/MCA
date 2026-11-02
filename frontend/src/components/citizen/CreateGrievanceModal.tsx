import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { complaintService } from "@/services/api/complaint.service";
import { aiService } from "@/services/api/ai.service";
import { GovernmentDepartments, Priority } from "@/types/complaint";
import {
  KARNATAKA_DISTRICTS,
  extractLocationFromText,
  resolveKarnatakaDistrict,
  detectLocationConflict,
  deriveCleanProblemTitle,
} from "@/utils/locationHelper";
import {
  X,
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Camera,
  FileText,
  Edit3,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  ShieldCheck,
  MapPin,
} from "lucide-react";

interface CreateGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | "CONFIRMATION";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export const CreateGrievanceModal: React.FC<CreateGrievanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();

  // Wizard Step State
  const [step, setStep] = useState<WizardStep>(1);

  // Step 1: Tell us what happened (Original Complaint Text)
  const [description, setDescription] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Step 2: AI Analysis & Understanding
  const [aiLoading, setAiLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState<string>("Water Supply");
  const [category, setCategory] = useState("Water Services");
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [safetyRisk, setSafetyRisk] = useState(false);
  const [confidence, setConfidence] = useState(0.85);
  const [isUncertain, setIsUncertain] = useState(false);
  const [isEditingAi, setIsEditingAi] = useState(false);

  // Step 3: Location (Precedence: Explicit > Extracted > Resolved > Unresolved)
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [landmark, setLandmark] = useState("");
  const [isLocationManuallyEdited, setIsLocationManuallyEdited] = useState(false);
  const [locationConflict, setLocationConflict] = useState<{
    hasConflict: boolean;
    enteredLocation: string;
    textLocation: string | null;
  } | null>(null);

  const [showAdvancedLocation, setShowAdvancedLocation] = useState(false);
  const [ward, setWard] = useState(user?.citizenProfile?.ward || "");
  const [mandal, setMandal] = useState("");
  const [pincode, setPincode] = useState(user?.citizenProfile?.pincode || "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Step 4: Evidence
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Step 5: Submission & Confirmation
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedComplaintNumber, setSubmittedComplaintNumber] = useState<string | null>(null);

  // Speech Recognition Refs & Cleanup
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef<string>("");

  // Initialize Speech Recognition Support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
      }
    }
  }, []);

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError(null);
      setLocationConflict(null);
      // Do not pre-fill hardcoded Mysuru or force village if not yet established
      if (!isLocationManuallyEdited && !village) {
        if (user?.citizenProfile?.village) {
          setVillage(user.citizenProfile.village);
        }
        if (user?.citizenProfile?.district) {
          setDistrict(user.citizenProfile.district);
        }
      }
    }
  }, [isOpen]);

  // Stop active speech recognition safely
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onstart = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore stop errors
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Clean up recognition when modal closes or unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  if (!isOpen) return null;

  // Toggle Voice Input
  const toggleListening = () => {
    if (!speechSupported) {
      setError("Speech recognition is not supported in this browser. Please type your message directly.");
      return;
    }

    if (isListening || recognitionRef.current) {
      stopListening();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      baseTextRef.current = description ? description.trim() : "";

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = (typeof navigator !== "undefined" && navigator.language) || "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        let sessionFinal = "";
        let sessionInterim = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          if (!res) continue;
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            sessionFinal += text;
          } else {
            sessionInterim += text;
          }
        }

        const recognizedSpoken = (sessionFinal + sessionInterim).trim();
        const base = baseTextRef.current;

        let fullText = "";
        if (base && recognizedSpoken) {
          fullText = `${base} ${recognizedSpoken}`;
        } else if (recognizedSpoken) {
          fullText = recognizedSpoken;
        } else {
          fullText = base;
        }

        setDescription(fullText);
      };

      recognition.onerror = (errEvent: SpeechRecognitionErrorEventLike) => {
        if (errEvent?.error !== "no-speech") {
          console.warn(`[SpeechRecognition] Error: ${errEvent?.error || "unknown"}`);
        }
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      stopListening();
      setError("Failed to start microphone speech input.");
    }
  };

  // Run AI Assist / Structure Complaint (Step 1 -> Step 2)
  const handleRunAiAssist = async () => {
    setError(null);
    const cleanDesc = description.trim();
    if (!cleanDesc || cleanDesc.length < 5) {
      setError("Please describe your problem in at least a few words first.");
      return;
    }

    // 1. Extract location from complaint text (Precedence rules)
    const locResult = extractLocationFromText(cleanDesc);

    // 2. Location Precedence and Conflict Checking:
    if (isLocationManuallyEdited && village.trim() && locResult.reportedLocation) {
      // Citizen entered one location, but text mentions another location (Test F)
      const conflict = detectLocationConflict(village.trim(), locResult.reportedLocation);
      setLocationConflict(conflict.hasConflict ? conflict : null);
    } else if (!isLocationManuallyEdited && locResult.reportedLocation) {
      // Precedence 2: Use extracted location from text (Test A, B, C)
      setVillage(locResult.reportedLocation);
      if (locResult.landmark && !landmark) {
        setLandmark(locResult.landmark);
      }
      if (locResult.district) {
        // Precedence 3: Use reliable resolved district
        setDistrict(locResult.district);
      }
    } else if (!isLocationManuallyEdited && !locResult.reportedLocation) {
      // Precedence 4: Location cannot be established from text (Test D)
      // Leave unresolved if not already provided; do NOT invent Mysuru
      if (!user?.citizenProfile?.village) {
        setVillage("");
      }
      if (!user?.citizenProfile?.district) {
        setDistrict("");
      }
    }

    setAiLoading(true);
    try {
      // Determine location to pass to AI service (do NOT pass arbitrary default)
      const targetVillage = (!isLocationManuallyEdited && locResult.reportedLocation)
        ? locResult.reportedLocation
        : (village.trim() || undefined);
      const targetDistrict = locResult.district || (district.trim() || undefined);

      // Derive clean problem title without appending meta-summaries
      const initialCleanTitle = deriveCleanProblemTitle(cleanDesc);

      const analysis = await aiService.analyzeComplaint({
        title: initialCleanTitle,
        description: cleanDesc,
        village: targetVillage,
        district: targetDistrict,
      });

      // Map AI department recommendation
      const rec = analysis.departmentRecommendation;
      const deptName = rec?.department || "Water Supply";

      let activeDept = "Water Supply";
      if (deptName.match(/Road|Transport|PWD/i)) {
        activeDept = "Roads & Transport";
      } else if (deptName.match(/Electricity|Power|Energy|BESCOM/i)) {
        activeDept = "Electricity & Power";
      } else {
        activeDept = "Water Supply";
      }

      setDepartment(activeDept);
      setCategory(rec?.subCategory || "General Civic Issue");

      // Set clean problem title (NEVER set to analysis.summary.summary with "Citizen filed a grievance regarding...")
      const finalCleanTitle = deriveCleanProblemTitle(cleanDesc, activeDept, rec?.subCategory);
      setTitle(finalCleanTitle);

      setPriority(analysis.priorityRecommendation?.priority || Priority.MEDIUM);

      const confVal = typeof rec?.confidence === "number" ? rec.confidence : 0.85;
      setConfidence(confVal);

      const lowConf = confVal < 0.50 || rec?.department === "UNCERTAIN" || rec?.department === "OUT_OF_SCOPE";
      setIsUncertain(Boolean(lowConf));

      const isSafety =
        (analysis.priorityRecommendation?.safetyFactors && analysis.priorityRecommendation.safetyFactors.length > 0) ||
        analysis.priorityRecommendation?.priority === Priority.CRITICAL;
      setSafetyRisk(Boolean(isSafety));

      setStep(2);
    } catch {
      // Offline fallback: derive clean classification locally
      const descLower = cleanDesc.toLowerCase();
      let fallbackDept = "Water Supply";
      let fallbackCat = "Water Supply Issue";

      if (descLower.match(/road|pothole|drainage|street|bridge|culvert|traffic|tar/i)) {
        fallbackDept = "Roads & Transport";
        fallbackCat = "Road & Drainage Maintenance";
      } else if (descLower.match(/power|electric|current|light|pole|wire|transformer|voltage/i)) {
        fallbackDept = "Electricity & Power";
        fallbackCat = "Power Supply Issue";
      }

      setDepartment(fallbackDept);
      setCategory(fallbackCat);
      setTitle(deriveCleanProblemTitle(cleanDesc, fallbackDept, fallbackCat));
      setPriority(Priority.MEDIUM);
      setConfidence(0.70);
      setIsUncertain(true);
      setStep(2);
    } finally {
      setAiLoading(false);
    }
  };

  // Auto-Detect GPS Location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("GPS is not supported by your browser.");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setError(`Unable to acquire GPS position: ${err.message}`);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Handle File Attachments
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (selectedFiles.length + newFiles.length > 5) {
        setError("Maximum 5 evidence files allowed.");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Final Grievance to Backend
  const handleSubmitGrievance = async () => {
    setError(null);
    if (!village.trim()) {
      setError("Please specify your Area / Village or Locality.");
      setStep(3);
      return;
    }

    if (!district.trim()) {
      setError("Please select or confirm your District.");
      setStep(3);
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("title", title || deriveCleanProblemTitle(description, department, category));
      formData.append("description", description.trim());
      formData.append("category", category);
      formData.append("department", department);
      formData.append("priority", priority);
      formData.append("village", village.trim());
      formData.append("district", district.trim());
      if (landmark.trim()) formData.append("addressLine", landmark.trim());
      if (ward.trim()) formData.append("ward", ward.trim());
      if (mandal.trim()) formData.append("mandal", mandal.trim());
      if (pincode.trim()) formData.append("pincode", pincode.trim());
      if (coords) {
        formData.append("latitude", coords.lat.toString());
        formData.append("longitude", coords.lng.toString());
      }

      selectedFiles.forEach((f) => {
        formData.append("files", f);
      });

      const res = await complaintService.submitComplaint(formData);
      setSubmittedComplaintNumber(res.complaintNumber || "CMP-PENDING");
      setStep("CONFIRMATION");
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-6 max-h-[90vh] overflow-y-auto relative">
        {/* Close Button */}
        {step !== "CONFIRMATION" && (
          <button
            onClick={onClose}
            className="absolute right-5 top-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Wizard Progress Indicator Bar */}
        {typeof step === "number" && (
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
              <span>Step {step} of 5</span>
              <span>
                {step === 1 && "Describe Problem"}
                {step === 2 && "AI Understanding"}
                {step === 3 && "Location"}
                {step === 4 && "Evidence (Optional)"}
                {step === 5 && "Review & Submit"}
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={`h-full flex-1 transition-all duration-300 border-r border-white ${
                    step >= i ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-xs sm:text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1">{error}</div>
            <button onClick={() => setError(null)} className="text-rose-500 hover:underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* ========================================================
            STEP 1: REPORT A PROBLEM (Tell Us What Happened)
        ======================================================== */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Report a Problem</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Tell us what happened in your own words.
              </p>
            </div>

            <div>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Describe your problem in plain language...&#10;&#10;Example: "There is a water problem in KR Puram, Bangalore."'
                className="w-full p-4 rounded-2xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden resize-none leading-relaxed"
                autoFocus
              />
              <div className="flex items-center justify-between text-xs text-slate-400 mt-1 px-1">
                <span>Type in English, Kannada, or your local language</span>
                <span>{description.length} chars</span>
              </div>
            </div>

            {/* Step 1 Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                    isListening
                      ? "bg-rose-100 text-rose-800 border-rose-300 animate-pulse"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-600" />}
                  <span>{isListening ? "Listening..." : "🎙 Speak"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={handleRunAiAssist}
                  disabled={aiLoading || !description.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                  )}
                  <span>✨ AI Assist</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAiAssist}
                  disabled={!description.trim() || aiLoading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 2: ✨ WE UNDERSTOOD YOUR PROBLEM (AI Review)
        ======================================================== */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  We Understood Your Problem
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Here is how our AI understood and structured your grievance:
                </p>
              </div>
            </div>

            {/* Location Conflict Banner (Test F) */}
            {locationConflict?.hasConflict && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Location Clarification Needed</span>
                </div>
                <p className="text-xs leading-relaxed text-amber-800">
                  Your complaint mentions <strong className="font-bold text-amber-950">"{locationConflict.textLocation}"</strong>, but your entered location is <strong className="font-bold text-amber-950">"{locationConflict.enteredLocation}"</strong>. Which location should field workers verify?
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (locationConflict.textLocation) {
                        setVillage(locationConflict.textLocation);
                        const resolved = resolveKarnatakaDistrict(locationConflict.textLocation);
                        if (resolved) setDistrict(resolved);
                        setIsLocationManuallyEdited(true);
                        setLocationConflict(null);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition"
                  >
                    ✓ Use "{locationConflict.textLocation}" (from complaint)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationConflict(null)}
                    className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-xs transition"
                  >
                    Keep "{locationConflict.enteredLocation}"
                  </button>
                </div>
              </div>
            )}

            {/* Unresolved Location Notice (Test D) */}
            {!village && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
                <Compass className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold">Location not found in text:</span> Please confirm your area or village in the next step so field teams can locate the issue.
                </div>
              </div>
            )}

            {/* Structured Information Display */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4">
              {/* Problem Title */}
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Problem Headline
                </div>
                <div className="font-bold text-slate-900 text-sm">{title}</div>
              </div>

              {/* Department, Category, Priority, Location Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Department Suggestion
                  </div>
                  <div className="text-xs font-bold text-blue-700 mt-0.5">{department}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Problem Type
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 truncate">{category}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Priority
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-0.5 uppercase">{priority}</div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Safety Risk
                  </div>
                  <div className={`text-xs font-bold mt-0.5 ${safetyRisk ? "text-rose-600" : "text-emerald-600"}`}>
                    {safetyRisk ? "Yes" : "No"}
                  </div>
                </div>
              </div>

              {/* Reported Location & District Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    Reported Location
                  </span>
                  <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {village || <span className="text-amber-700 font-normal">Pending your confirmation</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                    District
                  </span>
                  <span className="font-bold text-slate-900 mt-0.5 block">
                    {district || <span className="text-amber-700 font-normal">Unresolved (Select in Step 3)</span>}
                  </span>
                </div>
              </div>

              {/* Original Complaint Text Card */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                  Original Complaint (Your Words)
                </span>
                <p className="text-slate-700 leading-relaxed italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  "{description}"
                </p>
              </div>

              {/* Confidence & Uncertainty Indicator */}
              {isUncertain ? (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Volunteer Verification Layer</div>
                    <p className="mt-0.5 text-[11px] text-amber-800 leading-normal">
                      A village volunteer will review and field-verify this grievance before it is routed to the concerned department.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    AI Structuring Confidence: <strong>{Math.round(confidence * 100)}%</strong>
                  </span>
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-bold">
                    Structured
                  </span>
                </div>
              )}
            </div>

            {/* Manual Edit Toggle Section */}
            {isEditingAi ? (
              <div className="p-4 bg-white rounded-2xl border border-blue-200 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Refine Classification Details:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                    >
                      {GovernmentDepartments.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as Priority)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white uppercase font-bold"
                    >
                      <option value={Priority.LOW}>Low</option>
                      <option value={Priority.MEDIUM}>Medium</option>
                      <option value={Priority.HIGH}>High</option>
                      <option value={Priority.CRITICAL}>Critical</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Problem Summary Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            ) : null}

            {/* Step 2 Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingAi(!isEditingAi)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                <span>{isEditingAi ? "Hide Edit" : "✎ Edit"}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>✓ Looks Correct</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 3: WHERE IS THE PROBLEM? (Location Step)
        ======================================================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Where is the Problem?</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Help field workers find the exact spot in your village or locality.
              </p>
            </div>

            {/* Location Options */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="w-full p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center justify-between text-left transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-blue-900 text-sm">📍 Use My Current Location (GPS)</div>
                    <div className="text-xs text-blue-700 mt-0.5">
                      {coords
                        ? `Tagged: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
                        : "Auto-detect location from your phone"}
                    </div>
                  </div>
                </div>
                {locationLoading ? (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                ) : coords ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                )}
              </button>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-xs font-semibold text-slate-400 uppercase">
                  Confirm or Edit Location
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Area / Village & District */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Area / Village / Locality *
                  </label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => {
                      setVillage(e.target.value);
                      setIsLocationManuallyEdited(true);
                    }}
                    placeholder="e.g. KR Puram, Bangalore"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Extracted or entered locality
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setIsLocationManuallyEdited(true);
                    }}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden font-medium"
                  >
                    <option value="">-- Select Karnataka District --</option>
                    {KARNATAKA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Authoritative Karnataka District
                  </span>
                </div>
              </div>

              {/* Landmark */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Landmark or Cross Street (Optional)
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="e.g. Near TC Palya Main Road / Bus Stand / Water Tank"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                />
              </div>

              {/* Collapsible Advanced Location */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedLocation(!showAdvancedLocation)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                >
                  {showAdvancedLocation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>{showAdvancedLocation ? "Hide detailed location fields" : "Add more location details (Ward, Mandal, Pincode)"}</span>
                </button>

                {showAdvancedLocation && (
                  <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Ward / Street</label>
                      <input
                        type="text"
                        value={ward}
                        onChange={(e) => setWard(e.target.value)}
                        placeholder="Ward 4"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Mandal / Taluk</label>
                      <input
                        type="text"
                        value={mandal}
                        onChange={(e) => setMandal(e.target.value)}
                        placeholder="KR Puram Taluk"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">Pincode</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                        placeholder="560036"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3 Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!village.trim()) {
                    setError("Please enter your Area / Village or Locality name.");
                    return;
                  }
                  if (!district.trim()) {
                    setError("Please select or confirm your District.");
                    return;
                  }
                  setError(null);
                  setStep(4);
                }}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
              >
                <span>Continue to Photo</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 4: ADD A PHOTO OR DOCUMENT (Optional)
        ======================================================== */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Add a Photo or Document</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Optional: Photos help field workers understand the damage faster.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-300 rounded-3xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/20 transition cursor-pointer relative bg-slate-50/50">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex justify-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-800">📷 Add Photo or 📄 Add Document</h3>
              <p className="text-xs text-slate-500 mt-1">Click or drag files here (JPG, PNG, PDF up to 10MB each)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-700">Attached Files ({selectedFiles.length}):</div>
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate max-w-xs">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-rose-600 hover:underline font-bold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Step 4 Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                Back
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <span>Review Complaint</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            STEP 5: REVIEW YOUR COMPLAINT (Final Review)
        ======================================================== */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Review Your Complaint</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Please double-check your grievance details before submitting.
              </p>
            </div>

            {/* Structured Information Display */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              {/* Problem Headline */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Problem Headline</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">{title}</div>
              </div>

              {/* Original Complaint (Your Words) */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Original Complaint (Your Words)</div>
                <p className="text-slate-800 text-xs mt-1 leading-relaxed whitespace-pre-wrap">{description}</p>
              </div>

              {/* Location & AI Suggestions Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Location</div>
                  <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    {village}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    District: <strong className="font-semibold text-slate-800">{district}</strong>
                  </div>
                  {landmark && <div className="text-slate-500 text-[11px]">Landmark: {landmark}</div>}
                  {coords && <div className="text-emerald-700 font-mono text-[10px] mt-0.5">GPS Tagged</div>}
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department Suggestion</div>
                  <div className="font-bold text-blue-700 mt-0.5">{department}</div>
                  <div className="text-slate-600 text-[11px]">
                    Category: <strong className="font-semibold text-slate-800">{category}</strong> ({priority} priority)
                  </div>
                  <div className="text-emerald-700 text-[11px] font-medium">
                    Verified by volunteer before department assignment
                  </div>
                </div>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <span className="font-semibold text-slate-700">Photos / Documents Attached:</span>
                <span className="font-bold text-slate-900">{selectedFiles.length} file(s)</span>
              </div>
            </div>

            {/* Step 5 Actions */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
              >
                ✎ Edit Complaint
              </button>

              <button
                type="button"
                onClick={handleSubmitGrievance}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Grievance...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✓ Submit Grievance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            POST-SUBMISSION CONFIRMATION SCREEN
        ======================================================== */}
        {step === "CONFIRMATION" && (
          <div className="py-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
                Reference ID: {submittedComplaintNumber}
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Your grievance has been submitted.</h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                Your complaint will now be reviewed by a volunteer before it is forwarded to the concerned department.
              </p>
              {department && (
                <div className="mt-3 p-3 bg-blue-50/80 rounded-xl border border-blue-100 text-xs text-blue-900 max-w-md mx-auto">
                  <div className="font-semibold">✨ AI suggested: <span className="font-bold text-blue-700">{department}</span></div>
                  <div className="text-[11px] text-blue-700 mt-0.5">Final department will be confirmed during volunteer verification.</div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Mandatory Grievance Verification Flow:
              </div>
              <div className="flex items-center gap-2 text-slate-600 pt-1 flex-wrap">
                <span className="font-bold text-blue-700">1. Citizen Submitted</span>
                <span>→</span>
                <span className="font-bold text-amber-700">2. Volunteer Verification</span>
                <span>→</span>
                <span>3. Department Routing</span>
                <span>→</span>
                <span>4. Resolution</span>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setStep(1);
                  setDescription("");
                  setSelectedFiles([]);
                  setSubmittedComplaintNumber(null);
                }}
                className="px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md"
              >
                Track My Grievance
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
