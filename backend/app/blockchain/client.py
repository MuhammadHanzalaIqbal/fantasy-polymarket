"""Web3 client wrapper for contract reads and writes."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from eth_account import Account
from web3 import HTTPProvider, Web3
from web3.contract.contract import Contract

from backend.app.blockchain.contracts import get_contract
from backend.app.config import Settings


@dataclass(slots=True)
class TxResult:
    """Represents a sent transaction and receipt metadata."""

    tx_hash: str
    block_number: int | None
    status: int


class BlockchainClient:
    """Thin abstraction around web3.py for MVP operations."""

    def __init__(self, settings: Settings) -> None:
        """Initializes chain provider and signer context.

        Args:
            settings: Runtime application settings.
        """
        self._settings = settings
        self.web3 = Web3(
            HTTPProvider(
                settings.rpc_url,
                request_kwargs={"timeout": settings.request_timeout_seconds},
            )
        )
        self._account = (
            Account.from_key(settings.private_key) if settings.private_key else None
        )

    def is_connected(self) -> bool:
        """Returns chain connectivity status."""

        return self.web3.is_connected()

    def latest_block(self) -> int | None:
        """Fetches latest block number when available."""
        if not self.is_connected():
            return None
        return int(self.web3.eth.block_number)

    def runtime_chain_id(self) -> int | None:
        """Returns connected chain ID."""
        if not self.is_connected():
            return None
        return int(self.web3.eth.chain_id)

    def require_account(self) -> str:
        """Returns signer address or raises when private key is missing.

        Returns:
            Checksum signer address.

        Raises:
            ValueError: If signer key is not configured.
        """
        if self._account is None:
            raise ValueError("private_key is required for transaction endpoints")
        return self._account.address

    def contract(self, name: str, address: str) -> Contract:
        """Returns a bound contract by name and address."""

        return get_contract(self.web3, name, address)

    def send_transaction(
        self,
        contract: Contract,
        function_name: str,
        args: tuple[Any, ...],
        value_wei: int = 0,
    ) -> TxResult:
        """Builds, signs, sends and waits for receipt of a contract transaction.

        Args:
            contract: Bound web3 contract instance.
            function_name: Contract function to invoke.
            args: Positional function arguments.
            value_wei: Optional native value to send.

        Returns:
            Transaction hash and receipt status metadata.
        """
        sender = self.require_account()
        nonce = self.web3.eth.get_transaction_count(sender)
        gas_price = self.web3.eth.gas_price

        function_ref = getattr(contract.functions, function_name)(*args)
        estimated_gas = function_ref.estimate_gas({"from": sender, "value": value_wei})

        tx = function_ref.build_transaction(
            {
                "from": sender,
                "nonce": nonce,
                "chainId": self._settings.chain_id,
                "gas": max(estimated_gas, 250_000),
                "gasPrice": gas_price,
                "value": value_wei,
            }
        )

        assert self._account is not None
        signed = self._account.sign_transaction(tx)
        tx_hash = self.web3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        return TxResult(
            tx_hash=tx_hash.hex(),
            block_number=receipt.blockNumber,
            status=int(receipt.status),
        )

