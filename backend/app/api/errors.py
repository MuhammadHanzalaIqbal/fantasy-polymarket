"""Shared API error translation utilities."""

from fastapi import HTTPException, status


def raise_http_from_chain_error(
    error: Exception,
    operation: str,
    read_operation: bool = True,
) -> None:
    """Raises normalized HTTP errors for blockchain/provider failures.

    Args:
        error: Original exception raised by provider/contract call.
        operation: Human-readable operation label for error detail.
        read_operation: Whether operation is read-only.

    Raises:
        HTTPException: Normalized API error for frontend consumption.
    """
    if isinstance(error, HTTPException):
        raise error

    message = str(error)
    normalized = message.lower()
    if "execution reverted" in normalized or "revert" in normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{operation} failed: {message}",
        ) from error
    if (
        "timeout" in normalized
        or "timed out" in normalized
        or "connection" in normalized
        or "temporarily unavailable" in normalized
    ):
        upstream_status = (
            status.HTTP_503_SERVICE_UNAVAILABLE
            if read_operation
            else status.HTTP_502_BAD_GATEWAY
        )
        raise HTTPException(
            status_code=upstream_status,
            detail=f"{operation} unavailable: {message}",
        ) from error

    fallback_status = (
        status.HTTP_502_BAD_GATEWAY
        if read_operation
        else status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    raise HTTPException(
        status_code=fallback_status,
        detail=f"{operation} failed: {message}",
    ) from error
