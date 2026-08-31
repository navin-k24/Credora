import React, { useState } from 'react';
import type { CertDetails } from '../utils/stellar';
import { StellarService } from '../utils/stellar';
import { FileKey2, Upload, Search, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';

interface VerifyViewProps {
  stellarService: StellarService;
}

export const VerifyView: React.FC<VerifyViewProps> = ({ stellarService }) => {
  const [certId, setCertId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [manualHash, setManualHash] = useState('');
  const [useManualHash, setUseManualHash] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    status: 'VALID' | 'REVOKED' | 'HASH_MISMATCH' | 'NOT_FOUND';
    details?: CertDetails;
    computedHash?: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setVerificationResult(null);
      setError(null);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certId.trim()) {
      setError('Please enter a Certificate ID.');
      return;
    }

    let hashToVerify = '';
    
    setLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      if (useManualHash) {
        if (!manualHash.trim()) {
          throw new Error('Please enter the SHA-256 document hash.');
        }
        hashToVerify = manualHash.trim().toLowerCase();
      } else {
        if (!file) {
          throw new Error('Please upload the certificate file to verify.');
        }
        hashToVerify = await StellarService.hashFile(file);
      }

      // 1. Query contract for verification
      const isValid = await stellarService.verifyCertificate(certId, hashToVerify);

      if (isValid) {
        // Fetch full certificate details
        const details = await stellarService.getCertificate(certId);
        setVerificationResult({
          status: 'VALID',
          details: details || undefined,
          computedHash: hashToVerify
        });
      } else {
        // Query details to see why it failed (Not Found vs Revoked vs Hash Mismatch)
        const details = await stellarService.getCertificate(certId);
        if (!details) {
          setVerificationResult({ status: 'NOT_FOUND' });
        } else if (details.revoked) {
          setVerificationResult({ status: 'REVOKED', details });
        } else {
          setVerificationResult({
            status: 'HASH_MISMATCH',
            details,
            computedHash: hashToVerify
          });
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed. Make sure the contract address is correct.');
    } finally {
      setLoading(false);
    }
  };

  // Helper to safely parse metadata JSON
  const renderMetadata = (metadataStr: string) => {
    try {
      const data = JSON.parse(metadataStr);
      return (
        <div className="grid grid-cols-2 gap-4 text-sm mt-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700">
          {Object.entries(data).map(([key, val]) => (
            <div key={key}>
              <span className="text-slate-400 block capitalize">{key.replace(/_/g, ' ')}:</span>
              <span className="text-slate-200 font-medium">{String(val)}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return (
        <div className="mt-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm">
          <span className="text-slate-400 block">Raw Metadata:</span>
          <span className="text-slate-200 font-mono break-all">{metadataStr}</span>
        </div>
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Verify Certificate Authenticity
        </h2>
        <p className="text-lg text-slate-400">
          Instantly verify the integrity of educational certificates secured on the Stellar network.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <form onSubmit={handleVerify} className="space-y-6">
          {/* Certificate ID */}
          <div>
            <label htmlFor="certId" className="block text-sm font-semibold text-slate-300">
              Certificate Reference ID
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                id="certId"
                className="block w-full pl-10 pr-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
                placeholder="e.g. CERT-2026-9817"
                value={certId}
                onChange={(e) => setCertId(e.target.value)}
              />
            </div>
          </div>

          {/* Toggle manual vs file */}
          <div className="flex border-b border-slate-800 pb-2 space-x-4 text-sm font-medium">
            <button
              type="button"
              className={`pb-2 px-1 transition ${!useManualHash ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => setUseManualHash(false)}
            >
              Upload Certificate File
            </button>
            <button
              type="button"
              className={`pb-2 px-1 transition ${useManualHash ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400 hover:text-slate-200'}`}
              onClick={() => setUseManualHash(true)}
            >
              Enter Document Hash Manually
            </button>
          </div>

          {/* File Upload Zone */}
          {!useManualHash ? (
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-800 border-dashed rounded-lg bg-slate-950/50 hover:bg-slate-950 transition cursor-pointer relative">
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <div className="space-y-2 text-center pointer-events-none">
                <Upload className="mx-auto h-10 w-10 text-slate-500" />
                <div className="flex text-sm text-slate-400">
                  <span className="font-semibold text-violet-400">Upload a file</span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">PDF, PNG, JPG up to 10MB</p>
                {file && (
                  <div className="mt-2 text-sm text-green-400 bg-green-950/30 px-3 py-1 rounded-full border border-green-900 inline-flex items-center space-x-1">
                    <FileKey2 className="h-4 w-4" />
                    <span>Selected: {file.name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="hash" className="block text-sm font-semibold text-slate-300">
                Document SHA-256 Hash (Hexadecimal)
              </label>
              <input
                type="text"
                id="hash"
                className="mt-1 block w-full px-3 py-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition font-mono"
                placeholder="e.g. a1b2c3d4..."
                value={manualHash}
                onChange={(e) => setManualHash(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Verifying on Stellar...</span>
              </span>
            ) : (
              <span>Verify Authenticity</span>
            )}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-950/30 border border-red-900 rounded-lg flex items-start space-x-3 text-red-300 text-sm">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result Cards */}
      {verificationResult && (
        <div className="space-y-6">
          {verificationResult.status === 'VALID' && verificationResult.details && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <div>
                  <h3 className="text-xl font-bold text-emerald-300">Certificate Verified!</h3>
                  <p className="text-slate-400 text-sm">This is a valid, authentic certificate record secured on the Stellar ledger.</p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60 pt-2">
                <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between text-sm">
                  <span className="text-slate-400">Certificate ID:</span>
                  <span className="text-slate-200 font-mono">{verificationResult.details.id}</span>
                </div>
                <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between text-sm">
                  <span className="text-slate-400">Recipient Address:</span>
                  <span className="text-slate-200 font-mono break-all">{verificationResult.details.recipient}</span>
                </div>
                <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between text-sm">
                  <span className="text-slate-400">Issuer Address:</span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${verificationResult.details.issuer}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:underline font-mono break-all"
                  >
                    {verificationResult.details.issuer}
                  </a>
                </div>
                <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between text-sm">
                  <span className="text-slate-400">Issue Date:</span>
                  <span className="text-slate-200">
                    {new Date(verificationResult.details.issueDate * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="py-2.5 flex flex-col sm:flex-row sm:justify-between text-sm">
                  <span className="text-slate-400">Document Cryptographic Hash:</span>
                  <span className="text-slate-200 font-mono text-xs break-all">{verificationResult.details.docHash}</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-sm font-semibold text-slate-300">Certificate Metadata:</span>
                {renderMetadata(verificationResult.details.metadata)}
              </div>
            </div>
          )}

          {verificationResult.status === 'REVOKED' && verificationResult.details && (
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-8 w-8 text-amber-400" />
                <div>
                  <h3 className="text-xl font-bold text-amber-300">Certificate Revoked!</h3>
                  <p className="text-slate-400 text-sm">This certificate was officially revoked by the issuing institution.</p>
                </div>
              </div>

              <div className="divide-y divide-slate-800/60 pt-2 text-sm text-slate-300">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Certificate ID:</span>
                  <span className="font-mono">{verificationResult.details.id}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Issuer:</span>
                  <span className="font-mono break-all">{verificationResult.details.issuer}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-400">Revocation Notice:</span>
                  <span className="text-amber-300 font-semibold">Inactive / Invalidated</span>
                </div>
              </div>
            </div>
          )}

          {verificationResult.status === 'HASH_MISMATCH' && verificationResult.details && (
            <div className="bg-red-950/20 border border-red-500/30 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <XCircle className="h-8 w-8 text-red-400" />
                <div>
                  <h3 className="text-xl font-bold text-red-300">Verification Failed!</h3>
                  <p className="text-slate-400 text-sm">Document integrity check failed. The uploaded file does not match the on-chain registry.</p>
                </div>
              </div>

              <div className="p-4 bg-slate-950/50 rounded-lg border border-red-900/30 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">On-Chain Registered Hash:</span>
                  <span className="text-emerald-400 font-mono text-xs break-all">{verificationResult.details.docHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Uploaded Document Hash:</span>
                  <span className="text-red-400 font-mono text-xs break-all">{verificationResult.computedHash}</span>
                </div>
              </div>
              
              <div className="flex items-start space-x-2 text-xs text-slate-400">
                <Info className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Explanation</strong>: A single letter modification, re-saving, or format alteration generates a completely different cryptographic SHA-256 fingerprint. This guarantees that the original certificate content has been modified.
                </span>
              </div>
            </div>
          )}

          {verificationResult.status === 'NOT_FOUND' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
              <Search className="h-12 w-12 text-slate-500 mx-auto" />
              <h3 className="text-xl font-bold text-slate-300">Certificate Not Found</h3>
              <p className="text-slate-400 max-w-md mx-auto text-sm">
                No certificate registry with ID <span className="font-mono text-violet-400 font-semibold">{certId}</span> was found on the contract. Double check the ID or contact the issuing authority.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
