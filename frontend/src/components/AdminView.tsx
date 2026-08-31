import React, { useState, useEffect } from 'react';
import { StellarService } from '../utils/stellar';
import { Shield, UserPlus, UserMinus, CheckCircle2, AlertCircle, RefreshCw, Layers, Coins } from 'lucide-react';

interface AdminViewProps {
  stellarService: StellarService;
  walletAddress: string | null;
  useFreighter: boolean;
}

export const AdminView: React.FC<AdminViewProps> = ({
  stellarService,
  walletAddress,
  useFreighter
}) => {
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states
  const [newIssuerAddress, setNewIssuerAddress] = useState('');
  const [newIssuerName, setNewIssuerName] = useState('');
  const [removeIssuerAddress, setRemoveIssuerAddress] = useState('');
  const [faucetAddress, setFaucetAddress] = useState('');
  const [faucetLoading, setFaucetLoading] = useState(false);

  const fetchAdmin = async () => {
    setLoading(true);
    try {
      const admin = await stellarService.getAdmin();
      setAdminAddress(admin);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmin();
  }, [stellarService.getContractId()]);

  const handleInit = async () => {
    if (!walletAddress) {
      setStatusMessage({ type: 'error', text: 'Please connect your wallet first.' });
      return;
    }
    setLoading(true);
    setStatusMessage(null);
    try {
      await stellarService.initializeContract(walletAddress, useFreighter);
      setStatusMessage({ type: 'success', text: 'Contract initialized successfully! You are now the admin.' });
      await fetchAdmin();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Initialization failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      await stellarService.addIssuer(walletAddress, newIssuerAddress.trim(), newIssuerName.trim(), useFreighter);
      setStatusMessage({
        type: 'success',
        text: `Issuer "${newIssuerName}" (${newIssuerAddress.slice(0, 6)}...${newIssuerAddress.slice(-6)}) authorized on Stellar!`
      });
      setNewIssuerAddress('');
      setNewIssuerName('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to authorize issuer' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIssuer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) return;
    setLoading(true);
    setStatusMessage(null);
    try {
      await stellarService.removeIssuer(walletAddress, removeIssuerAddress.trim(), useFreighter);
      setStatusMessage({
        type: 'success',
        text: `Issuer ${removeIssuerAddress.slice(0, 6)}...${removeIssuerAddress.slice(-6)} removed from authorized registry.`
      });
      setRemoveIssuerAddress('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove issuer' });
    } finally {
      setLoading(false);
    }
  };

  const handleFundFriendbot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faucetAddress.trim()) return;
    setFaucetLoading(true);
    try {
      const ok = await stellarService.fundMockWallet(faucetAddress.trim());
      if (ok) {
        setStatusMessage({ type: 'success', text: `Account ${faucetAddress.slice(0, 6)}... funded with 10,000 testnet XLM via Friendbot!` });
        setFaucetAddress('');
      } else {
        setStatusMessage({ type: 'error', text: 'Friendbot funding request failed. Ensure address is valid.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Friendbot funding error' });
    } finally {
      setFaucetLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-7 w-7 text-violet-400" />
            Contract Governance & Administration
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage contract initialization, authorized educational issuers, and faucet utility for testing.
          </p>
        </div>
        <button
          onClick={fetchAdmin}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
              : 'bg-red-950/30 border-red-800 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Contract State Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Layers className="h-5 w-5 text-violet-400" />
          Contract Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Contract ID (Testnet)</span>
            <span className="font-mono text-slate-200 break-all text-xs font-semibold">
              {stellarService.getContractId()}
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <span className="text-slate-400 text-xs block mb-1">Registered Administrator</span>
            {adminAddress ? (
              <span className="font-mono text-emerald-400 break-all text-xs font-semibold">
                {adminAddress}
              </span>
            ) : (
              <span className="text-amber-400 font-semibold text-xs">Not Initialized</span>
            )}
          </div>
        </div>

        {!adminAddress && (
          <div className="pt-2">
            <button
              onClick={handleInit}
              disabled={loading || !walletAddress}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
            >
              {loading ? 'Initializing...' : 'Initialize Contract (Set Connected Wallet as Admin)'}
            </button>
          </div>
        )}
      </div>

      {/* Admin Operations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Issuer Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            <h3 className="text-md font-bold text-white">Authorize Educational Issuer</h3>
          </div>

          <form onSubmit={handleAddIssuer} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Institution / Issuer Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. MIT OpenCourseWare"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs focus:ring-2 focus:ring-violet-500"
                value={newIssuerName}
                onChange={(e) => setNewIssuerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Issuer Stellar Address (G...) *</label>
              <input
                type="text"
                required
                placeholder="e.g. G..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs font-mono focus:ring-2 focus:ring-violet-500"
                value={newIssuerAddress}
                onChange={(e) => setNewIssuerAddress(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !walletAddress}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-xs transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Authorize Issuer on Stellar'}
            </button>
          </form>
        </div>

        {/* Remove Issuer Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <UserMinus className="h-5 w-5 text-red-400" />
            <h3 className="text-md font-bold text-white">Revoke Issuer Authorization</h3>
          </div>

          <form onSubmit={handleRemoveIssuer} className="space-y-3">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Issuer Stellar Address (G...) *</label>
              <input
                type="text"
                required
                placeholder="e.g. G..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs font-mono focus:ring-2 focus:ring-violet-500"
                value={removeIssuerAddress}
                onChange={(e) => setRemoveIssuerAddress(e.target.value)}
              />
            </div>

            <p className="text-[11px] text-slate-500">
              Revoking an issuer prevents them from issuing new credentials. Existing verified credentials will remain valid unless individually revoked.
            </p>

            <button
              type="submit"
              disabled={loading || !walletAddress}
              className="w-full py-2.5 bg-red-900/60 hover:bg-red-800 border border-red-800 text-red-200 font-semibold rounded-lg text-xs transition disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Revoke Issuer Authorization'}
            </button>
          </form>
        </div>
      </div>

      {/* Testnet Friendbot Faucet Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Coins className="h-5 w-5 text-amber-400" />
          <h3 className="text-md font-bold text-white">Stellar Testnet Friendbot Faucet</h3>
        </div>
        <p className="text-xs text-slate-400">
          Fund any Stellar Testnet address with 10,000 XLM for testing transactions, onboarding new users, and paying gas fees.
        </p>

        <form onSubmit={handleFundFriendbot} className="flex gap-3">
          <input
            type="text"
            required
            placeholder="Enter Stellar Testnet address (G...)"
            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-xs font-mono focus:ring-2 focus:ring-violet-500"
            value={faucetAddress}
            onChange={(e) => setFaucetAddress(e.target.value)}
          />
          <button
            type="submit"
            disabled={faucetLoading}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 shrink-0"
          >
            {faucetLoading ? 'Funding...' : 'Fund with 10,000 XLM'}
          </button>
        </form>
      </div>
    </div>
  );
};
