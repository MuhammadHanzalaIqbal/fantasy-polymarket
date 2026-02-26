// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address user) external view returns (uint256);
}

interface IFTK is IERC20 {
    function burn(address from, uint256 amount) external;
}

interface ITreasury {
    function withdrawAsset(address token, address to, uint256 amount) external;
}

contract WithdrawalRouter {

    address public owner;

    IFTK public immutable ftk;
    ITreasury public treasury;
    IERC20 public immutable backingAsset; // eUSDC?

    uint256 public withdrawalFeeBps = 50;
    uint256 public perUserCooldown = 5 minutes;
    uint256 public globalDailyLimit;
    uint256 public withdrawnToday;
    uint256 public lastDay;

    mapping(address => uint256) public lastWithdrawTime;

    event Withdrawn(
        address indexed user,
        uint256 ftkBurned,
        uint256 assetReturned,
        uint256 fee
    );

    event FeeUpdated(uint256 newFeeBps);
    event TreasuryUpdated(address treasury);
    event LimitsUpdated(uint256 cooldown, uint256 dailyLimit);
    event OwnershipTransferred(address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address _ftk,
        address _treasury,
        address _backingAsset,
        uint256 _dailyLimit
    ) {
        owner = msg.sender;
        ftk = IFTK(_ftk);
        treasury = ITreasury(_treasury);
        backingAsset = IERC20(_backingAsset);
        globalDailyLimit = _dailyLimit;
        lastDay = block.timestamp / 1 days;
    }

    function withdraw(uint256 ftkAmount, uint256 minOut) external {
        require(ftkAmount > 0, "ZERO_AMOUNT");

        _checkAndUpdateLimits(msg.sender, ftkAmount);

        // pull FTK from user
        require(
            ftk.transferFrom(msg.sender, address(this), ftkAmount),
            "FTK_TRANSFER_FAIL"
        );

        // burn FTK
        ftk.burn(address(this), ftkAmount);

        // compute fee
        uint256 fee = (ftkAmount * withdrawalFeeBps) / 10_000;
        uint256 netAssets = ftkAmount - fee;

        require(netAssets >= minOut, "SLIPPAGE");

        // reserve sufficiency check
        uint256 treasuryBalance = backingAsset.balanceOf(address(treasury));
        require(treasuryBalance >= netAssets, "INSUFFICIENT_RESERVES");

        // pull assets from treasury to user
        treasury.withdrawAsset(address(backingAsset), msg.sender, netAssets);

        emit Withdrawn(msg.sender, ftkAmount, netAssets, fee);
    }

    function _checkAndUpdateLimits(address user, uint256 amount) internal {
        // per-user cooldown
        require(
            block.timestamp >= lastWithdrawTime[user] + perUserCooldown,
            "USER_COOLDOWN"
        );
        lastWithdrawTime[user] = block.timestamp;

        // reset daily window if needed
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastDay) {
            lastDay = currentDay;
            withdrawnToday = 0;
        }

        // global daily limit
        if (globalDailyLimit > 0) {
            require(
                withdrawnToday + amount <= globalDailyLimit,
                "DAILY_LIMIT"
            );
            withdrawnToday += amount;
        }
    }

    function setFee(uint256 newFeeBps) external onlyOwner {
        require(newFeeBps <= 500, "FEE_TOO_HIGH"); // max 5%
        withdrawalFeeBps = newFeeBps;
        emit FeeUpdated(newFeeBps);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = ITreasury(newTreasury);
        emit TreasuryUpdated(newTreasury);
    }

    function setLimits(
        uint256 cooldown,
        uint256 dailyLimit
    ) external onlyOwner {
        perUserCooldown = cooldown;
        globalDailyLimit = dailyLimit;
        emit LimitsUpdated(cooldown, dailyLimit);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }
}