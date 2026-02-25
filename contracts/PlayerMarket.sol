// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFantasyToken is IERC20 {
    function burn(address from, uint256 amount) external;
    function mint(address to, uint256 amount) external;
}

contract PlayerMarket is ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IFantasyToken public immutable ftk;
    address public treasury;

    uint256 public tradingFeeBps = 200;
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct PlayerPool {
        uint256 totalShares;
        uint256 ftkLiquidity;
        bool exists;
    }

    mapping(uint256 => PlayerPool) public players; // playerId => PlayerPool
    mapping(uint256 => mapping(address => uint256)) public userShares;

    // Events
    event PlayerAdded(uint256 playerId);
    event BoughtShares(uint256 playerId, address indexed user, uint256 ftkSpent, uint256 sharesBought, uint256 fee);
    event SoldShares(uint256 playerId, address indexed user, uint256 sharesSold, uint256 ftkReturned, uint256 fee);
    event TreasuryUpdated(address newTreasury);
    event TradingFeeUpdated(uint256 newFeeBps);

    constructor(address _ftk, address _treasury, address admin) {
        require(_ftk != address(0) && _treasury != address(0), "Invalid addresses");
        ftk = IFantasyToken(_ftk);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function addPlayer(uint256 playerId) external onlyRole(ADMIN_ROLE) {
        require(!players[playerId].exists, "Player exists");
        players[playerId] = PlayerPool({totalShares: 0, ftkLiquidity: 0, exists: true});
        emit PlayerAdded(playerId);
    }

    function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE) {
        require(_treasury != address(0), "Invalid treasury");
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setTradingFee(uint256 feeBps) external onlyRole(ADMIN_ROLE) {
        require(feeBps <= 1000, "Fee too high");
        tradingFeeBps = feeBps;
        emit TradingFeeUpdated(feeBps);
    }

    function buyShares(uint256 playerId, uint256 ftkAmount, uint256 minShares) external nonReentrant {
        PlayerPool storage pool = players[playerId];
        require(pool.exists, "Player not found");
        require(ftkAmount > 0, "Zero FTK");

        // Transfer FTK from user
        ftk.transferFrom(msg.sender, address(this), ftkAmount);

        // Calculate trading fee
        uint256 fee = (ftkAmount * tradingFeeBps) / BPS_DENOMINATOR;
        uint256 netFTK = ftkAmount - fee;

        // Send fee to treasury
        if (fee > 0) {
            ftk.transfer(treasury, fee);
        }

        // Simple constant product AMM for pricing:
        uint256 sharesToMint;
        if (pool.totalShares == 0) {
            // First buyer sets initial shares 1:1
            sharesToMint = netFTK;
        } else {
            // x*y=k: shares = netFTK * totalShares / ftkLiquidity
            sharesToMint = (netFTK * pool.totalShares) / pool.ftkLiquidity;
        }

        require(sharesToMint >= minShares, "Slippage exceeded");

        // Update pool
        pool.totalShares += sharesToMint;
        pool.ftkLiquidity += netFTK;

        // Update user balance
        userShares[playerId][msg.sender] += sharesToMint;

        emit BoughtShares(playerId, msg.sender, ftkAmount, sharesToMint, fee);
    }

    function sellShares(uint256 playerId, uint256 shares, uint256 minFTK) external nonReentrant {
        PlayerPool storage pool = players[playerId];
        require(pool.exists, "Player not found");
        require(userShares[playerId][msg.sender] >= shares, "Insufficient shares");

        // Calculate FTK return using constant product AMM
        uint256 ftkReturn = (shares * pool.ftkLiquidity) / pool.totalShares;

        uint256 fee = (ftkReturn * tradingFeeBps) / BPS_DENOMINATOR;
        uint256 netFTK = ftkReturn - fee;

        require(netFTK >= minFTK, "Slippage exceeded");

        pool.totalShares -= shares;
        pool.ftkLiquidity -= ftkReturn;

        userShares[playerId][msg.sender] -= shares;
        ftk.transfer(msg.sender, netFTK);

        if (fee > 0) {
            ftk.transfer(treasury, fee);
        }

        emit SoldShares(playerId, msg.sender, shares, netFTK, fee);
    }

    function userBalance(uint256 playerId, address user) external view returns (uint256) {
        return userShares[playerId][user];
    }

    function getSharePrice(uint256 playerId) external view returns (uint256) {
        PlayerPool storage pool = players[playerId];
        if (pool.totalShares == 0) return 1e18; // initial 1 FTK per share
        return (pool.ftkLiquidity * 1e18) / pool.totalShares;
    }
}