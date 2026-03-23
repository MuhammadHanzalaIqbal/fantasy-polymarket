"""Resolves fantasy player IDs against on-chain share manager storage."""

from __future__ import annotations

from fastapi import HTTPException, status
from web3.contract.contract import Contract

PLAYER_ID_SCALE = 10**18


def resolve_share_manager_player_id(
    share_manager_contract: Contract,
    player_id: int,
) -> int:
    """Resolves player ID in share manager using raw or scaled indexing.

    Some deployments register share tokens at raw IDs (1, 2, 3) and others at
    scaled IDs (1e18, 2e18, ...). This probes both when the request uses a
    small integer.

    Args:
        share_manager_contract: Bound PlayerShareManager contract.
        player_id: Requested player identifier.

    Returns:
        Existing player ID used by share manager.

    Raises:
        HTTPException: If player token is missing in both indexing schemes.
    """
    candidate_ids = [player_id]
    if player_id < PLAYER_ID_SCALE:
        candidate_ids.append(player_id * PLAYER_ID_SCALE)
    for candidate_id in candidate_ids:
        token_address = str(
            share_manager_contract.functions.playerToken(candidate_id).call()
        )
        if token_address != "0x0000000000000000000000000000000000000000":
            return candidate_id
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"player {player_id} is not listed in share manager",
    )
