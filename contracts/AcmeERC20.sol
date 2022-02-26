//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AcmeERC20 is ERC20 {
    constructor() ERC20("ACME", "ACME") {
        _mint(msg.sender, 100000 ether);
    }
}
