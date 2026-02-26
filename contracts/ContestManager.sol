// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IOracleAdapter {
    function playerScore(uint256 playerId) external view returns (uint256);
}

interface IPlayerShareManager {
    function playerToken(uint256 playerId) external view returns (address);
}

interface IERC20Balance {
    function balanceOf(address user) external view returns (uint256);
}

contract TeamNFT {
    string public name = "Fantasy Team";
    string public symbol = "FTEAM";

    uint256 public nextId;
    address public manager;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;

    modifier onlyManager() {
        require(msg.sender == manager, "NOT_MANAGER");
        _;
    }

    constructor(address _manager) {
        manager = _manager;
    }

    function mint(address to) external onlyManager returns (uint256 id) {
        id = ++nextId;
        ownerOf[id] = to;
        balanceOf[to]++;
    }
}

contract ContestManager {

    struct Contest {
        uint256 entryFee;
        uint256 maxEntries;
        uint256 startTime;
        uint256 lockTime;
        uint256 rakeBps;
        bool resolved;
        uint256 totalPot;
        uint256[] prizeBps; // e.g. [5000, 3000, 2000]
    }

    struct Entry {
        address user;
        uint256[] players;
        uint256 score;
        bool exists;
    }

    IERC20 public immutable ftk;
    address public treasury;
    IOracleAdapter public oracle;
    IPlayerShareManager public shareManager;
    TeamNFT public teamNFT;

    address public owner;
    uint256 public nextContestId;

    mapping(uint256 => Contest) public contests;
    mapping(uint256 => Entry[]) public contestEntries;
    mapping(uint256 => mapping(address => bool)) public entered; 

    event ContestCreated(uint256 indexed contestId);
    event ContestEntered(uint256 indexed contestId, address indexed user);
    event ContestResolved(uint256 indexed contestId);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(
        address _ftk,
        address _treasury,
        address _oracle,
        address _shareManager
    ) {
        owner = msg.sender;
        ftk = IERC20(_ftk);
        treasury = _treasury;
        oracle = IOracleAdapter(_oracle);
        shareManager = IPlayerShareManager(_shareManager);
        teamNFT = new TeamNFT(address(this));
    }

    function createContest(
        uint256 entryFee,
        uint256 maxEntries,
        uint256 startTime,
        uint256 lockTime,
        uint256 rakeBps,
        uint256[] calldata prizeBps
    ) external onlyOwner returns (uint256 contestId) {
        require(prizeBps.length > 0, "NO_PRIZES");
        require(rakeBps <= 2000, "RAKE_TOO_HIGH"); // max 20%

        uint256 total;
        for (uint256 i = 0; i < prizeBps.length; i++) {
            total += prizeBps[i];
        }
        require(total == 10000, "PRIZE_NOT_100%");

        contestId = ++nextContestId;

        contests[contestId] = Contest({
            entryFee: entryFee,
            maxEntries: maxEntries,
            startTime: startTime,
            lockTime: lockTime,
            rakeBps: rakeBps,
            resolved: false,
            totalPot: 0,
            prizeBps: prizeBps
        });

        emit ContestCreated(contestId);
    }

    function enterContest(uint256 contestId, uint256[] calldata players) external {
        Contest storage c = contests[contestId];

        require(block.timestamp < c.lockTime, "CONTEST_LOCKED");
        require(!entered[contestId][msg.sender], "ALREADY_ENTERED");
        require(contestEntries[contestId].length < c.maxEntries, "FULL");
        require(players.length > 0, "NO_PLAYERS");

        _validateRoster(msg.sender, players);

        // escrow FTK
        require(
            ftk.transferFrom(msg.sender, address(this), c.entryFee),
            "FTK_TRANSFER_FAIL"
        );

        c.totalPot += c.entryFee;

        contestEntries[contestId].push(
            Entry({
                user: msg.sender,
                players: players,
                score: 0,
                exists: true
            })
        );

        entered[contestId][msg.sender] = true;

        // mint team NFT
        teamNFT.mint(msg.sender);

        emit ContestEntered(contestId, msg.sender);
    }

    function _validateRoster(address user, uint256[] calldata players) internal view {
        for (uint256 i = 0; i < players.length; i++) {
            address token = shareManager.playerToken(players[i]);
            require(token != address(0), "PLAYER_NOT_LISTED");

            uint256 bal = IERC20Balance(token).balanceOf(user);
            require(bal > 0, "NO_PLAYER_SHARES");
        }
    }

    function resolveContest(uint256 contestId) external {
        Contest storage c = contests[contestId];
        require(!c.resolved, "ALREADY_RESOLVED");
        require(block.timestamp >= c.startTime, "NOT_STARTED");

        Entry[] storage entries = contestEntries[contestId];
        uint256 len = entries.length;
        require(len > 0, "NO_ENTRIES");

        // compute scores
        for (uint256 i = 0; i < len; i++) {
            uint256 totalScore;
            uint256[] storage players = entries[i].players;

            for (uint256 j = 0; j < players.length; j++) {
                totalScore += oracle.playerScore(players[j]);
            }

            entries[i].score = totalScore;
        }

        for (uint256 i = 1; i < len; i++) {
            Entry memory key = entries[i];
            uint256 j = i;
            while (j > 0 && entries[j - 1].score < key.score) {
                entries[j] = entries[j - 1];
                j--;
            }
            entries[j] = key;
        }

        // compute rake
        uint256 rake = (c.totalPot * c.rakeBps) / 10_000;
        uint256 prizePool = c.totalPot - rake;
        if (rake > 0) {
            ftk.transfer(treasury, rake);
        }

        uint256 paid;
        for (uint256 i = 0; i < c.prizeBps.length && i < len; i++) {
            uint256 prize = (prizePool * c.prizeBps[i]) / 10_000;
            paid += prize;
            ftk.transfer(entries[i].user, prize);
        }

        c.resolved = true;

        emit ContestResolved(contestId);
    }

    function setTreasury(address newTreasury) external onlyOwner {
        treasury = newTreasury;
    }

    function setOracle(address newOracle) external onlyOwner {
        oracle = IOracleAdapter(newOracle);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }
}