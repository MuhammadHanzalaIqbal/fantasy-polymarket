"""Contest read and operations routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import get_blockchain_client, require_demo_admin
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import (
    ContestEntryIntentRequest,
    ContestEntryIntentResponse,
    ContestResponse,
    ContestResultsResponse,
    LeaderboardEntryResponse,
    TransactionResponse,
)
from backend.app.services.admin_ops import resolve_contest as resolve_contest_tx
from backend.app.services.contest_entry import build_contest_entry_intent
from backend.app.services.contest_results import build_contest_results

router = APIRouter(prefix="/contests", tags=["contests"])


def _parse_contest_tuple(contest_data: tuple) -> ContestResponse:
    """Parses contest tuple for both legacy and current contract layouts."""

    if len(contest_data) >= 7:
        # Legacy layout:
        # [entryFee, maxEntries, startTime, lockTime, rakeBps, resolved, totalPot]
        return ContestResponse(
            contest_id=0,
            entry_fee=int(contest_data[0]),
            max_entries=int(contest_data[1]),
            start_time=int(contest_data[2]),
            lock_time=int(contest_data[3]),
            rake_bps=int(contest_data[4]),
            resolved=bool(contest_data[5]),
            total_pot=int(contest_data[6]),
        )

    # Current layout:
    # [entryFee, maxEntries, startTime, lockTime, resolved, totalPot]
    return ContestResponse(
        contest_id=0,
        entry_fee=int(contest_data[0]),
        max_entries=int(contest_data[1]),
        start_time=int(contest_data[2]),
        lock_time=int(contest_data[3]),
        rake_bps=0,
        resolved=bool(contest_data[4]),
        total_pot=int(contest_data[5]),
    )


@router.get("", response_model=list[ContestResponse])
def list_contests(
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> list[ContestResponse]:
    """Returns contest metadata indexed by contract IDs."""

    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )
    contest_manager = blockchain_client.contract(
        "ContestManager", settings.contest_manager_address
    )
    next_contest_id = int(contest_manager.functions.nextContestId().call())
    contests: list[ContestResponse] = []
    for contest_id in range(1, next_contest_id + 1):
        contest = contest_manager.functions.contests(contest_id).call()
        parsed = _parse_contest_tuple(tuple(contest))
        parsed.contest_id = contest_id
        contests.append(parsed)
    return contests


@router.get("/{contest_id}/leaderboard", response_model=list[LeaderboardEntryResponse])
def get_leaderboard(
    contest_id: int,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> list[LeaderboardEntryResponse]:
    """Returns leaderboard entries from on-chain contest storage."""

    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )

    contest_manager = blockchain_client.contract(
        "ContestManager", settings.contest_manager_address
    )
    entries: list[LeaderboardEntryResponse] = []
    index = 0
    while True:
        try:
            entry = contest_manager.functions.contestEntries(contest_id, index).call()
            entries.append(
                LeaderboardEntryResponse(
                    rank=index + 1,
                    user=str(entry[0]),
                    score=int(entry[2]),
                )
            )
            index += 1
        except Exception:
            break

    entries.sort(key=lambda row: row.score, reverse=True)
    for rank, entry in enumerate(entries, start=1):
        entry.rank = rank
    return entries


@router.get("/{contest_id}/results", response_model=ContestResultsResponse)
def get_contest_results(
    contest_id: int,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> ContestResultsResponse:
    """Returns normalized contest results for frontend details page."""
    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )
    contest_manager = blockchain_client.contract(
        "ContestManager", settings.contest_manager_address
    )
    return build_contest_results(
        contest_manager_contract=contest_manager,
        contest_id=contest_id,
    )


@router.post("/{contest_id}/entry-intent", response_model=ContestEntryIntentResponse)
def create_entry_intent(
    contest_id: int,
    request: ContestEntryIntentRequest,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> ContestEntryIntentResponse:
    """Builds unsigned transaction payload for contest entry."""
    settings = get_settings()
    if (
        not settings.contest_manager_address
        or not settings.player_share_manager_address
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "contest_manager_address and player_share_manager_address "
                "must be configured"
            ),
        )
    contest_manager = blockchain_client.contract(
        "ContestManager", settings.contest_manager_address
    )
    share_manager = blockchain_client.contract(
        "PlayerShareManager", settings.player_share_manager_address
    )
    return build_contest_entry_intent(
        contest_manager_contract=contest_manager,
        share_manager_contract=share_manager,
        wallet_address=request.wallet_address,
        contest_id=contest_id,
        players=request.players,
        chain_id=settings.chain_id,
    )


@router.post(
    "/{contest_id}/resolve",
    response_model=TransactionResponse,
    dependencies=[Depends(require_demo_admin)],
)
def resolve_contest_route(
    contest_id: int,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> TransactionResponse:
    """Triggers on-chain contest resolution for demo operations."""

    settings = get_settings()
    if not settings.contest_manager_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest_manager_address is not configured",
        )
    contest_manager = blockchain_client.contract(
        "ContestManager", settings.contest_manager_address
    )
    try:
        return resolve_contest_tx(
            blockchain_client=blockchain_client,
            contest_manager_contract=contest_manager,
            contest_id=contest_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error

