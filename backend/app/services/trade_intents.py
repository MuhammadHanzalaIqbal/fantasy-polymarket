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
ERC20_ALLOWANCE_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"},
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    }
]


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
    checksum_wallet = Web3.to_checksum_address(wallet_address)
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

    approval_token: str | None = None
    approval_spender: str | None = None
    required_allowance_wei: int | None = None
    current_allowance_wei: int | None = None
    approval_sufficient: bool | None = None

    if side == "buy":
        tx_data = encode_contract_call(
            contract=market_contract,
            function_name="buyShares",
            args=[resolved_player_id, amount, min_amount_out],
        )
        token_address = str(market_contract.functions.ftk().call())
        token_contract = market_contract.w3.eth.contract(
            address=Web3.to_checksum_address(token_address),
            abi=ERC20_ALLOWANCE_ABI,
        )
        allowance = int(
            token_contract.functions.allowance(
                checksum_wallet,
                Web3.to_checksum_address(market_contract.address),
            ).call()
        )
        approval_token = token_address
        approval_spender = market_contract.address
        required_allowance_wei = amount
        current_allowance_wei = allowance
        approval_sufficient = allowance >= amount
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
        approval_token=approval_token,
        approval_spender=approval_spender,
        required_allowance_wei=required_allowance_wei,
        current_allowance_wei=current_allowance_wei,
        approval_sufficient=approval_sufficient,
    )
