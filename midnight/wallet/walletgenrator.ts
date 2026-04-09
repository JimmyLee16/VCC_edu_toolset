 /**
 * Midnight Network key derivation from seed phrases.
 * 
 * Midnight uses Ed25519/Bip340 for transaction signing.
 * For Night keys: Ed25519 signature scheme (Bip340 variant)
 * For transaction signing: Ed25519 with proper Midnight SDK
 * 
 * Supports address generation using BIP-44 standard:
 * >>> m/44'/2400'/0'/3/0 (Shielded addresses)
 * >>> m/44'/2400'/0'/0/0 (Unshielded addresses) 
 * >>> m/44'/2400'/0'/2/0 (Dust addresses)
 * >>> mn_shield-addr_preprod1... (Shielded Preprod)
 * >>> mn_addr_preprod1... (Unshielded Preprod)
 * >>> mn_dust_preprod1... (Dust Preprod)
 * >>> mn_shield-addr_preview1... (Shielded Preview)
 * >>> mn_addr_preview1... (Unshielded Preview)
 * >>> mn_dust_preview1... (Dust Preview)
 * >>> mn_shield-addr1... (Shielded Mainnet)
 * >>> mn_addr1... (Unshielded Mainnet)
 * >>> mn_dust1... (Dust Mainnet)
 * 
 * IMPORTANT: Private keys returned are raw key material for Midnight SDK.
 * For transaction signing, use Midnight SDK with Ed25519/Bip340.
 */

import * as crypto from 'crypto';
import { HDKey } from '@scure/bip32';

export class MidnightDerivationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MidnightDerivationError';
    }
}

/**
 * Convert mnemonic phrase to seed using BIP-39.
 */
export function mnemonicToSeed(mnemonic: string, passphrase: string = ''): Buffer {
    const salt = Buffer.from(`mnemonic${passphrase}`);
    return crypto.pbkdf2Sync(
        mnemonic.normalize('NFKD'),
        salt,
        2048,
        64,
        'sha512'
    );
}

/**
 * Address information object.
 */
export interface AddressInfo {
    address: string;
    privateKey: string;
    path: string;
    index: number;
}

/**
 * Midnight network types.
 */
export type MidnightNetwork = 'preprod' | 'preview' | 'mainnet';

/**
 * Network configuration for Midnight.
 */
export interface MidnightNetworkConfig {
    name: string;
    explorerUrl: string;
    graphqlWsUrl: string;
    rpcUrl: string;
    indexerUrl: string;
    indexerWsUrl: string;
    proofServerUrl?: string;
    isTestnet: boolean;
}

/**
 * Get network configuration for Midnight.
 */
export function getMidnightNetworkConfig(network: MidnightNetwork): MidnightNetworkConfig {
    switch (network) {
        case 'preprod':
            return {
                name: 'Midnight Preprod Testnet',
                explorerUrl: 'https://explorer.preprod.midnight.network',
                graphqlWsUrl: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
                rpcUrl: 'wss://rpc.preprod.midnight.network',
                indexerUrl: 'https://indexer.preprod.midnight.network/api/v3/graphql',
                indexerWsUrl: 'wss://indexer.preprod.midnight.network/api/v3/graphql/ws',
          
                isTestnet: true
            };
        case 'preview':
            return {
                name: 'Midnight Preview Testnet',
                explorerUrl: 'https://explorer.preview.midnight.network',
                graphqlWsUrl: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws',
                rpcUrl: 'wss://rpc.preview.midnight.network',
                indexerUrl: 'https://indexer.preview.midnight.network/api/v3/graphql',
                indexerWsUrl: 'wss://indexer.preview.midnight.network/api/v3/graphql/ws',
        
                isTestnet: true
            };
        case 'mainnet':
            return {
                name: 'Midnight Mainnet',
                explorerUrl: 'https://explorer.midnight.network',
                graphqlWsUrl: 'wss://indexer.midnight.network/api/v3/graphql/ws',
                rpcUrl: 'https://rpc.mainnet.midnight.network',
                indexerUrl: 'https://indexer.midnight.network/api/v3/graphql',
                indexerWsUrl: 'wss://indexer.midnight.network/api/v3/graphql/ws',
                isTestnet: false
            };
        default:
            throw new MidnightDerivationError(`Unsupported network: ${network}`);
    }
}

/**
 * Generate Midnight shielded address from seed phrase.
 */
export async function seedToMidnightAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    try {
        const mnemonic = seed.join(' ');
        const path = "m/44'/2400'/0'/3/0"; // Shielded path
        
        // Generate seed from mnemonic
        const seedBuffer = mnemonicToSeed(mnemonic);
        
        // Load Midnight WASM packages dynamically
        const [
            { HDWallet, Roles },
            { ZswapSecretKeys },
            { ShieldedAddress, ShieldedCoinPublicKey, ShieldedEncryptionPublicKey }
        ] = await Promise.all([
            import('@midnight-ntwrk/wallet-sdk-hd'),
            import('@midnight-ntwrk/ledger-v7'),
            import('@midnight-ntwrk/wallet-sdk-address-format')
        ]);

        // HD key derivation using Midnight SDK
        const hdWalletResult = HDWallet.fromSeed(seedBuffer);
        
        if (hdWalletResult.type !== 'seedOk') {
            throw new MidnightDerivationError('Failed to create HD wallet');
        }
        
        const keyResult = hdWalletResult.hdWallet
            .selectAccount(0)
            .selectRole(Roles.Zswap)
            .deriveKeyAt(0);

        if (keyResult.type !== 'keyDerived') {
            throw new MidnightDerivationError('Key derivation failed');
        }

        // Zswap keys generation
        const zswapKeys = ZswapSecretKeys.fromSeed(keyResult.key);

        // Build shielded address
        const address = new ShieldedAddress(
            new ShieldedCoinPublicKey(Buffer.from(zswapKeys.coinPublicKey, 'hex')),
            new ShieldedEncryptionPublicKey(Buffer.from(zswapKeys.encryptionPublicKey, 'hex'))
        );

        // Encode to Bech32m
        const encoded = ShieldedAddress.codec.encode(network, address);

        // Cleanup sensitive data
        zswapKeys.clear();
        hdWalletResult.hdWallet.clear();
        
        return {
            address: encoded.asString(),
            privateKey: Buffer.from(keyResult.key).toString('hex'), // Raw key material for SDK
            path,
            index: 0,
        };
    } catch (error) {
        throw new MidnightDerivationError(
            error instanceof Error ? error.message : 'Failed to derive Midnight address'
        );
    }
}

/**
 * Generate Midnight unshielded address from seed phrase.
 */
export async function seedToMidnightUnshieldedAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    try {
        const mnemonic = seed.join(' ');
        const path = "m/44'/2400'/0'/0/0"; // Unshielded path
        
        // Generate seed from mnemonic
        const seedBuffer = mnemonicToSeed(mnemonic);
        
        // Load Midnight WASM packages dynamically
        const [
            { HDWallet, Roles },
            { signatureVerifyingKey, addressFromKey },
            { UnshieldedAddress }
        ] = await Promise.all([
            import('@midnight-ntwrk/wallet-sdk-hd'),
            import('@midnight-ntwrk/ledger-v7'),
            import('@midnight-ntwrk/wallet-sdk-address-format')
        ]);

        // HD key derivation using Midnight SDK
        const hdWalletResult = HDWallet.fromSeed(seedBuffer);
        
        if (hdWalletResult.type !== 'seedOk') {
            throw new MidnightDerivationError('Failed to create HD wallet');
        }
        
        const keyResult = hdWalletResult.hdWallet
            .selectAccount(0)
            .selectRole(Roles.NightExternal)
            .deriveKeyAt(0);

        if (keyResult.type !== 'keyDerived') {
            throw new MidnightDerivationError('Key derivation failed');
        }

        // Get signature verifying key
        const verifyingKey = signatureVerifyingKey(Buffer.from(keyResult.key).toString('hex'));
        
        // Get address from key
        const address = addressFromKey(verifyingKey);
        const addressBuffer = Buffer.from(address, 'hex');

        // Create unshielded address
        const unshieldAddress = new UnshieldedAddress(addressBuffer);
        const encoded = UnshieldedAddress.codec.encode(network, unshieldAddress);

        // Cleanup sensitive data
        hdWalletResult.hdWallet.clear();
        
        return {
            address: encoded.asString(),
            privateKey: Buffer.from(keyResult.key).toString('hex'), // Raw key material for SDK
            path,
            index: 0,
        };
    } catch (error) {
        throw new MidnightDerivationError(
            error instanceof Error ? error.message : 'Failed to derive Midnight unshielded address'
        );
    }
}

/**
 * Generate Midnight dust address from seed phrase.
 */
export async function seedToMidnightDustAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    try {
        const mnemonic = seed.join(' ');
        const path = "m/44'/2400'/0'/2/0"; // Dust path
        
        // Generate seed from mnemonic
        const seedBuffer = mnemonicToSeed(mnemonic);
        
        // Load Midnight WASM packages dynamically
        const [
            { HDWallet, Roles },
            { DustSecretKey },
            { DustAddress }
        ] = await Promise.all([
            import('@midnight-ntwrk/wallet-sdk-hd'),
            import('@midnight-ntwrk/ledger-v7'),
            import('@midnight-ntwrk/wallet-sdk-address-format')
        ]);

        // HD key derivation using Midnight SDK
        const hdWalletResult = HDWallet.fromSeed(seedBuffer);
        
        if (hdWalletResult.type !== 'seedOk') {
            throw new MidnightDerivationError('Failed to create HD wallet');
        }
        
        const keyResult = hdWalletResult.hdWallet
            .selectAccount(0)
            .selectRole(Roles.Dust)
            .deriveKeyAt(0);

        if (keyResult.type !== 'keyDerived') {
            throw new MidnightDerivationError('Key derivation failed');
        }

        // Create dust secret key
        const dustSecretKey = DustSecretKey.fromSeed(keyResult.key);
        
        // Get public key (BigInt)
        const dustPK = dustSecretKey.publicKey;

        // Create dust address
        const dustAddress = new DustAddress(dustPK);
        const encoded = DustAddress.codec.encode(network, dustAddress);

        // Cleanup sensitive data
        dustSecretKey.clear();
        hdWalletResult.hdWallet.clear();
        
        return {
            address: encoded.asString(),
            privateKey: Buffer.from(keyResult.key).toString('hex'), // Raw key material for SDK
            path,
            index: 0,
        };
    } catch (error) {
        throw new MidnightDerivationError(
            error instanceof Error ? error.message : 'Failed to derive Midnight dust address'
        );
    }
}

/**
 * Generate complete Midnight wallet (all address types) for mainnet.
 */
export async function createMidnightMainnetWallet(seed: string[]): Promise<{
    shielded: AddressInfo;
    unshielded: AddressInfo;
    dust: AddressInfo;
    network: MidnightNetwork;
}> {
    try {
        const [shielded, unshielded, dust] = await Promise.all([
            seedToMidnightAddress(seed, 'mainnet'),
            seedToMidnightUnshieldedAddress(seed, 'mainnet'),
            seedToMidnightDustAddress(seed, 'mainnet')
        ]);

        return {
            shielded,
            unshielded,
            dust,
            network: 'mainnet'
        };
    } catch (error) {
        throw new MidnightDerivationError(
            error instanceof Error ? error.message : 'Failed to create Midnight mainnet wallet'
        );
    }
}

/**
 * Generate Midnight shielded address for mainnet.
 */
export async function createMidnightMainnetShieldedAddress(seed: string[]): Promise<AddressInfo> {
    return seedToMidnightAddress(seed, 'mainnet');
}

/**
 * Generate Midnight unshielded address for mainnet.
 */
export async function createMidnightMainnetUnshieldedAddress(seed: string[]): Promise<AddressInfo> {
    return seedToMidnightUnshieldedAddress(seed, 'mainnet');
}

/**
 * Generate Midnight dust address for mainnet.
 */
export async function createMidnightMainnetDustAddress(seed: string[]): Promise<AddressInfo> {
    return seedToMidnightDustAddress(seed, 'mainnet');
}

/**
 * Validate Midnight address format.
 */
export function validateMidnightAddress(address: string, mode?: 'unshielded' | 'shielded', network: MidnightNetwork = 'preprod'): boolean {
    try {
        const prefix = address.split('1')[0];
        
        // Check if address matches expected network format
        const expectedPrefix = mode === 'shielded' 
            ? `mn_shield-addr${network === 'mainnet' ? '' : `_${network}`}`
            : `mn_addr${network === 'mainnet' ? '' : `_${network}`}`;
            
        if (mode && !address.startsWith(expectedPrefix)) {
            return false;
        }
        
        if (prefix.startsWith('mn_shield-addr')) {
            return address.length > 20; // Basic validation
        }
        
        if (prefix.startsWith('mn_addr')) {
            return address.length > 20;
        }
        
        if (prefix.startsWith('mn_dust')) {
            return address.length > 10;
        }
        
        return false;
    } catch {
        return false;
    }
}
