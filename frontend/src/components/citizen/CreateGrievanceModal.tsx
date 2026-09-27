import React, { useState } from "react";
import { complaintService } from "@/services/api/complaint.service";
import { GovernmentDepartments, Priority } from "@/types/complaint";
import {
  X,
  Upload,
  MapPin,
  Compass,
  AlertCircle,
  FileCheck,
  CheckCircle2,
} from "lucide-react";

interface CreateGrievanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateGrievanceModal: React.FC<CreateGrievanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Drainage & Sanitation");
  const [department, setDepartment] = useState<string>(GovernmentDepartments[0]);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);

  // Locality
  const [village, setVillage] = useState("");
  const [ward, setWard] = useState("");
  const [mandal, setMandal] = useState("");
  const [district, setDistrict] = useState("Mysuru");
  const [pincode, setPincode] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Files
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  if (!isOpen) return null;

  // Handle GPS location capture
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
      },
      (err) => {
        setError(`Unable to retrieve GPS coordinates: ${err.message}`);
        setLocationLoading(false);
      }
    );
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (selectedFiles.length + filesArray.length > 5) {
        setError("Maximum 5 evidence files allowed");
        return;
      }
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !village || !district) {
      setError("Please fill in all required fields (Title, Description, Village, District)");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("category", category);
      formData.append("department", department);
      formData.append("priority", priority);
      formData.append("village", village);
      if (ward) formData.append("ward", ward);
      if (mandal) formData.append("mandal", mandal);
      formData.append("district", district);
      if (pincode) formData.append("pincode", pincode);
      if (addressLine) formData.append("addressLine", addressLine);
      if (coords) {
        formData.append("latitude", coords.lat.toString());
        formData.append("longitude", coords.lng.toString());
      }

      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      await complaintService.submitComplaint(formData);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register grievance");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-6 h-6 text-blue-600" />
              Register Citizen Grievance
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit your public service grievance directly to the concerned government department.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Department & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Department *
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
              >
                {GovernmentDepartments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category / Problem Type *
              </label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Drinking Water Contamination"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Grievance Summary / Title *
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Main street drinking water pipeline leaking near panchayat office"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description *
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              maxLength={3000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail: when it started, exact location landmarks, and how it impacts the community..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden resize-none"
            />
            <div className="text-right text-[11px] text-slate-400 mt-1">
              {description.length}/3000 characters
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Urgency Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.CRITICAL].map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition border ${
                    priority === p
                      ? p === Priority.CRITICAL
                        ? "bg-red-600 text-white border-red-600"
                        : p === Priority.HIGH
                        ? "bg-amber-600 text-white border-amber-600"
                        : "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Location details */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-600" />
                Problem Location & Locality *
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={locationLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-semibold transition"
              >
                <Compass className="w-3.5 h-3.5" />
                {locationLoading ? "Acquiring GPS..." : "Auto-Detect GPS"}
              </button>
            </div>

            {coords && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  GPS Tagged: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </span>
                <button
                  type="button"
                  onClick={() => setCoords(null)}
                  className="text-emerald-700 hover:underline text-[10px]"
                >
                  Clear GPS
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Village / Town Name *"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  placeholder="Ward / Street Number"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <input
                  type="text"
                  value={mandal}
                  onChange={(e) => setMandal(e.target.value)}
                  placeholder="Mandal / Taluk"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District *"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Pincode (6 digits)"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Specific Landmark (e.g. Opposite Ram Mandir Water Tank)"
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          {/* Evidence Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Attach Photographic or Document Evidence (Optional, max 5 files)
            </label>

            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center hover:border-blue-500 hover:bg-blue-50/20 transition cursor-pointer relative">
              <input
                type="file"
                multiple
                accept="image/*,application/pdf,audio/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                Click or drag files here to upload evidence
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Supports JPG, PNG, PDF, Audio (up to 25MB each)
              </p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileCheck className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-400 shrink-0">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-red-600 hover:text-red-800 text-xs font-semibold ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Submit Grievance"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
