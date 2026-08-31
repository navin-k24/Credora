import React, { useState, useEffect } from 'react';
import { StellarService } from './utils/stellar';
import { VerifyView } from './components/VerifyView';
import { IssuerView } from './components/IssuerView';
import { AdminView } from './components/AdminView';
import { GuideView } from './components/GuideView';
import {
  ShieldCheck,
  Search,
  Award,
  Shield,
  BookOpen,
  Wallet,
  Menu,
  X,
  ExternalLink,
  Edit2,
  Check,
  Zap,
  Activity
} from 'lucide-react';

const DEFAULT_CONTRACT_ID = 'CB4Z56EYHH4VYBYJUD624TMD3DOHXCXONNJT5OIGXRC4O7FU6CZ7OXKU';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'verify' | 'issuer' | 'admin' | 'guide'>('verify');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [contractId, setContractId] = useState<string>(() => {
    return localStorage.getItem('credora_contract_id') || DEFAULT_CONTRACT_ID;
  });
  const [editingContract, setEditingContract] = useState(false);
  const [tempContractId, setTempContractId] = useState(contractId);

  const [stellarService, setStellarService] = useState<StellarService>(
    () => new StellarService(contractId)
  );

  const [walletMode, setWalletMode] = useState<'none' | 'freighter' | 'mock'>('mock');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0.0');

  useEffect(() => {
    const s = new StellarService(contractId);
    setStellarService(s);
    localStorage.setItem('credora_contract_id', contractId);
  }, [contractId]);

  const connectWallet = async (mode: 'freighter' | 'mock') => {
    try {
      if (mode === 'freighter') {
        const addr = await stellarService.getFreighterPublicKey();
        setWalletAddress(addr);
        setWalletMode('freighter');
        const bal = await stellarService.getAccountBalance(addr);
        setBalance(bal);
      } else {
        const kp = stellarService.getOrCreateMockWallet();
        const addr = kp.publicKey();
        setWalletAddress(addr);
        setWalletMode('mock');

        let bal = await stellarService.getAccountBalance(addr);
        if (parseFloat(bal) === 0) {
          await stellarService.fundMockWallet(addr);
          bal = await stellarService.getAccountBalance(addr);
        }
        setBalance(bal);
      }
    } catch (err: any) {
      alert(`Wallet Connection Notice: ${err.message || err}\nSwitched to Developer Mock Wallet.`);
      const kp = stellarService.getOrCreateMockWallet();
      setWalletAddress(kp.publicKey());
      setWalletMode('mock');
    }
  };

  useEffect(() => {
    connectWallet('mock');
  }, []);

  const handleSaveContractId = () => {
    if (tempContractId.trim()) {
      setContractId(tempContractId.trim());
      setEditingContract(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-violet-500 selection:text-white">
      {/* Top Banner / Network & Contract Config Bar */}
      <div className="bg-slate-950 border-b border-slate-800/80 px-4 py-2 text-xs flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-300">Stellar Testnet</span>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5">
            <span>Contract:</span>
            {!editingContract ? (
              <span className="font-mono text-violet-400 font-medium">
                {contractId.slice(0, 6)}...{contractId.slice(-6)}
              </span>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono text-white focus:outline-none"
                  value={tempContractId}
                  onChange={(e) => setTempContractId(e.target.value)}
                />
                <button
                  onClick={handleSaveContractId}
                  className="p-0.5 bg-emerald-600 rounded text-white hover:bg-emerald-500"
                >
                  <Check className="h-3 w-3" />
                </button>
              </div>
            )}
            {!editingContract && (
              <button
                onClick={() => { setTempContractId(contractId); setEditingContract(true); }}
                className="text-slate-500 hover:text-slate-300 ml-1"
                title="Change Contract ID"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Wallet Connection Bar */}
        <div className="flex items-center gap-3">
          {walletAddress && (
            <div className="hidden sm:flex items-center gap-2 text-slate-400">
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>Balance: <strong className="text-slate-200">{balance} XLM</strong></span>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => connectWallet('mock')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                walletMode === 'mock'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="h-3 w-3" />
              Dev Mock Wallet
            </button>
            <button
              onClick={() => connectWallet('freighter')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                walletMode === 'freighter'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Wallet className="h-3 w-3" />
              Freighter
            </button>
          </div>

          {walletAddress && (
            <span className="font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded border border-slate-800 text-[11px]">
              {walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}
            </span>
          )}
        </div>
      </div>

      {/* Main Header / Navigation */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('verify')}>
              <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-500/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                  CREDORA <span className="text-[10px] px-1.5 py-0.5 bg-violet-950 border border-violet-800 text-violet-300 rounded uppercase tracking-wider font-semibold">Stellar Soroban</span>
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">Decentralized Certificate Registry</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              <button
                onClick={() => setActiveTab('verify')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'verify'
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Search className="h-4 w-4" />
                Verify Certificate
              </button>

              <button
                onClick={() => setActiveTab('issuer')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'issuer'
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Award className="h-4 w-4" />
                Issuer Portal
              </button>

              <button
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'admin'
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Shield className="h-4 w-4" />
                Admin Panel
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === 'guide'
                    ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Guide & Proof
              </button>
            </nav>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
            <button
              onClick={() => { setActiveTab('verify'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'verify' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              <Search className="h-4 w-4" />
              Verify Certificate
            </button>
            <button
              onClick={() => { setActiveTab('issuer'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'issuer' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              <Award className="h-4 w-4" />
              Issuer Portal
            </button>
            <button
              onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'admin' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              <Shield className="h-4 w-4" />
              Admin Panel
            </button>
            <button
              onClick={() => { setActiveTab('guide'); setMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                activeTab === 'guide' ? 'bg-violet-600 text-white' : 'text-slate-300'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              Guide & Proof
            </button>
          </div>
        )}
      </header>

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {activeTab === 'verify' && <VerifyView stellarService={stellarService} />}
        {activeTab === 'issuer' && (
          <IssuerView
            stellarService={stellarService}
            walletAddress={walletAddress}
            useFreighter={walletMode === 'freighter'}
          />
        )}
        {activeTab === 'admin' && (
          <AdminView
            stellarService={stellarService}
            walletAddress={walletAddress}
            useFreighter={walletMode === 'freighter'}
          />
        )}
        {activeTab === 'guide' && <GuideView />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div>
            <span>© 2026 Credora • Built on Stellar Soroban</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://stellar.expert/explorer/testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 flex items-center gap-1 transition"
            >
              <span>Stellar Expert Explorer</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <a
              href="https://soroban.stellar.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 flex items-center gap-1 transition"
            >
              <span>Soroban Documentation</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
