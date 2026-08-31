import {
  Contract,
  rpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Account,
  scValToNative,
  nativeToScVal,
  BASE_FEE,
  Transaction
} from '@stellar/stellar-sdk';
import freighter from '@stellar/freighter-api';
import { Buffer } from 'buffer';

// Polyfill Buffer on window
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

const RPC_URL = 'https://soroban-testnet.stellar.org';
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const NETWORK_PASSPHRASE = Networks.TESTNET;

export interface CertDetails {
  id: string;
  issuer: string;
  recipient: string;
  docHash: string;
  metadata: string;
  issueDate: number;
  revoked: boolean;
}

export interface IssuerDetails {
  name: string;
  authorizedAt: number;
}

export class StellarService {
  private server: rpc.Server;
  private contractId: string;

  constructor(contractId: string) {
    this.server = new rpc.Server(RPC_URL);
    this.contractId = contractId;
  }

  public getContractId(): string {
    return this.contractId;
  }

  public setContractId(contractId: string) {
    this.contractId = contractId;
  }

  /**
   * Check if Freighter Wallet is installed
   */
  public async isFreighterInstalled(): Promise<boolean> {
    try {
      const res: any = await freighter.isConnected();
      return !!(res && (res === true || res.isConnected));
    } catch {
      return false;
    }
  }

  /**
   * Request user public key from Freighter
   */
  public async getFreighterPublicKey(): Promise<string> {
    try {
      const res: any = await freighter.getAddress();
      const address = res?.address || res;
      if (!address || typeof address !== 'string') {
        throw new Error("No address found in Freighter");
      }
      return address;
    } catch (err: any) {
      throw new Error(`Freighter connection failed: ${err.message || err}`);
    }
  }

  /**
   * Generate a new developer keypair for Mock mode and save to localStorage
   */
  public getOrCreateMockWallet(): Keypair {
    const storedSecret = localStorage.getItem('credora_mock_secret');
    if (storedSecret) {
      try {
        return Keypair.fromSecret(storedSecret);
      } catch {
        // invalid secret, fallback to new
      }
    }
    const kp = Keypair.random();
    localStorage.setItem('credora_mock_secret', kp.secret());
    return kp;
  }

  /**
   * Fund Mock Wallet using Friendbot
   */
  public async fundMockWallet(publicKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${HORIZON_URL}/friendbot?addr=${publicKey}`);
      return response.ok;
    } catch (err) {
      console.error("Failed to fund wallet with Friendbot:", err);
      return false;
    }
  }

  /**
   * Get balance of an account on Testnet
   */
  public async getAccountBalance(publicKey: string): Promise<string> {
    try {
      const response = await fetch(`${HORIZON_URL}/accounts/${publicKey}`);
      if (!response.ok) return "0.0";
      const data = await response.json();
      const nativeBalance = data.balances.find((b: any) => b.asset_type === 'native');
      return nativeBalance ? nativeBalance.balance : "0.0";
    } catch {
      return "0.0";
    }
  }

  /**
   * Call a read-only method on the smart contract via RPC simulation
   */
  private async simulateCall(method: string, args: any[] = []): Promise<any> {
    const dummyKp = Keypair.random();
    const contract = new Contract(this.contractId);
    const operation = contract.call(method, ...args);

    const dummyAccount = new Account(dummyKp.publicKey(), "0");

    const tx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(operation)
      .setTimeout(30)
      .build();

    const simResponse = await this.server.simulateTransaction(tx);
    
    if (rpc.Api.isSimulationError(simResponse)) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }

    const res: any = simResponse;
    if (res.result && res.result.retval) {
      return scValToNative(res.result.retval);
    }
    return null;
  }

  /**
   * Helper to execute a state-modifying transaction (sends & polls for result)
   */
  private async executeTx(
    sourceAddress: string,
    operation: any,
    signCallback: (tx: Transaction) => Promise<Transaction>
  ): Promise<any> {
    // 1. Fetch source account sequence from Horizon
    let sequence = "0";
    try {
      const horizonAcc = await fetch(`${HORIZON_URL}/accounts/${sourceAddress}`).then(r => r.json());
      sequence = horizonAcc.sequence;
    } catch {
      throw new Error(`Account ${sourceAddress} is not funded on Stellar Testnet yet.`);
    }

    const sourceAccount = new Account(sourceAddress, sequence);

    // 2. Build the transaction
    const txBuilder = new TransactionBuilder(sourceAccount, {
      fee: '100000',
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(operation)
      .setTimeout(180);

    // 3. Simulate to assemble transaction
    const simTx = txBuilder.build();
    const simResponse = await this.server.simulateTransaction(simTx);

    if (rpc.Api.isSimulationError(simResponse)) {
      throw new Error(`Simulation failed: ${simResponse.error}`);
    }

    // 4. Assemble simulation results into the transaction
    const assembledTx: any = rpc.assembleTransaction(simTx, simResponse).build();

    // 5. Sign the transaction
    const signedTx = await signCallback(assembledTx);

    // 6. Submit the transaction
    const submitResponse = await this.server.sendTransaction(signedTx);
    
    if (submitResponse.status === "ERROR") {
      throw new Error(`Submission failed: ${JSON.stringify(submitResponse)}`);
    }

    // 7. Poll transaction status
    let status: any = submitResponse.status;
    let attempts = 0;
    while ((status === "PENDING" || status === "TRY_AGAIN_LATER" || status === "DUPLICATE") && attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      const txResult: any = await this.server.getTransaction(submitResponse.hash);
      status = txResult.status;
      attempts++;

      if (status === "SUCCESS") {
        if (txResult.returnValue) {
          return scValToNative(txResult.returnValue);
        }
        return true;
      }
      
      if (status === "FAILED") {
        throw new Error(`Transaction execution failed: ${txResult.resultXdr || 'Unknown error'}`);
      }
    }

    if (status !== "SUCCESS") {
      throw new Error("Transaction timed out waiting to be finalized.");
    }
    return true;
  }

  // --- READ-ONLY CONTRACT METHODS ---

  public async getAdmin(): Promise<string | null> {
    return await this.simulateCall('get_admin');
  }

  public async isIssuer(address: string): Promise<boolean> {
    try {
      const res = await this.simulateCall('is_issuer', [
        nativeToScVal(address, { type: 'address' })
      ]);
      return !!res;
    } catch {
      return false;
    }
  }

  public async getIssuerInfo(address: string): Promise<IssuerDetails | null> {
    try {
      const res = await this.simulateCall('get_issuer_info', [
        nativeToScVal(address, { type: 'address' })
      ]);
      if (!res) return null;
      return {
        name: res.name,
        authorizedAt: Number(res.authorized_at)
      };
    } catch {
      return null;
    }
  }

  public async getCertificate(id: string): Promise<CertDetails | null> {
    try {
      const res = await this.simulateCall('get_certificate', [
        nativeToScVal(id, { type: 'string' })
      ]);
      if (!res) return null;
      return {
        id: res.id,
        issuer: res.issuer,
        recipient: res.recipient,
        docHash: Buffer.from(res.doc_hash).toString('hex'),
        metadata: res.metadata,
        issueDate: Number(res.issue_date),
        revoked: res.revoked
      };
    } catch (err) {
      console.error("getCertificate error:", err);
      return null;
    }
  }

  public async verifyCertificate(id: string, hexHash: string): Promise<boolean> {
    try {
      const bytes32 = Buffer.from(hexHash, 'hex');
      const res = await this.simulateCall('verify_certificate', [
        nativeToScVal(id, { type: 'string' }),
        nativeToScVal(bytes32, { type: 'bytes' })
      ]);
      return !!res;
    } catch {
      return false;
    }
  }

  // --- STATE-MODIFYING CONTRACT METHODS ---

  public async initializeContract(adminAddress: string, useFreighter: boolean): Promise<any> {
    const contract = new Contract(this.contractId);
    const operation = contract.call(
      'init',
      nativeToScVal(adminAddress, { type: 'address' })
    );

    return this.executeTx(
      adminAddress,
      operation,
      async (assembledTx) => {
        if (useFreighter) {
          const res: any = await freighter.signTransaction(assembledTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          const signedXdr = res.signedTxXdr || res;
          return TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        } else {
          const kp = this.getOrCreateMockWallet();
          assembledTx.sign(kp);
          return assembledTx;
        }
      }
    );
  }

  public async addIssuer(
    adminAddress: string,
    issuerAddress: string,
    name: string,
    useFreighter: boolean
  ): Promise<any> {
    const contract = new Contract(this.contractId);
    const operation = contract.call(
      'add_issuer',
      nativeToScVal(adminAddress, { type: 'address' }),
      nativeToScVal(issuerAddress, { type: 'address' }),
      nativeToScVal(name, { type: 'string' })
    );

    return this.executeTx(
      adminAddress,
      operation,
      async (assembledTx) => {
        if (useFreighter) {
          const res: any = await freighter.signTransaction(assembledTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          const signedXdr = res.signedTxXdr || res;
          return TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        } else {
          const kp = this.getOrCreateMockWallet();
          assembledTx.sign(kp);
          return assembledTx;
        }
      }
    );
  }

  public async removeIssuer(
    adminAddress: string,
    issuerAddress: string,
    useFreighter: boolean
  ): Promise<any> {
    const contract = new Contract(this.contractId);
    const operation = contract.call(
      'remove_issuer',
      nativeToScVal(adminAddress, { type: 'address' }),
      nativeToScVal(issuerAddress, { type: 'address' })
    );

    return this.executeTx(
      adminAddress,
      operation,
      async (assembledTx) => {
        if (useFreighter) {
          const res: any = await freighter.signTransaction(assembledTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          const signedXdr = res.signedTxXdr || res;
          return TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        } else {
          const kp = this.getOrCreateMockWallet();
          assembledTx.sign(kp);
          return assembledTx;
        }
      }
    );
  }

  public async issueCertificate(
    issuerAddress: string,
    id: string,
    recipientAddress: string,
    hexHash: string,
    metadata: string,
    useFreighter: boolean
  ): Promise<any> {
    const contract = new Contract(this.contractId);
    const bytes32 = Buffer.from(hexHash, 'hex');

    const operation = contract.call(
      'issue_certificate',
      nativeToScVal(issuerAddress, { type: 'address' }),
      nativeToScVal(id, { type: 'string' }),
      nativeToScVal(recipientAddress, { type: 'address' }),
      nativeToScVal(bytes32, { type: 'bytes' }),
      nativeToScVal(metadata, { type: 'string' })
    );

    return this.executeTx(
      issuerAddress,
      operation,
      async (assembledTx) => {
        if (useFreighter) {
          const res: any = await freighter.signTransaction(assembledTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          const signedXdr = res.signedTxXdr || res;
          return TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        } else {
          const kp = this.getOrCreateMockWallet();
          assembledTx.sign(kp);
          return assembledTx;
        }
      }
    );
  }

  public async revokeCertificate(
    issuerAddress: string,
    id: string,
    useFreighter: boolean
  ): Promise<any> {
    const contract = new Contract(this.contractId);
    const operation = contract.call(
      'revoke_certificate',
      nativeToScVal(issuerAddress, { type: 'address' }),
      nativeToScVal(id, { type: 'string' })
    );

    return this.executeTx(
      issuerAddress,
      operation,
      async (assembledTx) => {
        if (useFreighter) {
          const res: any = await freighter.signTransaction(assembledTx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
          const signedXdr = res.signedTxXdr || res;
          return TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as Transaction;
        } else {
          const kp = this.getOrCreateMockWallet();
          assembledTx.sign(kp);
          return assembledTx;
        }
      }
    );
  }

  // --- CRYPTO FILE HASHING HELPERS ---

  public static async hashFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  }

  public static async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
