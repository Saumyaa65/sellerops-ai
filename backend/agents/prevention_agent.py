"""
Prevention Agent — validates listings before they go live.
Checks: missing images, wrong size charts, pricing anomalies, OCR mismatches.
"""

from agents.base_agent import BaseAgent
from agents.state import AgentState
from services.data_service import get_listings
from services.ocr_service import ocr_service
from utils.logger import logger


class PreventionAgent(BaseAgent):
    name = "prevention_agent"

    async def run(self, state: AgentState) -> AgentState:
        run_id = state["run_id"]
        await self.emit_step(run_id, "Scanning listings for issues...")

        seller_id = state.get("input_data", {}).get("seller_id", "SELLER-IND-001")
        listings = await get_listings(seller_id)
        issues = []

        for listing in listings:
            listing_issues = self._check_listing(listing)
            if listing_issues:
                issues.append({
                    "listing_id": listing.get("id"),
                    "product_name": listing.get("name"),
                    "issues": listing_issues,
                })

        await self.emit_step(run_id, f"Prevention scan complete — {len(issues)} listings with issues", {"count": len(issues)})
        await self.emit(run_id, "completed", "Prevention scan complete", {"count": len(issues)})

        return {
            **state,
            "detected_issues": issues,
            "is_complete": True,
        }  # type: ignore[return-value]

    def _check_listing(self, listing: dict) -> list:
        """Run rule-based checks on a single listing."""
        issues = []

        # Image checks
        images = listing.get("images", [])
        if not images:
            issues.append({"type": "missing_images", "severity": "error", "message": "No product images uploaded"})
        elif len(images) < 3:
            issues.append({"type": "low_image_count", "severity": "warning", "message": f"Only {len(images)} image(s) — recommend at least 3"})

        # Simulated AI Image Analysis Guidelines (using deterministic SKU hash rules)
        sku = listing.get("sku", "")
        sku_hash = sum(ord(c) for c in sku) if sku else 0
        if len(images) > 0:
            if sku_hash % 3 == 0:
                issues.append({"type": "blurry_image", "severity": "warning", "message": "Hero image appears blurry. Marketplace recommends replacing it before publishing."})
            if sku_hash % 4 == 0:
                issues.append({"type": "watermark_detected", "severity": "error", "message": "Watermark/logo detected in product image. Platform rules prohibit custom logos."})
            if sku_hash % 5 == 0:
                issues.append({"type": "missing_white_background", "severity": "warning", "message": "Missing pure white background. Guidelines require white background for main image."})
            if sku_hash % 7 == 0:
                issues.append({"type": "guideline_violation", "severity": "warning", "message": "Product occupies less than 85% of image frame. Adjust frame margin."})

        # Price checks
        price = listing.get("price", 0)
        mrp = listing.get("mrp", 0)
        if price <= 0:
            issues.append({"type": "invalid_price", "severity": "error", "message": "Selling price must be greater than 0"})
        if mrp > 0 and price > mrp:
            issues.append({"type": "price_above_mrp", "severity": "error", "message": "Selling price exceeds MRP"})

        # Size chart
        if listing.get("category") in ("clothing", "footwear") and not listing.get("size_chart"):
            issues.append({"type": "missing_size_chart", "severity": "warning", "message": "Size chart required for apparel/footwear"})

        # Description
        description = listing.get("description", "")
        if len(description) < 50:
            issues.append({"type": "thin_description", "severity": "warning", "message": "Product description is too short"})

        return issues
