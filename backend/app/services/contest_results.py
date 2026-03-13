"""Services for contest result and leaderboard normalization."""

from web3 import Web3
from web3.contract.contract import Contract

from backend.app.models.schemas import (
    ContestResultEntryResponse,
    ContestResultsResponse,
)

CONTESTS_MAPPING_SLOT = 6
CONTEST_PRIZE_BPS_OFFSET = 6


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
    prize_bps = _read_prize_bps_from_storage(
        contest_manager_contract=contest_manager_contract,
        contest_id=contest_id,
    )
    winners_count = min(len(entries), len(prize_bps)) if resolved else 0
    if resolved:
        for index, prize_bp in enumerate(prize_bps):
            if index >= len(entries):
                break
            entries[index].prize_wei = (total_pot * prize_bp) // 10_000

    return ContestResultsResponse(
        contest_id=contest_id,
        resolved=resolved,
        total_pot=total_pot,
        winners_count=winners_count,
        entries=entries,
    )


def _read_prize_bps_from_storage(
    contest_manager_contract: Contract,
    contest_id: int,
) -> list[int]:
    """Reads prize basis points from contest struct storage.

    Args:
        contest_manager_contract: Bound ContestManager contract.
        contest_id: Contest identifier.

    Returns:
        Prize distribution basis points.
    """
    try:
        mapping_base_slot = int.from_bytes(
            Web3.solidity_keccak(
                ["uint256", "uint256"],
                [contest_id, CONTESTS_MAPPING_SLOT],
            ),
            "big",
        )
        prize_length_slot = mapping_base_slot + CONTEST_PRIZE_BPS_OFFSET
        prize_length = int.from_bytes(
            contest_manager_contract.w3.eth.get_storage_at(
                contest_manager_contract.address,
                prize_length_slot,
            ),
            "big",
        )
        if prize_length <= 0 or prize_length > 100:
            return []
        prize_data_base_slot = int.from_bytes(
            Web3.keccak(prize_length_slot.to_bytes(32, byteorder="big")),
            "big",
        )
        prize_bps: list[int] = []
        for index in range(prize_length):
            value = int.from_bytes(
                contest_manager_contract.w3.eth.get_storage_at(
                    contest_manager_contract.address,
                    prize_data_base_slot + index,
                ),
                "big",
            )
            if value > 0:
                prize_bps.append(value)
        return prize_bps
    except Exception:
        return []
