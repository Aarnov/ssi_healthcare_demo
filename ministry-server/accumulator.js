import fs from 'fs';

const STATE_FILE = 'accumulator_state.json';
const N = BigInt("10000000000000000000000000000011600000000000000000000000000002739"); 
const G = BigInt("2");
const PHI_N = BigInt("10000000000000000000000000000011400000000000000000000000000002624");

let state = {
    currentEpoch: 1,
    accumulatorValue: G.toString(),
    primeMap: {},
    lastPrimeUsed: "13",
    revokedSet: [],
    historyLog: []
};

if (fs.existsSync(STATE_FILE)) {
    state = JSON.parse(fs.readFileSync(STATE_FILE));
    if (!state.currentEpoch) state.currentEpoch = 1;
    if (!state.revokedSet) state.revokedSet = [];
    if (!state.historyLog) state.historyLog = [];
} else {
    saveState();
}

function saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function power(base, exp, mod) {
    let res = 1n;
    base = base % mod;
    while (exp > 0n) {
        if (exp % 2n === 1n) res = (res * base) % mod;
        base = (base * base) % mod;
        exp = exp / 2n;
    }
    return res;
}

function gcde(a, b) {
    if (a === 0n) return [b, 0n, 1n];
    let [g, x1, y1] = gcde(b % a, a);
    let x = y1 - (b / a) * x1;
    let y = x1;
    return [g, x, y];
}

export const TrustEngine = {
    add: (did) => {
        let currentAcc = BigInt(state.accumulatorValue);
        if (state.primeMap[did]) return { root: currentAcc.toString(), prime: state.primeMap[did] };
        
        state.currentEpoch++;
        const p = BigInt(state.lastPrimeUsed) + 2n; 
        currentAcc = power(currentAcc, p, N);
        
        state.accumulatorValue = currentAcc.toString();
        state.primeMap[did] = p.toString();
        state.lastPrimeUsed = p.toString();
        
        state.historyLog.push({
            epoch: state.currentEpoch,
            type: 'ADD',
            did: did,
            prime: p.toString()
        });

        saveState();
        return { root: state.accumulatorValue, prime: state.primeMap[did] };
    },

    revoke: (did) => {
        if (!state.primeMap[did]) return null;
        
        state.currentEpoch++;
        const p = BigInt(state.primeMap[did]);
        
        // 1. Remove the hospital
        delete state.primeMap[did];
        state.revokedSet.push(did);
        
        // 2. 🚨 THE FIX: Safely recalculate the global root from scratch!
        let newAcc = G;
        for (let d in state.primeMap) {
            newAcc = power(newAcc, BigInt(state.primeMap[d]), N);
        }
        state.accumulatorValue = newAcc.toString();
        
        state.historyLog.push({
            epoch: state.currentEpoch,
            type: 'REVOKE',
            did: did,
            prime: p.toString() // 🚨 CRITICAL: We are now logging the prime here!
        });

        saveState();
        return { newRoot: state.accumulatorValue };
    },

    // 🛡️ NEW: The Bézout "Defense" Generator
    getInnocenceProof: (hospitalPrime) => {
        const P = BigInt(hospitalPrime);
        
        // 1. Calculate the "Bad List" (Product of all revoked primes)
        let revokedProduct = 1n;
        state.historyLog.forEach(e => {
            if (e.type === 'REVOKE' && e.prime) {
                revokedProduct *= BigInt(e.prime);
            }
        });

        // If no one has ever been revoked, there's no need for a defense
        if (revokedProduct === 1n) return null; 

        // 2. The Bézout Identity: aP + b(RevokedProduct) = 1
        const [gcd, a, b] = gcde(P, revokedProduct);
        
        return {
            a: a.toString(),
            b: b.toString(),
            revokedProduct: revokedProduct.toString()
        };
    },

    createWitness: (did) => {
        const targetPrime = BigInt(state.primeMap[did] || "0");
        if (targetPrime === 0n) return null;
        let witness = G;
        for (let d in state.primeMap) {
            if (d !== did) witness = power(witness, BigInt(state.primeMap[d]), N);
        }
        return witness.toString();
    },

    getPrime: (did) => state.primeMap[did],
    getRoot: () => state.accumulatorValue,
    getEpoch: () => state.currentEpoch,
    getHistoryLog: () => state.historyLog
};