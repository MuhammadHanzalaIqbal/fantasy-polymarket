"""Services for preparing wallet-direct market trade transactions."""

from typing import Literal

from fastapi import HTTPException, status
from web3 import Web3
from web3.contract.contract import Contract

from backend.app.blockchain.contracts import encode_contract_call
from backend.app.models.schemas import TradeIntentResponse, TransactionIntent
from backend.app.services.quotes import estimate_quote

PLAYER_ID_SCALE = 10**18
BPS_DENOMINATOR = 10_000


def _resolve_player_id_for_market(market_contract: Contract, player_id: int) -> int:
    """Resolves player ID using raw or 1e18-scaled indexing.

    Args:
        market_contract: Bound PlayerMarket contract instance.
        player_id: Requested player identifier.

    Returns:
        Existing player ID in market storage.

    Raises:
        HTTPException: If player is not found in either indexing scheme.
    """
    candidate_ids = [player_id]
    if player_id < PLAYER_ID_SCALE:
        candidate_ids.append(player_id * PLAYER_ID_SCALE)

    for candidate_id in candidate_ids:
        pool = market_contract.functions.players(candidate_id).call()
        if bool(pool[2]):
            return candidate_id

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Player {player_id} not found in market",
    )


def _calculate_min_out(estimated_amount_out: int, slippage_bps: int) -> int:
    """Calculates minimum acceptable output from slippage configuration.

    Args:
        estimated_amount_out: Estimated output amount from quote simulation.
        slippage_bps: Slippage tolerance in basis points.

    Returns:
        Minimum output amount accepted by the transaction.
    """
    return (estimated_amount_out * (BPS_DENOMINATOR - slippage_bps)) // BPS_DENOMINATOR


def build_trade_intent(
    market_contract: Contract,
    wallet_address: str,
    player_id: int,
    side: Literal["buy", "sell"],
    amount: int,
    slippage_bps: int,
    chain_id: int,
) -> TradeIntentResponse:
    """Builds unsigned market trade payload for frontend wallet submission.

    Args:
        market_contract: Bound PlayerMarket contract instance.
        wallet_address: User wallet address.
        player_id: Requested player ID.
        side: Trade side, `buy` or `sell`.
        amount: Input amount for transaction side.
        slippage_bps: Allowed slippage tolerance.
        chain_id: Target blockchain chain ID.

    Returns:
        Trade intent payload including quote and unsigned transaction fields.
    """
    Web3.to_checksum_address(wallet_address)
    resolved_player_id = _resolve_player_id_for_market(market_contract, player_id)
    reference_price_wei = int(
        market_contract.functions.getSharePrice(resolved_player_id).call()
    )
    estimated_amount_out = estimate_quote(
        side=side,
        amount=amount,
        reference_price_wei=reference_price_wei,
    )
    min_amount_out = _calculate_min_out(
        estimated_amount_out=estimated_amount_out,
        slippage_bps=slippage_bps,
    )

    if side == "buy":
        tx_data = encode_contract_call(
            contract=market_contract,
            function_name="buyShares",
            args=[resolved_player_id, amount, min_amount_out],
        )
    else:
        tx_data = encode_contract_call(
            contract=market_contract,
            function_name="sellShares",
            args=[resolved_player_id, amount, min_amount_out],
        )

    return TradeIntentResponse(
        player_id=resolved_player_id,
        side=side,
        amount_in=amount,
        estimated_amount_out=estimated_amount_out,
        min_amount_out=min_amount_out,
        reference_price_wei=reference_price_wei,
        tx_intent=TransactionIntent(
            to=market_contract.address,
            data=tx_data,
            value_wei=0,
            chain_id=chain_id,
        ),
    )
