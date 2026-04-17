"""
Grafana Webhook Alert Receiver Example

本示例展示如何在生产环境中接收 Grafana 告警。
可直接部署或作为参考集成到现有告警系统。
"""

from flask import Flask, request, jsonify
from datetime import datetime
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 存储最近的告警（仅用于演示，生产环境应使用数据库）
alert_history = []


@app.route('/webhook/alerts', methods=['POST'])
def receive_alerts():
    """
    接收 Grafana 告警 webhook
    
    期望的 POST body:
    {
      "status": "firing" | "resolved",
      "alerts": [
        {
          "status": "firing",
          "labels": {
            "alertname": "AlertName",
            "severity": "warning" | "critical"
          },
          "annotations": {
            "summary": "Alert summary",
            "description": "Alert description"
          }
        }
      ]
    }
    """
    try:
        payload = request.get_json()
        
        if not payload:
            return jsonify({"error": "Empty body"}), 400
        
        status = payload.get('status', 'unknown')
        alerts = payload.get('alerts', [])
        
        logger.info(f"Received webhook: status={status}, alerts_count={len(alerts)}")
        
        # 处理每个告警
        processed_alerts = []
        for alert in alerts:
            alert_data = {
                "received_at": datetime.utcnow().isoformat(),
                "alert_name": alert.get('labels', {}).get('alertname', 'Unknown'),
                "status": alert.get('status', 'unknown'),
                "severity": alert.get('labels', {}).get('severity', 'info'),
                "summary": alert.get('annotations', {}).get('summary', ''),
                "description": alert.get('annotations', {}).get('description', ''),
            }
            processed_alerts.append(alert_data)
            logger.info(f"Alert: {alert_data['alert_name']} - {alert_data['status']}")
        
        # 存储到历史（可选）
        alert_history.extend(processed_alerts)
        
        return jsonify({
            "status": "ok",
            "received_at": datetime.utcnow().isoformat(),
            "alerts_processed": len(processed_alerts),
            "alerts": processed_alerts
        }), 200
    
    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/webhook/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


@app.route('/webhook/alerts/history', methods=['GET'])
def get_alert_history():
    """获取告警历史（可选，仅用于演示）"""
    limit = request.args.get('limit', 100, type=int)
    return jsonify({
        "total": len(alert_history),
        "alerts": alert_history[-limit:]
    }), 200


if __name__ == '__main__':
    logger.info("Starting Grafana Webhook Receiver on http://localhost:9000")
    app.run(host='0.0.0.0', port=9000, debug=False)
