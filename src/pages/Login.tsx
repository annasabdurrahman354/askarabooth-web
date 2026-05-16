import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../store/useAuthStore";
import { Camera, Lock, Mail } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("superadmin@example.com");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, loading } = useAuthStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard");
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      // read freshly updated store
      const { user } = useAuthStore.getState();
      if (user) {
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
        {/* Header */}
        <div className="flex justify-center mb-6 text-blue-600">
          <div className="w-16 h-16 bg-blue-600 border-2 border-slate-950 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
            <Camera size={32} className="text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-center mb-1 text-slate-950 uppercase">
          Photobooth OS
        </h1>
        <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 text-center mb-8">
          Management Console
        </p>

        {error && (
          <div className="mb-4 bg-red-100 border-2 border-red-500 text-red-700 p-3 font-bold text-center uppercase tracking-widest text-xs rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Email address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="login-email"
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
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-4 py-3 rounded border-2 border-slate-950 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:translate-y-[2px] focus:translate-x-[2px] focus:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-sm font-bold"
                required
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 px-4 py-3 rounded">
            <p className="text-xs text-slate-600 font-bold">
              <span className="font-black text-slate-950">Tip:</span> Use{" "}
              <code className="bg-yellow-100 px-1 rounded text-xs">superadmin@...</code> for superadmin
              access. New users are auto-registered on first login. Default password:{" "}
              <code className="bg-yellow-100 px-1 rounded text-xs">password123</code>
            </p>
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border-2 border-slate-950 rounded shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-sm font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 active:translate-y-[4px] active:translate-x-[4px] active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : null}
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
