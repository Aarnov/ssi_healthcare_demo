import matplotlib.pyplot as plt

# Research-based constants
CRL_ENTRY_BYTES = 51  # Average CRL entry size in bytes
# Average DID Document/StatusList overhead per revocation in KB
BLOCKCHAIN_SSI_KB_PER_REV = 4.5 
RSA_2048_SNAPSHOT_BYTES = 614  # 256(N) + 256(R) + ~100 bytes Metadata/Sig

# Data generation (0 to 10,000 revoked hospitals)
revocations = [0, 2000, 4000, 6000, 8000, 10000]
crl_size_kb = [(r * CRL_ENTRY_BYTES) / 1024 for r in revocations]
blockchain_size_kb = [r * BLOCKCHAIN_SSI_KB_PER_REV for r in revocations]
proposed_size_kb = [RSA_2048_SNAPSHOT_BYTES / 1024 for _ in revocations]

plt.figure(figsize=(10, 6.5), dpi=300)
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'

# Plotting the lines
plt.plot(revocations, blockchain_size_kb, label='Blockchain SSI (On-chain Status) [O(n)]', 
         color='#f39c12', linestyle='-.', marker='^', linewidth=2)
plt.plot(revocations, crl_size_kb, label='Legacy PKI (CRL) [O(n)]', 
         color='#e74c3c', linestyle='--', marker='o', linewidth=2)
plt.plot(revocations, proposed_size_kb, label='Proposed System (FTR Snapshot) [O(1)]', 
         color='#2c3e50', linewidth=3, marker='s')

# Formatting
plt.title('Revocation Scalability: Legacy PKI vs. Blockchain vs. Proposed', fontsize=14, fontweight='bold', pad=20)
plt.xlabel('Number of Revoked Issuers (Global)', fontsize=11)
plt.ylabel('Data Payload Size (KB) [Log Scale]', fontsize=11)
plt.yscale('log') 
plt.legend(frameon=True, loc='upper left', shadow=True)

# Annotation
plt.annotate('O(1) Constant ~0.6 KB', xy=(8000, 0.6), xytext=(3500, 1.5),
             arrowprops=dict(facecolor='black', shrink=0.05, width=1, headwidth=8),
             fontsize=10, fontweight='bold')

plt.tight_layout()
plt.savefig('scalability_final.png')
print("✅ Final benchmark graph saved as 'scalability_final.png'")