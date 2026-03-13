"""Services for preparing wallet-direct contest entry transactions."""

from __future__ import annotations

import time

from fastapi import HTTPException, status
from web3 import Web3
from web3.contract.contract import Contract

from backend.app.blockchain.contracts import encode_contract_call
from backend.app.models.schemas import ContestEntryIntentResponse, TransactionIntent

PLAYER_ID_SCALE = 10**18
ERC20_BALANCE_OF_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    }
]
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


def _parse_contest_tuple(contest_data: tuple[int, ...]) -> tuple[int, int, bool, int]:
    """Parses contest tuple to common fields.

    Args:
        contest_data: Raw contest tuple returned by `contests(contest_id)`.

    Returns:
        Contest entry fee, max entries, resolved status, and lock time.
    """
    if len(contest_data) >= 7:
        return (
            int(contest_data[0]),
            int(contest_data[1]),
            bool(contest_data[5]),
            int(contest_data[3]),
        )

    return (
        int(contest_data[0]),
        int(contest_data[1]),
        bool(contest_data[4]),
        int(contest_data[3]),
    )


def _count_entries(contest_manager_contract: Contract, contest_id: int) -> int:
    """Counts existing contest entries in storage.

    Args:
        contest_manager_contract: Bound ContestManager contract.
        contest_id: Contest identifier.

    Returns:
        Number of entries currently stored on chain.
    """
    entries_count = 0
    while True:
        try:
            contest_manager_contract.functions.contestEntries(
                contest_id, entries_count
            ).call()
            entries_count += 1
        except Exception:
            break
    return entries_count


def _validate_roster_holdings(
    share_manager_contract: Contract,
    user_wallet: str,
    players: list[int],
) -> None:
    """Validates roster player listing and user holdings before tx build.

    Args:
        share_manager_contract: Bound PlayerShareManager contract.
        user_wallet: User wallet in checksum format.
        players: Candidate roster player IDs.

    Raises:
        HTTPException: When a player is missing or user has no shares.
    """
    web3 = share_manager_contract.w3
    for player_id in players:
        token_address = str(
            share_manager_contract.functions.playerToken(player_id).call()
        )
        if token_address == "0x0000000000000000000000000000000000000000":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"player {player_id} is not listed in share manager",
            )
        token_contract = web3.eth.contract(
            address=Web3.to_checksum_address(token_address),
            abi=ERC20_BALANCE_OF_ABI,
        )
        balance = int(token_contract.functions.balanceOf(user_wallet).call())
        if balance <= 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"user has no shares for player {player_id}",
            )


def _resolve_share_player_id(share_manager_contract: Contract, player_id: int) -> int:
    """Resolves player ID in share manager using raw or scaled indexing.

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


def _normalize_roster_player_ids(
    share_manager_contract: Contract,
    players: list[int],
) -> list[int]:
    """Normalizes roster IDs to share-manager storage scheme.

    Args:
        share_manager_contract: Bound PlayerShareManager contract.
        players: Requested roster player IDs.

    Returns:
        Resolved roster player IDs with deterministic order.
    """
    resolved_players: list[int] = []
    for player_id in players:
        resolved_players.append(
            _resolve_share_player_id(share_manager_contract, player_id)
        )
    return resolved_players


def build_contest_entry_intent(
    contest_manager_contract: Contract,
    share_manager_contract: Contract,
    wallet_address: str,
    contest_id: int,
    players: list[int],
    chain_id: int,
) -> ContestEntryIntentResponse:
    """Builds unsigned contest-entry payload for frontend wallet submission.

    Args:
        contest_manager_contract: Bound ContestManager contract.
        share_manager_contract: Bound PlayerShareManager contract.
        wallet_address: User wallet address.
        contest_id: Contest identifier.
        players: Selected player IDs for roster.
        chain_id: Target blockchain chain ID.

    Returns:
        Contest entry intent payload and metadata.
    """
    checksum_wallet = Web3.to_checksum_address(wallet_address)
    resolved_players = _normalize_roster_player_ids(
        share_manager_contract=share_manager_contract,
        players=players,
    )
    contest_data = tuple(contest_manager_contract.functions.contests(contest_id).call())
    entry_fee, max_entries, resolved, lock_time = _parse_contest_tuple(contest_data)
    if resolved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest is already resolved",
        )
    if int(time.time()) >= lock_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest is already locked",
        )
    has_entered = bool(
        contest_manager_contract.functions.entered(contest_id, checksum_wallet).call()
    )
    if has_entered:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="wallet already entered this contest",
        )
    entries_count = _count_entries(contest_manager_contract, contest_id)
    if entries_count >= max_entries:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="contest is full",
        )
    _validate_roster_holdings(
        share_manager_contract=share_manager_contract,
        user_wallet=checksum_wallet,
        players=resolved_players,
    )
    ftk_address = str(contest_manager_contract.functions.ftk().call())
    ftk_contract = contest_manager_contract.w3.eth.contract(
        address=Web3.to_checksum_address(ftk_address),
        abi=ERC20_ALLOWANCE_ABI,
    )
    current_allowance = int(
        ftk_contract.functions.allowance(
            checksum_wallet,
            Web3.to_checksum_address(contest_manager_contract.address),
        ).call()
    )
    tx_data = encode_contract_call(
        contract=contest_manager_contract,
        function_name="enterContest",
        args=[contest_id, resolved_players],
    )
    return ContestEntryIntentResponse(
        contest_id=contest_id,
        wallet_address=checksum_wallet,
        entry_fee=entry_fee,
        players=players,
        resolved_players=resolved_players,
        tx_intent=TransactionIntent(
            to=contest_manager_contract.address,
            data=tx_data,
            value_wei=0,
            chain_id=chain_id,
        ),
        approval_token=ftk_address,
        approval_spender=contest_manager_contract.address,
        required_allowance_wei=entry_fee,
        current_allowance_wei=current_allowance,
        approval_sufficient=current_allowance >= entry_fee,
    )
