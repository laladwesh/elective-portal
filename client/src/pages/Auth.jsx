import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast'; // Correct import for react-hot-toast
import { authAPI } from '../services/apiService';

function Auth() {
  const navigate = useNavigate();

  // Redirect if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('elective-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.role === 'admin') {
          navigate('/admin-dashboard');
        } else if (parsedUser.role === 'student') {
          navigate('/student-dashboard');
        }
      } catch (e) {
        console.error("Failed to parse user from localStorage on Auth page:", e);
        localStorage.removeItem('elective-user');
      }
    }
  }, [navigate]);

  // This is the correct way for your current backend-driven OAuth flow:
  // Directly navigating to your backend's Google auth initiation route.
const handleGoogleLoginClick = () => {
  toast.loading("Redirecting to Google…", { id: "oauth" });
  window.location.href = authAPI.getGoogleAuthUrl();
};

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Spectral:ital,wght@0,600;0,700;1,600&display=swap');

        :root {
          --auth-bg: #efeee9;
          --auth-bg-deep: #e4e2dc;
          --auth-ink: #1f2428;
          --auth-muted: #5d676f;
          --auth-line: #d8d6cf;
          --auth-card: #fbfaf7;
          --auth-accent: #24546f;
          --auth-accent-soft: #d9e6ed;
          --auth-button-ink: #f7fbfd;
        }

        .auth-shell {
          background:
            radial-gradient(1200px 800px at -10% -10%, #f7f6f2 0%, transparent 65%),
            radial-gradient(800px 500px at 110% 10%, #dfe6e2 0%, transparent 70%),
            linear-gradient(160deg, var(--auth-bg) 0%, var(--auth-bg-deep) 100%);
        }

        .auth-grid::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(to right, rgba(31, 36, 40, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(31, 36, 40, 0.03) 1px, transparent 1px);
          background-size: 34px 34px;
          mask-image: radial-gradient(circle at 40% 35%, black 10%, transparent 85%);
        }

        .auth-fade-up {
          opacity: 0;
          animation: authFadeUp 650ms cubic-bezier(0.18, 0.68, 0.24, 0.98) forwards;
        }

        @keyframes authFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="auth-shell auth-grid relative min-h-[100svh] overflow-hidden px-4 py-4 sm:min-h-screen sm:px-8 sm:py-10">
        <div className="absolute -left-28 top-8 h-72 w-72 rounded-full border border-white/55 bg-white/20 blur-[2px]" aria-hidden="true" />
        <div className="absolute -right-20 bottom-10 h-56 w-56 rounded-full border border-slate-400/20 bg-slate-300/20 blur-[1px]" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-6xl items-center sm:min-h-[calc(100vh-3rem)]">
          <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <section
              className="auth-fade-up hidden rounded-3xl border border-white/60 bg-white/35 p-7 shadow-[0_12px_60px_rgba(0,0,0,0.07)] backdrop-blur-md sm:p-10 lg:block"
              style={{ animationDelay: '80ms' }}
            >
              <div className="mb-5">
                <p
                  className="inline-flex items-center rounded-full border border-slate-300/80 bg-slate-100/80 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-600"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  PRASAD INSTITUTE OF MEDICAL SCIENCES
                </p>
              </div>

              <h1
                className="max-w-2xl text-4xl leading-[1.05] text-[var(--auth-ink)] sm:text-5xl lg:text-[3.35rem]"
                style={{ fontFamily: 'Spectral, serif' }}
              >
                A quieter, cleaner way to choose your electives.
              </h1>

              <p
                className="mt-5 max-w-xl text-[15px] leading-relaxed text-[var(--auth-muted)] sm:text-base"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Course windows, seat availability, and enrollment timing stay structured in one place so you can focus on the actual choice.
              </p>

              <div className="mt-8 max-w-lg rounded-2xl border border-slate-200/80 bg-white/60 px-5 py-4">
                <p
                  className="text-sm leading-relaxed text-slate-600"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Designed for a calm workflow with secure institute authentication and straightforward elective access.
                </p>
              </div>
            </section>

            <section
              className="auth-fade-up rounded-3xl border border-slate-200/80 bg-[var(--auth-card)] p-6 shadow-[0_20px_55px_rgba(31,36,40,0.11)] sm:p-9"
              style={{ animationDelay: '180ms' }}
            >
              <div className="mb-6 sm:mb-8">
                <p
                  className="mb-3 inline-flex items-center rounded-full border border-slate-300/80 bg-slate-100/80 px-3 py-1 text-[11px] font-semibold tracking-[0.08em] text-slate-600 lg:hidden"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  PRASAD INSTITUTE OF MEDICAL SCIENCES
                </p>
                <p
                  className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Sign In
                </p>
                <h2
                  className="mt-3 text-3xl leading-tight text-[var(--auth-ink)]"
                  style={{ fontFamily: 'Spectral, serif' }}
                >
                  Welcome to Prasad Institute of Medical Sciences
                </h2>
                <p
                  className="mt-2 text-sm leading-relaxed text-[var(--auth-muted)]"
                  style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
                >
                  Use your approved institute Google account to continue.
                </p>
              </div>

              <button
                onClick={handleGoogleLoginClick}
                className="group relative flex w-full items-center justify-center rounded-xl border border-slate-900/5 bg-[var(--auth-accent)] px-4 py-3.5 text-base font-semibold text-[var(--auth-button-ink)] shadow-[0_10px_24px_rgba(36,84,111,0.25)] transition-all duration-300 hover:-translate-y-[1px] hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--auth-accent)]/45"
                style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                <span className="mr-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/92">
                  <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google logo" className="h-5 w-5" />
                </span>
                Continue with Institute Gmail
              </button>

              <div className="mt-5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
                Login is restricted to users pre-approved by the administration panel.
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}

export default Auth;