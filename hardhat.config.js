require("@nomiclabs/hardhat-waffle");
require('dotenv').config();

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.0", 
  networks: {
    hardhat: {
      forking: {
        url: "https://eth-mainnet.alchemyapi.io/v2/" + process.env.ALCHEMY_API_KEY,
        blockNumber: 14240415, // Specify block number for performance, see https://hardhat.org/hardhat-network/guides/mainnet-forking.html.
      }
    }
  }
};
