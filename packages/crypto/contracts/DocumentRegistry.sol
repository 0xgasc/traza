// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DocumentRegistry {
    mapping(bytes32 => uint256) public documentTimestamps;
    mapping(bytes32 => address) public documentAnchors;

    event DocumentAnchored(
        bytes32 indexed hash,
        uint256 timestamp,
        address indexed anchor
    );

    function anchor(bytes32 hash) external {
        require(documentTimestamps[hash] == 0, "Already anchored");
        documentTimestamps[hash] = block.timestamp;
        documentAnchors[hash] = msg.sender;
        emit DocumentAnchored(hash, block.timestamp, msg.sender);
    }

    function anchorBatch(bytes32[] calldata hashes) external {
        for (uint256 i = 0; i < hashes.length; i++) {
            if (documentTimestamps[hashes[i]] == 0) {
                documentTimestamps[hashes[i]] = block.timestamp;
                documentAnchors[hashes[i]] = msg.sender;
                emit DocumentAnchored(hashes[i], block.timestamp, msg.sender);
            }
        }
    }

    function verify(bytes32 hash) external view returns (uint256 timestamp, address anchorAddr) {
        return (documentTimestamps[hash], documentAnchors[hash]);
    }
}
