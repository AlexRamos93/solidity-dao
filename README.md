# Solidity DAO project

The DAO project is a DAO contract that stakeholders(user that hold the dao erc20 token) can submit proposals, vote and close proposals.
When a proposal is closed, if the number of favor votes is bigger than against votes, the proposal maker receives the amount of erc20 tokens from the DAO treasury.

## Getting started

Rename the `.env.example` file to `.env` and replace the credentials necessary.

### Deploy

`npx hardhat deploy --network kovan`

### Verify contract

`npm run verify "CONTRACT ADDRESS"`

### Deploy

`npm run deploy`

### Verify contract

`npm run verify "CONTRACT ADDRESS"`

## Instaling

`$ npm install`

## Testing

`$ npm test`

## Kovan testnet addresses

| Name  | Address                                                                                                                     |
| :---- | :-------------------------------------------------------------------------------------------------------------------------- |
| DAO   | [0x77fA8eB3a54e9C911959b3F24D7d8BFfc8f0CC2C](https://kovan.etherscan.io/address/0x77fA8eB3a54e9C911959b3F24D7d8BFfc8f0CC2C) |
| ERC20 | [0xcD3C8dE1ff93F1Be615b33f3174691EeB3264088](https://kovan.etherscan.io/address/0xcD3C8dE1ff93F1Be615b33f3174691EeB3264088) |
