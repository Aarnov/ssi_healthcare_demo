import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'

methods = ['Proposed System\n(Offline Dual-Gate)', 'Centralized API\n(Cloud Database)', 'Blockchain SSI\n(Public RPC Read)']
latency_ms = [0.485, 150.0, 250.0]

fig, ax = plt.subplots(figsize=(8, 5.5), dpi=300)

bars = ax.bar(methods, latency_ms, color=['#2c3e50', '#bdc3c7', '#bdc3c7'], width=0.6, edgecolor='black')

ax.set_yscale('log')

for bar in bars:
    height = bar.get_height()
    label = f'{height:.3f} ms' if height < 1 else f'{int(height)} ms'
    ax.annotate(label,
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 5), 
                textcoords="offset points",
                ha='center', va='bottom', fontsize=12, fontweight='bold')

ax.set_ylabel('Verification Latency (ms) [Logarithmic Scale]', fontsize=12, fontweight='bold')
ax.set_title('Verification Latency Comparison: Proposed Edge Architecture vs. Industry Baselines', fontsize=14, fontweight='bold', pad=20)
ax.tick_params(axis='x', labelsize=11)
ax.tick_params(axis='y', labelsize=11)

plt.tight_layout()
plt.savefig('clean_latency_graph.png', format='png', dpi=300)
print("✅ Clean high-resolution graph saved as 'clean_latency_graph.png'")
plt.show()