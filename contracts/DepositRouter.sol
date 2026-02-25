// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFantasyToken {
    function mint(address to, uint256 amount) external;
}

contract DepositRouter is ReentrancyGuard, AccessControl {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IFantasyToken public immutable ftk;
    address public treasury;
    uint256 public depositFeeBps;
    mapping(address => bool) public supportedAsset;

    event Deposited(
        address indexed user,
        address indexed asset,
        uint256 assetAmount,
        uint256 ftkMinted,
        uint256 feeTaken
    );

    event AssetSupported(address asset, bool supported);
    event TreasuryUpdated(address treasury);
    event DepositFeeUpdated(uint256 newFeeBps);

    // =========================
    // Constructor
    // =========================
    constructor(
        address _ftk,
        address _treasury,
        uint256 _depositFeeBps,
        address admin
    ) {
        require(_ftk != address(0), "Invalid FTK");
        require(_treasury != address(0), "Invalid treasury");
        require(_depositFeeBps <= 1000, "Fee too high"); // max 10%

        ftk = IFantasyToken(_ftk);
        treasury = _treasury;
        depositFeeBps = _depositFeeBps;

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

    function setTreasury(address _treasury)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setDepositFee(uint256 newFeeBps)
        external
        onlyRole(ADMIN_ROLE)
    {
        require(newFeeBps <= 1000, "Fee too high");
        depositFeeBps = newFeeBps;
        emit DepositFeeUpdated(newFeeBps);
    }

    function deposit(
        address asset,
        uint256 amount,
        uint256 minFTKOut
    ) external nonReentrant {
        require(supportedAsset[asset], "Asset not supported");
        require(amount > 0, "Zero amount");

        IERC20(asset).transferFrom(msg.sender, address(this), amount);

        uint256 fee = (amount * depositFeeBps) / BPS_DENOMINATOR;
        uint256 netAmount = amount - fee;

        require(netAmount >= minFTKOut, "Slippage exceeded");

        if (fee > 0) {
            IERC20(asset).transfer(treasury, fee);
        }

        ftk.mint(msg.sender, netAmount);

        emit Deposited(msg.sender, asset, amount, netAmount, fee);
    }
}