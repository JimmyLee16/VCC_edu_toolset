import { seedToMidnightAddress, seedToMidnightUnshieldedAddress, seedToMidnightDustAddress } from './walletgenrator';
import { Wordlist } from './wordlist';
import { mnemonicService, WordCount } from './mnemonicService';

export interface GeneratedWallet {
    address: string;
    privateKey: string;
    mnemonic: string;
    chain: string;
    path: string;
    /** Midnight: Shielded address (private transactions) */
    shieldedAddress?: string;
    /** Midnight: Unshielded address (public transactions) */
    unshieldedAddress?: string;
    /** Midnight: Dust address (gas token) */
    dustAddress?: string;
    /** Midnight: HD paths for different address types */
    unshieldedPath?: string;
    dustPath?: string;
    /** Midnight: Network type (preprod/preview/mainnet) */
    network?: 'preprod' | 'preview' | 'mainnet';
}

const wordlist = new Wordlist();

export const walletService = {
    /**
     * Generates a new random Midnight wallet or derives from mnemonic.
     * @param mnemonic Optional mnemonic to derive from
     * @param wordCount Number of words for random generation
     * @param network Midnight network type
     */
    createWallet: async (mnemonic?: string, wordCount: WordCount = 12, network?: 'preprod' | 'preview' | 'mainnet'): Promise<GeneratedWallet> => {
        const bip39Mnemonic = mnemonic || mnemonicService.generateMnemonic(wordCount);
        const words = bip39Mnemonic.split(/\s+/);

        // Determine network (default to preprod)
        const midnightNetwork = network || 'preprod';
        
        // Generate all 3 address types with specified network
        const [shieldedResult, unshieldedResult, dustResult] = await Promise.all([
            seedToMidnightAddress(words, midnightNetwork),
            seedToMidnightUnshieldedAddress(words, midnightNetwork),
            seedToMidnightDustAddress(words, midnightNetwork)
        ]);
        
        return {
            address: shieldedResult.address,
            shieldedAddress: shieldedResult.address,
            unshieldedAddress: unshieldedResult.address,
            dustAddress: dustResult.address,
            privateKey: shieldedResult.privateKey,
            mnemonic: bip39Mnemonic,
            chain: 'Midnight',
            path: shieldedResult.path,
            unshieldedPath: unshieldedResult.path,
            dustPath: dustResult.path,
            // Add network info for UI display
            network: midnightNetwork,
        };
    }
};
