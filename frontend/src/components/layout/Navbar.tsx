import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/auth";
import { LogOut, User as UserIcon, Shield, Building, HeartHandshake, BookOpen, BarChart3 } from "lucide-react";
import { NotificationBell } from "../notifications/NotificationBell";
import { KnowledgeAssistantModal } from "../rag/KnowledgeAssistantModal";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isKnowledgeOpen, setIsKnowledgeOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
            <Shield className="w-3 h-3" /> Administrator
          </span>
        );
      case UserRole.OFFICIAL:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Building className="w-3 h-3" /> Department Official
          </span>
        );
      case UserRole.VOLUNTEER:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <HeartHandshake className="w-3 h-3" /> Village Volunteer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <UserIcon className="w-3 h-3" /> Citizen
          </span>
        );
    }
  };

  const getDashboardLink = () => {
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-blue-700 transition">
            V
          </div>
          <div>
            <div className="font-bold text-slate-900 tracking-tight flex items-center gap-2 text-base">
              VCGIS
              <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                Govt of Karnataka
              </span>
            </div>
            <div className="text-xs text-slate-500 hidden sm:block">
              Village Volunteer-Assisted Citizen Grievance Intelligence System
            </div>
          </div>
        </Link>

        {/* User actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Schemes & GOs RAG Knowledge Button */}
          <button
            onClick={() => setIsKnowledgeOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition shadow-2xs"
            title="Search Karnataka Government Schemes, GOs & Circulars"
          >
            <BookOpen className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Schemes & GOs</span>
          </button>

          {/* Analytics & GIS Link for Officials and Admins */}
          {isAuthenticated && (user?.role === UserRole.ADMIN || user?.role === UserRole.OFFICIAL) && (
            <Link
              to="/analytics"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition shadow-2xs"
              title="Spatial Analytics & Executive Scorecards"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">GIS & Analytics</span>
            </Link>
          )}

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              {/* In-app Notifications Bell */}
              <NotificationBell />

              <Link
                to={getDashboardLink()}
                className="hidden md:flex flex-col items-end hover:opacity-80 transition"
              >
                <span className="text-sm font-semibold text-slate-900 leading-tight">{user.name}</span>
                <span className="mt-0.5">{getRoleBadge(user.role)}</span>
              </Link>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-xs"
              >
                Sign In / Login
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* RAG Knowledge Assistant Modal */}
      <KnowledgeAssistantModal
        isOpen={isKnowledgeOpen}
        onClose={() => setIsKnowledgeOpen(false)}
      />
    </header>
  );
};
