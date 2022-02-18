# Arbitrage Bot
Trading bot that utilizes Solidity contracts, in conjunction with decentralized exchanges, to execute token arbitrage opportunities on any EVM compatible blockchain. 

## Technologies
Javascript/Node.js, Solidity, Hardhat, Ethers.js, Waffle. 

## Setup
1. Following https://hardhat.org/tutorial/, install Node.js if needed.
2. ```npm install``` should install needed dependencies to the ```node_modules``` folder. Confirm with ```npx hardhat compile```.
 
 TODOs:
 - First step, follow this tutorial to start a new proj in hardhat https://hardhat.org/tutorial/, using ethers.js etc. Then can port over exisitng bot code and change where neccessary.  
 - Finish initial configuration, port over web3.js references to ethers.js, setup hardhat, etc. See existing readme in downloads
 - Consider using https://github.com/NomicFoundation/hardhat-hackathon-boilerplate or front-end here https://github.com/NomicFoundation/hardhat-hackathon-boilerplate/tree/master/frontend
 - Research new stategies, create modular scripts for each blockchain, implement bot for DEXs on AVAX/FTM/MATIC, etc. 
 - Neat React front-end
 - Find inspiration for data pipelines
 - refactor given code to be OOP based
 - Write up TDD here and setup instructions, maybe draw out FSM 
 - Ideally make this super portable for new DEXs
