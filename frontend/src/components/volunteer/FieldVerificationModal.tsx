import React, { useState } from "react";
import {
  X,
  ClipboardCheck,
  MapPin,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { IComplaint, FieldVerificationResult } from "@/types/complaint";
import { volunteerService } from "@/services/api/volunteer.service";
import { useAuth } from "@/context/AuthContext";

interface FieldVerificationModalProps {
  isOpen: boolean;
  complaint: IComplaint | null;
  onClose: () => void;
  onSuccess: (updatedComplaint: IComplaint) => void;
}

export const FieldVerificationModal: React.FC<FieldVerificationModalProps> = ({
  isOpen,
  complaint,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [result, setResult] = useState<FieldVerificationResult>(FieldVerificationResult.VERIFIED);
  const [notes, setNotes] = useState("");
  const [citizenIdentified, setCitizenIdentified] = useState(true);
  const [incidentConfirmed, setIncidentConfirmed] = useState(true);
  const [evidenceValid, setEvidenceValid] = useState(true);
  const [severityMatches, setSeverityMatches] = useState(true);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !complaint) return null;

  const handleCaptureGps = () => {
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
      const selected = Array.from(e.target.files).slice(0, 4);
      setPhotos(selected);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!notes.trim() || notes.trim().length < 5) {
      setError("Please provide verification notes (at least 5 characters)");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("result", result);
      formData.append("notes", notes.trim());
      formData.append("citizenIdentified", String(citizenIdentified));
      formData.append("incidentConfirmed", String(incidentConfirmed));
      formData.append("evidenceValid", String(evidenceValid));
      formData.append("severityMatches", String(severityMatches));

      if (latitude !== null && longitude !== null) {
        formData.append("latitude", String(latitude));
        formData.append("longitude", String(longitude));
      }

      photos.forEach((file) => {
        formData.append("photos", file);
      });

      const updated = await volunteerService.submitFieldVerification(complaint.id, formData);
      onSuccess(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record field verification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">On-Site Field Verification</h2>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                  {complaint.complaintNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Authorized field visit by Volunteer {user?.name || "Field Agent"} (Badge:{" "}
                {user?.volunteerProfile?.volunteerId || "VOL-CLUSTER"})
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

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Target Complaint Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-sm text-slate-900">{complaint.title}</div>
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs font-semibold">
                {complaint.category}
              </span>
            </div>
            <p className="text-xs text-slate-600 line-clamp-2">{complaint.description}</p>
            <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1 border-t border-slate-200/60">
              <span>
                <strong>Citizen:</strong> {complaint.citizenName} ({complaint.citizenPhone})
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {complaint.location.village}, {complaint.location.district}
              </span>
            </div>
          </div>

          {/* Verification Decision */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Verification Outcome <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                  result === FieldVerificationResult.VERIFIED
                    ? "bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="result"
                  value={FieldVerificationResult.VERIFIED}
                  checked={result === FieldVerificationResult.VERIFIED}
                  onChange={() => setResult(FieldVerificationResult.VERIFIED)}
                  className="sr-only"
                />
                <CheckCircle2
                  className={`w-4 h-4 ${
                    result === FieldVerificationResult.VERIFIED ? "text-emerald-600" : "text-slate-400"
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">Verify & Endorse</div>
                  <div className="text-[10px] text-slate-500">Genuine field incident</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                  result === FieldVerificationResult.REQUIRES_INFO
                    ? "bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="result"
                  value={FieldVerificationResult.REQUIRES_INFO}
                  checked={result === FieldVerificationResult.REQUIRES_INFO}
                  onChange={() => setResult(FieldVerificationResult.REQUIRES_INFO)}
                  className="sr-only"
                />
                <AlertTriangle
                  className={`w-4 h-4 ${
                    result === FieldVerificationResult.REQUIRES_INFO ? "text-amber-600" : "text-slate-400"
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">Requires Info</div>
                  <div className="text-[10px] text-slate-500">Need more details</div>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2.5 transition ${
                  result === FieldVerificationResult.REJECTED
                    ? "bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-500/20"
                    : "border-slate-200 hover:bg-slate-50 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="result"
                  value={FieldVerificationResult.REJECTED}
                  checked={result === FieldVerificationResult.REJECTED}
                  onChange={() => setResult(FieldVerificationResult.REJECTED)}
                  className="sr-only"
                />
                <XCircle
                  className={`w-4 h-4 ${
                    result === FieldVerificationResult.REJECTED ? "text-rose-600" : "text-slate-400"
                  }`}
                />
                <div>
                  <div className="text-xs font-bold">Mark Invalid</div>
                  <div className="text-[10px] text-slate-500">False / Duplicate</div>
                </div>
              </label>
            </div>
          </div>

          {/* 4-Point Ground Checklist */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              4-Point On-Site Verification Checklist
            </label>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
              <label className="flex items-center gap-3 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={citizenIdentified}
                  onChange={(e) => setCitizenIdentified(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>1. Citizen identity, contact, and village residence confirmed in person</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={incidentConfirmed}
                  onChange={(e) => setIncidentConfirmed(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>2. Physical ground inspection conducted at the reported spot</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={evidenceValid}
                  onChange={(e) => setEvidenceValid(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>3. Photographic evidence inspected and matches reality</span>
              </label>

              <label className="flex items-center gap-3 text-xs text-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={severityMatches}
                  onChange={(e) => setSeverityMatches(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>4. Problem severity and requested administrative intervention are justified</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Inspector Field Remarks & Findings <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Visited the site near water tank at 11:30 AM. Found 2-inch pipe joint broken and water flooding road. Spoke to Panchayat lineman who promised repair once work order is issued."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Photos and GPS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload On-Site Photos (Optional)
              </label>
              <label className="border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50">
                <Camera className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-600 font-medium">
                  {photos.length > 0 ? `${photos.length} photo(s) selected` : "Attach site photos"}
                </span>
                <span className="text-[10px] text-slate-400">JPG, PNG up to 10MB</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GPS Verification Coordinates
              </label>
              <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between h-20">
                <div className="text-xs text-slate-700">
                  {latitude && longitude ? (
                    <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                      Lat: {latitude}, Long: {longitude}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">No GPS coordinates recorded</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCaptureGps}
                  disabled={locating}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {locating ? "Acquiring GPS..." : "Record Current Location"}
                </button>
              </div>
            </div>
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
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-semibold text-sm transition shadow-sm ${
                result === FieldVerificationResult.VERIFIED
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : result === FieldVerificationResult.REJECTED
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Recording Verification...
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  Submit Field Verification
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
