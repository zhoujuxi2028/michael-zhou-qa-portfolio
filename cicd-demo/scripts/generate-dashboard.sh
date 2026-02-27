#!/bin/bash
# Generate HTML performance monitoring dashboard
# Part of Phase 3: Performance Monitoring

set -e

METRICS_DIR="test-metrics"
HISTORY_FILE="$METRICS_DIR/history.jsonl"
DASHBOARD_FILE="$METRICS_DIR/dashboard.html"

echo "📊 Generating performance monitoring dashboard..."

# Check if history file exists
if [ ! -f "$HISTORY_FILE" ]; then
  echo "⚠️  No test history found. Run tests with tracking first."
  echo "   Run: ./scripts/track-test-execution.sh"
  exit 1
fi

# Count total runs
total_runs=$(wc -l < "$HISTORY_FILE")
echo "   Found $total_runs test run(s) in history"

# Get latest metrics
latest_metrics=$(tail -1 "$HISTORY_FILE")

# Calculate statistics from history
avg_duration=$(jq -s 'map(.totalDuration) | add / length' "$HISTORY_FILE")
avg_cypress_duration=$(jq -s 'map(.cypress.duration) | add / length' "$HISTORY_FILE")
avg_newman_duration=$(jq -s 'map(.newman.duration) | add / length' "$HISTORY_FILE")
total_tests=$(jq -s 'map(.cypress.total) | add' "$HISTORY_FILE")
pass_rate=$(jq -s 'map(select(.status == "PASS")) | length' "$HISTORY_FILE")
pass_rate_percent=$(echo "scale=1; $pass_rate * 100 / $total_runs" | bc)

# Generate HTML dashboard
cat > "$DASHBOARD_FILE" << 'HTMLEOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CI/CD Demo - Performance Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 2rem;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        header {
            text-align: center;
            color: white;
            margin-bottom: 2rem;
        }

        header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }

        header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: transform 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-5px);
        }

        .stat-card h3 {
            color: #666;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }

        .stat-value {
            font-size: 2.5rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 0.5rem;
        }

        .stat-value.success {
            color: #10b981;
        }

        .stat-value.warning {
            color: #f59e0b;
        }

        .stat-value.danger {
            color: #ef4444;
        }

        .stat-subtitle {
            color: #999;
            font-size: 0.85rem;
        }

        .charts-section {
            background: white;
            border-radius: 12px;
            padding: 2rem;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 2rem;
        }

        .charts-section h2 {
            color: #333;
            margin-bottom: 1.5rem;
        }

        .chart-container {
            margin-bottom: 2rem;
        }

        .chart-title {
            color: #666;
            font-size: 1.1rem;
            margin-bottom: 1rem;
            font-weight: 600;
        }

        .bar-chart {
            display: flex;
            align-items: flex-end;
            height: 200px;
            gap: 0.5rem;
            padding: 1rem;
            background: #f9fafb;
            border-radius: 8px;
        }

        .bar {
            flex: 1;
            background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px 4px 0 0;
            position: relative;
            transition: all 0.3s ease;
        }

        .bar:hover {
            opacity: 0.8;
        }

        .bar-label {
            position: absolute;
            bottom: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75rem;
            color: #666;
            white-space: nowrap;
        }

        .bar-value {
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.8rem;
            color: #333;
            font-weight: bold;
            white-space: nowrap;
        }

        .history-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }

        .history-table th {
            background: #f9fafb;
            padding: 1rem;
            text-align: left;
            color: #666;
            font-weight: 600;
            border-bottom: 2px solid #e5e7eb;
        }

        .history-table td {
            padding: 1rem;
            border-bottom: 1px solid #e5e7eb;
            color: #333;
        }

        .history-table tr:hover {
            background: #f9fafb;
        }

        .status-badge {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-badge.pass {
            background: #d1fae5;
            color: #065f46;
        }

        .status-badge.fail {
            background: #fee2e2;
            color: #991b1b;
        }

        footer {
            text-align: center;
            color: white;
            margin-top: 2rem;
            opacity: 0.8;
        }

        .refresh-button {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: white;
            color: #667eea;
            border: none;
            padding: 1rem 2rem;
            border-radius: 50px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            transition: all 0.3s ease;
        }

        .refresh-button:hover {
            transform: scale(1.05);
            box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 CI/CD Performance Dashboard</h1>
            <p>QA Portfolio - Test Execution Metrics & Monitoring</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Test Runs</h3>
                <div class="stat-value" id="totalRuns">--</div>
                <div class="stat-subtitle">Since tracking started</div>
            </div>

            <div class="stat-card">
                <h3>Pass Rate</h3>
                <div class="stat-value success" id="passRate">--</div>
                <div class="stat-subtitle" id="passRateSubtitle">--</div>
            </div>

            <div class="stat-card">
                <h3>Avg Duration</h3>
                <div class="stat-value" id="avgDuration">--</div>
                <div class="stat-subtitle">Average test execution time</div>
            </div>

            <div class="stat-card">
                <h3>Latest Status</h3>
                <div class="stat-value" id="latestStatus">--</div>
                <div class="stat-subtitle" id="latestTimestamp">--</div>
            </div>
        </div>

        <div class="charts-section">
            <h2>📊 Performance Metrics</h2>

            <div class="chart-container">
                <div class="chart-title">Test Execution Duration (Last 10 Runs)</div>
                <div class="bar-chart" id="durationChart"></div>
            </div>

            <div class="chart-container">
                <div class="chart-title">Test Results History</div>
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Status</th>
                            <th>Duration</th>
                            <th>Cypress</th>
                            <th>Newman</th>
                            <th>Artifacts</th>
                        </tr>
                    </thead>
                    <tbody id="historyTable">
                        <tr>
                            <td colspan="6" style="text-align: center; color: #999;">Loading...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <footer>
            <p>Generated by CI/CD Demo Performance Monitoring System</p>
            <p>Part of Michael Zhou's QA Portfolio</p>
        </footer>

        <button class="refresh-button" onclick="location.reload()">🔄 Refresh</button>
    </div>

    <script>
        // Load metrics data
        async function loadMetrics() {
            try {
                const response = await fetch('history.jsonl');
                const text = await response.text();
                const lines = text.trim().split('\n');
                const metrics = lines.map(line => JSON.parse(line));

                renderDashboard(metrics);
            } catch (error) {
                console.error('Error loading metrics:', error);
            }
        }

        function renderDashboard(metrics) {
            const totalRuns = metrics.length;
            const passCount = metrics.filter(m => m.status === 'PASS').length;
            const passRate = (passCount / totalRuns * 100).toFixed(1);
            const avgDuration = (metrics.reduce((sum, m) => sum + m.totalDuration, 0) / totalRuns).toFixed(1);
            const latest = metrics[metrics.length - 1];

            // Update stat cards
            document.getElementById('totalRuns').textContent = totalRuns;
            document.getElementById('passRate').textContent = passRate + '%';
            document.getElementById('passRate').className = 'stat-value ' + (passRate >= 90 ? 'success' : 'warning');
            document.getElementById('passRateSubtitle').textContent = `${passCount} of ${totalRuns} runs passed`;
            document.getElementById('avgDuration').textContent = avgDuration + 's';
            document.getElementById('latestStatus').textContent = latest.status;
            document.getElementById('latestStatus').className = 'stat-value ' + (latest.status === 'PASS' ? 'success' : 'danger');
            document.getElementById('latestTimestamp').textContent = new Date(latest.timestamp).toLocaleString();

            // Render duration chart (last 10 runs)
            const chartData = metrics.slice(-10);
            const maxDuration = Math.max(...chartData.map(m => m.totalDuration));
            const durationChart = document.getElementById('durationChart');
            durationChart.innerHTML = chartData.map((m, i) => {
                const height = (m.totalDuration / maxDuration * 100);
                const runNumber = metrics.length - 10 + i + 1;
                return `
                    <div class="bar" style="height: ${height}%">
                        <div class="bar-value">${m.totalDuration}s</div>
                        <div class="bar-label">Run ${runNumber}</div>
                    </div>
                `;
            }).join('');

            // Render history table
            const historyTable = document.getElementById('historyTable');
            historyTable.innerHTML = metrics.slice().reverse().map(m => `
                <tr>
                    <td>${new Date(m.timestamp).toLocaleString()}</td>
                    <td><span class="status-badge ${m.status.toLowerCase()}">${m.status}</span></td>
                    <td>${m.totalDuration}s</td>
                    <td>${m.cypress.passed}/${m.cypress.total} (${m.cypress.duration}s)</td>
                    <td>${m.newman.assertions - m.newman.failed}/${m.newman.assertions} (${m.newman.duration}s)</td>
                    <td>${formatBytes(m.cypress.videosSize + m.cypress.screenshotsSize + m.newman.reportsSize)}</td>
                </tr>
            `).join('');
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        // Load metrics on page load
        loadMetrics();
    </script>
</body>
</html>
HTMLEOF

echo "✅ Dashboard generated: $DASHBOARD_FILE"
echo ""
echo "📂 View dashboard:"
echo "   xdg-open $DASHBOARD_FILE"
echo "   or"
echo "   open $DASHBOARD_FILE"
echo ""
