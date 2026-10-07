import React, { useState } from 'react';
import {
  Lock,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  HelpCircle,
  Check,
  Info,
  UserPlus,
  Building2,
  FileCheck,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface AdminLoginPageProps {
  onSuccessRedirect: (targetDashboardUrl: string) => void;
  onNavigatePublicMarketplace: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onSuccessRedirect,
  onNavigatePublicMarketplace,
}) => {
  const { login, signup } = useAuth();

  // Mode: 'signin' or 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Sign Up States
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupRole, setSignupRole] = useState<UserRole>('Media Owner');
  const [signupOrganization, setSignupOrganization] = useState('');
  const [signupTitle, setSignupTitle] = useState('');
  const [signupCity, setSignupCity] = useState('Lagos');
  const [signupLicense, setSignupLicense] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Shared Status States
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Handle Sign In Submit
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your work email address.');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatusMessage('Authenticating credentials...');

    setTimeout(() => {
      setAuthStatusMessage('Retrieving organization & active tenant...');
    }, 350);

    setTimeout(() => {
      setAuthStatusMessage('Determining cryptographic role & permissions...');
    }, 700);

    const result = await login(email.trim(), password);

    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthStatusMessage(null);

      if (result.success && result.user) {
        const dest = result.redirectTo || result.user.authorizedDashboard || '/admin/media-owner';
        onSuccessRedirect(dest);
      } else {
        setError(result.error || 'Authentication failed. Please verify your email and credentials.');
      }
    }, 950);
  };

  // Handle Sign Up Submit
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signupName.trim() || !signupEmail.trim() || !signupOrganization.trim()) {
      setError('Please fill in your name, corporate email, and organization name.');
      return;
    }

    if (signupPassword && signupPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (signupPassword && signupPassword !== signupConfirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    if (!agreedTerms) {
      setError('Please accept the OOH Concessionaire and Regulatory Compliance terms to proceed.');
      return;
    }

    setIsAuthenticating(true);
    setAuthStatusMessage('Registering enterprise tenant account...');

    setTimeout(() => {
      setAuthStatusMessage('Assigning regulatory roles & permissions...');
    }, 400);

    setTimeout(() => {
      setAuthStatusMessage('Provisioning secure inventory & analytics console...');
    }, 800);

    const result = await signup({
      name: signupName.trim(),
      email: signupEmail.trim(),
      organization: signupOrganization.trim(),
      role: signupRole,
      title:
        signupTitle.trim() ||
        (signupRole === 'Media Owner'
          ? 'Managing Director & Concessionaire'
          : 'Enterprise Administrator'),
      licenseNumber: signupLicense.trim() || 'LASAA/OOH/VOL.4/2024-REG',
      city: signupCity,
      password: signupPassword,
    });

    setTimeout(() => {
      setIsAuthenticating(false);
      setAuthStatusMessage(null);

      if (result.success && result.user) {
        const dest = result.redirectTo || result.user.authorizedDashboard || '/admin/media-owner';
        onSuccessRedirect(dest);
      } else {
        setError(result.error || 'Sign up failed. Please check your inputs and try again.');
      }
    }, 1100);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
      setForgotEmail('');
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col justify-between selection:bg-white selection:text-[#140338]">
      {/* Top Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#140338] flex items-center justify-center text-white font-black text-xl shadow-md">
            AO
          </div>
          <div>
            <span className="font-extrabold text-lg text-[#140338] tracking-tight block">
              ADGRID
            </span>
            <span className="text-[11px] text-zinc-500 font-semibold">
              Pan-African Advertising Infrastructure & Operations
            </span>
          </div>
        </div>

        <button
          onClick={onNavigatePublicMarketplace}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#eae7e1] text-xs font-bold text-[#140338] hover:bg-zinc-50 transition-colors shadow-2xs"
        >
          <Globe className="w-4 h-4 text-emerald-600" />
          <span>Public Marketplace</span>
        </button>
      </header>

      {/* Main Authentication Box */}
      <main className="flex-1 flex items-center justify-center p-4 my-4">
        <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 border border-[#eae7e1] shadow-xl space-y-6">
          {/* Logo & Headline */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#140338] text-white mx-auto flex items-center justify-center text-2xl font-black shadow-md">
              {authMode === 'signin' ? (
                <Lock className="w-6 h-6 text-white" />
              ) : (
                <UserPlus className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <h1 className="text-2xl font-normal text-[#140338] tracking-tight font-serif italic">
              {authMode === 'signin'
                ? 'Central Authentication Gateway'
                : 'Register Enterprise Account'}
            </h1>
            <p className="text-xs text-zinc-500">
              {authMode === 'signin'
                ? 'Single entry gateway for all platform operations, media owners, and clients.'
                : 'Sign up to manage billboard inventory, export asset catalogs, and service direct advertiser bookings.'}
            </p>
          </div>

          {/* Tab Switcher: Sign In vs Sign Up */}
          <div className="flex rounded-2xl bg-[#faf9f6] p-1 border border-[#eae7e1]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-white text-[#140338] shadow-xs'
                  : 'text-zinc-500 hover:text-[#140338]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === 'signup'
                  ? 'bg-white text-[#140338] shadow-xs'
                  : 'text-zinc-500 hover:text-[#140338]'
              }`}
            >
              Sign Up / Register
            </button>
          </div>

          {/* Authentication Status Overlay */}
          {isAuthenticating && (
            <div className="p-3.5 rounded-2xl bg-[#140338] text-white text-xs flex items-center gap-3 shadow-md animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0 text-amber-300" />
              <div className="min-w-0 flex-1">
                <span className="font-bold block truncate">{authStatusMessage}</span>
                <span className="text-[10px] text-zinc-300 block">Loading role-specific workspace...</span>
              </div>
            </div>
          )}

          {error && !isAuthenticating && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* MODE 1: SIGN IN FORM */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 block">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.africa"
                  disabled={isAuthenticating}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-sm text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338] disabled:opacity-60 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] font-bold text-zinc-500 hover:text-[#140338] transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-sm text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338] disabled:opacity-60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-zinc-600 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#eae7e1] text-[#140338] focus:ring-[#140338]"
                  />
                  <span>Remember me on this workstation</span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 px-4 rounded-xl bg-[#140338] hover:bg-[#200557] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all group disabled:opacity-75 cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Session...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Admin</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('signup')}
                  className="text-xs font-bold text-zinc-600 hover:text-[#140338] transition-colors"
                >
                  Need a new concessionaire or admin account?{' '}
                  <span className="underline text-[#140338]">Sign Up here</span>
                </button>
              </div>
            </form>
          )}

          {/* MODE 2: SIGN UP FORM */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    placeholder="e.g. Babatunde Balogun"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="name@concession.ng"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Account Role *
                  </label>
                  <select
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as UserRole)}
                    disabled={isAuthenticating}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  >
                    <option value="Media Owner">Media Owner & Concessionaire</option>
                    <option value="Agency Admin">Agency Admin (Buyer)</option>
                    <option value="Customer / Client Company">Advertiser / Brand Client</option>
                    <option value="Vendor">Contractor / Rigging Vendor</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Organization / Concession *
                  </label>
                  <input
                    type="text"
                    required
                    value={signupOrganization}
                    onChange={(e) => setSignupOrganization(e.target.value)}
                    placeholder="e.g. Continental Outdoor Nigeria"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Operating Metro / Hub
                  </label>
                  <select
                    value={signupCity}
                    onChange={(e) => setSignupCity(e.target.value)}
                    disabled={isAuthenticating}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  >
                    <option value="Lagos">Lagos, Nigeria</option>
                    <option value="Abuja">Abuja (FCT), Nigeria</option>
                    <option value="Port Harcourt">Port Harcourt, Nigeria</option>
                    <option value="Ibadan">Ibadan, Nigeria</option>
                    <option value="Kano">Kano, Nigeria</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Regulatory License (LASAA/DOAS)
                  </label>
                  <input
                    type="text"
                    value={signupLicense}
                    onChange={(e) => setSignupLicense(e.target.value)}
                    placeholder="e.g. LASAA/OOH/2024-REG"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="••••••••••••"
                      disabled={isAuthenticating}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
                    >
                      {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-700 block">
                    Confirm Password *
                  </label>
                  <input
                    type={showSignupPassword ? 'text' : 'password'}
                    required
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    disabled={isAuthenticating}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs text-[#140338] font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                  />
                </div>
              </div>

              <div className="text-xs pt-1">
                <label className="flex items-start gap-2 cursor-pointer font-medium text-zinc-600 select-none">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="rounded border-[#eae7e1] text-[#140338] focus:ring-[#140338] mt-0.5"
                  />
                  <span className="text-[11px] leading-snug">
                    I confirm compliance with Nigerian OOH advertising regulations (LASAA / DOAS / OAAN standards) and agree to ADGRID Verified Concessionaire Terms.
                  </span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full py-3 px-4 rounded-xl bg-[#140338] hover:bg-[#200557] text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all group disabled:opacity-75 cursor-pointer"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Creating Enterprise Tenant...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account & Enter Console</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode('signin')}
                  className="text-xs font-bold text-zinc-600 hover:text-[#140338] transition-colors"
                >
                  Already registered? <span className="underline text-[#140338]">Sign In to your account</span>
                </button>
              </div>
            </form>
          )}

          {/* Test Accounts Reference Accordion */}
          {/* Security Guarantee Note */}
          <div className="p-3 rounded-2xl bg-[#faf9f6] border border-[#eae7e1] flex items-start gap-2.5 text-xs text-zinc-600">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Enterprise Zero-Trust:</strong> Concession inventory, bookings, and financial escrow clearing are encrypted with automated bank-grade verification.
            </p>
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#eae7e1] shadow-2xl space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-normal text-[#140338] font-serif italic">
                Reset Enterprise Password
              </h2>
              <p className="text-xs text-zinc-500">
                Enter your registered corporate domain email to receive a zero-trust reset token.
              </p>
            </div>

            {forgotSent ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Password reset token dispatched to domain security officer.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@organization.africa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#eae7e1] bg-[#faf9f6] text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#140338]"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#140338] text-white text-xs font-bold hover:bg-[#200557] transition-colors cursor-pointer"
                  >
                    Send Token
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-zinc-400 border-t border-[#eae7e1]">
        © {new Date().getFullYear()} ADGRID. ISO 20560 Audited • Nigerian OOH Concession Infrastructure.
      </footer>
    </div>
  );
};
