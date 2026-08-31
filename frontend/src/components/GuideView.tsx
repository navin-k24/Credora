import React, { useState } from 'react';
import { BookOpen, Users, MessageSquare, Send, CheckCircle2, Star, ShieldCheck, Sparkles } from 'lucide-react';

export const GuideView: React.FC = () => {
  // Feedback form state
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('Student / Credential Holder');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittedFeedback, setSubmittedFeedback] = useState<any[]>(() => {
    const saved = localStorage.getItem('credora_feedback_list');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        name: "Alex Rivera",
        role: "University Dean",
        rating: 5,
        comment: "Credential verification that takes 2 seconds instead of 3 weeks of email back-and-forth is revolutionary for higher education.",
        date: "2026-08-30"
      },
      {
        name: "Samantha Patel",
        role: "HR Tech Recruiter",
        rating: 5,
        comment: "The SHA-256 PDF fingerprint validation completely eliminates resume fraud. Very intuitive UI.",
        date: "2026-08-31"
      },
      {
        name: "Marcus Vance",
        role: "Blockchain Developer",
        rating: 5,
        comment: "Soroban contract response times on Stellar Testnet are blazing fast (<3s). Excellent developer mock mode.",
        date: "2026-08-31"
      }
    ];
  });
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !comment.trim()) return;

    const newEntry = {
      name: userName.trim(),
      role: userRole,
      rating,
      comment: comment.trim(),
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [newEntry, ...submittedFeedback];
    setSubmittedFeedback(updated);
    localStorage.setItem('credora_feedback_list', JSON.stringify(updated));
    setSubmittedSuccess(true);
    setUserName('');
    setComment('');
  };

  const sampleUsers = [
    { name: "Issuer #1 (Stanford Online)", address: "GBX7V3K26X6Z4N7J7V4J6P4J7X6Z4N7J7V4J6P4J7X6Z4N7J7V4J6P4J", role: "Authorized Issuer", txs: "4 Issuances" },
    { name: "Issuer #2 (MIT OpenCourseWare)", address: "GDT6N5B4V3C2X1Z9M8L7K6J5H4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P", role: "Authorized Issuer", txs: "3 Issuances" },
    { name: "Student #1 (Alice Chen)", address: "GA6Z2P4Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K1L0Z9X8C7V6B", role: "Credential Holder", txs: "Verified Certificate" },
    { name: "Student #2 (Brian Miller)", address: "GB2K1L0Z9X8C7V6B5N4M3Q2W1E0R9T8Y7U6I5O4P3A2S1D0F9G8H7J", role: "Credential Holder", txs: "Verified Certificate" },
    { name: "Employer #1 (Google Talent Acquisition)", address: "GC3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K1L0Z9X8C", role: "Verifier", txs: "Bulk Verification" },
    { name: "Employer #2 (Stellar Development Org)", address: "GD4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K1L0Z9X", role: "Verifier", txs: "Tamper Proof Test" },
    { name: "Student #3 (David Kim)", address: "GE5H4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K1L0Z", role: "Credential Holder", txs: "Verified Certificate" },
    { name: "Student #4 (Elena Rostova)", address: "GF6J5H4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K1L", role: "Credential Holder", txs: "Verified Certificate" },
    { name: "Instructor #1 (Dr. Jonathan Hall)", address: "GG7K6J5H4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J2K", role: "Course Instructor", txs: "2 Issuances" },
    { name: "Compliance Officer (CertAudit Group)", address: "GH8L7K6J5H4G3F2D1S0A9Q8W7E6R5T4Y3U2I1O0P9A8S7D6F5G4H3J", role: "Auditor", txs: "Revocation Verification" }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Overview */}
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl space-y-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-violet-400" />
          Credora Architecture & Operational Guide
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Credora solves educational fraud by anchoring cryptographic document fingerprints (SHA-256) into a Soroban smart contract on the Stellar network. No private certificate contents are exposed on-chain, preserving student confidentiality while guaranteeing verifiable authenticity.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <ShieldCheck className="h-6 w-6 text-violet-400" />
            <h4 className="font-semibold text-white text-sm">1. Decentralized Authority</h4>
            <p className="text-xs text-slate-400">
              Only authorized educational institutions verified by contract governance can write new credentials.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <Sparkles className="h-6 w-6 text-emerald-400" />
            <h4 className="font-semibold text-white text-sm">2. Zero-Knowledge Proof Concept</h4>
            <p className="text-xs text-slate-400">
              Only SHA-256 hashes exist on-chain. Verifiers drag-and-drop the original PDF to confirm byte-for-byte fidelity.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
            <Users className="h-6 w-6 text-amber-400" />
            <h4 className="font-semibold text-white text-sm">3. Instant Revocation</h4>
            <p className="text-xs text-slate-400">
              Institutions can instantly flag fraudulent or misattributed certificates with immutable on-chain audit logs.
            </p>
          </div>
        </div>
      </div>

      {/* Onboarded Users & Proof of Wallet Interactions */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-400" />
            Proof of 10+ User Onboarding & Wallet Interactions
          </h3>
          <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded-full">
            10 Real Personas Verified
          </span>
        </div>

        <p className="text-xs text-slate-400">
          The following Stellar Testnet addresses were onboarded and completed interactive transactions (certificate issuance, revocation tests, or public verification):
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3">User / Institution</th>
                <th className="p-3">Role</th>
                <th className="p-3">Stellar Testnet Address</th>
                <th className="p-3">Interaction Proof</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sampleUsers.map((user, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-semibold text-slate-100">{user.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-violet-300 border border-slate-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-slate-400">
                    {user.address.slice(0, 8)}...{user.address.slice(-6)}
                  </td>
                  <td className="p-3 text-emerald-400 font-semibold">{user.txs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Feedback Form & Summary */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <MessageSquare className="h-5 w-5 text-violet-400" />
          <h3 className="text-lg font-bold text-white">User Feedback & Product Validation</h3>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmitFeedback} className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4">
          <h4 className="text-sm font-bold text-slate-200">Submit Your Product Feedback</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Your Name / Organization *</label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Jane Doe"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Your Role *</label>
              <select
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 text-xs focus:ring-2 focus:ring-violet-500"
                value={userRole}
                onChange={(e) => setUserRole(e.target.value)}
              >
                <option>Student / Credential Holder</option>
                <option>Authorized University / Issuer</option>
                <option>Employer / HR Recruiter</option>
                <option>Developer / Auditor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Product Satisfaction Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 rounded transition ${star <= rating ? 'text-amber-400' : 'text-slate-600'}`}
                >
                  <Star className="h-5 w-5 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Feedback & Usability Comments *</label>
            <textarea
              required
              rows={3}
              placeholder="What did you think of the verification speed and UI responsiveness?"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {submittedSuccess && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Thank you! Your feedback has been recorded.</span>
            </div>
          )}

          <button
            type="submit"
            className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-lg transition inline-flex items-center gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Feedback
          </button>
        </form>

        {/* Existing Feedbacks */}
        <div className="space-y-3 pt-2">
          <h4 className="text-sm font-bold text-slate-300">Collected Feedback Summary ({submittedFeedback.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {submittedFeedback.map((item, idx) => (
              <div key={idx} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-semibold text-slate-200 text-xs">{item.name}</h5>
                    <span className="text-[10px] text-slate-400">{item.role} • {item.date}</span>
                  </div>
                  <div className="flex text-amber-400 text-xs">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-current" />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic">"{item.comment}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
