import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/api/auth.service";
import { UserRole } from "@/types/auth";
import { Lock, Mail, ArrowRight, ShieldCheck, User, KeyRound, AlertCircle, CheckCircle2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"CITIZEN" | "STAFF">("CITIZEN");
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithOtp, loginStaff } = useAuth();

  // Citizen State
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [village, setVillage] = useState("");
  const [ward, setWard] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Staff State
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const redirectAfterLogin = (role: UserRole) => {
    if (from) {
      navigate(from, { replace: true });
      return;
    }
    switch (role) {
      case UserRole.ADMIN:
        navigate("/admin", { replace: true });
        break;
      case UserRole.OFFICIAL:
        navigate("/official", { replace: true });
        break;
      case UserRole.VOLUNTEER:
        navigate("/volunteer", { replace: true });
        break;
      case UserRole.DEPARTMENT_STAFF:
        navigate("/department-staff", { replace: true });
        break;
      default:
        navigate("/citizen", { replace: true });
        break;
    }
  };

  // Handle Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number");
      return;
    }

    setLoading(true);
    try {
      const res = await authService.sendCitizenOtp({ phone, purpose: "LOGIN" });
      setIsOtpSent(true);
      if (res.devOtpPreview) {
        setDevOtp(res.devOtpPreview);
        setOtp(res.devOtpPreview); // Auto-populate for convenience in dev
      }
      setSuccessMsg("OTP sent successfully to +91 " + phone);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError("Please enter 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const user = await loginWithOtp({
        phone,
        otp,
        name: name.trim() || undefined,
        village: village.trim() || undefined,
        ward: ward.trim() || undefined,
      });
      redirectAfterLogin(user.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Login
  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!staffEmail || !staffPassword) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const user = await loginStaff({ email: staffEmail, password: staffPassword });
      redirectAfterLogin(user.role);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Quick dev helpers
  const fillDevCredentials = (role: "ADMIN" | "VOLUNTEER" | "OFFICIAL") => {
    if (role === "ADMIN") {
      setStaffEmail("admin@vcgis.gov.in");
      setStaffPassword("Admin@12345");
    } else if (role === "VOLUNTEER") {
      setStaffEmail("volunteer@vcgis.gov.in");
      setStaffPassword("Volunteer@12345");
    } else {
      setStaffEmail("official@vcgis.gov.in");
      setStaffPassword("Official@12345");
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-blue-50/40">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Sign In to VCGIS
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Citizen Grievance & Village Volunteer Intelligence System
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 overflow-hidden">
          {/* Tab selector */}
          <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab("CITIZEN");
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "CITIZEN"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4" />
              Citizen Login (OTP)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("STAFF");
                setError(null);
              }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                activeTab === "STAFF"
                  ? "bg-white text-blue-700 shadow-xs border border-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Staff Login
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* Feedback messages */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700 animate-in fade-in duration-200">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                <div>{error}</div>
              </div>
            )}

            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-800 animate-in fade-in duration-200">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                <div>{successMsg}</div>
              </div>
            )}

            {/* CITIZEN TAB */}
            {activeTab === "CITIZEN" && (
              <div>
                {!isOtpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-medium text-sm">
                          +91
                        </div>
                        <input
                          type="tel"
                          maxLength={10}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                          placeholder="Enter 10-digit mobile number"
                          className="block w-full pl-14 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden transition"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        We will send a 6-digit one-time password (OTP) to your phone.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || phone.length !== 10}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    {/* Dev OTP preview banner */}
                    {devOtp && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                        <span>
                          <strong>Dev Mode OTP:</strong> {devOtp}
                        </span>
                        <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded font-mono font-bold">
                          AUTO-FILLED
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Enter 6-Digit OTP
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsOtpSent(false)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          Change Number (+91 {phone})
                        </button>
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••••"
                        className="block w-full px-4 py-3 text-center tracking-[0.6em] text-xl font-bold rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden transition"
                        required
                        autoFocus
                      />
                    </div>

                    {/* Optional details for self-registration */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-medium text-slate-600">
                        First-time logging in? (Optional details):
                      </p>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="block w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Village / Town"
                          value={village}
                          onChange={(e) => setVillage(e.target.value)}
                          className="block w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                        />
                        <input
                          type="text"
                          placeholder="Ward Number"
                          value={ward}
                          onChange={(e) => setWard(e.target.value)}
                          className="block w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-600 outline-hidden"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* STAFF TAB */}
            {activeTab === "STAFF" && (
              <div>
                <form onSubmit={handleStaffLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Official Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        value={staffEmail}
                        onChange={(e) => setStaffEmail(e.target.value)}
                        placeholder="official@vcgis.gov.in"
                        className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden transition"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-slate-900 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !staffEmail || !staffPassword}
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Sign In as Staff</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Development Quick Fill Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
                    Quick Dev Testing Credentials:
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => fillDevCredentials("ADMIN")}
                      className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg text-xs font-medium border border-purple-200 transition text-center"
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDevCredentials("VOLUNTEER")}
                      className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-medium border border-amber-200 transition text-center"
                    >
                      Volunteer
                    </button>
                    <button
                      type="button"
                      onClick={() => fillDevCredentials("OFFICIAL")}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-medium border border-emerald-200 transition text-center"
                    >
                      Official
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-xs text-slate-500 space-y-1">
          <p>Government of Karnataka • Citizen Grievance Portal</p>
          <p>For assistance, contact your local Grama Panchayat / Bapuji Seva Kendra.</p>
        </div>
      </div>
    </div>
  );
};
