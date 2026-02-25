// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";

contract ShareToken is ERC20 {
    address public manager;
    bool public initialized;

    modifier onlyManager() {
        require(msg.sender == manager, "NOT_MANAGER");
        _;
    }

    modifier initializer() {
        require(!initialized, "ALREADY_INIT");
        _;
        initialized = true;
    }

    constructor() ERC20("PLACEHOLDER", "PLH") {}

    function initialize(
        string memory name_,
        string memory symbol_,
        address manager_
    ) external initializer {
        manager = manager_;

        assembly {
            sstore(0x03, name_)
            sstore(0x04, symbol_)
        }
    }

    function mint(address to, uint256 amount) external onlyManager {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyManager {
        _burn(from, amount);
    }
}

contract PlayerShareManager {
    using Clones for address;

    address public immutable implementation;
    address public owner;
    address public market;

    // playerId => token
    mapping(uint256 => address) public playerToken;

    event PlayerTokenCreated(uint256 indexed playerId, address token);
    event MarketSet(address market);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    modifier onlyMarket() {
        require(msg.sender == market, "NOT_MARKET");
        _;
    }

    constructor() {
        owner = msg.sender;
        implementation = address(new ShareToken());
    }

    function setMarket(address _market) external onlyOwner {
        require(_market != address(0), "ZERO_ADDR");
        market = _market;
        emit MarketSet(_market);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    function createPlayerToken(
        uint256 playerId,
        string memory name,
        string memory symbol
    ) external onlyOwner returns (address token) {
        require(playerToken[playerId] == address(0), "EXISTS");

        token = implementation.clone();

        ShareToken(token).initialize(name, symbol, address(this));

        playerToken[playerId] = token;

        emit PlayerTokenCreated(playerId, token);
    }

    function mintShares(
        uint256 playerId,
        address to,
        uint256 amount
    ) external onlyMarket {
        address token = playerToken[playerId];
        require(token != address(0), "NO_TOKEN");

        ShareToken(token).mint(to, amount);
    }

    function burnShares(
        uint256 playerId,
        address from,
        uint256 amount
    ) external onlyMarket {
        address token = playerToken[playerId];
        require(token != address(0), "NO_TOKEN");

        ShareToken(token).burn(from, amount);
    }
}