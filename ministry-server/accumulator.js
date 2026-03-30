import fs from 'fs';

const STATE_FILE = 'accumulator_state.json';
const N = BigInt("10000000000000000000000000000011600000000000000000000000000002739"); 
const G = BigInt("2");

// --- 🛡️ THE PRIME GENERATOR ENGINE ---

/**
 * Checks if a number is a prime. 
 * Essential for ensuring identifiers are coprime for Bezout Proofs.
 */
function isPrime(n) {
    if (n <= 1n) return false;
    if (n <= 3n) return true;
    if (n % 2n === 0n || n % 3n === 0n) return false;
    for (let i = 5n; i * i <= n; i = i + 6n) {
        if (n % i === 0n || n % (i + 2n) === 0n) return false;
    }
    return true;
}

/**
 * Finds the next mathematical prime after a given value.
 */
function getNextPrime(n) {
    let candidate = BigInt(n);
    // Ensure we start on an odd number
    if (candidate % 2n === 0n) candidate += 1n;
    else candidate += 2n;

    while (!isPrime(candidate)) {
        candidate += 2n;
    }
    return candidate;
}

// --- INITIALIZATION ---

let state = {
    currentEpoch: 1,
    accumulatorValue: G.toString(),
    primeMap: {},
    lastPrimeUsed: "11", // Starting with a small prime
    revokedSet: [],
    historyLog: []
};

if (fs.existsSync(STATE_FILE)) {
    state = JSON.parse(fs.readFileSync(STATE_FILE));
} else {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function saveState() {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// --- CORE MATH UTILITIES ---

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

// --- TRUST ENGINE ---

export const TrustEngine = {
    add: (did) => {
        let currentAcc = BigInt(state.accumulatorValue);
        if (state.primeMap[did]) return { root: currentAcc.toString(), prime: state.primeMap[did] };
        
        state.currentEpoch++;
        
        // 🚨 THE FIX: No more +2n. We hunt for the next actual prime.
        const p = getNextPrime(state.lastPrimeUsed); 
        
        // Accumulator update: R_new = R_old^P mod N [cite: 68]
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
        
        delete state.primeMap[did];
        state.revokedSet.push(did);
        
        // Recalculate global root from scratch for security [cite: 121]
        let newAcc = G;
        for (let d in state.primeMap) {
            newAcc = power(newAcc, BigInt(state.primeMap[d]), N);
        }
        state.accumulatorValue = newAcc.toString();
        
        state.historyLog.push({
            epoch: state.currentEpoch,
            type: 'REVOKE',
            did: did,
            prime: p.toString()
        });

        saveState();
        return { newRoot: state.accumulatorValue };
    },

    getInnocenceProof: (hospitalPrime) => {
        const P = BigInt(hospitalPrime);
        
        let revokedProduct = 1n;
        state.historyLog.forEach(e => {
            if (e.type === 'REVOKE' && e.prime) {
                revokedProduct *= BigInt(e.prime);
            }
        });

        if (revokedProduct === 1n) return null; 

        // Bezout Identity: aP + b(revokedProduct) = 1 
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