from datetime import datetime
from typing import List, Dict, Optional
from collections import deque
import random

CHANNELS = ["whatsapp", "sms", "email", "pa_system"]

NOTIFICATION_TEMPLATES = {
    "emergency": {
        "whatsapp": "🚨 EMERGENCY ALERT — {zone}\nRisk Score: {risk}/100\nAction: {action}\nSentinelAI Safety Intelligence",
        "sms": "ALERT: Emergency in {zone}. Risk {risk}/100. {action}.",
        "email": "Subject: EMERGENCY ALERT — {zone}\n\nRisk Score: {risk}/100\nZone: {zone}\nAction Required: {action}\n\nThis is an automated alert from SentinelAI.",
        "pa_system": "ATTENTION: EMERGENCY in {zone}. Risk level {risk}/100. {action}. Please follow evacuation procedures.",
    },
    "ppe_violation": {
        "whatsapp": "⚠️ PPE VIOLATION — {worker} in {zone}\nMissing: {missing}\nPermit: {permit_type}",
        "sms": "PPE Alert: {worker} missing {missing} in {zone}.",
        "email": "Subject: PPE Violation — {zone}\n\nWorker: {worker}\nMissing Equipment: {missing}\nZone: {zone}\nPermit: {permit_type}",
        "pa_system": "ATTENTION: PPE violation in {zone}. Please ensure compliance.",
    },
    "alert": {
        "whatsapp": "⚠️ SENTINELAI ALERT — {zone}\nSeverity: {severity}\nDetails: {detail}",
        "sms": "Alert: {zone} — {severity}. {detail}",
        "email": "Subject: SentinelAI Alert — {zone}\n\nSeverity: {severity}\nDetails: {detail}",
        "pa_system": "ATTENTION: {severity} alert in {zone}. {detail}",
    },
}

RECIPIENTS = {
    "whatsapp": ["+91-9876543210 (Safety Officer)", "+91-9876543211 (Shift Supervisor)", "+91-9876543212 (Plant Manager)"],
    "sms": ["+91-9876543210", "+91-9876543213 (Emergency Response)", "+91-9876543214 (Maintenance Lead)"],
    "email": ["safety@vizagsteel.com", "controlroom@vizagsteel.com", "manager@vizagsteel.com"],
    "pa_system": ["Plant-wide PA System"],
}

_notification_queue: deque = deque()
_notification_history: List[dict] = []
_notification_counter = 0

def _generate_notification_id() -> str:
    global _notification_counter
    _notification_counter += 1
    return f"NOTIF-{datetime.now().strftime('%Y%m%d')}-{_notification_counter:04d}"

def _render_template(template_type: str, channel: str, context: dict) -> str:
    templates = NOTIFICATION_TEMPLATES.get(template_type, NOTIFICATION_TEMPLATES["alert"])
    tmpl = templates.get(channel, templates.get("sms", ""))
    try:
        return tmpl.format(**context)
    except KeyError:
        return tmpl

def dispatch_notification(template_type: str, context: dict, channels: Optional[List[str]] = None) -> List[dict]:
    sent = []
    channels_to_use = channels or CHANNELS
    for channel in channels_to_use:
        recipients = RECIPIENTS.get(channel, ["Unknown"])
        recipient = random.choice(recipients)
        message = _render_template(template_type, channel, context)
        notification = {
            "notificationId": _generate_notification_id(),
            "channel": channel,
            "recipient": recipient,
            "message": message,
            "templateType": template_type,
            "timestamp": datetime.now().isoformat(),
            "delivered": True,
        }
        _notification_history.insert(0, notification)
        sent.append(notification)
    return sent

def dispatch_emergency_notifications(zone: str, risk: int, action: str) -> List[dict]:
    return dispatch_notification("emergency", {
        "zone": zone, "risk": risk, "action": action,
    })

def dispatch_ppe_violation_notification(worker: str, zone: str, missing: str, permit_type: str) -> List[dict]:
    return dispatch_notification("ppe_violation", {
        "worker": worker, "zone": zone, "missing": missing, "permit_type": permit_type,
    }, channels=["whatsapp", "sms", "email"])

def dispatch_alert_notification(zone: str, severity: str, detail: str) -> List[dict]:
    return dispatch_notification("alert", {
        "zone": zone, "severity": severity, "detail": detail,
    })

def get_notification_history(limit: int = 50) -> List[dict]:
    return _notification_history[:limit]

def get_notification_stats() -> dict:
    by_channel: Dict[str, int] = {}
    by_type: Dict[str, int] = {}
    for n in _notification_history:
        by_channel[n["channel"]] = by_channel.get(n["channel"], 0) + 1
        by_type[n["templateType"]] = by_type.get(n["templateType"], 0) + 1
    return {
        "total": len(_notification_history),
        "byChannel": by_channel,
        "byType": by_type,
    }
