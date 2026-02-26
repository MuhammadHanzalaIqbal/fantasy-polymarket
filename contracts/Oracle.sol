// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

library ECDSA {
    function recover(bytes32 hash, bytes memory signature) internal pure returns (address) {
        require(signature.length == 65, "BAD_SIG_LENGTH");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }

        require(v == 27 || v == 28, "BAD_V");

        return ecrecover(hash, v, r, s);
    }

    function toEthSignedMessageHash(bytes32 hash) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
    }
}

contract OracleAdapter {
    using ECDSA for bytes32;

    struct MatchweekData {
        uint256 matchweek;
        uint256 timestamp;
        uint256[] playerIds;
        uint256[] scores;
    }

    address public owner;

    // authorized oracle signers
    mapping(address => bool) public isSigner;

    // replay protection
    mapping(uint256 => bool) public matchweekFinalized;

    // playerId => latest score
    mapping(uint256 => uint256) public playerScore;

    // timestamp safety window
    uint256 public maxDelay = 6 hours;
    uint256 public maxFuture = 10 minutes;

    event SignerUpdated(address signer, bool allowed);
    event MatchweekSubmitted(uint256 indexed matchweek);
    event OwnershipTransferred(address newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "NOT_OWNER");
        _;
    }

    constructor(address initialSigner) {
        owner = msg.sender;
        isSigner[initialSigner] = true;
    }

    function submitMatchData(
        uint256 matchweek,
        uint256 timestamp,
        uint256[] calldata playerIds,
        uint256[] calldata scores,
        bytes calldata signature
    ) external {
        require(!matchweekFinalized[matchweek], "MATCHWEEK_DONE");
        require(playerIds.length == scores.length, "LENGTH_MISMATCH");
        require(playerIds.length > 0, "NO_DATA");

        // timestamp checks
        require(timestamp <= block.timestamp + maxFuture, "TOO_FUTURE");
        require(block.timestamp - timestamp <= maxDelay, "STALE_DATA");

        // verify signature
        bytes32 digest = keccak256(
            abi.encodePacked(
                address(this),
                matchweek,
                timestamp,
                keccak256(abi.encodePacked(playerIds)),
                keccak256(abi.encodePacked(scores))
            )
        );

        address signer = digest
            .toEthSignedMessageHash()
            .recover(signature);

        require(isSigner[signer], "BAD_SIGNER");

        // update scores
        for (uint256 i = 0; i < playerIds.length; i++) {
            playerScore[playerIds[i]] = scores[i];
        }

        matchweekFinalized[matchweek] = true;

        emit MatchweekSubmitted(matchweek);
    }

    function setSigner(address signer, bool allowed) external onlyOwner {
        isSigner[signer] = allowed;
        emit SignerUpdated(signer, allowed);
    }

    function setTimingBounds(
        uint256 _maxDelay,
        uint256 _maxFuture
    ) external onlyOwner {
        maxDelay = _maxDelay;
        maxFuture = _maxFuture;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        owner = newOwner;
        emit OwnershipTransferred(newOwner);
    }
}