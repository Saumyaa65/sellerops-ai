import asyncio
import smtplib
from email.mime.text import MIMEText
from typing import Optional
from config.settings import get_settings
from utils.logger import logger

# Import database models to query seller details dynamically
from models.database import AsyncSessionLocal
from sqlalchemy.future import select
from models.seller import Seller
from models.user import User

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
    seller_id: str,
    scenario_id: Optional[str] = None,
    appeal_available: bool = True
) -> bool:
    """
    Sends a personalized critical alert email asynchronously.
    Queries the database to map seller_id to actual seller name, email, marketplace, and tier.
    """
    if not settings.email_sending_enabled:
        logger.info("[Email] Email sending is disabled in settings.")
        return False

    # Default fallback values (e.g. Rohan Enterprises)
    seller_name = "Rohan Enterprises"
    recipient = settings.smtp_recipient
    seller_email = "rohan@sellerops.ai"
    marketplace = "meesho"
    tier = "Bronze"

    try:
        async with AsyncSessionLocal() as db:
            # Query seller information
            stmt = select(Seller).where(Seller.id == seller_id)
            res = await db.execute(stmt)
            seller = res.scalars().first()
            if seller:
                seller_name = seller.name
                marketplace = seller.marketplace.upper()
                tier = seller.tier
                
                # Query corresponding user email
                user_stmt = select(User).where(User.seller_id == seller.id)
                user_res = await db.execute(user_stmt)
                user = user_res.scalars().first()
                if user:
                    seller_email = user.email
    except Exception as db_err:
        logger.error(f"[Email] Database lookup failed for seller {seller_id}: {db_err}")

    sender = settings.smtp_sender
    subject = f"🚨 SellerOps AI Alert: {issue_title} Detected"

    investigation_url = "http://localhost:3000/investigations"
    if scenario_id:
        investigation_url += f"?scenario_id={scenario_id}"

    # Determine if account suspension risk is applicable
    desc_lower = description.lower()
    is_suspension_applicable = (
        "suspension" in desc_lower or
        "suspend" in desc_lower or
        "rating" in desc_lower or
        "counterfeit" in desc_lower or
        "authenticity" in desc_lower or
        "restrict" in desc_lower
    )

    # Build clean HTML email body with premium styling
    html_body = f"""
    <html>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 20px; line-height: 1.6; background-color: #f8fafc;">
        <div style="max-width: 580px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <div style="font-size: 28px; margin-bottom: 12px;">🚨</div>
          <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #e11d48; margin-bottom: 20px;">SellerOps AI Alert</h2>
          
          <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
            Dear <strong>{seller_name}</strong>,
          </p>
          
          <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
            SellerOps AI has detected a critical issue requiring immediate attention on your <strong>{marketplace}</strong> ({tier} Tier) workspace (Account: <em>{seller_email}</em>).
          </p>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Issue</p>
            <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">{issue_title}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Summary</p>
            <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">{description}</p>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Business Impact</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
              <li style="margin-bottom: 4px;">Revenue risk</li>
              <li style="margin-bottom: 4px;">Policy violation risk</li>
              {f'<li style="margin-bottom: 4px;">Account suspension risk</li>' if is_suspension_applicable else ''}
            </ul>
          </div>

          <div style="margin-bottom: 24px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">Recommended Action</p>
            <p style="margin: 0 0 6px 0; font-size: 14px; color: #334155;">Run an AI investigation to generate:</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #334155;">
              <li style="margin-bottom: 4px;">Root cause analysis</li>
              <li style="margin-bottom: 4px;">Marketplace policy validation</li>
              <li style="margin-bottom: 4px;">Recovery plan</li>
              <li style="margin-bottom: 4px;">Appeal letter</li>
            </ul>
          </div>

          <div style="margin: 28px 0 16px 0;">
            <a href="{investigation_url}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);">
              Open Investigation
            </a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 28px 0 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
            This is an automated notification from SellerOps AI.
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

Dear {seller_name},

SellerOps AI has detected a critical issue requiring immediate attention.

Issue
{issue_title}

Summary
{description}

Business Impact
• Revenue risk
• Policy violation risk
{"• Account suspension risk" if is_suspension_applicable else ""}

Recommended Action
Run an AI investigation to generate:
• Root cause analysis
• Marketplace policy validation
• Recovery plan
• Appeal letter

[Open Investigation]: {investigation_url}

This is an automated notification from SellerOps AI.
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
        return False
