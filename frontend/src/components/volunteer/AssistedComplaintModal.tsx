import React, { useState, useEffect } from "react";
import {
  X,
  FileCheck,
  Search,
  Sparkles,
  MapPin,
  Upload,
  AlertCircle,
  Loader2,
  CheckCircle,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { IUser } from "@/types/auth";
import { GovernmentDepartments, Priority, IComplaint } from "@/types/complaint";
import { volunteerService } from "@/services/api/volunteer.service";
import { VolunteerAiAssistantModal } from "./VolunteerAiAssistantModal";

interface AssistedComplaintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (complaint: IComplaint) => void;
  onOpenRegisterCitizen: () => void;
  preselectedCitizen?: IUser | null;
  initialDraft?: {
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
  } | null;
}

export const AssistedComplaintModal: React.FC<AssistedComplaintModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenRegisterCitizen,
  preselectedCitizen = null,
  initialDraft = null,
}) => {
  const { user } = useAuth();
  const volunteerProfile = user?.volunteerProfile;

  // Citizen search & selection
  const [citizenQuery, setCitizenQuery] = useState("");
  const [citizens, setCitizens] = useState<IUser[]>([]);
  const [selectedCitizen, setSelectedCitizen] = useState<IUser | null>(preselectedCitizen);
  const [searchingCitizen, setSearchingCitizen] = useState(false);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Drinking Water Supply");
  const [department, setDepartment] = useState<string>(GovernmentDepartments[0]);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

  // Location Fields
  const [village, setVillage] = useState(volunteerProfile?.assignedVillage || "Rampura");
  const [ward, setWard] = useState(volunteerProfile?.assignedWard || "Ward 4");
  const [mandal, setMandal] = useState("");
  const [district, setDistrict] = useState(volunteerProfile?.district || "Mysuru");
  const [pincode, setPincode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Evidence & Immediate Verification
  const [files, setFiles] = useState<File[]>([]);
  const [immediateVerification, setImmediateVerification] = useState(true);
  const [verificationNotes, setVerificationNotes] = useState("");

  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    if (initialDraft) {
      if (initialDraft.title) setTitle(initialDraft.title);
      if (initialDraft.description) setDescription(initialDraft.description);
      if (initialDraft.category) setCategory(initialDraft.category);
      if (initialDraft.department) setDepartment(initialDraft.department);
      if (initialDraft.priority) setPriority(initialDraft.priority as Priority);
    }
  }, [initialDraft]);

  useEffect(() => {
    if (preselectedCitizen) {
      setSelectedCitizen(preselectedCitizen);
      if (preselectedCitizen.citizenProfile?.village) setVillage(preselectedCitizen.citizenProfile.village);
      if (preselectedCitizen.citizenProfile?.ward) setWard(preselectedCitizen.citizenProfile.ward);
      if (preselectedCitizen.citizenProfile?.district) setDistrict(preselectedCitizen.citizenProfile.district);
      if (preselectedCitizen.citizenProfile?.pincode) setPincode(preselectedCitizen.citizenProfile.pincode);
    }
  }, [preselectedCitizen]);

  useEffect(() => {
    if (!selectedCitizen && isOpen) {
      // Load initial citizens in cluster
      searchClusterCitizens("");
    }
  }, [isOpen, selectedCitizen]);

  const searchClusterCitizens = async (q: string) => {
    try {
      setSearchingCitizen(true);
      const list = await volunteerService.searchCitizens(q);
      setCitizens(list);
    } catch {
      // ignore
    } finally {
      setSearchingCitizen(false);
    }
  };

  const handleSelectCitizen = (c: IUser) => {
    setSelectedCitizen(c);
    if (c.citizenProfile?.village) setVillage(c.citizenProfile.village);
    if (c.citizenProfile?.ward) setWard(c.citizenProfile.ward);
    if (c.citizenProfile?.district) setDistrict(c.citizenProfile.district);
    if (c.citizenProfile?.pincode) setPincode(c.citizenProfile.pincode);
    if (c.citizenProfile?.address) setAddressLine(c.citizenProfile.address);
  };

  const handleCaptureLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        setError(`Unable to get location: ${err.message}`);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files).slice(0, 5);
      setFiles(selected);
    }
  };

  const handleApplyAiDraft = (draft: {
    title: string;
    description: string;
    category: string;
    department: string;
    priority: string;
  }) => {
    setTitle(draft.title);
    setDescription(draft.description);
    setCategory(draft.category);
    setDepartment(draft.department);
    setPriority(draft.priority as Priority);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCitizen) {
      setError("Please select or register a citizen for this grievance");
      return;
    }

    if (!title.trim() || title.trim().length < 5) {
      setError("Grievance title must be at least 5 characters");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    if (!village.trim() || !district.trim()) {
      setError("Village and District are required");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("citizenId", selectedCitizen.id);
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("category", category.trim());
      formData.append("department", department.trim());
      formData.append("priority", priority);
      formData.append("village", village.trim());
      if (ward.trim()) formData.append("ward", ward.trim());
      if (mandal.trim()) formData.append("mandal", mandal.trim());
      formData.append("district", district.trim());
      if (pincode.trim()) formData.append("pincode", pincode.trim());
      if (addressLine.trim()) formData.append("addressLine", addressLine.trim());

      if (latitude !== null && longitude !== null) {
        formData.append("latitude", String(latitude));
        formData.append("longitude", String(longitude));
      }

      formData.append("immediateVerification", String(immediateVerification));
      if (immediateVerification && verificationNotes.trim()) {
        formData.append("verificationNotes", verificationNotes.trim());
      }

      files.forEach((f) => {
        formData.append("evidence", f);
      });

      const complaint = await volunteerService.fileAssistedComplaint(formData);
      onSuccess(complaint);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit assisted complaint");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">File Assisted Grievance</h2>
                <p className="text-xs text-slate-500">
                  Registering on behalf of a rural citizen with volunteer verification
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* 1. Citizen Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Citizen Identification <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={onOpenRegisterCitizen}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  + Register New Villager
                </button>
              </div>

              {selectedCitizen ? (
                <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-sm">
                      {selectedCitizen.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        {selectedCitizen.name}
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                          Verified Citizen
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {selectedCitizen.phone} • {selectedCitizen.citizenProfile?.village || village}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCitizen(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg hover:bg-white"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search citizen by name or phone in cluster..."
                      value={citizenQuery}
                      onChange={(e) => {
                        setCitizenQuery(e.target.value);
                        searchClusterCitizens(e.target.value);
                      }}
                      className="w-full pl-10 pr-10 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                    />
                    {searchingCitizen && (
                      <Loader2 className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin" />
                    )}
                  </div>

                  {citizens.length > 0 && (
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
                      {citizens.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCitizen(c)}
                          className="p-2.5 px-3 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{c.name}</div>
                            <div className="text-[11px] text-slate-500">
                              {c.phone} • {c.citizenProfile?.village || "Cluster"}
                            </div>
                          </div>
                          <span className="text-[11px] font-semibold text-amber-600">Select</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* AI Assistant Quick Draft Trigger */}
            <div className="p-3.5 rounded-xl bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-950">Draft with Volunteer AI Assistant</div>
                  <div className="text-[11px] text-amber-800">
                    Transform colloquial citizen words into formal administrative categories
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition shadow-xs"
              >
                Launch Assistant
              </button>
            </div>

            {/* 2. Grievance Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grievance Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Drinking water pipeline leakage near water tank"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Citizen Statement & Problem Details <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description of the issue as narrated by the citizen..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
                  >
                    {GovernmentDepartments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Drinking Water Supply"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 bg-white"
                  >
                    <option value={Priority.LOW}>Low</option>
                    <option value={Priority.MEDIUM}>Medium</option>
                    <option value={Priority.HIGH}>High</option>
                    <option value={Priority.CRITICAL}>Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. Location Details */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Location & Coordinates
                </span>
                <button
                  type="button"
                  onClick={handleCaptureLocation}
                  disabled={locating}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-800"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {locating ? "Detecting..." : "Auto-Capture GPS"}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Village *</label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Ward</label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Mandal</label>
                  <input
                    type="text"
                    value={mandal}
                    onChange={(e) => setMandal(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Pincode</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>

              {latitude && longitude && (
                <div className="mt-2 text-[11px] text-emerald-700 flex items-center gap-1 font-mono">
                  <CheckCircle className="w-3 h-3" />
                  GPS Tagged: {latitude}, {longitude}
                </div>
              )}
            </div>

            {/* 4. Evidence Attachments */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Photos / Documents</label>
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50">
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-600 font-medium">
                  {files.length > 0 ? `${files.length} file(s) attached` : "Upload photos or citizen documents"}
                </span>
                <span className="text-[10px] text-slate-400">JPG, PNG, PDF up to 10MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* 5. Immediate Field Verification Toggle */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={immediateVerification}
                  onChange={(e) => setImmediateVerification(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Immediate Field Verification
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Check this if you are physically present at the scene and have verified the complaint on the ground right now.
                  </p>
                </div>
              </label>

              {immediateVerification && (
                <div className="pt-2">
                  <input
                    type="text"
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    placeholder="On-site verification remarks (e.g. Inspected spot in person; verified damage)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-sm font-medium transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm transition shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting Grievance...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4" />
                    Submit Assisted Grievance
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* AI Assistant Modal */}
      <VolunteerAiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onApplyDraft={handleApplyAiDraft}
        defaultVillage={village}
      />
    </>
  );
};
