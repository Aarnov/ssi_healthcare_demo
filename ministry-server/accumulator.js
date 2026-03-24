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
        const [g, x, y] = gcde(p, PHI_N);
        const pInv = (x % PHI_N + PHI_N) % PHI_N;
        
        state.accumulatorValue = power(BigInt(state.accumulatorValue), pInv, N).toString();
        
        delete state.primeMap[did];
        state.revokedSet.push(did);
        
        state.historyLog.push({
            epoch: state.currentEpoch,
            type: 'REVOKE',
            did: did
        });

        saveState();
        return { newRoot: state.accumulatorValue };
    },

    createNonMembershipProof: (targetDid) => {
        const x = BigInt(state.primeMap[targetDid] || "0");
        if (x === 0n) return null; 

        let P = 1n;
        for (let did in state.primeMap) {
            P *= BigInt(state.primeMap[did]);
        }
        const [gcd, a, b] = gcde(x, P);
        
        return { a: a.toString(), b: b.toString(), currentRoot: state.accumulatorValue };
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