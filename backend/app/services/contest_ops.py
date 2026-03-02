"""Contest-related orchestration helpers."""

from web3.contract.contract import Contract


def is_contest_resolvable(contest_contract: Contract, contest_id: int) -> bool:
    """Checks whether a contest can be resolved using contract state.

    Args:
        contest_contract: Bound contest manager contract.
        contest_id: Contest identifier.

    Returns:
        True when contest is not resolved and has at least one entry.
    """
    contest_data = contest_contract.functions.contests(contest_id).call()
    resolved_flag = bool(contest_data[5])
    if resolved_flag:
        return False

    entries_count = 0
    while True:
        try:
            contest_contract.functions.contestEntries(contest_id, entries_count).call()
            entries_count += 1
        except Exception:
            break

    return entries_count > 0

