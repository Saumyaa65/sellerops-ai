"""API v1 root router — aggregates all sub-routers."""

from fastapi import APIRouter

from api.v1 import agents, health, listings, orders, payouts, policies, reviews, tickets, scenarios, chats, auth

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["Auth"])
router.include_router(health.router, tags=["Health"])
router.include_router(agents.router, prefix="/agents", tags=["Agents"])
router.include_router(listings.router, prefix="/listings", tags=["Listings"])
router.include_router(orders.router, prefix="/orders", tags=["Orders"])
router.include_router(payouts.router, prefix="/payouts", tags=["Payouts"])
router.include_router(policies.router, prefix="/policies", tags=["Policies"])
router.include_router(reviews.router, prefix="/reviews", tags=["Reviews"])
router.include_router(tickets.router, prefix="/tickets", tags=["Tickets"])
router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
router.include_router(chats.router, prefix="/chats", tags=["Chats"])
