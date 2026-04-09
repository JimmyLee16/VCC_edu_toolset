import { words as englishWords } from './english';

/**
 * Compute the edit distance between strings a and b.
 * Uses the optimal string alignment algorithm according to:
 * https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
 */
function editDistance(a: string, b: string): number {
    const d: number[][] = [];

    for (let i = 0; i <= a.length; i++) {
        d[i] = [i];
    }

    for (let j = 1; j <= b.length; j++) {
        d[0][j] = j;
    }

    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            let cost = 1;
            if (a[i - 1] === b[j - 1]) {
                cost = 0;
            }

            const deleteOp = d[i - 1][j] + 1;
            const insert = d[i][j - 1] + 1;
            const substitute = d[i - 1][j - 1] + cost;

            d[i][j] = Math.min(deleteOp, insert, substitute);

            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                const transpose = d[i - 2][j - 2] + 1;
                d[i][j] = Math.min(d[i][j], transpose);
            }
        }
    }

    return d[a.length][b.length];
}

/**
 * Wordlist with similarity functionality.
 */
class Wordlist {
    private words: string[] = [];

    /**
     * Load wordlist (defaults to English BIP-39).
     */
    constructor(customWords?: string[]) {
        this.words = customWords || englishWords;
    }

    /**
     * Return iterator for words in list.
     */
    [Symbol.iterator](): Iterator<string> {
        return this.words[Symbol.iterator]();
    }

    /**
     * Get the number for a given word.
     */
    getNumber(word: string): number {
        const index = this.words.indexOf(word);
        if (index === -1) {
            throw new Error(`'${word}' is not in list`);
        }
        return index;
    }

    /**
     * Get the word for a given number.
     */
    getWord(number: number): string {
        if (number >= this.words.length || number < 0) {
            throw new Error("list index out of range");
        }
        return this.words[number];
    }

    /**
     * Check if word is in list.
     */
    contains(word: string): boolean {
        return this.words.includes(word);
    }

    /**
     * Get words in list up to edit distance.
     */
    getWords(word: string, distance: number = 0): string[] {
        let initialWords: string[] = [];

        if (this.words.includes(word)) {
            initialWords = [word];
        } else {
            let closest: number | null = null;
            for (const otherWord of this.words) {
                const otherDistance = editDistance(otherWord, word);
                if (closest === null || otherDistance < closest) {
                    closest = otherDistance;
                    initialWords = [otherWord];
                } else if (otherDistance === closest) {
                    initialWords.push(otherWord);
                }
            }
        }

        if (distance === 0) {
            return initialWords;
        }

        const resultWords: string[] = [];
        const addedWords = new Set<string>();

        for (const otherWord of this.words) {
            for (const initialWord of initialWords) {
                if (editDistance(otherWord, initialWord) <= distance) {
                    if (!addedWords.has(otherWord)) {
                        resultWords.push(otherWord);
                        addedWords.add(otherWord);
                    }
                    break;
                }
            }
        }

        return resultWords;
    }
}

export { Wordlist, editDistance };
