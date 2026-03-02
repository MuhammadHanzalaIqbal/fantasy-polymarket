// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFantasyToken {
    function mint(address to, uint256 amount) external;
}

contract DepositRouter is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IFantasyToken public immutable ftk;

    mapping(address => bool) public supportedAsset;

    event Deposited(
        address indexed user,
        address indexed asset,
        uint256 assetAmount,
        uint256 ftkMinted
    );

    event AssetSupported(address asset, bool supported);

    constructor(address _ftk, address admin) {
        require(_ftk != address(0), "Invalid FTK");
        require(admin != address(0), "Invalid admin");

        ftk = IFantasyToken(_ftk);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function setSupportedAsset(address asset, bool supported)
        external
        onlyRole(ADMIN_ROLE)
    {
        supportedAsset[asset] = supported;
        emit AssetSupported(asset, supported);
    }

    function deposit(
        address asset,
        uint256 amount,
        uint256 minFTKOut
    ) external nonReentrant {
        require(supportedAsset[asset], "Asset not supported");
        require(amount > 0, "Zero amount");

        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        require(amount >= minFTKOut, "Slippage exceeded");

        ftk.mint(msg.sender, amount);

        emit Deposited(msg.sender, asset, amount, amount);
    }
}