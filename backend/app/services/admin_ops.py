"""Admin operation services for demo API endpoints."""

from sqlalchemy.orm import Session
from web3.contract.contract import Contract

from backend.app.blockchain.client import BlockchainClient, TxResult
from backend.app.models.schemas import (
    AdminCreateContestRequest,
    AdminCreatePlayerRequest,
    AdminCreatePlayerResponse,
    TransactionResponse,
)
from backend.app.services.contest_ops import is_contest_resolvable
from backend.app.services.player_profiles import upsert_player_avatar_url


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
    db_session: Session,
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
    token_address = str(
        share_manager_contract.functions.playerToken(request.player_id).call()
    )
    token_already_exists = token_address != "0x0000000000000000000000000000000000000000"
    market_pool = market_contract.functions.players(request.player_id).call()
    player_already_listed = bool(market_pool[2])

    create_token_response: TransactionResponse | None = None
    add_market_response: TransactionResponse | None = None

    if not token_already_exists:
        create_token_result = blockchain_client.send_transaction(
            contract=share_manager_contract,
            function_name="createPlayerToken",
            args=(request.player_id, request.token_name, request.token_symbol),
        )
        create_token_response = _to_transaction_response(create_token_result)

    if not player_already_listed:
        add_market_result = blockchain_client.send_transaction(
            contract=market_contract,
            function_name="addPlayer",
            args=(request.player_id,),
        )
        add_market_response = _to_transaction_response(add_market_result)

    upsert_player_avatar_url(
        db_session=db_session,
        player_id=request.player_id,
        avatar_url=request.avatar_url,
    )

    return AdminCreatePlayerResponse(
        player_id=request.player_id,
        token_already_exists=token_already_exists,
        player_already_listed=player_already_listed,
        create_token_tx=create_token_response,
        add_market_tx=add_market_response,
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
