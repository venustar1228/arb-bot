const { expect } = require("chai");
const { ethers } = require("hardhat");
const { setupAndManipulatePrice, AMOUNT } = require("../src/localPriceManipulator");
const { abi: erc20Abi } = require('@openzeppelin/contracts/build/contracts/ERC20.json');
const { getArbContractAndDeployer, resetHardhatToFork } = require('../src/helpers');
const { UNISWAP } = require("../config.json");

const ARB_FOR = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH address.
const ARB_AGAINST = "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE"; // SHIB address.

let deployedContract, arbForContract, deployer;

describe("Arbitrage contract", async function () {
  beforeEach(async function () {
    await resetHardhatToFork();
    const res = await getArbContractAndDeployer();
    deployedContract = res.deployedContract;
    deployer = res.deployer;
    arbForContract = new ethers.Contract(ARB_FOR, erc20Abi, deployer);
  })

  it("Test token to market Id mapping.", async function () {
    const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const marketId = await deployedContract.getMarketId(wethAddress);
    expect(marketId).to.equal(0);
  });

  it("Test arb execution.", async function() {
    // Assumes that uniswap price is manipulated, then we have an arb opportunity against sushiswap.
    await setupAndManipulatePrice(AMOUNT, UNISWAP.V2_ROUTER_02_ADDRESS);
    const startOnUniswap = true;
    const token0 = ARB_FOR;
    const token1 = ARB_AGAINST; // SHIB was dumped, we wanna pickup the sale.
    const flashAmount = AMOUNT; // Arbitrary flash amount for now, just verifying the on-chain function works.

    const balanceBefore = await arbForContract.balanceOf(await deployer.getAddress());

    await deployedContract.executeTrade(
      startOnUniswap,
      token0,
      token1,
      flashAmount
    );

    const balanceAfter = await arbForContract.balanceOf(await deployer.getAddress());

    const someArbitraryProfitInEther = 0.001; 
    const profit = ethers.utils.formatEther(balanceAfter - balanceBefore);
    console.log("Arb profit (ETH): ", profit);
    expect(Number(profit)).to.be.greaterThanOrEqual(someArbitraryProfitInEther);
  })
});

