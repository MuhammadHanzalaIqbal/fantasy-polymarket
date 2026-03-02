"""Oracle operation routes."""

from fastapi import APIRouter, Depends, HTTPException, status

from backend.app.api.deps import get_blockchain_client, require_demo_admin
from backend.app.blockchain.client import BlockchainClient
from backend.app.config import get_settings
from backend.app.models.schemas import OracleSubmitRequest, TransactionResponse
from backend.app.oracle.payloads import build_submit_args

router = APIRouter(prefix="/oracle", tags=["oracle"])


@router.post(
    "/submit-matchweek",
    response_model=TransactionResponse,
    dependencies=[Depends(require_demo_admin)],
)
def submit_matchweek(
    request: OracleSubmitRequest,
    blockchain_client: BlockchainClient = Depends(get_blockchain_client),
) -> TransactionResponse:
    """Submits signed matchweek data to OracleAdapter."""

    settings = get_settings()
    if not settings.oracle_adapter_address:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="oracle_adapter_address is not configured",
        )
    if not settings.private_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="private_key is required for oracle submission",
        )
    if len(request.player_ids) != len(request.scores):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="player_ids and scores must have equal length",
        )

    oracle_adapter = blockchain_client.contract(
        "OracleAdapter", settings.oracle_adapter_address
    )
    tx_args = build_submit_args(
        oracle_adapter_address=settings.oracle_adapter_address,
        matchweek=request.matchweek,
        timestamp=request.timestamp,
        player_ids=request.player_ids,
        scores=request.scores,
        private_key=settings.private_key,
    )
    result = blockchain_client.send_transaction(
        contract=oracle_adapter,
        function_name="submitMatchData",
        args=tx_args,
    )
    return TransactionResponse(
        tx_hash=result.tx_hash,
        block_number=result.block_number,
        status=result.status,
    )

