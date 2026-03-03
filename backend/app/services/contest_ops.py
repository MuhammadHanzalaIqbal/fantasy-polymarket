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
    # Supports both tuple layouts:
    # legacy: [entryFee, maxEntries, startTime, lockTime, rakeBps, resolved, totalPot]
    # current: [entryFee, maxEntries, startTime, lockTime, resolved, totalPot]
    resolved_index = 5 if len(contest_data) >= 7 else 4
    resolved_flag = bool(contest_data[resolved_index])
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

