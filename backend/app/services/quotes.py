"""Quote and simulation services for market actions."""

from typing import Literal


def estimate_quote(
    side: Literal["buy", "sell"],
    amount: int,
    reference_price_wei: int,
) -> int:
    """Estimates output amount for basic buy or sell simulation.

    Args:
        side: Trade side, either `buy` or `sell`.
        amount: Input amount in wei units.
        reference_price_wei: Price of one share in wei precision.

    Returns:
        Estimated output amount in wei units.

    Raises:
        ValueError: If amount or price is non-positive.
    """
    if amount <= 0:
        raise ValueError("amount must be positive")
    if reference_price_wei <= 0:
        raise ValueError("reference_price_wei must be positive")

    if side == "buy":
        return (amount * 10**18) // reference_price_wei
    return (amount * reference_price_wei) // 10**18

