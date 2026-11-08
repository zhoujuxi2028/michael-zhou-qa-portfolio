#!/bin/bash

# Webhook 告警测试脚本
# 用法: bash grafana/examples/webhook-test.sh [receiver_url]

RECEIVER_URL="${1:-http://localhost:9000/webhook/alerts}"

echo "Testing Grafana Webhook Receiver at: $RECEIVER_URL"
echo "---"

# 测试 1: Warning 级别告警
echo "[Test 1] Sending Warning Alert..."
curl -X POST "$RECEIVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighP95Warning",
          "severity": "warning"
        },
        "annotations": {
          "summary": "High p95 latency detected",
          "description": "p95 latency exceeded 400ms for 5 minutes"
        }
      }
    ]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 2: Critical 级别告警
echo "[Test 2] Sending Critical Alert..."
curl -X POST "$RECEIVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighP95Critical",
          "severity": "critical"
        },
        "annotations": {
          "summary": "Critical p95 latency",
          "description": "p95 latency exceeded 1000ms"
        }
      }
    ]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 3: 错误率告警
echo "[Test 3] Sending Error Rate Alert..."
curl -X POST "$RECEIVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "ErrorSpike",
          "severity": "warning"
        },
        "annotations": {
          "summary": "Error rate spike detected",
          "description": "Error rate exceeded 0.5%"
        }
      }
    ]
  }' \
  -w "\nStatus: %{http_code}\n\n"

# 测试 4: 多个告警
echo "[Test 4] Sending Multiple Alerts..."
curl -X POST "$RECEIVER_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "firing",
    "alerts": [
      {
        "status": "firing",
        "labels": {
          "alertname": "HighP95",
          "severity": "critical"
        },
        "annotations": {
          "summary": "Critical latency",
          "description": "p95 > 1000ms"
        }
      },
      {
        "status": "firing",
        "labels": {
          "alertname": "MemoryGrowth",
          "severity": "warning"
        },
        "annotations": {
          "summary": "Memory leak detected",
          "description": "Heap growth > 200MB/h"
        }
      }
    ]
  }' \
  -w "\nStatus: %{http_code}\n\n"

echo "---"
echo "✅ Tests complete. Check receiver logs for details."
