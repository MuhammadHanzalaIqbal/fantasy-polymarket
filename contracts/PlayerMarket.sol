// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IFantasyToken is IERC20 {
    function burn(address from, uint256 amount) external;
    function mint(address to, uint256 amount) external;
}

interface IPlayerShareManager {
    function mintShares(uint256 playerId, address to, uint256 amount) external;
    function burnShares(uint256 playerId, address from, uint256 amount) external;
}

contract PlayerMarket is ReentrancyGuard, AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    IFantasyToken public immutable ftk;
    IPlayerShareManager public shareManager;

    struct PlayerPool {
        uint256 totalShares;
        uint256 ftkLiquidity;
        bool exists;
    }

    mapping(uint256 => PlayerPool) public players;
    mapping(uint256 => mapping(address => uint256)) public userShares;

    event PlayerAdded(uint256 playerId);
    event BoughtShares(
        uint256 indexed playerId,
        address indexed user,
        uint256 ftkSpent,
        uint256 sharesBought
    );
    event SoldShares(
        uint256 indexed playerId,
        address indexed user,
        uint256 sharesSold,
        uint256 ftkReturned
    );

    constructor(
        address _ftk,
        address _shareManager,
        address admin
    ) {
        require(_ftk != address(0), "Invalid FTK");
        require(_shareManager != address(0), "Invalid manager");
        require(admin != address(0), "Invalid admin");

        ftk = IFantasyToken(_ftk);
        shareManager = IPlayerShareManager(_shareManager);

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function addPlayer(uint256 playerId) external onlyRole(ADMIN_ROLE) {
        require(!players[playerId].exists, "Player exists");

        players[playerId] = PlayerPool({
            totalShares: 0,
            ftkLiquidity: 0,
            exists: true
        });

        emit PlayerAdded(playerId);
    }

    function buyShares(
        uint256 playerId,
        uint256 ftkAmount,
        uint256 minShares
    ) external nonReentrant {
        PlayerPool storage pool = players[playerId];
        require(pool.exists, "Player not found");
        require(ftkAmount > 0, "Zero FTK");

        IERC20(address(ftk)).safeTransferFrom(
            msg.sender,
            address(this),
            ftkAmount
        );

        uint256 sharesToMint;

        if (pool.totalShares == 0) {
            sharesToMint = ftkAmount;
        } else {
            sharesToMint = (ftkAmount * pool.totalShares) / pool.ftkLiquidity;
        }

        require(sharesToMint >= minShares, "Slippage exceeded");

        pool.totalShares += sharesToMint;
        pool.ftkLiquidity += ftkAmount;
        userShares[playerId][msg.sender] += sharesToMint;
        shareManager.mintShares(playerId, msg.sender, sharesToMint);

        emit BoughtShares(playerId, msg.sender, ftkAmount, sharesToMint);
    }

    function sellShares(
        uint256 playerId,
        uint256 shares,
        uint256 minFTK
    ) external nonReentrant {
        PlayerPool storage pool = players[playerId];
        require(pool.exists, "Player not found");
        require(shares > 0, "Zero shares");
        require(userShares[playerId][msg.sender] >= shares, "Insufficient shares");

        uint256 ftkReturn = (shares * pool.ftkLiquidity) / pool.totalShares;
        require(ftkReturn >= minFTK, "Slippage exceeded");

        pool.totalShares -= shares;
        pool.ftkLiquidity -= ftkReturn;
        userShares[playerId][msg.sender] -= shares;
        shareManager.burnShares(playerId, msg.sender, shares);
        IERC20(address(ftk)).safeTransfer(msg.sender, ftkReturn);

        emit SoldShares(playerId, msg.sender, shares, ftkReturn);
    }

    function userBalance(
        uint256 playerId,
        address user
    ) external view returns (uint256) {
        return userShares[playerId][user];
    }

    function getSharePrice(uint256 playerId) external view returns (uint256) {
        PlayerPool storage pool = players[playerId];

        if (pool.totalShares == 0) {
            return 1e18;
        }

        return (pool.ftkLiquidity * 1e18) / pool.totalShares;
    }
}