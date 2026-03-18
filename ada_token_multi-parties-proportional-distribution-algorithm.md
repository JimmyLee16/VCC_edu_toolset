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

## 🏗️ API Design & Strategy Architecture

### 🎯 Problem Statement
UI hiện tại có 4 assignment strategies + 4 fee distribution strategies, nhưng API chỉ implement proportional. Cần flexible design để support tất cả strategies mà không gây conflict.

### 📋 Available Strategies

#### Assignment Strategies (4 types):
```typescript
export type AssignmentStrategy = 'proportional' | 'round_robin' | 'capacity_based' | 'manual';
```

1. **🔄 Proportional** - Phân bổ theo tỷ lệ ADA/tokens (✅ Implemented)
2. **🔄 Round Robin** - Phân bổ luân phiên qua senders
3. **💰 Capacity Based** - Dựa trên capacity của mỗi sender
4. **👤 Manual** - Gán thủ công recipient cho sender cụ thể

#### Fee Distribution Strategies (4 types):
```typescript
export type FeeDistributionStrategy = 'proportional' | 'equal' | 'largest_sender' | 'custom';
```

1. **🔄 Proportional** - Fee chia theo tỷ lệ contribution
2. **⚖️ Equal** - Fee chia đều cho tất cả senders
3. **🏆 Largest Sender** - Sender lớn nhất trả toàn bộ fee
4. **🎛️ Custom** - Custom fee distribution

### 🔧 API Structure Design

#### Single Endpoint - Strategy-Based Routing
```typescript
// POST /api/cardano/multi-sender/execute
{
  "batchConfig": {
    "senders": [...],
    "recipients": [...],
    "network": "preview"
  },
  "strategies": {
    "assignment": "proportional", // | "round_robin" | "capacity_based" | "manual"
    "feeDistribution": "proportional" // | "equal" | "largest_sender" | "custom"
  },
  "options": {
    "dryRun": false, // preview mode
    "validateOnly": false
  }
}
```

#### Strategy Factory Pattern
```typescript
// route.ts - Main orchestrator
async function buildBatchTransaction(params: MultiSenderRequest) {
  const { batchConfig, strategies, options } = params;
  
  // Strategy selection
  const assignmentEngine = AssignmentEngineFactory.create(strategies.assignment);
  const feeCalculator = FeeCalculatorFactory.create(strategies.feeDistribution);
  
  // Execute with selected strategies
  return await executeWithStrategies(batchConfig, assignmentEngine, feeCalculator);
}
```

### 🏭 Modular Strategy Classes

#### Assignment Strategies Implementation
```typescript
// strategies/AssignmentStrategies.ts
export class ProportionalAssignment implements AssignmentStrategy {
  calculate(balances, requirements) {
    // ✅ Current implementation - Target Token Proportional Distribution
    // Steps: ADA Ratios → Target Token Supply → Target Token Ratios → Distribution
  }
}

export class RoundRobinAssignment implements AssignmentStrategy {
  calculate(balances, requirements) {
    const assignments = [];
    let senderIndex = 0;
    
    for (const recipient of requirements.recipients) {
      const sender = balances.senders[senderIndex % balances.senders.length];
      assignments.push({ recipientId: recipient.id, senderId: sender.id });
      senderIndex++;
    }
    
    return assignments;
  }
}

export class CapacityBasedAssignment implements AssignmentStrategy {
  calculate(balances, requirements) {
    // Sort by capacity, assign greedily
    const sortedSenders = [...balances.senders].sort((a, b) => 
      Number(b.capacity - a.capacity)
    );
    
    return this.assignByCapacity(sortedSenders, requirements.recipients);
  }
}

export class ManualAssignment implements AssignmentStrategy {
  calculate(balances, requirements) {
    // Use pre-assigned senderId from recipient.assignedSenderId
    return requirements.recipients.map(r => ({
      recipientId: r.id,
      senderId: r.assignedSenderId
    }));
  }
}
```

#### Fee Distribution Strategies Implementation
```typescript
// strategies/FeeStrategies.ts
export class ProportionalFee implements FeeStrategy {
  distribute(totalFee, senderContributions) {
    // Current proportional logic - based on contribution ratios
  }
}

export class EqualFee implements FeeStrategy {
  distribute(totalFee, senderContributions) {
    const feePerSender = totalFee / BigInt(senderContributions.length);
    return senderContributions.map(() => feePerSender);
  }
}

export class LargestSenderFee implements FeeStrategy {
  distribute(totalFee, senderContributions) {
    // Find largest sender, assign all fee
    const largestIndex = senderContributions.indexOf(Math.max(...senderContributions));
    return senderContributions.map((_, index) => 
      index === largestIndex ? totalFee : BigInt(0)
    );
  }
}

export class CustomFee implements FeeStrategy {
  distribute(totalFee, senderContributions, customRatios) {
    // Custom ratios from user input
    return senderContributions.map((_, index) => 
      (totalFee * BigInt(customRatios[index])) / BigInt(100)
    );
  }
}
```

### 🏭 Factory Pattern Implementation
```typescript
// factories/StrategyFactory.ts
export class AssignmentEngineFactory {
  static create(strategy: string): AssignmentStrategy {
    switch (strategy) {
      case 'proportional':
        return new ProportionalAssignment();
      case 'round_robin':
        return new RoundRobinAssignment();
      case 'capacity_based':
        return new CapacityBasedAssignment();
      case 'manual':
        return new ManualAssignment();
      default:
        throw new Error(`Unknown assignment strategy: ${strategy}`);
    }
  }
}

export class FeeCalculatorFactory {
  static create(strategy: string): FeeStrategy {
    switch (strategy) {
      case 'proportional':
        return new ProportionalFee();
      case 'equal':
        return new EqualFee();
      case 'largest_sender':
        return new LargestSenderFee();
      case 'custom':
        return new CustomFee();
      default:
        throw new Error(`Unknown fee strategy: ${strategy}`);
    }
  }
}
```

### 🔄 Updated Main Orchestrator
```typescript
// route.ts - Clean main orchestrator
async function buildBatchTransaction(params: MultiSenderRequest) {
  const { batchConfig, strategies, options } = params;
  
  // 1. Initialize strategies
  const assignmentEngine = AssignmentEngineFactory.create(strategies.assignment);
  const feeCalculator = FeeCalculatorFactory.create(strategies.feeDistribution);
  
  // 2. Process inputs (same for all strategies)
  const senderBalances = await processInputs(batchConfig.senders);
  
  // 3. Calculate assignments using selected strategy
  const assignments = assignmentEngine.calculate(senderBalances, batchConfig.recipients);
  
  // 4. Build outputs based on assignments
  const outputs = buildOutputsFromAssignments(assignments, batchConfig.recipients);
  
  // 5. Calculate and distribute fees
  const feeBreakdown = feeCalculator.distribute(calculatedFee, getSenderContributions(senderBalances));
  
  // 6. Build final transaction
  return buildFinalTransaction(outputs, feeBreakdown, senderBalances);
}
```

### 📊 Benefits of This Design

#### ✅ Conflict Prevention:
1. **Isolated Strategies:** Mỗi strategy trong class riêng biệt
2. **Factory Pattern:** Clean strategy selection với validation
3. **Single Entry Point:** One API endpoint, multiple behaviors
4. **Type Safety:** Compile-time strategy validation

#### 🚀 Extensibility:
1. **Easy to Add New Strategies:** Implement interface và add to factory
2. **Backward Compatible:** Existing API calls still work
3. **Testable:** Each strategy có thể unit test riêng
4. **Maintainable:** Clear separation of concerns

#### 🔒 Safety:
1. **Validation:** Factory throws error cho unknown strategies
2. **Consistency:** Same input/output format cho tất cả strategies
3. **Error Handling:** Strategy-specific error handling

### 🎯 Migration Path

#### Phase 1: Refactor Current Code
- [ ] Move current proportional logic to ProportionalAssignment class
- [ ] Keep same API endpoint structure
- [ ] Add factory pattern infrastructure

#### Phase 2: Add Missing Strategies
- [ ] Implement RoundRobin assignment
- [ ] Implement CapacityBased assignment  
- [ ] Implement Manual assignment
- [ ] Implement all fee distribution strategies
- [ ] Add comprehensive testing

#### Phase 3: Advanced Features
- [ ] Add dry-run mode cho preview
- [ ] Add validation-only mode
- [ ] Add custom fee distribution UI
- [ ] Add strategy performance metrics

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

## 🏗️ Complete Strategy Architecture Design

### 🎯 Architecture Overview

Với 4 assignment strategies + 4 fee distribution strategies, tôi thiết kế conflict-free architecture như sau:

### 📋 Strategy Interface Definitions

#### Assignment Strategy Interface
```typescript
interface AssignmentStrategy {
  calculate(balances: SenderBalances, requirements: RecipientRequirements): Assignment[];
  validate(balances: SenderBalances, assignments: Assignment[]): ValidationResult;
  getDescription(): string;
}

interface Assignment {
  recipientId: string;
  senderId: string;
  adaAmount: bigint;
  tokens: TokenAmount[];
}
```

#### Fee Strategy Interface
```typescript
interface FeeStrategy {
  distribute(totalFee: bigint, contributions: Map<string, bigint>): Map<string, bigint>;
  validate(feeDistribution: Map<string, bigint>): ValidationResult;
  getDescription(): string;
}
```

### 🏭 Factory Pattern Implementation
```typescript
// AssignmentEngineFactory
export class AssignmentEngineFactory {
  static create(strategy: string): AssignmentStrategy {
    switch (strategy) {
      case 'proportional': return new ProportionalAssignment();
      case 'round_robin': return new RoundRobinAssignment();
      case 'capacity_based': return new CapacityBasedAssignment();
      case 'manual': return new ManualAssignment();
      default: throw new Error(`Unknown assignment strategy: ${strategy}`);
    }
  }
}

// FeeCalculatorFactory  
export class FeeCalculatorFactory {
  static create(strategy: string): FeeStrategy {
    switch (strategy) {
      case 'proportional': return new ProportionalFee();
      case 'equal': return new EqualFee();
      case 'largest_sender': return new LargestSenderFee();
      case 'custom': return new CustomFee();
      default: throw new Error(`Unknown fee strategy: ${strategy}`);
    }
  }
}
```

### 🔄 Updated Main Orchestrator
```typescript
// route.ts - Clean, strategy-agnostic main function
async function buildBatchTransaction(params: MultiSenderRequest) {
  const { batchConfig, strategies, options } = params;
  
  // 1. Initialize strategies via factories
  const assignmentEngine = AssignmentEngineFactory.create(strategies.assignment);
  const feeCalculator = FeeCalculatorFactory.create(strategies.feeDistribution);
  
  // 2. Process inputs (same for all strategies)
  const senderBalances = await processInputs(batchConfig.senders);
  
  // 3. Calculate assignments using selected strategy
  const assignments = assignmentEngine.calculate(senderBalances, {
    recipients: batchConfig.recipients
  });
  
  // 4. Build outputs based on assignments
  const outputs = buildOutputsFromAssignments(assignments, batchConfig.recipients);
  
  // 5. Calculate and distribute fees using selected strategy
  const contributions = calculateSenderContributions(senderBalances, assignments);
  const feeBreakdown = feeCalculator.distribute(calculatedFee, contributions);
  
  // 6. Build final transaction with fee distribution
  return buildFinalTransaction(outputs, feeBreakdown, senderBalances);
}
```

### 📊 Benefits of This Architecture

#### ✅ Conflict Prevention
1. **Strategy Isolation** - Mỗi strategy độc lập, không ảnh hưởng lẫn nhau
2. **Factory Pattern** - Clean selection, runtime validation
3. **Single Entry Point** - Một API endpoint, multiple behaviors
4. **Type Safety** - Compile-time validation cho strategies

#### 🚀 Extensibility
1. **Easy to Add** - Implement interface, add to factory
2. **Backward Compatible** - Existing calls vẫn work
3. **Testable** - Unit test từng strategy riêng
4. **Maintainable** - Clear separation of concerns

### 📋 Implementation Roadmap

#### Phase 1: Refactor Current Code ✅
- Move current proportional logic vào `ProportionalAssignment` class
- Add factory pattern infrastructure
- Keep same API endpoint

#### Phase 2: Implement Missing Strategies
- Add `RoundRobinAssignment` implementation
- Add `CapacityBasedAssignment` implementation  
- Add `ManualAssignment` implementation
- Implement fee distribution strategies
- Add comprehensive unit tests

#### Phase 3: Advanced Features
- Add dry-run mode for preview
- Add validation-only mode
- Add custom fee distribution UI
- Add strategy performance metrics

---

## � Transaction Building Process Per Strategy

### 🎯 Overview

Mỗi chiến lược có transaction building process riêng biệt để đảm bảo optimal UTXO usage và correct balance tracking.

### 📋 Common Transaction Building Steps

#### Base Process (Applies to All Strategies)
```typescript
// 1. Initialize Transaction Builder
const txBuilder = CSL.TransactionBuilder.new(
  CSL.LinearFee.new(),
  CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
  CSL.BigNum.from_str(protocolParams.min_fee_b.toString()),
  CSL.BigNum.from_str(protocolParams.max_tx_size.toString())
);

// 2. Add All Inputs (Same for all strategies)
for (const sender of senders) {
  for (const utxo of sender.utxos) {
    const txInput = CSL.TransactionInput.new(
      CSL.TransactionHash.from_hex(utxo.txHash),
      utxo.outputIndex
    );
    
    const inputValue = CSL.Value.new(CSL.BigNum.from_str(utxo.amount));
    
    // Add multi-assets if present
    if (utxo.assets) {
      const multiAsset = CSL.MultiAsset.new();
      for (const asset of utxo.assets) {
        const policyId = CSL.ScriptHash.from_hex(asset.policyId);
        const assetName = CSL.AssetName.new(Buffer.from(asset.assetName, 'hex'));
        const assets = CSL.Assets.new();
        assets.insert(assetName, CSL.BigNum.from_str(asset.amount));
        multiAsset.insert(policyId, assets);
      }
      inputValue.set_multiasset(multiAsset);
    }
    
    const senderAddress = CSL.Address.from_bech32(sender.address);
    txBuilder.add_regular_input(senderAddress, txInput, inputValue);
  }
}

// 3. Build Outputs (Strategy-specific)
const outputs = strategy.buildOutputs(assignments, recipients);

// 4. Add Outputs to Transaction
for (const output of outputs) {
  const outputValue = CSL.Value.new(CSL.BigNum.from_str(output.adaAmount));
  
  if (output.tokens && output.tokens.length > 0) {
    const multiAsset = CSL.MultiAsset.new();
    for (const token of output.tokens) {
      const policyId = CSL.ScriptHash.from_hex(token.policyId);
      const assetName = CSL.AssetName.new(Buffer.from(token.assetName, 'hex'));
      const assets = CSL.Assets.new();
      assets.insert(assetName, CSL.BigNum.from_str(token.amount));
      multiAsset.insert(policyId, assets);
    }
    outputValue.set_multiasset(multiAsset);
  }
  
  const recipientAddress = CSL.Address.from_bech32(output.address);
  const txOutput = CSL.TransactionOutput.new(recipientAddress, outputValue);
  txBuilder.add_output(txOutput);
}

// 5. Calculate and Add Fee
const calculatedFee = txBuilder.min_fee();
txBuilder.set_fee(calculatedFee);

// 6. Build Change Outputs (Strategy-specific)
const changeOutputs = strategy.buildChangeOutputs(senderBalances, calculatedFee);
for (const change of changeOutputs) {
  // Add change outputs to transaction
}

// 7. Build Final Transaction
const transaction = txBuilder.build();
```

### 🔄 Proportional Strategy Transaction Building

#### Output Creation Process
```typescript
class ProportionalTransactionBuilder {
  buildOutputs(assignments: Assignment[], recipients: Recipient[]): TransactionOutput[] {
    const outputs = [];
    
    for (const recipient of recipients) {
      // Get all assignments for this recipient
      const recipientAssignments = assignments.filter(a => a.recipientId === recipient.id);
      
      // Create multiple outputs per recipient (one per sender)
      for (const assignment of recipientAssignments) {
        // Auto-add minimum ADA for token-only transfers
        let adaAmount = assignment.adaAmount;
        if (adaAmount === 0n && assignment.tokens.length > 0) {
          adaAmount = BigInt(1400000); // 1.4 ADA minimum
        }
        
        outputs.push({
          address: recipient.address,
          adaAmount: adaAmount.toString(),
          tokens: assignment.tokens.map(token => ({
            policyId: token.policyId.toLowerCase(),
            assetName: token.assetName.toLowerCase(),
            amount: token.amount.toString()
          })),
          senderId: assignment.senderId,
          recipientId: recipient.id
        });
      }
    }
    
    return outputs;
  }
  
  buildChangeOutputs(
    senderBalances: Map<string, SenderBalance>, 
    feeDistribution: Map<string, bigint>
  ): TransactionOutput[] {
    const changeOutputs = [];
    
    for (const [senderId, balance] of senderBalances.entries()) {
      const remainingAda = balance.inputAda - balance.outputAda - (feeDistribution.get(senderId) || 0n);
      const remainingTokens = this.calculateRemainingTokens(balance);
      
      // Only create change if there's something to return
      if (remainingAda > 0n || remainingTokens.size > 0) {
        const changeOutput = {
          address: balance.address,
          adaAmount: remainingAda.toString(),
          tokens: Array.from(remainingTokens.entries()).map(([key, amount]) => {
            const [policyId, assetName] = key.split('.');
            return {
              policyId: policyId.toLowerCase(),
              assetName: assetName.toLowerCase(),
              amount: amount.toString()
            };
          }),
          isChange: true,
          senderId: senderId
        };
        
        // Ensure minimum ADA for change with tokens
        if (remainingAda < BigInt(1400000) && remainingTokens.size > 0) {
          changeOutput.adaAmount = BigInt(1400000).toString();
        }
        
        changeOutputs.push(changeOutput);
      }
    }
    
    return changeOutputs;
  }
  
  private calculateRemainingTokens(balance: SenderBalance): Map<string, bigint> {
    const remainingTokens = new Map<string, bigint>();
    
    for (const [tokenKey, inputAmount] of balance.inputTokens.entries()) {
      const outputAmount = balance.outputTokens.get(tokenKey) || 0n;
      const remaining = inputAmount - outputAmount;
      
      if (remaining > 0n) {
        remainingTokens.set(tokenKey, remaining);
      }
    }
    
    return remainingTokens;
  }
}
```

#### UTXO Optimization
```typescript
// Proportional strategy creates:
// - Multiple recipient outputs (one per sender assignment)
// - Single change output per sender
// - Optimal UTXO count: recipients × senders + senders

// Example: 2 recipients, 2 senders = 4 recipient outputs + 2 change outputs = 6 UTXOs
```

### 🔄 Round Robin Strategy Transaction Building

#### Output Creation Process
```typescript
class RoundRobinTransactionBuilder {
  buildOutputs(assignments: Assignment[], recipients: Recipient[]): TransactionOutput[] {
    const outputs = [];
    
    for (const recipient of recipients) {
      // Round robin assigns each recipient to exactly one sender
      const assignment = assignments.find(a => a.recipientId === recipient.id);
      
      if (!assignment) {
        throw new Error(`No assignment found for recipient ${recipient.id}`);
      }
      
      // Create single output per recipient (not multiple like proportional)
      let adaAmount = assignment.adaAmount;
      if (adaAmount === 0n && assignment.tokens.length > 0) {
        adaAmount = BigInt(1400000);
      }
      
      outputs.push({
        address: recipient.address,
        adaAmount: adaAmount.toString(),
        tokens: assignment.tokens.map(token => ({
          policyId: token.policyId.toLowerCase(),
          assetName: token.assetName.toLowerCase(),
          amount: token.amount.toString()
        })),
        senderId: assignment.senderId,
        recipientId: recipient.id
      });
    }
    
    return outputs;
  }
  
  buildChangeOutputs(
    senderBalances: Map<string, SenderBalance>, 
    feeDistribution: Map<string, bigint>
  ): TransactionOutput[] {
    // Similar to proportional but simpler
    // Each sender has at most one recipient assignment
    const changeOutputs = [];
    
    for (const [senderId, balance] of senderBalances.entries()) {
      const feeShare = feeDistribution.get(senderId) || 0n;
      const remainingAda = balance.inputAda - balance.outputAda - feeShare;
      const remainingTokens = this.calculateRemainingTokens(balance);
      
      if (remainingAda > 0n || remainingTokens.size > 0) {
        changeOutputs.push({
          address: balance.address,
          adaAmount: remainingAda.toString(),
          tokens: Array.from(remainingTokens.entries()).map(([key, amount]) => {
            const [policyId, assetName] = key.split('.');
            return {
              policyId: policyId.toLowerCase(),
              assetName: assetName.toLowerCase(),
              amount: amount.toString()
            };
          }),
          isChange: true,
          senderId: senderId
        });
      }
    }
    
    return changeOutputs;
  }
}
```

#### UTXO Optimization
```typescript
// Round robin creates:
// - Single recipient output per recipient (not multiple)
// - Change output per sender
// - Optimal UTXO count: recipients + senders

// Example: 2 recipients, 2 senders = 2 recipient outputs + 2 change outputs = 4 UTXOs
// More efficient than proportional for simple cases
```

### 💰 Capacity Based Strategy Transaction Building

#### Output Creation Process
```typescript
class CapacityBasedTransactionBuilder {
  buildOutputs(assignments: Assignment[], recipients: Recipient[]): TransactionOutput[] {
    const outputs = [];
    
    // Similar to round robin - one output per recipient
    for (const recipient of recipients) {
      const assignment = assignments.find(a => a.recipientId === recipient.id);
      
      if (!assignment) {
        throw new Error(`No assignment found for recipient ${recipient.id}`);
      }
      
      let adaAmount = assignment.adaAmount;
      if (adaAmount === 0n && assignment.tokens.length > 0) {
        adaAmount = BigInt(1400000);
      }
      
      outputs.push({
        address: recipient.address,
        adaAmount: adaAmount.toString(),
        tokens: assignment.tokens.map(token => ({
          policyId: token.policyId.toLowerCase(),
          assetName: token.assetName.toLowerCase(),
          amount: token.amount.toString()
        })),
        senderId: assignment.senderId,
        recipientId: recipient.id
      });
    }
    
    return outputs;
  }
  
  buildChangeOutputs(
    senderBalances: Map<string, SenderBalance>, 
    feeDistribution: Map<string, bigint>
  ): TransactionOutput[] {
    // Capacity based may have uneven usage
    // Some senders might be unused, others heavily used
    const changeOutputs = [];
    
    for (const [senderId, balance] of senderBalances.entries()) {
      const feeShare = feeDistribution.get(senderId) || 0n;
      const remainingAda = balance.inputAda - balance.outputAda - feeShare;
      const remainingTokens = this.calculateRemainingTokens(balance);
      
      if (remainingAda > 0n || remainingTokens.size > 0) {
        changeOutputs.push({
          address: balance.address,
          adaAmount: remainingAda.toString(),
          tokens: Array.from(remainingTokens.entries()).map(([key, amount]) => {
            const [policyId, assetName] = key.split('.');
            return {
              policyId: policyId.toLowerCase(),
              assetName: assetName.toLowerCase(),
              amount: amount.toString()
            };
          }),
          isChange: true,
          senderId: senderId
        });
      }
    }
    
    return changeOutputs;
  }
}
```

#### UTXO Optimization
```typescript
// Capacity based creates:
// - Single recipient output per recipient (like round robin)
// - Change only for used senders
// - Variable UTXO count based on assignment efficiency

// Example: 2 recipients, 2 senders (1 used heavily, 1 unused)
// = 2 recipient outputs + 1 change output = 3 UTXOs
// Most efficient when some senders are unused
```

### 👤 Manual Strategy Transaction Building

#### Output Creation Process
```typescript
class ManualTransactionBuilder {
  buildOutputs(assignments: Assignment[], recipients: Recipient[]): TransactionOutput[] {
    const outputs = [];
    
    // Manual assignments are pre-defined by user
    for (const recipient of recipients) {
      const assignment = assignments.find(a => a.recipientId === recipient.id);
      
      if (!assignment) {
        throw new Error(`No manual assignment found for recipient ${recipient.id}`);
      }
      
      // Validate manual assignment is possible
      this.validateManualAssignment(assignment);
      
      let adaAmount = assignment.adaAmount;
      if (adaAmount === 0n && assignment.tokens.length > 0) {
        adaAmount = BigInt(1400000);
      }
      
      outputs.push({
        address: recipient.address,
        adaAmount: adaAmount.toString(),
        tokens: assignment.tokens.map(token => ({
          policyId: token.policyId.toLowerCase(),
          assetName: token.assetName.toLowerCase(),
          amount: token.amount.toString()
        })),
        senderId: assignment.senderId,
        recipientId: recipient.id
      });
    }
    
    return outputs;
  }
  
  private validateManualAssignment(assignment: Assignment): void {
    // Additional validation for manual assignments
    if (assignment.adaAmount < 0n) {
      throw new Error(`Manual assignment has negative ADA: ${assignment.adaAmount}`);
    }
    
    for (const token of assignment.tokens) {
      if (BigInt(token.amount) <= 0n) {
        throw new Error(`Manual assignment has invalid token amount: ${token.amount}`);
      }
    }
  }
  
  buildChangeOutputs(
    senderBalances: Map<string, SenderBalance>, 
    feeDistribution: Map<string, bigint>
  ): TransactionOutput[] {
    // Manual may have very uneven usage
    const changeOutputs = [];
    
    for (const [senderId, balance] of senderBalances.entries()) {
      const feeShare = feeDistribution.get(senderId) || 0n;
      const remainingAda = balance.inputAda - balance.outputAda - feeShare;
      const remainingTokens = this.calculateRemainingTokens(balance);
      
      if (remainingAda > 0n || remainingTokens.size > 0) {
        changeOutputs.push({
          address: balance.address,
          adaAmount: remainingAda.toString(),
          tokens: Array.from(remainingTokens.entries()).map(([key, amount]) => {
            const [policyId, assetName] = key.split('.');
            return {
              policyId: policyId.toLowerCase(),
              assetName: assetName.toLowerCase(),
              amount: amount.toString()
            };
          }),
          isChange: true,
          senderId: senderId
        });
      }
    }
    
    return changeOutputs;
  }
}
```

#### UTXO Optimization
```typescript
// Manual creates:
// - Output per manual assignment
// - Change only for used senders
// - Most predictable UTXO count

// Depends entirely on user's manual assignments
// Can be most efficient if user optimizes manually
```

### 📊 UTXO Efficiency Comparison

| Strategy | Recipient Outputs | Change Outputs | Total UTXOs | Best For |
|-----------|------------------|----------------|--------------|-----------|
| Proportional | recipients × senders | senders | (r × s) + s | Fair distribution |
| Round Robin | recipients | used senders | r + used | Simple cases |
| Capacity Based | recipients | used senders | r + used | Uneven capacity |
| Manual | recipients | used senders | r + used | User control |

### 🔧 Fee Distribution Integration

#### Per-Strategy Fee Handling
```typescript
// Fee distribution applied after output creation
class FeeDistributor {
  distributeFees(
    strategy: FeeStrategy,
    totalFee: bigint,
    senderContributions: Map<string, bigint>
  ): Map<string, bigint> {
    return strategy.distribute(totalFee, senderContributions);
  }
  
  applyFeesToChangeOutputs(
    changeOutputs: TransactionOutput[],
    feeDistribution: Map<string, bigint>
  ): TransactionOutput[] {
    return changeOutputs.map(change => {
      const senderId = change.senderId;
      const feeAmount = feeDistribution.get(senderId) || 0n;
      
      // Subtract fee from change ADA
      const currentAda = BigInt(change.adaAmount);
      const adaAfterFee = currentAda - feeAmount;
      
      // Ensure minimum ADA after fee
      const finalAda = adaAfterFee < BigInt(1400000) && change.tokens.length > 0
        ? BigInt(1400000)
        : adaAfterFee;
      
      return {
        ...change,
        adaAmount: finalAda.toString(),
        feeDeducted: feeAmount.toString()
      };
    });
  }
}
```

### 🎯 Transaction Finalization

#### Common Finalization Steps
```typescript
class TransactionFinalizer {
  finalizeTransaction(
    txBuilder: CSL.TransactionBuilder,
    outputs: TransactionOutput[],
    changeOutputs: TransactionOutput[],
    feeDistribution: Map<string, bigint>
  ): CSL.Transaction {
    // Add all outputs
    for (const output of outputs) {
      this.addOutputToBuilder(txBuilder, output);
    }
    
    // Add change outputs with fee deduction
    const finalChangeOutputs = this.applyFeesToChange(changeOutputs, feeDistribution);
    for (const change of finalChangeOutputs) {
      this.addOutputToBuilder(txBuilder, change);
    }
    
    // Calculate final fee
    const calculatedFee = txBuilder.min_fee();
    txBuilder.set_fee(calculatedFee);
    
    // Build and return
    return txBuilder.build();
  }
  
  private addOutputToBuilder(txBuilder: CSL.TransactionBuilder, output: TransactionOutput): void {
    const outputValue = CSL.Value.new(CSL.BigNum.from_str(output.adaAmount));
    
    if (output.tokens && output.tokens.length > 0) {
      const multiAsset = CSL.MultiAsset.new();
      for (const token of output.tokens) {
        const policyId = CSL.ScriptHash.from_hex(token.policyId);
        const assetName = CSL.AssetName.new(Buffer.from(token.assetName, 'hex'));
        const assets = CSL.Assets.new();
        assets.insert(assetName, CSL.BigNum.from_str(token.amount));
        multiAsset.insert(policyId, assets);
      }
      outputValue.set_multiasset(multiAsset);
    }
    
    const recipientAddress = CSL.Address.from_bech32(output.address);
    const txOutput = CSL.TransactionOutput.new(recipientAddress, outputValue);
    txBuilder.add_output(txOutput);
  }
}
```

### 📈 Performance Characteristics

#### Time Complexity Analysis
```typescript
// Per-strategy time complexity:
// Proportional: O(n × m × t) - n=recipients, m=senders, t=tokenTypes
// Round Robin: O(n + m) - linear time
// Capacity Based: O(n log n + m log m) - sorting + assignment
// Manual: O(n) - direct assignments

// Space complexity: O(n × m) for all strategies
```

#### Memory Usage Patterns
```typescript
// Memory optimization per strategy:
// Proportional: Highest - stores all assignment combinations
// Round Robin: Medium - simple rotation
// Capacity Based: Medium - sorting + greedy assignment
// Manual: Lowest - direct lookup
```

---

## �🚀 Conclusion

This algorithm provides a robust, fair, and scalable solution for multi-sender proportional distribution that:

- **Maintains True Proportions:** Both ADA and tokens distributed according to actual availability
- **Focuses on Target Tokens:** Ignores irrelevant token types for efficiency
- **Handles Complexity:** Works with large numbers of senders, recipients, and token types
- **Ensures Accuracy:** Validates balances and prevents transaction failures
- **Optimizes Performance:** Efficient algorithm with predictable complexity

**Đây sẽ là tool mạnh nhất cho Cardano community!** 🚀
