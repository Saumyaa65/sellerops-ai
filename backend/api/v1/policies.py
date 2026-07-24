"""Policies endpoint — RAG-based marketplace policy query."""

from fastapi import APIRouter

from models.schemas import ApiResponse, PolicyQueryRequest, PolicyQueryResult
from rag.retriever import PolicyRetriever
from services.groq_service import groq_service
from config.settings import get_settings

router = APIRouter()
_retriever = PolicyRetriever()
settings = get_settings()


@router.post("/query", response_model=ApiResponse[PolicyQueryResult])
async def query_policy(body: PolicyQueryRequest) -> ApiResponse[PolicyQueryResult]:
    """
    Semantic search over marketplace policies.
    Optionally generates a synthesized answer using Groq.
    """
    chunks = await _retriever.retrieve(
        query=body.query,
        marketplace=body.marketplace,
        top_k=body.top_k,
    )

    # Synthesize an answer from retrieved chunks
    answer = None
    if chunks:
        context = "\n\n".join(c["payload"].get("text", "") for c in chunks[:3])
        messages = [
            {
                "role": "system",
                "content": "You are a marketplace policy expert. Answer based ONLY on the policy excerpts. Be concise.",
            },
            {
                "role": "user",
                "content": f"Policy:\n{context}\n\nQuestion: {body.query}",
            },
        ]
        answer = await groq_service.chat(
            messages,
            temperature=0.2,
            max_tokens=400,
        )

    return ApiResponse(
        data=PolicyQueryResult(
            query=body.query,
            results=chunks,
            answer=answer,
        )
    )
