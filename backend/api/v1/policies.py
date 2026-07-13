"""Policies endpoint — RAG-based marketplace policy query."""

from fastapi import APIRouter

from models.schemas import ApiResponse, PolicyQueryRequest, PolicyQueryResult
from rag.retriever import PolicyRetriever
from services.groq_service import groq_service

router = APIRouter()
_retriever = PolicyRetriever()


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
                "content": "You are a marketplace policy expert. Answer the seller's question based on the policy excerpts provided. Be concise and specific.",
            },
            {
                "role": "user",
                "content": f"Policy excerpts:\n{context}\n\nSeller question: {body.query}",
            },
        ]
        answer = await groq_service.chat(messages, temperature=0.2, max_tokens=512)

    return ApiResponse(
        data=PolicyQueryResult(
            query=body.query,
            results=chunks,
            answer=answer,
        )
    )
