import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, FileText, ArrowLeft, Lock, HeartPulse, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { Button } from '../components/Button';

const TermsPrivacy = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('terms');

  useEffect(() => {
    if (location.pathname.includes('privacy')) {
      setActiveTab('privacy');
    } else {
      setActiveTab('terms');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const handleGoBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-4 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">Aura AI Legal & Privacy</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Terms of Service & Privacy Policy</p>
            </div>
          </div>

          <button
            onClick={handleGoBack}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
        </div>
      </header>

      {/* Subheader Hero */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-10 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
            Transparency & Patient Security First
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
            Review how our AI medical diagnostic tools function, your data confidentiality rights, and our strict patient privacy safeguards.
          </p>

          {/* Toggle Tabs */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-4 shadow-inner">
            <button
              onClick={() => setActiveTab('terms')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'terms'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Terms of Service
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              Privacy Policy
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        {activeTab === 'terms' ? (
          <div className="space-y-8 animate-fadeIn">
            {/* Medical Disclaimer Banner */}
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>CRITICAL MEDICAL ADVICE DISCLAIMER</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-amber-800 dark:text-amber-200/90 font-medium">
                Aura AI does <strong>NOT</strong> provide licensed medical diagnosis or clinical treatment. Symptom predictions, PDF medical report evaluations, and AI chat responses are generated by machine learning models for self-assessment and informational purposes only. Always consult a qualified physician regarding any health condition. <strong>In a medical emergency, call 911 or your local emergency service immediately.</strong>
              </p>
            </div>

            {/* Section 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                1. Acceptance of Terms
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                By creating an account, accessing, or using the Aura AI web application, mobile app, or associated health features (the "Service"), you agree to be bound by these Terms of Service. If you do not agree to all terms, you may not access or use the Service.
              </p>
            </div>

            {/* Section 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-primary" />
                2. AI Diagnostic Models & Lab Report Analysis
              </h3>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-3 leading-relaxed">
                <li><strong>Probabilistic Predictions:</strong> Symptom evaluation algorithms and Large Language Models (LLMs) provide probabilistic insights based on user input. These predictions are statistical estimations and do not replace laboratory diagnoses.</li>
                <li><strong>Medical PDF Uploads:</strong> You represent that you possess lawful authority over any PDF lab test reports uploaded to the system.</li>
                <li><strong>Emergency SOS Alert Dispatch:</strong> Automated SMS, WhatsApp, and GPS notifications depend on cellular carrier availability and network signals. Aura AI cannot guarantee signal transmission during telecom network outages.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                3. User Account Conduct & Safety
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                Users agree not to input malicious scripts, extract machine learning model weights, impersonate healthcare professionals, or trigger false emergency alerts. Violating accounts are subject to immediate suspension.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">
            {/* Privacy Summary Banner */}
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                <Lock className="w-5 h-5 shrink-0" />
                <span>OUR PRIVACY PROMISE</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-emerald-800 dark:text-emerald-200/90 font-medium">
                Your medical health records belong exclusively to you. <strong>Aura AI DOES NOT SELL, RENT, OR SHARE YOUR PERSONAL HEALTH RECORDS OR MEDICAL LAB REPORTS WITH ADVERTISERS OR THIRD PARTIES.</strong>
              </p>
            </div>

            {/* Privacy 1 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                1. Information We Collect
              </h3>
              <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 text-sm space-y-3 leading-relaxed">
                <li><strong>Account Registration:</strong> Full name, verified email address, mobile number, gender, blood group, and emergency contact numbers.</li>
                <li><strong>Protected Health Data:</strong> Reported symptoms, uploaded lab report PDFs, RAG vector embeddings, and daily behavioral health metrics (water, steps, sleep).</li>
                <li><strong>Emergency GPS Location:</strong> Real-time location coordinates gathered strictly when activating the Emergency SOS trigger.</li>
              </ul>
            </div>

            {/* Privacy 2 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                2. Data Security & Encryption
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                All data in transit is encrypted using <strong>TLS 1.3 / HTTPS encryption</strong>. Databases storing user records enforce row-level security. Vector stores built from uploaded PDF reports are partitioned by session ID and isolated from unauthorized access.
              </p>
            </div>

            {/* Privacy 3 */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-2xl shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                3. Your Data Ownership & Right to Erasure
              </h3>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                You maintain complete authority over your health records. You may delete uploaded report contexts, clear consultation logs, or trigger full account erasure anytime within Profile Settings.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Aura AI Health & Disease Predictor. All rights reserved.
      </footer>
    </div>
  );
};

export default TermsPrivacy;
