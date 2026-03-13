"""Services for contest result and leaderboard normalization."""

from web3.contract.contract import Contract

from backend.app.models.schemas import (
    ContestResultEntryResponse,
    ContestResultsResponse,
)


def _read_contest_metadata(
    contest_manager_contract: Contract,
    contest_id: int,
) -> tuple[bool, int]:
    """Reads normalized resolved/total-pot values from contest storage.

    Args:
        contest_manager_contract: Bound ContestManager contract.
        contest_id: Contest identifier.

    Returns:
        Tuple of resolved flag and total pot.
    """
    contest_data = tuple(contest_manager_contract.functions.contests(contest_id).call())
    if len(contest_data) >= 7:
        return bool(contest_data[5]), int(contest_data[6])
    return bool(contest_data[4]), int(contest_data[5])


def build_contest_results(
    contest_manager_contract: Contract,
    contest_id: int,
) -> ContestResultsResponse:
    """Builds contest results payload from on-chain entries.

    Args:
        contest_manager_contract: Bound ContestManager contract.
        contest_id: Contest identifier.

    Returns:
        Contest results payload sorted by score.
    """
    resolved, total_pot = _read_contest_metadata(
        contest_manager_contract=contest_manager_contract,
        contest_id=contest_id,
    )
    entries: list[ContestResultEntryResponse] = []
    index = 0
    while True:
        try:
            entry = contest_manager_contract.functions.contestEntries(
                contest_id, index
            ).call()
            entries.append(
                ContestResultEntryResponse(
                    rank=index + 1,
                    user=str(entry[0]),
                    score=int(entry[2]),
                    prize_wei=0,
                )
            )
            index += 1
        except Exception:
            break
    entries.sort(key=lambda item: item.score, reverse=True)
    for rank, entry in enumerate(entries, start=1):
        entry.rank = rank
    return ContestResultsResponse(
        contest_id=contest_id,
        resolved=resolved,
        total_pot=total_pot,
        winners_count=0,
        entries=entries,
    )
