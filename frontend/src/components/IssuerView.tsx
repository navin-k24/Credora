import React, { useState, useEffect } from 'react';
import type { CertDetails, IssuerDetails } from '../utils/stellar';
import { StellarService } from '../utils/stellar';
import { Award, PlusCircle, AlertCircle, CheckCircle2, ShieldCheck, RefreshCw, FileText, Trash2, Key } from 'lucide-react';

interface IssuerViewProps {
  stellarService: StellarService;
  walletAddress: string | null;
  useFreighter: boolean;
}

export const IssuerView: React.FC<IssuerViewProps> = ({
  stellarService,
  walletAddress,
  useFreighter
}) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [issuerInfo, setIssuerInfo] = useState<IssuerDetails | null>(null);
  const [loadingCheck, setLoadingCheck] = useState(false);

  // Form State
  const [certId, setCertId] = useState('');
  const [recipient, setRecipient] = useState('');
  const [studentName, setStudentName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('Pass');
  const [certType, setCertType] = useState('Certificate of Completion');
  const [, setFile] = useState<File | null>(null);
  const [computedHash, setComputedHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [issueSuccess, setIssueSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Issued List
  const [issuedCerts, setIssuedCerts] = useState<CertDetails[]>([]);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load issuer status
  const checkIssuerStatus = async () => {
    if (!walletAddress) {
      setIsAuthorized(false);
      setIssuerInfo(null);
      return;
    }
    setLoadingCheck(true);
    try {
      const authorized = await stellarService.isIssuer(walletAddress);
      setIsAuthorized(authorized);
      if (authorized) {
        const info = await stellarService.getIssuerInfo(walletAddress);
        setIssuerInfo(info);
      }
    } catch (err) {
      console.error(err);
      setIsAuthorized(false);
    } finally {
      setLoadingCheck(false);
    }
  };

  useEffect(() => {
    checkIssuerStatus();
    loadLocalIssuedCerts();
  }, [walletAddress, stellarService.getContractId()]);

  const loadLocalIssuedCerts = () => {
    const saved = localStorage.getItem(`credora_issued_${stellarService.getContractId()}`);
    if (saved) {
      try {
        setIssuedCerts(JSON.parse(saved));
      } catch {
        setIssuedCerts([]);
      }
    }
  };

  const saveIssuedCertLocally = (cert: CertDetails) => {
    const updated = [cert, ...issuedCerts.filter(c => c.id !== cert.id)];
    setIssuedCerts(updated);
    localStorage.setItem(`credora_issued_${stellarService.getContractId()}`, JSON.stringify(updated));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      try {
        const hash = await StellarService.hashFile(selected);
        setComputedHash(hash);
        setFormError(null);
      } catch {
        setFormError('Failed to compute file SHA-256 hash.');
      }
    }
  };

  const generateCertId = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const dateStr = new Date().getFullYear();
    setCertId(`CRED-${dateStr}-${randomSuffix}`);
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIssueSuccess(null);

    if (!walletAddress) {
      setFormError('Please connect your Stellar wallet first.');
      return;
    }
    if (!certId.trim() || !recipient.trim() || !computedHash) {
      setFormError('Please fill in all required fields and upload the certificate file.');
      return;
    }

    setSubmitting(true);
    try {
      const metadataObj = {
        student_name: studentName,
        course_name: courseName,
        grade: grade,
        credential_type: certType,
        issued_by: issuerInfo?.name || 'Authorized Issuer',
        timestamp: Date.now()
      };
      const metadataStr = JSON.stringify(metadataObj);

      await stellarService.issueCertificate(
        walletAddress,
        certId.trim(),
        recipient.trim(),
        computedHash,
        metadataStr,
        useFreighter
      );

      const newCert: CertDetails = {
        id: certId.trim(),
        issuer: walletAddress,
        recipient: recipient.trim(),
        docHash: computedHash,
        metadata: metadataStr,
        issueDate: Math.floor(Date.now() / 1000),
        revoked: false
      };

      saveIssuedCertLocally(newCert);
      setIssueSuccess(`Certificate ${certId} successfully recorded on Stellar!`);
      
      setCertId('');
      setRecipient('');
      setStudentName('');
      setCourseName('');
      setFile(null);
      setComputedHash('');
    } catch (err: any) {
      console.error(err);
      setFormError(err.message || 'Failed to issue certificate on chain.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!walletAddress) return;
    if (!window.confirm(`Are you sure you want to permanently revoke Certificate ${id}?`)) {
      return;
    }

    setRevokingId(id);
    try {
      await stellarService.revokeCertificate(walletAddress, id, useFreighter);
      
      const updated = issuedCerts.map(c => c.id === id ? { ...c, revoked: true } : c);
      setIssuedCerts(updated);
      localStorage.setItem(`credora_issued_${stellarService.getContractId()}`, JSON.stringify(updated));
    } catch (err: any) {
      alert(`Revocation error: ${err.message || err}`);
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="h-7 w-7 text-violet-400" />
            Issuer Management Portal
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Issue cryptographically tamper-resistant credentials to students and manage certificates.
          </p>
        </div>
        <button
          onClick={checkIssuerStatus}
          disabled={loadingCheck}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingCheck ? 'animate-spin' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Authorization Banner */}
      {!walletAddress ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-3">
          <Key className="h-10 w-10 text-violet-400 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-200">Connect Wallet to Access Issuer Portal</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Use Freighter or enable Developer Mode in the top bar to connect an authorized issuer address.
          </p>
        </div>
      ) : isAuthorized === false ? (
        <div className="p-6 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-400 shrink-0" />
            <h3 className="text-lg font-bold text-amber-300">Unauthorized Account</h3>
          </div>
          <p className="text-sm text-slate-300">
            Address <span className="font-mono text-violet-400 font-semibold">{walletAddress}</span> is not registered as an authorized certificate issuer in the contract.
          </p>
          <p className="text-xs text-slate-400">
            Tip: You can authorize this address using the Admin Dashboard if you are the contract administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Issuer Badge */}
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">Authorized Institution</span>
                <h4 className="text-lg font-bold text-white">{issuerInfo?.name || 'Authorized Issuer'}</h4>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              Active on Ledger
            </span>
          </div>

          {/* Issue Certificate Form */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
              <PlusCircle className="h-5 w-5 text-violet-400" />
              <h3 className="text-lg font-bold text-white">Issue Digital Certificate</h3>
            </div>

            <form onSubmit={handleIssue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Certificate ID */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-semibold text-slate-300">Certificate Reference ID *</label>
                    <button
                      type="button"
                      onClick={generateCertId}
                      className="text-xs text-violet-400 hover:text-violet-300 underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CRED-2026-1001"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:ring-2 focus:ring-violet-500"
                    value={certId}
                    onChange={(e) => setCertId(e.target.value)}
                  />
                </div>

                {/* Recipient Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student Stellar Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. G..."
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm font-mono focus:ring-2 focus:ring-violet-500"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                {/* Student Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alice Chen"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:ring-2 focus:ring-violet-500"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>

                {/* Course Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Course / Program Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Smart Contracts on Stellar"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:ring-2 focus:ring-violet-500"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                  />
                </div>

                {/* Grade */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Grade / Distinction</label>
                  <input
                    type="text"
                    placeholder="e.g. Grade A / Distinction"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:ring-2 focus:ring-violet-500"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  />
                </div>

                {/* Credential Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Credential Type</label>
                  <select
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:ring-2 focus:ring-violet-500"
                    value={certType}
                    onChange={(e) => setCertType(e.target.value)}
                  >
                    <option>Certificate of Completion</option>
                    <option>Diploma Degree</option>
                    <option>Professional Accreditation</option>
                    <option>Achievement Badge</option>
                  </select>
                </div>
              </div>

              {/* Certificate File Upload */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Upload Certificate PDF / Document (Calculates Cryptographic SHA-256 Hash) *
                </label>
                <input
                  type="file"
                  required
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-violet-600 file:text-white hover:file:bg-violet-700 cursor-pointer bg-slate-950 p-2 border border-slate-800 rounded-lg"
                />
                {computedHash && (
                  <p className="mt-2 text-xs font-mono text-slate-400 break-all bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-violet-400 font-semibold">Document SHA-256 Hash: </span>
                    {computedHash}
                  </p>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-950/40 border border-red-900 rounded-lg text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {issueSuccess && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-900 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{issueSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {submitting ? 'Submitting & Signing Transaction...' : 'Issue Certificate to Stellar Testnet'}
              </button>
            </form>
          </div>

          {/* Issued Certificates List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-violet-400" />
              Issued Certificates Registry ({issuedCerts.length})
            </h3>

            {issuedCerts.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No certificates issued yet on this browser session.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">ID</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Issue Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {issuedCerts.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3 font-mono font-semibold text-slate-100">{cert.id}</td>
                        <td className="p-3 font-mono text-slate-400">
                          {cert.recipient.slice(0, 6)}...{cert.recipient.slice(-6)}
                        </td>
                        <td className="p-3">{new Date(cert.issueDate * 1000).toLocaleDateString()}</td>
                        <td className="p-3">
                          {cert.revoked ? (
                            <span className="px-2 py-0.5 bg-red-950/60 border border-red-800 text-red-400 rounded text-[10px] font-bold uppercase">
                              Revoked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 rounded text-[10px] font-bold uppercase">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {!cert.revoked ? (
                            <button
                              onClick={() => handleRevoke(cert.id)}
                              disabled={revokingId === cert.id}
                              className="px-2.5 py-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 rounded text-xs transition disabled:opacity-50 inline-flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              {revokingId === cert.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Revoked</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
