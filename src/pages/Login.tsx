import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { Camera, Lock, Mail, Building2, KeyRound } from "lucide-react";

type AuthMode = "login" | "signup";
type SignupMode = "create" | "join";

export default function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [signupMode, setSignupMode] = useState<SignupMode>("create");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup, user, loading } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const resetForm = () => {
    setError("");
    setEmail("");
    setPassword("");
    setTenantName("");
    setReferralCode("");
  };

  const switchMode = (m: AuthMode) => {
    resetForm();
    setMode(m);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        const { user } = useAuthStore.getState();
        if (user) navigate("/dashboard");
      } else {
        if (signupMode === "create") {
          if (!tenantName.trim()) {
            setError("Organization name is required.");
            setIsLoading(false);
            return;
          }
          await signup(email, password, { mode: "create", tenantName: tenantName.trim() });
        } else {
          if (!referralCode.trim()) {
            setError("Referral code is required.");
            setIsLoading(false);
            return;
          }
          await signup(email, password, { mode: "join", referralCode: referralCode.trim() });
        }
        // Profile creation is handled by onAuthStateChange (reads user_metadata).
        // Navigate immediately — ProtectedRoute shows "Loading..." until user state is set.
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans">
      <div className="max-w-md w-full bg-white p-8 border-4 border-slate-950 rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex justify-center mb-6 text-blue-600">
          <div className="w-16 h-16 bg-blue-600 border-2 border-slate-950 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
            <Camera size={32} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-center mb-1 text-slate-950 uppercase">
          Photobooth OS
        </h1>
        <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 text-center mb-6">
          Management Console
        </p>

        <div className="flex mb-6 border-2 border-slate-950 rounded overflow-hidden">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
              mode === "login"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors border-l-2 border-slate-950 ${
              mode === "signup"
                ? "bg-slate-950 text-white"
                : "bg-white text-slate-500 hover:bg-slate-100"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 p-3 font-bold text-center uppercase tracking-widest text-xs rounded">
            {error}
          </div>
        )}

        {mode === "signup" && (
          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => { setSignupMode("create"); setError(""); }}
              className={`flex-1 py-2 px-3 border-2 border-slate-950 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                signupMode === "create"
                  ? "bg-yellow-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <Building2 size={14} className="inline mr-1" />
              New Org
            </button>
            <button
              type="button"
              onClick={() => { setSignupMode("join"); setError(""); }}
              className={`flex-1 py-2 px-3 border-2 border-slate-950 rounded text-[10px] font-black uppercase tracking-widest transition-all ${
                signupMode === "join"
                  ? "bg-yellow-400 text-slate-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  : "bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <KeyRound size={14} className="inline mr-1" />
              Join Org
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === "signup" && signupMode === "create" && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Organization name
              </label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 rounded border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-bold"
                  required
                  placeholder="My Photobooth Studio"
                />
              </div>
            </div>
          )}

          {mode === "signup" && signupMode === "join" && (
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Referral code
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="block w-full pl-10 pr-4 py-3 rounded border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-bold uppercase tracking-widest"
                  required
                  placeholder="ABCD1234"
                  maxLength={8}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 rounded border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-bold"
                required
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 rounded border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-bold"
                required
                minLength={6}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {isLoading
              ? "Please wait..."
              : mode === "login"
                ? "Sign in"
                : signupMode === "create"
                  ? "Create account"
                  : "Join organization"}
          </button>
        </form>
      </div>
    </div>
  );
}
