import json
import logging
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import models
from models.base import Base
from models.user import User
from models.seller import Seller
from models.seller_metrics import SellerMetric
from models.listing import Listing
from models.order import Order
from models.review import Review
from models.support_ticket import SupportTicket
from models.payout import Payout
from models.customer_chat import CustomerChat
from models.scenario import InvestigationScenario

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")

from config.settings import get_settings
settings = get_settings()

DATABASE_URL = settings.database_url.replace("sqlite+aiosqlite://", "sqlite://")
MOCK_DATA_DIR = Path(settings.mock_data_dir)

def load_json(filename: str):
    path = MOCK_DATA_DIR / filename
    if not path.exists():
        logger.warning(f"File not found: {path}")
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def run_seed(session_factory=None) -> None:
    if session_factory is None:
        engine = create_engine(DATABASE_URL)
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
    else:
        session = session_factory()

    try:
        # Check if users already exist
        existing_users = session.query(User).count()
        if existing_users > 0:
            logger.info("Database already seeded. Skipping.")
            return

        logger.info("Starting database seeding...")

        # Load Mock Data
        listings_data = load_json("listings.json")
        orders_data = load_json("orders.json")
        payouts_data = load_json("payouts.json")
        reviews_data = load_json("reviews.json")
        chats_data = load_json("customer_chats.json")
        tickets_data = load_json("support_tickets.json")
        scenarios_data = load_json("investigation_scenarios.json")
        metrics_data = load_json("seller_metrics.json")

        # 1. Create Sellers
        sellers = [
            Seller(id="SELLER-IND-001", name="Rohan Enterprises", tier="Bronze", marketplace="meesho"),
            Seller(id="SELLER-IND-002", name="Priya Fashion", tier="Silver", marketplace="meesho"),
            Seller(id="SELLER-IND-003", name="ElectroKart", tier="Gold", marketplace="meesho"),
        ]
        session.add_all(sellers)
        session.commit()
        logger.info("Created 3 sellers.")

        # 2. Create Users
        users = [
            User(email="rohan@sellerops.ai", password="demo123", seller_id="SELLER-IND-001"),
            User(email="priya@sellerops.ai", password="demo123", seller_id="SELLER-IND-002"),
            User(email="electro@sellerops.ai", password="demo123", seller_id="SELLER-IND-003"),
        ]
        session.add_all(users)
        session.commit()
        logger.info("Created 3 demo accounts.")

        # 3. Seed Rohan Enterprises (SELLER-IND-001) - Full Mock Data
        logger.info("Seeding Rohan Enterprises (SELLER-IND-001) full data...")
        
        # Listings
        for l in listings_data:
            session.add(Listing(
                id=l["id"], seller_id="SELLER-IND-001", name=l["name"], category=l["category"],
                sku=l["sku"], price=l["price"], mrp=l["mrp"], images=l["images"],
                description=l["description"], size_chart=l["size_chart"], stock=l["stock"],
                marketplace=l["marketplace"], status=l["status"], rating=l["rating"],
                total_reviews=l["total_reviews"], violations=l["violations"]
            ))
        
        # Orders
        for o in orders_data:
            session.add(Order(
                order_id=o["order_id"], seller_id="SELLER-IND-001", product_id=o["product_id"],
                product_name=o["product_name"], quantity=o["quantity"], order_value=o["order_value"],
                order_date=o["order_date"], delivery_date=o.get("delivery_date"), status=o["status"],
                is_return=o.get("is_return", False), return_reason=o.get("return_reason"),
                return_date=o.get("return_date"), customer_id=o["customer_id"], marketplace=o["marketplace"],
                payment_mode=o["payment_mode"], shipping_days=o.get("shipping_days"),
                cancel_reason=o.get("cancel_reason"), high_value=o.get("high_value", False),
                repeat_buyer=o.get("repeat_buyer", False), suspicious=o.get("suspicious", False),
                fraud_suspected=o.get("fraud_suspected", False)
            ))
            
        # Payouts
        for p in payouts_data:
            session.add(Payout(
                payout_id=p["payout_id"], seller_id="SELLER-IND-001", period=p["period"],
                marketplace=p["marketplace"], gross_amount=p["gross_amount"], deductions=p["deductions"],
                net_amount=p["net_amount"], expected_amount=p["expected_amount"], variance=p["variance"],
                status=p["status"], settlement_date=p["settlement_date"], is_anomaly=p["is_anomaly"],
                orders_count=p["orders_count"], deduction_breakdown=p.get("deduction_breakdown"),
                anomaly_reason=p.get("anomaly_reason")
            ))

        # Reviews
        for r in reviews_data:
            session.add(Review(
                review_id=r["review_id"], seller_id="SELLER-IND-001", product_id=r["product_id"],
                product_name=r["product_name"], customer_id=r["customer_id"], rating=r["rating"],
                title=r["title"], body=r["body"], date=r["date"], helpful_votes=r["helpful_votes"],
                marketplace=r["marketplace"], verified_purchase=r["verified_purchase"],
                flagged=r.get("flagged", False), flag_reason=r.get("flag_reason")
            ))

        # Chats
        for c in chats_data:
            session.add(CustomerChat(
                chat_id=c["chat_id"], seller_id="SELLER-IND-001", order_id=c["order_id"],
                customer_id=c["customer_id"], product_id=c["product_id"], date=c["date"],
                status=c["status"], category=c["category"], messages=c["messages"]
            ))

        # Tickets
        for t in tickets_data:
            session.add(SupportTicket(
                ticket_id=t["ticket_id"], seller_id="SELLER-IND-001", marketplace=t["marketplace"],
                category=t["category"], status=t["status"], priority=t["priority"],
                subject=t["subject"], description=t["description"], created_date=t["created_date"],
                updated_date=t["updated_date"], resolution=t.get("resolution"),
                related_listings=t.get("related_listings"), recommended_actions=t.get("recommended_actions")
            ))

        # Scenarios
        for s in scenarios_data:
            session.add(InvestigationScenario(
                scenario_id=s["scenario_id"], seller_id="SELLER-IND-001", name=s["name"],
                description=s["description"], trigger_data=s["trigger_data"],
                expected_issues=s["expected_issues"], expected_severity=s["expected_severity"],
                context=s["context"]
            ))

        # Metrics
        session.add(SellerMetric(
            seller_id="SELLER-IND-001", seller_rating=metrics_data["seller_rating"],
            total_orders=metrics_data["total_orders"], total_returns=metrics_data["total_returns"],
            return_rate=metrics_data["return_rate"], active_listings=metrics_data["active_listings"],
            inactive_listings=metrics_data["inactive_listings"], draft_listings=metrics_data["draft_listings"],
            total_revenue_30d=metrics_data["total_revenue_30d"], total_payouts_30d=metrics_data["total_payouts_30d"],
            pending_payouts=metrics_data["pending_payouts"], account_health=metrics_data["account_health"],
            cancellation_rate=metrics_data["cancellation_rate"], late_shipment_rate=metrics_data["late_shipment_rate"],
            on_time_delivery_rate=metrics_data["on_time_delivery_rate"], fraud_flags=metrics_data["fraud_flags"],
            violations=metrics_data["violations"], top_categories=metrics_data["top_categories"],
            performance_trend=metrics_data["performance_trend"], last_updated=metrics_data["last_updated"]
        ))
        
        session.commit()
        logger.info("Successfully seeded Rohan Enterprises.")

        # 4. Seed Priya Fashion (SELLER-IND-002) - Apparel and Footwear only
        logger.info("Seeding Priya Fashion (SELLER-IND-002) apparel/footwear dataset...")
        priya_categories = {"clothing", "footwear"}
        priya_listings = [l for l in listings_data if l["category"] in priya_categories]
        priya_product_ids = {l["id"] for l in priya_listings}

        for l in priya_listings:
            session.add(Listing(
                id=l["id"], seller_id="SELLER-IND-002", name=l["name"], category=l["category"],
                sku=l["sku"], price=l["price"], mrp=l["mrp"], images=l["images"],
                description=l["description"], size_chart=l["size_chart"], stock=l["stock"],
                marketplace=l["marketplace"], status=l["status"], rating=l["rating"],
                total_reviews=l["total_reviews"], violations=l["violations"]
            ))

        priya_orders = [o for o in orders_data if o["product_id"] in priya_product_ids]
        for o in priya_orders:
            session.add(Order(
                order_id=o["order_id"], seller_id="SELLER-IND-002", product_id=o["product_id"],
                product_name=o["product_name"], quantity=o["quantity"], order_value=o["order_value"],
                order_date=o["order_date"], delivery_date=o.get("delivery_date"), status=o["status"],
                is_return=o.get("is_return", False), return_reason=o.get("return_reason"),
                return_date=o.get("return_date"), customer_id=o["customer_id"], marketplace=o["marketplace"],
                payment_mode=o["payment_mode"], shipping_days=o.get("shipping_days"),
                cancel_reason=o.get("cancel_reason"), high_value=o.get("high_value", False),
                repeat_buyer=o.get("repeat_buyer", False), suspicious=o.get("suspicious", False),
                fraud_suspected=o.get("fraud_suspected", False)
            ))

        priya_payouts = [p for p in payouts_data if p["gross_amount"] < 30000] # smaller payouts scale
        for p in priya_payouts:
            session.add(Payout(
                payout_id=p["payout_id"], seller_id="SELLER-IND-002", period=p["period"],
                marketplace=p["marketplace"], gross_amount=p["gross_amount"] * 0.7, deductions=p["deductions"] * 0.7,
                net_amount=p["net_amount"] * 0.7, expected_amount=p["expected_amount"] * 0.7, variance=p["variance"] * 0.7,
                status=p["status"], settlement_date=p["settlement_date"], is_anomaly=p["is_anomaly"],
                orders_count=int(p["orders_count"] * 0.7), deduction_breakdown=p.get("deduction_breakdown"),
                anomaly_reason=p.get("anomaly_reason")
            ))

        priya_reviews = [r for r in reviews_data if r["product_id"] in priya_product_ids]
        for r in priya_reviews:
            session.add(Review(
                review_id=r["review_id"], seller_id="SELLER-IND-002", product_id=r["product_id"],
                product_name=r["product_name"], customer_id=r["customer_id"], rating=r["rating"],
                title=r["title"], body=r["body"], date=r["date"], helpful_votes=r["helpful_votes"],
                marketplace=r["marketplace"], verified_purchase=r["verified_purchase"],
                flagged=r.get("flagged", False), flag_reason=r.get("flag_reason")
            ))

        priya_chats = [c for c in chats_data if c["product_id"] in priya_product_ids]
        for c in priya_chats:
            session.add(CustomerChat(
                chat_id=c["chat_id"], seller_id="SELLER-IND-002", order_id=c["order_id"],
                customer_id=c["customer_id"], product_id=c["product_id"], date=c["date"],
                status=c["status"], category=c["category"], messages=c["messages"]
            ))

        priya_tickets = [t for t in tickets_data if t["category"] in {"account_warning", "listing_suppression"}]
        for t in priya_tickets:
            session.add(SupportTicket(
                ticket_id=t["ticket_id"], seller_id="SELLER-IND-002", marketplace=t["marketplace"],
                category=t["category"], status=t["status"], priority=t["priority"],
                subject=t["subject"], description=t["description"], created_date=t["created_date"],
                updated_date=t["updated_date"], resolution=t.get("resolution"),
                related_listings=[l for l in t.get("related_listings", []) if l in priya_product_ids],
                recommended_actions=t.get("recommended_actions")
            ))

        for s in scenarios_data:
            session.add(InvestigationScenario(
                scenario_id=s["scenario_id"], seller_id="SELLER-IND-002", name=s["name"],
                description=s["description"], trigger_data=s["trigger_data"],
                expected_issues=s["expected_issues"], expected_severity=s["expected_severity"],
                context=s["context"]
            ))

        # Metrics
        session.add(SellerMetric(
            seller_id="SELLER-IND-002", seller_rating=4.1,
            total_orders=len(priya_orders), total_returns=len([o for o in priya_orders if o.get("is_return")]),
            return_rate=len([o for o in priya_orders if o.get("is_return")]) / max(len(priya_orders), 1),
            active_listings=len([l for l in priya_listings if l["status"] == "active"]),
            inactive_listings=len([l for l in priya_listings if l["status"] == "inactive"]),
            draft_listings=len([l for l in priya_listings if l["status"] == "draft"]),
            total_revenue_30d=54000.00, total_payouts_30d=48000.00, pending_payouts=6000.00,
            account_health="good", cancellation_rate=0.005, late_shipment_rate=0.012,
            on_time_delivery_rate=0.965, fraud_flags=0,
            violations=[], top_categories=[{"category": "clothing", "orders": len(priya_orders), "revenue": 54000.00}],
            performance_trend={"return_rate_7d": 0.08, "return_rate_30d": 0.09, "return_rate_90d": 0.10, "rating_trend": "stable", "revenue_trend": "increasing"},
            last_updated="2025-03-12T00:00:00Z"
        ))

        session.commit()
        logger.info("Successfully seeded Priya Fashion.")

        # 5. Seed ElectroKart (SELLER-IND-003) - Electronics and Kitchen only
        logger.info("Seeding ElectroKart (SELLER-IND-003) electronics/kitchen dataset...")
        electro_categories = {"kitchen", "electronics", "home_decor"}
        electro_listings = [l for l in listings_data if l["category"] in electro_categories]
        electro_product_ids = {l["id"] for l in electro_listings}

        for l in electro_listings:
            session.add(Listing(
                id=l["id"], seller_id="SELLER-IND-003", name=l["name"], category=l["category"],
                sku=l["sku"], price=l["price"], mrp=l["mrp"], images=l["images"],
                description=l["description"], size_chart=l["size_chart"], stock=l["stock"],
                marketplace=l["marketplace"], status=l["status"], rating=l["rating"],
                total_reviews=l["total_reviews"], violations=l["violations"]
            ))

        electro_orders = [o for o in orders_data if o["product_id"] in electro_product_ids]
        for o in electro_orders:
            session.add(Order(
                order_id=o["order_id"], seller_id="SELLER-IND-003", product_id=o["product_id"],
                product_name=o["product_name"], quantity=o["quantity"], order_value=o["order_value"],
                order_date=o["order_date"], delivery_date=o.get("delivery_date"), status=o["status"],
                is_return=o.get("is_return", False), return_reason=o.get("return_reason"),
                return_date=o.get("return_date"), customer_id=o["customer_id"], marketplace=o["marketplace"],
                payment_mode=o["payment_mode"], shipping_days=o.get("shipping_days"),
                cancel_reason=o.get("cancel_reason"), high_value=o.get("high_value", False),
                repeat_buyer=o.get("repeat_buyer", False), suspicious=o.get("suspicious", False),
                fraud_suspected=o.get("fraud_suspected", False)
            ))

        electro_payouts = [p for p in payouts_data if p["gross_amount"] >= 20000] # larger payouts scale
        for p in electro_payouts:
            session.add(Payout(
                payout_id=p["payout_id"], seller_id="SELLER-IND-003", period=p["period"],
                marketplace=p["marketplace"], gross_amount=p["gross_amount"] * 1.5, deductions=p["deductions"] * 1.5,
                net_amount=p["net_amount"] * 1.5, expected_amount=p["expected_amount"] * 1.5, variance=p["variance"] * 1.5,
                status=p["status"], settlement_date=p["settlement_date"], is_anomaly=p["is_anomaly"],
                orders_count=int(p["orders_count"] * 1.5), deduction_breakdown=p.get("deduction_breakdown"),
                anomaly_reason=p.get("anomaly_reason")
            ))

        electro_reviews = [r for r in reviews_data if r["product_id"] in electro_product_ids]
        for r in electro_reviews:
            session.add(Review(
                review_id=r["review_id"], seller_id="SELLER-IND-003", product_id=r["product_id"],
                product_name=r["product_name"], customer_id=r["customer_id"], rating=r["rating"],
                title=r["title"], body=r["body"], date=r["date"], helpful_votes=r["helpful_votes"],
                marketplace=r["marketplace"], verified_purchase=r["verified_purchase"],
                flagged=r.get("flagged", False), flag_reason=r.get("flag_reason")
            ))

        electro_chats = [c for c in chats_data if c["product_id"] in electro_product_ids]
        for c in electro_chats:
            session.add(CustomerChat(
                chat_id=c["chat_id"], seller_id="SELLER-IND-003", order_id=c["order_id"],
                customer_id=c["customer_id"], product_id=c["product_id"], date=c["date"],
                status=c["status"], category=c["category"], messages=c["messages"]
            ))

        electro_tickets = [t for t in tickets_data if t["category"] in {"payout_dispute", "counterfeit_suspicion"}]
        for t in electro_tickets:
            session.add(SupportTicket(
                ticket_id=t["ticket_id"], seller_id="SELLER-IND-003", marketplace=t["marketplace"],
                category=t["category"], status=t["status"], priority=t["priority"],
                subject=t["subject"], description=t["description"], created_date=t["created_date"],
                updated_date=t["updated_date"], resolution=t.get("resolution"),
                related_listings=[l for l in t.get("related_listings", []) if l in electro_product_ids],
                recommended_actions=t.get("recommended_actions")
            ))

        for s in scenarios_data:
            session.add(InvestigationScenario(
                scenario_id=s["scenario_id"], seller_id="SELLER-IND-003", name=s["name"],
                description=s["description"], trigger_data=s["trigger_data"],
                expected_issues=s["expected_issues"], expected_severity=s["expected_severity"],
                context=s["context"]
            ))

        # Metrics
        session.add(SellerMetric(
            seller_id="SELLER-IND-003", seller_rating=4.7,
            total_orders=len(electro_orders), total_returns=len([o for o in electro_orders if o.get("is_return")]),
            return_rate=len([o for o in electro_orders if o.get("is_return")]) / max(len(electro_orders), 1),
            active_listings=len([l for l in electro_listings if l["status"] == "active"]),
            inactive_listings=len([l for l in electro_listings if l["status"] == "inactive"]),
            draft_listings=len([l for l in electro_listings if l["status"] == "draft"]),
            total_revenue_30d=148500.00, total_payouts_30d=121000.00, pending_payouts=27500.00,
            account_health="excellent", cancellation_rate=0.002, late_shipment_rate=0.005,
            on_time_delivery_rate=0.992, fraud_flags=0,
            violations=[], top_categories=[{"category": "electronics", "orders": len(electro_orders), "revenue": 148500.00}],
            performance_trend={"return_rate_7d": 0.02, "return_rate_30d": 0.03, "return_rate_90d": 0.03, "rating_trend": "stable", "revenue_trend": "increasing"},
            last_updated="2025-03-12T00:00:00Z"
        ))

        session.commit()
        logger.info("Successfully seeded ElectroKart.")
        logger.info("Database seeding completed.")
    except Exception as e:
        session.rollback()
        logger.error(f"Seeding failed: {e}")
        raise
    finally:
        if session_factory is None:
            session.close()

if __name__ == "__main__":
    run_seed()
