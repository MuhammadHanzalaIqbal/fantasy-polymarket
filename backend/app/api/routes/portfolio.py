"""Portfolio routes."""

from fastapi import APIRouter, Depends, HTTPException, status
from web3 import Web3

from backend.app.api.deps import get_blockchain_client
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import PortfolioResponse

router = APIRouter(prefix="/portfolio", tags=["portfolio"])
PLAYER_ID_SCALE = 10**18
PORTFOLIO_MAX_RAW_PLAYER_ID = 200
MAX_CONSECUTIVE_MISSING_PLAYERS = 25


def _detect_player_id_scale(market_contract: object) -> int | None:
    """Detects whether market stores players with raw or scaled IDs.

    Args:
        market_contract: Bound PlayerMarket contract instance.

    Returns:
        `1` for raw indexing, `PLAYER_ID_SCALE` for scaled indexing,
        or `None` when detection is ambiguous.
    """
    raw_exists = bool(market_contract.functions.players(1).call()[2])
    scaled_exists = bool(market_contract.functions.players(PLAYER_ID_SCALE).call()[2])

    if raw_exists and not scaled_exists:
        return 1
    if scaled_exists and not raw_exists:
        return PLAYER_ID_SCALE
    return None


def _iter_existing_player_ids(
    market_contract: object,
    max_raw_player_id: int,
    id_scale: int | None,
    max_consecutive_missing: int,
) -> list[int]:
    """Finds existing player IDs while stopping early on sparse ranges.

    Args:
        market_contract: Bound PlayerMarket contract instance.
        max_raw_player_id: Highest raw ID value to probe.
        id_scale: Resolved player ID scale or `None` when ambiguous.
        max_consecutive_missing: Early-stop threshold for absent IDs.

    Returns:
        Existing player IDs in market storage.
    """
    existing_player_ids: list[int] = []
    consecutive_missing = 0

    for raw_player_id in range(1, max_raw_player_id + 1):
        if id_scale == 1:
            candidate_ids = [raw_player_id]
        elif id_scale == PLAYER_ID_SCALE:
            candidate_ids = [raw_player_id * PLAYER_ID_SCALE]
        else:
            candidate_ids = [raw_player_id, raw_player_id * PLAYER_ID_SCALE]

        exists_for_raw_id = False
        for candidate_id in candidate_ids:
            exists = bool(market_contract.functions.players(candidate_id).call()[2])
            if not exists:
                continue
            existing_player_ids.append(candidate_id)
            exists_for_raw_id = True

        if exists_for_raw_id:
            consecutive_missing = 0
            continue

        consecutive_missing += 1
        if consecutive_missing >= max_consecutive_missing:
            break

    return existing_player_ids


def _read_user_shares(market_contract: object, player_id: int, wallet: str) -> int:
    """Reads player share balance with compatibility across market versions.

    Args:
        market_contract: Bound PlayerMarket contract instance.
        player_id: Player ID in market storage.
        wallet: User wallet address in checksum format.

    Returns:
        Share balance for the user and player.
    """
    user_balance = int(market_contract.functions.userBalance(player_id, wallet).call())
    if user_balance > 0:
        return user_balance

    return int(market_contract.functions.userShares(player_id, wallet).call())


def _player_ids_from_user_events(market_contract: object, wallet: str) -> list[int]:
    """Extracts candidate player IDs from user trade events.

    Args:
        market_contract: Bound PlayerMarket contract instance.
        wallet: User wallet address in checksum format.

    Returns:
        Sorted unique player IDs observed in user buy/sell events.
    """
    player_ids: set[int] = set()

    for event_name in ("BoughtShares", "SoldShares"):
        event_factory = getattr(market_contract.events, event_name, None)
        if event_factory is None:
            continue

        logs = event_factory().get_logs(
            from_block=0,
            to_block="latest",
            argument_filters={"user": wallet},
        )
        for log in logs:
            player_ids.add(int(log["args"]["playerId"]))

    return sorted(player_ids)


@router.get("/{wallet_address}", response_model=PortfolioResponse)
def get_portfolio(
    wallet_address: str,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> PortfolioResponse:
    """Returns FTK balance and player share balances for a wallet."""

    settings = get_settings()
    if not settings.fantasy_token_address or not settings.player_market_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="fantasy_token_address and player_market_address must be configured",
        )

    try:
        checksum_wallet = Web3.to_checksum_address(wallet_address)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="invalid wallet address format",
        ) from error

    ftk = blockchain_client.contract("FantasyToken", settings.fantasy_token_address)
    market = blockchain_client.contract("PlayerMarket", settings.player_market_address)

    ftk_balance = int(ftk.functions.balanceOf(checksum_wallet).call())
    player_shares: dict[int, int] = {}

    try:
        existing_player_ids = _player_ids_from_user_events(market, checksum_wallet)
    except Exception:
        player_id_scale = _detect_player_id_scale(market)
        existing_player_ids = _iter_existing_player_ids(
            market_contract=market,
            max_raw_player_id=PORTFOLIO_MAX_RAW_PLAYER_ID,
            id_scale=player_id_scale,
            max_consecutive_missing=MAX_CONSECUTIVE_MISSING_PLAYERS,
        )

    for player_id in existing_player_ids:
        shares = _read_user_shares(market, player_id, checksum_wallet)
        if shares > 0:
            player_shares[player_id] = shares

    return PortfolioResponse(
        wallet_address=checksum_wallet,
        ftk_balance=ftk_balance,
        player_shares=player_shares,
    )

