// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract FantasyToken is ERC20, ERC20Permit, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    uint256 public maxSupply;

    event MaxSupplyUpdated(uint256 newMaxSupply);

    constructor(
        address admin,
        uint256 _maxSupply
    )
        ERC20("Fantasy Token", "FTK")
        ERC20Permit("Fantasy Token")
    {
        require(admin != address(0), "Invalid admin");

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);

        maxSupply = _maxSupply;
    }

    function mint(address to, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        whenNotPaused
    {
        require(to != address(0), "Invalid recipient");

        if (maxSupply != 0) {
            require(totalSupply() + amount <= maxSupply, "Max supply exceeded");
        }

        _mint(to, amount);
    }

    function burn(address from, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        whenNotPaused
    {
        require(from != address(0), "Invalid address");
        _burn(from, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setMaxSupply(uint256 _maxSupply)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(_maxSupply == 0 || _maxSupply >= totalSupply(), "Below current supply");
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(_maxSupply);
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        super._update(from, to, value);
    }
}