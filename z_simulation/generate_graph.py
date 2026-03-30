import matplotlib.pyplot as plt

plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'

# UPDATED: Including both the Normal and Revocation (Bézout) paths
methods = [
    'Proposed System\n(Normal Path)', 
    'Proposed System\n(Bézout Defense)', 
    'Centralized API\n(Cloud Database)', 
    'Blockchain SSI\n(Public RPC Read)'
]
latency_ms = [0.10681, 0.13142, 150.0, 250.0] 

fig, ax = plt.subplots(figsize=(10, 6), dpi=300)

# Highlighting your system in darker colors
colors = ['#2c3e50', '#34495e', '#bdc3c7', '#bdc3c7']
bars = ax.bar(methods, latency_ms, color=colors, width=0.6, edgecolor='black')

ax.set_yscale('log')

for bar in bars:
    height = bar.get_height()
    label = f'{height:.3f} ms' if height < 1 else f'{int(height)} ms'
    ax.annotate(label,
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 5), 
                textcoords="offset points",
                ha='center', va='bottom', fontsize=11, fontweight='bold')

ax.set_ylabel('Verification Latency (ms) [Logarithmic Scale]', fontsize=12, fontweight='bold')
ax.set_title('Fig 1. Edge Verification Latency: Dual-Gate Prototype vs. Baselines', fontsize=14, fontweight='bold', pad=20)

plt.tight_layout()
plt.savefig('latency_graph_final.png', format='png', dpi=300)
plt.show()