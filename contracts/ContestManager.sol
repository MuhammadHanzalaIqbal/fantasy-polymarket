// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

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

contract TeamNFT is ERC1155 {
    address public manager;
    uint256 public nextId;

    modifier onlyManager() {
        require(msg.sender == manager, "NOT_MANAGER");
        _;
    }

    constructor(address _manager)
        ERC1155("https://api.yourgame.xyz/team/{id}.json")
    {
        manager = _manager;
    }

    function mint(address to) external onlyManager returns (uint256 id) {
        id = ++nextId;
        _mint(to, id, 1, "");
    }
}

contract ContestManager is ReentrancyGuard {

    struct Contest {
        uint256 entryFee;
        uint256 maxEntries;
        uint256 startTime;
        uint256 lockTime;
        bool resolved;
        uint256 totalPot;
        uint256[] prizeBps; // must sum to 10000
    }

    struct Entry {
        address user;
        uint256[] players;
        uint256 score;
        bool exists;
    }

    IERC20 public immutable ftk;
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
        address _oracle,
        address _shareManager
    ) {
        require(_ftk != address(0), "ZERO_FTK");
        require(_oracle != address(0), "ZERO_ORACLE");
        require(_shareManager != address(0), "ZERO_MANAGER");

        owner = msg.sender;
        ftk = IERC20(_ftk);
        oracle = IOracleAdapter(_oracle);
        shareManager = IPlayerShareManager(_shareManager);

        teamNFT = new TeamNFT(address(this));
    }

    function createContest(
        uint256 entryFee,
        uint256 maxEntries,
        uint256 startTime,
        uint256 lockTime,
        uint256[] calldata prizeBps
    ) external onlyOwner returns (uint256 contestId) {
        require(prizeBps.length > 0, "NO_PRIZES");
        require(lockTime < startTime, "BAD_TIMES");

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
            resolved: false,
            totalPot: 0,
            prizeBps: prizeBps
        });

        emit ContestCreated(contestId);
    }

    function enterContest(uint256 contestId, uint256[] calldata players)
        external
        nonReentrant
    {
        Contest storage c = contests[contestId];

        require(block.timestamp < c.lockTime, "CONTEST_LOCKED");
        require(!entered[contestId][msg.sender], "ALREADY_ENTERED");
        require(contestEntries[contestId].length < c.maxEntries, "FULL");
        require(players.length > 0, "NO_PLAYERS");

        _validateRoster(msg.sender, players);

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

        teamNFT.mint(msg.sender);

        emit ContestEntered(contestId, msg.sender);
    }

    function _validateRoster(address user, uint256[] calldata players)
        internal
        view
    {
        for (uint256 i = 0; i < players.length; i++) {
            address token = shareManager.playerToken(players[i]);
            require(token != address(0), "PLAYER_NOT_LISTED");

            uint256 bal = IERC20Balance(token).balanceOf(user);
            require(bal > 0, "NO_PLAYER_SHARES");
        }
    }

    function resolveContest(uint256 contestId) external nonReentrant {
        Contest storage c = contests[contestId];
        require(!c.resolved, "ALREADY_RESOLVED");
        require(block.timestamp >= c.startTime, "NOT_STARTED");

        Entry[] storage entries = contestEntries[contestId];
        uint256 len = entries.length;
        require(len > 0, "NO_ENTRIES");
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

        for (uint256 i = 0; i < c.prizeBps.length && i < len; i++) {
            uint256 prize = (c.totalPot * c.prizeBps[i]) / 10_000;
            ftk.transfer(entries[i].user, prize);
        }

        c.resolved = true;

        emit ContestResolved(contestId);
    }

    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "ZERO_ORACLE");
        oracle = IOracleAdapter(newOracle);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "ZERO_OWNER");
        owner = newOwner;
    }
}