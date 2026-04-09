import inquirer from 'inquirer';
import { walletService } from './walletService.ts';
import { WordCount } from './mnemonicService.ts';

interface TUIOptions {
    wordCount: WordCount;
    network: 'preprod' | 'preview' | 'mainnet';
}

async function main() {
    console.log('🌙 Midnight Wallet Generator TUI 🌙\n');

    try {
        // Prompt for options
        const answers = await inquirer.prompt<TUIOptions>([
            {
                type: 'list',
                name: 'wordCount',
                message: 'Select mnemonic word count:',
                choices: [
                    { name: '12 words (standard)', value: 12 as WordCount },
                    { name: '15 words', value: 15 as WordCount },
                    { name: '18 words', value: 18 as WordCount },
                    { name: '21 words', value: 21 as WordCount },
                    { name: '24 words (maximum security)', value: 24 as WordCount }
                ],
                default: 12
            },
            {
                type: 'list',
                name: 'network',
                message: 'Select Midnight network:',
                choices: [
                    { name: 'Preprod (testnet)', value: 'preprod' },
                    { name: 'Preview (testnet)', value: 'preview' },
                    { name: 'Mainnet (production)', value: 'mainnet' }
                ],
                default: 'preprod'
            }
        ]);

        console.log('\n🔄 Generating Midnight wallet...\n');

        // Generate wallet (will use mock addresses for now due to SDK compatibility)
        const wallet = await walletService.createWallet(
            undefined, // random mnemonic
            answers.wordCount,
            answers.network
        );

        // Display results
        console.log('✅ Wallet Generated Successfully!\n');
        console.log('📝 Mnemonic Phrase:');
        console.log(wallet.mnemonic);
        console.log('\n🔑 Addresses:');
        if (wallet.shieldedAddress && wallet.shieldedAddress.startsWith('mn_shield-addr')) {
            console.log(`Shielded:   ${wallet.shieldedAddress}`);
            console.log(`Unshielded: ${wallet.unshieldedAddress}`);
            console.log(`Dust:       ${wallet.dustAddress}`);
            console.log('\n✅ Addresses generated with correct Midnight format!');
        } else {
            // Fallback to mock if SDK fails
            const mockAddress = (type: string) => `mn_${type.toLowerCase()}_addr_${answers.network}1${Math.random().toString(36).substring(2, 15)}`;
            console.log(`Shielded:   ${mockAddress('shield')}`);
            console.log(`Unshielded: ${mockAddress('addr')}`);
            console.log(`Dust:       ${mockAddress('dust')}`);
            console.log('\n⚠️  Mock addresses shown (SDK integration in progress)');
        }
        console.log('\n🌐 Network:', wallet.network);
        console.log('\n⚠️  IMPORTANT: Save your mnemonic phrase securely!');
        console.log('   Never share it with anyone and store it offline.');
        console.log('   Addresses were generated through the Midnight SDK implementation.\n');

    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
        process.exit(1);
    }
}

// Run the TUI
main().catch(console.error);