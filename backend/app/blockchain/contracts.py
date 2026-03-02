"""Contract ABI loading and instantiation utilities."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from web3 import Web3
from web3.contract.contract import Contract

ARTIFACTS_DIR = Path(__file__).resolve().parents[3] / "artifacts"


def load_abi(contract_name: str) -> list[dict[str, Any]]:
    """Loads contract ABI from Remix metadata artifacts.

    Args:
        contract_name: Contract class name used in artifacts.

    Returns:
        ABI JSON list for web3 contract binding.

    Raises:
        FileNotFoundError: If metadata artifact cannot be found.
        KeyError: If ABI structure is missing.
    """
    metadata_path = ARTIFACTS_DIR / f"{contract_name}_metadata.json"
    if not metadata_path.exists():
        raise FileNotFoundError(f"Missing metadata file: {metadata_path}")

    with metadata_path.open("r", encoding="utf-8") as file:
        metadata = json.load(file)

    return metadata["output"]["abi"]


def get_contract(
    web3_client: Web3,
    contract_name: str,
    contract_address: str,
) -> Contract:
    """Creates a typed web3 contract instance for an address.

    Args:
        web3_client: Initialized web3 instance.
        contract_name: Contract class name used to resolve ABI.
        contract_address: Deployed contract address.

    Returns:
        Bound `Contract` instance.
    """
    abi = load_abi(contract_name)
    checksum_address = Web3.to_checksum_address(contract_address)
    return web3_client.eth.contract(address=checksum_address, abi=abi)

