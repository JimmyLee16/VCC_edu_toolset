import { seedToMidnightAddress, seedToMidnightUnshieldedAddress, seedToMidnightDustAddress } from './wallet/midnight';
import { Wordlist } from './wallet/wordlist';
import { mnemonicService, WordCount } from './mnemonicService';

export interface GeneratedWallet {
    address: string;
    privateKey: string;
    mnemonic: string;
    chain: string;
    path: string;
    stakeAddress?: string;
    /** Polkadot: Generic Substrate address (SS58 prefix 42, starts with '5') */
    substrateAddress?: string;
    /** Polkadot: Kusama address (SS58 prefix 2, starts with 'C/D') */
    kusamaAddress?: string;
    /** TON: Non-bounceable address (starts with 'UQ') */
    nonBounceableAddress?: string;
    /** TON: Raw address (0:...) */
    rawAddress?: string;
    /** TON: Account ID (StateInit hash hex) */
    accountId?: string;
    /** Bitcoin: Taproot address (starts with 'bc1p') */
    taprootAddress?: string;
    /** Bitcoin: SegWit Nested address (starts with '3') */
    segwitAddress?: string;
    /** Bitcoin: Legacy address (starts with '1') */
    legacyAddress?: string;
    /** Bitcoin: Testnet addresses (signet) */
    testnetAddress?: string;
    testnetTaprootAddress?: string;
    testnetSegwitAddress?: string;
    testnetLegacyAddress?: string;
    /** Bitcoin: Testnet private key (signet) */
    testnetPrivateKey?: string;
    /** Cardano: Testnet addresses */
    testnetPaymentAddress?: string;
    testnetStakeAddress?: string;
    testnetDelegatedAddress?: string;
    /** Cardano: Extended private keys (XSK) */
    paymentXsk?: string;
    stakeXsk?: string;
    /** Midnight: Shielded address (private transactions) */
    shieldedAddress?: string;
    /** Midnight: Unshielded address (public transactions) */
    unshieldedAddress?: string;
    /** Midnight: Dust address (gas token) */
    dustAddress?: string;
    /** Midnight: HD paths for different address types */
    unshieldedPath?: string;
    dustPath?: string;
    /** Cardano: Signing keys in JSON format */
    paymentSigningKey?: string;
    stakeSigningKey?: string;
    /** Midnight: Network type (preprod/preview/mainnet) */
    network?: 'preprod' | 'preview' | 'mainnet';
}

const wordlist = new Wordlist();

export const walletService = {
    /**
     * Generates a new random wallet or derives from mnemonic.
     * @param chain The target blockchain
     * @param mnemonic Optional mnemonic to derive from
     * @param wordCount Number of words for random generation
     */
    createWallet: async (chain: string = 'EVM', mnemonic?: string, wordCount: WordCount = 12, network?: string): Promise<GeneratedWallet> => {
        const bip39Mnemonic = mnemonic || mnemonicService.generateMnemonic(wordCount);
        const words = bip39Mnemonic.split(/\s+/);

        switch (chain.toUpperCase()) {
            case 'BTC': {
                // All formats use their respective standard BIP paths (44, 49, 84, 86)
                const segwitResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2wpkh');
                const taprootResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2tr');
                const p2shResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2sh-p2wpkh');
                const legacyResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2pkh');

                // Testnet addresses (signet)
                const segwitTestnetResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2wpkh', 'signet');
                const taprootTestnetResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2tr', 'signet');
                const p2shTestnetResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2sh-p2wpkh', 'signet');
                const legacyTestnetResult = seedToMultipleBitcoinAddresses(words, 1, 0, 'p2pkh', 'signet');

                return {
                    address: segwitResult[0].address, // Native SegWit (Primary)
                    taprootAddress: taprootResult[0].address,
                    segwitAddress: p2shResult[0].address,
                    legacyAddress: legacyResult[0].address,
                    privateKey: segwitResult[0].privateKey, // Primary WIF
                    mnemonic: bip39Mnemonic,
                    chain: 'Bitcoin',
                    path: segwitResult[0].path,
                    // Testnet addresses
                    testnetAddress: segwitTestnetResult[0].address,
                    testnetTaprootAddress: taprootTestnetResult[0].address,
                    testnetSegwitAddress: p2shTestnetResult[0].address,
                    testnetLegacyAddress: legacyTestnetResult[0].address,
                    testnetPrivateKey: segwitTestnetResult[0].privateKey // Testnet Private Key
                };
            }
            case 'EVM': {
                const results = seedToMultipleEVMAddresses(words, 1, 0);
                return {
                    address: results[0].address,
                    privateKey: results[0].privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'Ethereum/EVM',
                    path: results[0].path
                };
            }
            case 'SOL': {
                const results = seedToMultipleSolanaAddresses(words, 1, 0);
                return {
                    address: results[0].address,
                    privateKey: results[0].privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'Solana',
                    path: results[0].path
                };
            }
            case 'ADA': {
                const derivationPath = "m/1852'/1815'/0'/0/0";
                const address = seed_to_delegated_address(words, wordlist);
                const xprv = seed_to_xprv(words, wordlist, derivationPath);
                const stakeAddress = seed_to_stakeaddress(words, wordlist);
                
                // Testnet addresses
                const testnetPaymentAddress = seed_to_payment_address_testnet(words, wordlist);
                const testnetStakeAddress = seed_to_stakeaddress_testnet(words, wordlist);
                const testnetDelegatedAddress = seed_to_delegated_address_testnet(words, wordlist);
                
                // XSK keys
                const paymentXsk = seed_to_child_xsk(words, wordlist, 'payment');
                const stakeXsk = seed_to_child_xsk(words, wordlist, 'stake');
                
                // Signing keys JSON
                const paymentSigningKey = xsk_to_skey_json(paymentXsk, 'payment');
                const stakeSigningKey = xsk_to_skey_json(stakeXsk, 'stake');
                
                return {
                    address: address,
                    privateKey: paymentXsk, // Use XSK instead of regular private key
                    mnemonic: bip39Mnemonic,
                    chain: 'Cardano (Shelley)',
                    path: derivationPath,
                    stakeAddress: stakeAddress,
                    testnetPaymentAddress,
                    testnetStakeAddress,
                    testnetDelegatedAddress,
                    paymentXsk,
                    stakeXsk,
                    paymentSigningKey,
                    stakeSigningKey
                };
            }
            case 'TRX': {
                const result = seedToTronAddress(words);
                return {
                    address: result.address,
                    privateKey: result.privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'Tron (TRX)',
                    path: result.path,
                };
            }
            case 'APT': {
                const result = seedToAptosAddress(words);
                return {
                    address: result.address,
                    privateKey: result.privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'Aptos (APT)',
                    path: result.path,
                };
            }
            case 'DOT': {
                const result = seedToPolkadotAddress(words);
                return {
                    address: result.address,
                    privateKey: result.privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'Polkadot (DOT)',
                    path: result.path,
                    substrateAddress: result.substrateAddress,
                    kusamaAddress: result.kusamaAddress,
                };
            }
            case 'TON': {
                const result = await seedToTonAddress(words);
                return {
                    address: result.address,
                    privateKey: result.privateKey,
                    mnemonic: bip39Mnemonic,
                    chain: 'TON (The Open Network)',
                    path: result.path,
                    nonBounceableAddress: result.nonBounceableAddress,
                    rawAddress: result.raw,
                    accountId: result.accountId,
                };
            }
            case 'MIDNIGHT': {
                // Determine network (default to preprod)
                const midnightNetwork = (network as 'preprod' | 'preview' | 'mainnet') || 'preprod';
                
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
            default:
                throw new Error(`Unsupported chain: ${chain}`);
        }
    }
};
