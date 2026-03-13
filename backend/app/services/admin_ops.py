"""Admin operation services for demo API endpoints."""

from web3.contract.contract import Contract

from backend.app.blockchain.client import BlockchainClient, TxResult
from backend.app.models.schemas import (
    AdminCreateContestRequest,
    AdminCreatePlayerRequest,
    AdminCreatePlayerResponse,
    TransactionResponse,
)
from backend.app.services.contest_ops import is_contest_resolvable


def _to_transaction_response(result: TxResult) -> TransactionResponse:
    """Converts blockchain client tx result to API schema.

    Args:
        result: Transaction result object.

    Returns:
        Serialized API transaction response.
    """
    return TransactionResponse(
        tx_hash=str(result.tx_hash),
        block_number=result.block_number,
        status=int(result.status),
    )


def create_player_and_market_listing(
    blockchain_client: BlockchainClient,
    share_manager_contract: Contract,
    market_contract: Contract,
    request: AdminCreatePlayerRequest,
) -> AdminCreatePlayerResponse:
    """Creates player token and lists player in market.

    Args:
        blockchain_client: Blockchain client used for writes.
        share_manager_contract: Bound PlayerShareManager contract.
        market_contract: Bound PlayerMarket contract.
        request: API input payload for player creation.

    Returns:
        Player creation and listing transaction metadata.
    """
    create_token_result = blockchain_client.send_transaction(
        contract=share_manager_contract,
        function_name="createPlayerToken",
        args=(request.player_id, request.token_name, request.token_symbol),
    )
    add_market_result = blockchain_client.send_transaction(
        contract=market_contract,
        function_name="addPlayer",
        args=(request.player_id,),
    )
    return AdminCreatePlayerResponse(
        player_id=request.player_id,
        create_token_tx=_to_transaction_response(create_token_result),
        add_market_tx=_to_transaction_response(add_market_result),
    )


def create_contest(
    blockchain_client: BlockchainClient,
    contest_manager_contract: Contract,
    request: AdminCreateContestRequest,
) -> TransactionResponse:
    """Creates a new contest on chain.

    Args:
        blockchain_client: Blockchain client used for writes.
        contest_manager_contract: Bound ContestManager contract.
        request: API input payload for contest creation.

    Returns:
        Transaction metadata for contest creation.
    """
    result = blockchain_client.send_transaction(
        contract=contest_manager_contract,
        function_name="createContest",
        args=(
            request.entry_fee,
            request.max_entries,
            request.start_time,
            request.lock_time,
            request.prize_bps,
        ),
    )
    return _to_transaction_response(result)


def resolve_contest(
    blockchain_client: BlockchainClient,
    contest_manager_contract: Contract,
    contest_id: int,
) -> TransactionResponse:
    """Resolves a contest if it is currently resolvable.

    Args:
        blockchain_client: Blockchain client used for writes.
        contest_manager_contract: Bound ContestManager contract.
        contest_id: Contest identifier.

    Returns:
        Transaction metadata for contest resolution.

    Raises:
        ValueError: If contest state does not allow resolution.
    """
    if not is_contest_resolvable(contest_manager_contract, contest_id):
        raise ValueError("contest is not resolvable in current state")
    result = blockchain_client.send_transaction(
        contract=contest_manager_contract,
        function_name="resolveContest",
        args=(contest_id,),
    )
    return _to_transaction_response(result)
