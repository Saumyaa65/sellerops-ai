import asyncio
import smtplib
from email.mime.text import MIMEText
from typing import Optional
from config.settings import get_settings
from utils.logger import logger

settings = get_settings()

def _send_email_sync(host: str, port: int, username: str, password: str, sender: str, recipient: str, subject: str, body: str) -> None:
    msg = MIMEText(body, "html")
    msg["Subject"] = subject
    msg["From"] = sender
    msg["To"] = recipient

    with smtplib.SMTP(host, port, timeout=10) as server:
        if username and password:
            server.starttls()
            server.login(username, password)
        server.send_message(msg)

async def send_critical_alert_email(
    issue_title: str,
    description: str,
    business_impact: str,
    scenario_id: Optional[str] = None,
    appeal_available: bool = True
) -> bool:
    """
    Sends a critical alert email asynchronously.
    If SMTP credentials are not configured, it runs in Demo Mode, logging the email to the console.
    Returns True if successfully sent/logged, False otherwise.
    """
    if not settings.email_sending_enabled:
        logger.info("[Email] Email sending is disabled in settings.")
        return False

    recipient = settings.smtp_recipient
    sender = settings.smtp_sender
    subject = f"🚨 SellerOps AI Alert: {issue_title} Detected"

    # Build clean HTML email body
    investigation_url = "http://localhost:3000/investigations"
    if scenario_id:
        investigation_url += f"?scenario_id={scenario_id}"

    appeal_msg = ""
    if appeal_available:
        appeal_msg = "<p style='font-size: 13px; color: #8a2be2; font-weight: bold;'>A recovery plan and appeal letter can be generated automatically.</p>"

    html_body = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 20px; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px; padding: 24px; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="font-size: 24px; margin-bottom: 16px;">🚨</div>
          <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #e11d48;">Critical Issue Detected</h2>
          <p style="font-size: 14px; margin-bottom: 20px;">Dear <strong>Rohan Enterprises</strong>,</p>
          
          <div style="background: #fdf2f8; border-left: 4px solid #db2777; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; font-weight: 600; color: #9d174d;">{issue_title}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #c21d5a;">{description}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4b5563;">Business Impact:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563;">{business_impact}</p>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #4b5563;">Recommended Action:</p>
            <p style="margin: 0; font-size: 13px; color: #4b5563;">Run a complete AI investigation on SellerOps AI to generate policy checks and mitigation documents.</p>
          </div>

          {appeal_msg}

          <div style="margin: 28px 0 16px 0;">
            <a href="{investigation_url}" style="background: #8b5cf6; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(139, 92, 246, 0.2);">
              Open SellerOps AI Investigation
            </a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />
          <p style="font-size: 11px; color: #9ca3af; margin: 0; text-align: center;">
            This is an automated alert from SellerOps AI Operations Manager.
          </p>
        </div>
      </body>
    </html>
    """

    # Plain text version for console logger/fallback (Unicode safe)
    plain_body = f"""
==================================================
[ALERT] SellerOps AI Alert: {issue_title} Detected
==================================================
To: {recipient}
From: {sender}

Dear Rohan Enterprises,

A critical operational issue has been detected:
- Issue: {issue_title}
- Details: {description}
- Business Impact: {business_impact}

Recommended Action:
- Open SellerOps AI Investigation: {investigation_url}
{"A recovery plan and appeal letter can be generated automatically." if appeal_available else ""}
==================================================
"""

    has_smtp_creds = bool(settings.smtp_host and settings.smtp_username and settings.smtp_password)
    
    if not has_smtp_creds:
        # Demo Mode Fallback
        logger.info("\n--- [DEMO EMAIL NOTIFICATION] ---" + plain_body + "---------------------------------\n")
        return True

    try:
        logger.info(f"[Email] Sending critical alert email to {recipient} via SMTP...")
        await asyncio.to_thread(
            _send_email_sync,
            host=settings.smtp_host,
            port=settings.smtp_port,
            username=settings.smtp_username,
            password=settings.smtp_password,
            sender=sender,
            recipient=recipient,
            subject=subject,
            body=html_body
        )
        logger.info(f"[Email] Email successfully sent to {recipient}")
        return True
    except Exception as e:
        logger.error(f"[Email] Failed to send SMTP email: {e}")
        # Return False to log the failure, but prevent crash
        return False
