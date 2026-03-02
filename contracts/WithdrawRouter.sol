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

contract WithdrawalRouter {

    address public owner;

    IFTK public immutable ftk;
    IERC20 public immutable backingAsset;

    uint256 public perUserCooldown = 5 minutes;
    uint256 public globalDailyLimit;
    uint256 public withdrawnToday;
    uint256 public lastDay;

    mapping(address => uint256) public lastWithdrawTime;

    event Withdrawn(address indexed user, uint256 ftkBurned, uint256 assetReturned);
    event LimitsUpdated(uint256 cooldown, uint256 dailyLimit);
    event OwnershipTransferred(address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address _ftk,
        address _backingAsset,
        uint256 _dailyLimit
    ) {
        require(_ftk != address(0) && _backingAsset != address(0), "ZERO_ADDR");
        owner = msg.sender;
        ftk = IFTK(_ftk);
        backingAsset = IERC20(_backingAsset);
        globalDailyLimit = _dailyLimit;
        lastDay = block.timestamp / 1 days;
    }

    function withdraw(uint256 ftkAmount, uint256 minOut) external {
        require(ftkAmount > 0, "ZERO_AMOUNT");

        _checkAndUpdateLimits(msg.sender, ftkAmount);
        require(ftk.transferFrom(msg.sender, address(this), ftkAmount), "FTK_TRANSFER_FAIL");
        ftk.burn(address(this), ftkAmount);

        uint256 netAssets = ftkAmount;

        require(netAssets >= minOut, "SLIPPAGE");

        uint256 reserve = backingAsset.balanceOf(address(this));
        require(reserve >= netAssets, "INSUFFICIENT_RESERVES");

        backingAsset.transfer(msg.sender, netAssets);

        emit Withdrawn(msg.sender, ftkAmount, netAssets);
    }

    function _checkAndUpdateLimits(address user, uint256 amount) internal {
        require(block.timestamp >= lastWithdrawTime[user] + perUserCooldown, "USER_COOLDOWN");
        lastWithdrawTime[user] = block.timestamp;
        uint256 currentDay = block.timestamp / 1 days;
        if (currentDay > lastDay) {
            lastDay = currentDay;
            withdrawnToday = 0;
        }

        if (globalDailyLimit > 0) {
            require(withdrawnToday + amount <= globalDailyLimit, "DAILY_LIMIT");
            withdrawnToday += amount;
        }
    }

    function setLimits(uint256 cooldown, uint256 dailyLimit) external onlyOwner {
        perUserCooldown = cooldown;
        globalDailyLimit = dailyLimit;
        emit LimitsUpdated(cooldown, dailyLimit);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_ADDR");
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }
}