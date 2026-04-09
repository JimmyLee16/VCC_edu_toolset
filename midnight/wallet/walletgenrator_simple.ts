import * as crypto from 'crypto';

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
 * Generate Midnight shielded address from seed phrase.
 * NOTE: This is a simplified mock implementation for demo purposes.
 * For production use, integrate with official Midnight SDK.
 */
export async function seedToMidnightAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    // Generate deterministic mock address based on seed
    const seedStr = seed.join(' ');
    const hash = crypto.createHash('sha256').update(seedStr + 'shielded').digest('hex');
    const mockAddress = `mn_shield-addr_${network}1${hash.substring(0, 20)}`;

    return {
        address: mockAddress,
        privateKey: crypto.createHash('sha256').update(seedStr + 'private').digest('hex'),
        path: "m/44'/2400'/0'/3/0",
        index: 0,
    };
}

/**
 * Generate Midnight unshielded address from seed phrase.
 */
export async function seedToMidnightUnshieldedAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    const seedStr = seed.join(' ');
    const hash = crypto.createHash('sha256').update(seedStr + 'unshielded').digest('hex');
    const mockAddress = `mn_addr_${network}1${hash.substring(0, 20)}`;

    return {
        address: mockAddress,
        privateKey: crypto.createHash('sha256').update(seedStr + 'unshielded_private').digest('hex'),
        path: "m/44'/2400'/0'/0/0",
        index: 0,
    };
}

/**
 * Generate Midnight dust address from seed phrase.
 */
export async function seedToMidnightDustAddress(seed: string[], network: MidnightNetwork = 'preprod'): Promise<AddressInfo> {
    const seedStr = seed.join(' ');
    const hash = crypto.createHash('sha256').update(seedStr + 'dust').digest('hex');
    const mockAddress = `mn_dust_${network}1${hash.substring(0, 20)}`;

    return {
        address: mockAddress,
        privateKey: crypto.createHash('sha256').update(seedStr + 'dust_private').digest('hex'),
        path: "m/44'/2400'/0'/2/0",
        index: 0,
    };
}