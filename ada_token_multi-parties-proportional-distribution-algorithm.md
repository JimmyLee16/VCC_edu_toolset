
# Multi-Sender Proportional Distribution Algorithm Design

## 📋 Table of Contents
1. [Problem Statement](#problem-statement)
2. [Current Issues](#current-issues)
3. [Algorithm Requirements](#algorithm-requirements)
4. [Design Principles](#design-principles)
5. [Algorithm: Target Token Proportional Distribution](#algorithm-target-token-proportional-distribution)
6. [Complex Scenario Example](#complex-scenario-example)
7. [Implementation Steps](#implementation-steps)
8. [Edge Cases & Error Handling](#edge-cases--error-handling)
9. [Performance Considerations](#performance-considerations)

---

## 🎯 Problem Statement

### Current Issues with Existing Implementation:
1. **Greedy Assignment:** All outputs assigned to sender with highest remaining ADA balance
2. **Token Imbalance:** Senders with high ADA but low tokens get assigned token-heavy recipients
3. **Non-Proportional:** 75%-25% ADA ratio becomes 100%-0% in practice
4. **Token Balance Errors:** Senders try to send more tokens than they own

### Example Failure Case:
```
Sender 1: 75% ADA (375M) but only 23% tokens (15/65)
Sender 2: 25% ADA (129M) but 77% tokens (50/65)

Current Result: All outputs assigned to Sender 1
Expected Result: Proportional distribution of both ADA and tokens
```

---

## 🎯 Algorithm Requirements

### Functional Requirements:
1. **True Proportional Distribution:** Maintain exact ADA ratios (75%-25%)
2. **Token-Aware:** Ensure senders have sufficient tokens for assigned outputs
3. **Target Token Focus:** Only consider tokens that need to be transferred
4. **Scalability:** Handle large numbers of senders, recipients, and token types
5. **Deterministic:** Same inputs produce same outputs

### Non-Functional Requirements:
1. **Minimal UTXO Creation:** Prefer fewer outputs for efficiency
2. **Logic Safety:** Simple, verifiable algorithm to minimize bugs
3. **Performance:** O(n × m) complexity where n=recipients, m=senders
4. **Error Handling:** Graceful handling of insufficient balances

---

## 🏗️ Design Principles

### 1. **Separation of Concerns**
- ADA distribution calculated independently
- Token distribution calculated independently  
- Results merged at the end

### 2. **Target Token Focus**
```typescript
// Only consider tokens that need to be transferred
const targetTokenTypes = new Set<string>();
for (const recipient of recipients) {
  for (const token of recipient.tokens) {
    targetTokenTypes.add(`${token.policyId}.${token.assetName}`);
  }
}
```

### 3. **Proportional Fairness**
- ADA: Based on ADA balance ratios
- Tokens: Based on target token availability ratios
- Remainders: Assigned to sender with highest remaining balance

---

## 🧮 Algorithm: Target Token Proportional Distribution

### Step 1: Calculate ADA Ratios
```typescript
const adaRatios = new Map<string, number>();
const totalInputAda = calculateTotalInputAda();

for (const sender of sendersArray) {
  const ratio = Number(sender.inputAda * 100n) / Number(totalInputAda);
  adaRatios.set(sender.id, ratio);
}
```

### Step 2: Calculate Target Token Supply
```typescript
// Step 2a: Identify target token types
const targetTokenTypes = new Set<string>();
for (const recipient of globalRecipients) {
  if (recipient.tokens) {
    for (const token of recipient.tokens) {
      const tokenKey = `${token.policyId}.${token.assetName}`;
      targetTokenTypes.add(tokenKey);
    }
  }
}

// Step 2b: Calculate total supply for target tokens only
const targetTokenSupply = new Map<string, bigint>();
for (const tokenKey of targetTokenTypes) {
  let totalSupply = 0n;
  for (const sender of sendersArray) {
    const bal = senderBalances.get(sender.id);
    const hasAmount = bal.inputTokens.get(tokenKey) || 0n;
    totalSupply += hasAmount;
  }
  targetTokenSupply.set(tokenKey, totalSupply);
}
```

### Step 3: Calculate Target Token Ratios
```typescript
const targetTokenRatios = new Map<string, Map<string, number>>();

for (const sender of sendersArray) {
  const senderTargetRatios = new Map<string, number>();
  const bal = senderBalances.get(sender.id);
  
  for (const tokenKey of targetTokenTypes) {
    const totalAmount = targetTokenSupply.get(tokenKey) || 0n;
    const senderHas = bal.inputTokens.get(tokenKey) || 0n;
    
    const ratio = totalAmount > 0n ? Number(senderHas * 100n) / Number(totalAmount) : 0;
    senderTargetRatios.set(tokenKey, ratio);
  }
  
  targetTokenRatios.set(sender.id, senderTargetRatios);
}
```

### Step 4: Distribute Outputs by Ratios
```typescript
for (const recipient of globalRecipients) {
  // ADA portion by ADA ratio
  const adaAmount = BigInt(recipient.amount);
  for (const sender of sendersArray) {
    const adaRatio = adaRatios.get(sender.id) || 0;
    const adaPortion = (adaAmount * BigInt(Math.floor(adaRatio))) / 100n;
    
    if (adaPortion > 0) {
      // Token portion by target token ratio
      const tokenPortions = new Map<string, bigint>();
      if (recipient.tokens) {
        for (const token of recipient.tokens) {
          const tokenKey = `${token.policyId}.${token.assetName}`;
          const tokenRatio = targetTokenRatios.get(sender.id)?.get(tokenKey) || 0;
          const tokenAmount = BigInt(token.amount);
          const tokenPortion = (tokenAmount * BigInt(Math.floor(tokenRatio))) / 100n;
          
          if (tokenPortion > 0) {
            tokenPortions.set(tokenKey, tokenPortion);
          }
        }
      }
      
      // Create output for this sender
      createOutput(sender.id, recipient.address, adaPortion, tokenPortions);
    }
  }
}
```

### Step 5: Handle Remainders
```typescript
// Distribute fractional remainders (< 1 ADA or < 1 token)
// to sender with highest remaining balance
distributeRemainders();
```

---

## 🎯 Complex Scenario Example

### Scenario: 5 Senders × 4 Recipients × 3 Token Types

#### Senders Data:
```typescript
const senders = [
  {
    id: 'sender_A',
    inputAda: 1000000000n, // 1000 ADA
    inputTokens: {
      'policyA.token1': 1000n,  // Target token 1
      'policyB.token2': 500n,   // Target token 2  
      'policyC.token3': 200n,   // Target token 3
      'policyX.other1': 10000n, // Other tokens (ignored)
      'policyY.other2': 5000n   // Other tokens (ignored)
    }
  },
  {
    id: 'sender_B', 
    inputAda: 500000000n, // 500 ADA
    inputTokens: {
      'policyA.token1': 300n,   // Target token 1
      'policyB.token2': 800n,   // Target token 2
      'policyC.token3': 600n,   // Target token 3
      'policyZ.other3': 2000n   // Other tokens (ignored)
    }
  },
  {
    id: 'sender_C',
    inputAda: 2000000000n, // 2000 ADA
    inputTokens: {
      'policyA.token1': 200n,   // Target token 1
      'policyB.token2': 100n,   // Target token 2
      'policyC.token3': 1200n,  // Target token 3
      'policyW.other4': 8000n   // Other tokens (ignored)
    }
  },
  {
    id: 'sender_D',
    inputAda: 800000000n, // 800 ADA  
    inputTokens: {
      'policyA.token1': 500n,   // Target token 1
      'policyB.token2': 200n,   // Target token 2
      'policyC.token3': 50n,    // Target token 3
      'policyV.other5': 3000n   // Other tokens (ignored)
    }
  },
  {
    id: 'sender_E',
    inputAda: 1500000000n, // 1500 ADA
    inputTokens: {
      'policyA.token1': 100n,   // Target token 1
      'policyB.token2': 400n,   // Target token 2  
      'policyC.token3': 300n,   // Target token 3
      'policyU.other6': 6000n   // Other tokens (ignored)
    }
  }
];
```

#### Recipients Data:
```typescript
const recipients = [
  {
    address: 'addr_test1...recipient1',
    amount: '500000000', // 500 ADA
    tokens: [
      { policyId: 'policyA', assetName: 'token1', amount: '800' },
      { policyId: 'policyB', assetName: 'token2', amount: '300' }
    ]
  },
  {
    address: 'addr_test1...recipient2', 
    amount: '1000000000', // 1000 ADA
    tokens: [
      { policyId: 'policyB', assetName: 'token2', amount: '600' },
      { policyId: 'policyC', assetName: 'token3', amount: '400' }
    ]
  },
  {
    address: 'addr_test1...recipient3',
    amount: '200000000', // 200 ADA  
    tokens: [
      { policyId: 'policyA', assetName: 'token1', amount: '200' },
      { policyId: 'policyC', assetName: 'token3', amount: '100' }
    ]
  },
  {
    address: 'addr_test1...recipient4',
    amount: '800000000', // 800 ADA
    tokens: [
      { policyId: 'policyA', assetName: 'token1', amount: '400' },
      { policyId: 'policyB', assetName: 'token2', amount: '500' },
      { policyId: 'policyC', assetName: 'token3', amount: '200' }
    ]
  }
];
```

#### Expected Calculations:

**Total Resources:**
- Total ADA: 5.8B (1000+500+2000+800+1500)
- Target Token 1: 2100 (1000+300+200+500+100)
- Target Token 2: 2000 (500+800+100+200+400)  
- Target Token 3: 2350 (200+600+1200+50+300)

**Total Requirements:**
- Total ADA needed: 2.5B (500+1000+200+800)
- Token 1 needed: 1400 (800+200+400)
- Token 2 needed: 1400 (300+600+500)
- Token 3 needed: 700 (400+100+200)

**Expected Ratios:**
- ADA Ratios: A:17%, B:9%, C:34%, D:14%, E:26%
- Token 1 Ratios: A:48%, B:14%, C:10%, D:24%, E:5%
- Token 2 Ratios: A:25%, B:40%, C:5%, D:10%, E:20%  
- Token 3 Ratios: A:9%, B:26%, C:51%, D:2%, E:13%

**Expected Distribution Results for Recipient 1 (500 ADA, 800 T1, 300 T2):**
```
- A: 85 ADA, 384 T1, 75 T2
- B: 45 ADA, 112 T1, 120 T2
- C: 170 ADA, 80 T1, 15 T2
- D: 70 ADA, 192 T1, 30 T2
- E: 130 ADA, 32 T1, 60 T2
```

---

## 🔧 Implementation Steps

### Phase 1: Core Algorithm
1. Replace current greedy assignment with proportional calculation
2. Implement target token identification
3. Calculate separate ADA and token ratios
4. Implement proportional distribution logic

### Phase 2: Validation & Testing
1. Add comprehensive logging for ratio calculations
2. Test with simple 2-sender scenario
3. Test with complex 5-sender scenario
4. Validate total input = total output + fee

### Phase 3: Edge Cases & Optimization
1. Handle insufficient token scenarios
2. Implement remainder distribution
3. Optimize for minimal UTXO creation
4. Add error recovery mechanisms

---

## ⚠️ Edge Cases & Error Handling

### 1. Insufficient Token Balance
```typescript
// If sender lacks tokens, reassign to next eligible sender
if (senderHas < tokenPortion) {
  // Find next sender with sufficient tokens
  const nextSender = findNextEligibleSender(tokenKey, tokenPortion);
  if (nextSender) {
    reassignTokenPortion(nextSender, tokenKey, tokenPortion);
  } else {
    throw new Error(`Insufficient ${tokenKey} across all senders`);
  }
}
```

### 2. Zero Amount Recipients
```typescript
// Skip recipients with zero ADA and no tokens
if (adaAmount === 0n && !hasTokens) {
  console.log(`⚠️ Skipping recipient ${recipient.address}: no ADA or tokens`);
  continue;
}
```

### 3. Fractional Remainders
```typescript
// Handle < 1 ADA or < 1 token remainders
const adaRemainder = totalAdaAmount - distributedAda;
if (adaRemainder > 0) {
  const richestSender = findSenderWithHighestRemainingBalance();
  assignRemainder(richestSender, adaRemainder);
}
```

### 4. Validation Checks
```typescript
// Final validation
const totalInput = calculateTotalInput();
const totalOutput = calculateTotalOutput();
const fee = calculateFee();

if (totalInput !== totalOutput + fee) {
  throw new Error(`Balance mismatch: input=${totalInput}, output=${totalOutput}, fee=${fee}`);
}
```

---

## 📊 Performance Considerations

### Time Complexity: O(n × m × t)
- n = number of recipients
- m = number of senders  
- t = number of target token types

### Space Complexity: O(m × t)
- Storage for sender balances
- Storage for token ratios
- Storage for distribution tracking

### Optimization Strategies:
1. **Early Filtering:** Skip recipients with zero amounts
2. **Batch Processing:** Process multiple recipients together
3. **Memoization:** Cache ratio calculations
4. **Parallel Processing:** Calculate ratios for different token types in parallel

---

## ✅ Success Criteria

### Functional Success:
1. ✅ Maintains exact ADA ratios (75%-25% becomes 75%-25%)
2. ✅ Ensures sufficient token balances for all assignments
3. ✅ Handles multiple token types correctly
4. ✅ Ignores non-target tokens in calculations

### Technical Success:
1. ✅ Zero balance mismatch errors
2. ✅ Deterministic behavior across runs
3. ✅ Handles edge cases gracefully
4. ✅ Scales to large numbers of senders/recipients

### Performance Success:
1. ✅ Completes in reasonable time for 100+ senders/recipients
2. ✅ Memory usage stays within acceptable limits
3. ✅ Minimal UTXO creation for blockchain efficiency

---

## 🚀 Conclusion

This algorithm provides a robust, fair, and scalable solution for multi-sender proportional distribution that:

- **Maintains True Proportions:** Both ADA and tokens distributed according to actual availability
- **Focuses on Target Tokens:** Ignores irrelevant token types for efficiency
- **Handles Complexity:** Works with large numbers of senders, recipients, and token types
- **Ensures Accuracy:** Validates balances and prevents transaction failures
- **Optimizes Performance:** Efficient algorithm with predictable complexity

## Source https://vietcardano.vercel.app/vi/blockchain-tools/tokentransfer

**Đây sẽ là tool mạnh nhất cho Cardano community!** 🚀
