import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import {
  ShieldCheck,
  HeartHandshake,
  Building2,
  Users,
  ArrowRight,
  Sparkles,
  Bot,
  MapPin,
  CheckCircle2,
} from "lucide-react";

export const HomePage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  const getPortalLink = () => {
    if (!user) return "/login";
    switch (user.role) {
      case UserRole.ADMIN:
        return "/admin";
      case UserRole.OFFICIAL:
        return "/official";
      case UserRole.VOLUNTEER:
        return "/volunteer";
      default:
        return "/citizen";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-blue-50/70 via-white to-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold mb-6 border border-blue-200 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Government of Karnataka
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Village Volunteer-Assisted <br className="hidden sm:inline" />
              <span className="text-blue-600">Citizen Grievance Intelligence</span> System
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Empowering rural citizens through village volunteer assisted grievance filing, automated AI triage, location intelligence, and transparent departmental resolution tracking.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Link
                  to={getPortalLink()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-md hover:shadow-lg"
                >
                  <span>Go to My Dashboard ({user?.role})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-md hover:shadow-lg"
                  >
                    <span>Citizen Portal (OTP Login)</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm border border-slate-300 transition shadow-xs"
                  >
                    <span>Staff & Volunteer Sign In</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars Section */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Four Connected Governance Tiers
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Built with strict role-based access control and human-in-the-loop accountability.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Citizen */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">1. Citizen Tier</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Direct mobile OTP login, multilingual grievance submission, photo & audio evidence upload, and real-time status tracking.
            </p>
            <div className="text-xs font-semibold text-blue-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Self-Service Portal
            </div>
          </div>

          {/* Volunteer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">2. Village Volunteer</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Assists rural and non-tech-savvy citizens, collects on-site verification, GPS tags problem locations, and bridges village secretariats.
            </p>
            <div className="text-xs font-semibold text-amber-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Field Verification Layer
            </div>
          </div>

          {/* Official */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">3. Department Official</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Department-isolated queues, SLA breach alerts, investigation logs, resolution notes, and photographic proof of redressal.
            </p>
            <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Action & Resolution Layer
            </div>
          </div>

          {/* Admin */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">4. Administrator</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              System-wide oversight, staff provisioning, role administration, department jurisdiction mapping, and immutable audit trails.
            </p>
            <div className="text-xs font-semibold text-purple-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Governance & Security
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence layer banner */}
      <section className="bg-slate-900 text-white py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-blue-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">AI-Powered Decision Support Layer</h4>
              <p className="text-xs text-slate-400">
                OCR document extraction • NLP auto-routing • Duplicate clustering • Human-in-the-loop governance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-400" /> Geographic Triage
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-400" /> RBAC Enforced
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
