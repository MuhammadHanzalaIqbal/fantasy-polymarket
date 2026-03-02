"""Oracle payload hashing and signing helpers."""

from typing import Any

from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3


def build_matchweek_digest(
    oracle_adapter_address: str,
    matchweek: int,
    timestamp: int,
    player_ids: list[int],
    scores: list[int],
) -> bytes:
    """Builds the OracleAdapter-compatible digest for signature verification.

    Args:
        oracle_adapter_address: Deployed oracle adapter address.
        matchweek: Matchweek identifier.
        timestamp: Payload timestamp.
        player_ids: Player IDs in submission order.
        scores: Scores in the same order as `player_ids`.

    Returns:
        Raw 32-byte digest used for signing.

    Raises:
        ValueError: If arrays are empty or mismatched.
    """
    if not player_ids or len(player_ids) != len(scores):
        raise ValueError("player_ids and scores must be non-empty and same length")

    players_hash = Web3.solidity_keccak(["uint256[]"], [player_ids])
    scores_hash = Web3.solidity_keccak(["uint256[]"], [scores])
    return Web3.solidity_keccak(
        ["address", "uint256", "uint256", "bytes32", "bytes32"],
        [oracle_adapter_address, matchweek, timestamp, players_hash, scores_hash],
    )


def sign_matchweek_digest(digest: bytes, private_key: str) -> str:
    """Signs digest using EIP-191 compatible personal message flow.

    Args:
        digest: 32-byte digest from `build_matchweek_digest`.
        private_key: Signer private key hex string.

    Returns:
        Hex-encoded signature string.
    """
    message = encode_defunct(primitive=digest)
    signed_message = Account.sign_message(message, private_key=private_key)
    return signed_message.signature.hex()


def build_submit_args(
    oracle_adapter_address: str,
    matchweek: int,
    timestamp: int,
    player_ids: list[int],
    scores: list[int],
    private_key: str,
) -> tuple[Any, ...]:
    """Constructs transaction argument tuple for OracleAdapter submission.

    Args:
        oracle_adapter_address: Deployed oracle adapter address.
        matchweek: Matchweek identifier.
        timestamp: Payload timestamp.
        player_ids: Player IDs.
        scores: Computed scores.
        private_key: Oracle signer key.

    Returns:
        Tuple for `submitMatchData`.
    """
    digest = build_matchweek_digest(
        oracle_adapter_address=oracle_adapter_address,
        matchweek=matchweek,
        timestamp=timestamp,
        player_ids=player_ids,
        scores=scores,
    )
    signature = sign_matchweek_digest(digest=digest, private_key=private_key)
    signature_hex = signature[2:] if signature.startswith("0x") else signature
    return (
        matchweek,
        timestamp,
        player_ids,
        scores,
        bytes.fromhex(signature_hex),
    )

