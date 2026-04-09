import * as crypto from 'crypto';
import { Wordlist } from './core/wordlist';
import { words as englishWords } from './core/english';

export type WordCount = 12 | 15 | 18 | 21 | 24;

export interface MnemonicValidationResult {
    isValid: boolean;
    error?: string;
    words?: string[];
}

const wordlist = new Wordlist();

export const mnemonicService = {
    /**
     * Validates a mnemonic phrase and its checksum.
     * @param mnemonic The mnemonic phrase to validate.
     */
    validateMnemonic: (mnemonic: string): MnemonicValidationResult => {
        if (!mnemonic) return { isValid: false, error: 'Mnemonic is required' };

        const words = mnemonic.trim().toLowerCase().split(/\s+/);
        const wordCount = words.length;

        if (![12, 15, 18, 21, 24].includes(wordCount)) {
            return { isValid: false, error: 'Mnemonic must be 12, 15, 18, 21, or 24 words' };
        }

        // 1. Convert words to bits
        let bits = '';
        for (const word of words) {
            const index = englishWords.indexOf(word);
            if (index === -1) {
                return { isValid: false, error: `Invalid word: '${word}'` };
            }
            bits += index.toString(2).padStart(11, '0');
        }

        // 2. Split into Entropy and Checksum
        // Total = ENT + CS where CS = ENT / 32
        // Total = ENT + ENT/32 = ENT(33/32) => ENT = Total * 32 / 33
        const totalBits = bits.length;
        const entropyBitsCount = (totalBits * 32) / 33;
        const checksumBitsCount = totalBits - entropyBitsCount;

        const entropyBits = bits.slice(0, entropyBitsCount);
        const checksumBits = bits.slice(entropyBitsCount);

        // 3. Convert Entropy bits to Bytes
        const entropyBytes = new Uint8Array(entropyBitsCount / 8);
        for (let i = 0; i < entropyBytes.length; i++) {
            entropyBytes[i] = parseInt(entropyBits.slice(i * 8, (i + 1) * 8), 2);
        }

        // 4. Hash Entropy to verify Checksum
        const hash = crypto.createHash('sha256').update(entropyBytes).digest();
        const hashBits = hash[0].toString(2).padStart(8, '0');
        const calculatedChecksum = hashBits.slice(0, checksumBitsCount);

        if (calculatedChecksum !== checksumBits) {
            return { isValid: false, error: 'Invalid checksum' };
        }

        return { isValid: true, words };
    },

    /**
     * Normalizes a mnemonic phrase (removes extra whitespace, lowers case).
     */
    normalizeMnemonic: (mnemonic: string): string => {
        return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
    },

    /**
     * Generates a random BIP-39 mnemonic.
     * bits = ENT + CS (where CS = ENT / 32)
     */
    generateMnemonic: (wordCount: WordCount = 12): string => {
        // Mapping: 12->16, 15->20, 18->24, 21->28, 24->32 bytes
        const entropySize = (wordCount * 4) / 3;
        const entropy = crypto.randomBytes(entropySize);

        const hash = crypto.createHash('sha256').update(entropy).digest();
        const checksumBits = (entropySize * 8) / 32;

        let bits = '';
        for (let i = 0; i < entropy.length; i++) {
            bits += entropy[i].toString(2).padStart(8, '0');
        }

        const hashBits = hash[0].toString(2).padStart(8, '0');
        bits += hashBits.slice(0, checksumBits);

        const mnemonicWords: string[] = [];
        for (let i = 0; i < bits.length; i += 11) {
            const index = parseInt(bits.slice(i, i + 11), 2);
            mnemonicWords.push(englishWords[index]);
        }

        return mnemonicWords.join(' ');
    }
};
