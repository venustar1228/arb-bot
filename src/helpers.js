require("dotenv").config();
const hardhatConfig = require("../hardhat.config");
const config = require("../config.json");
const Big = require("big.js");
const { ethers, waffle, network } = require("hardhat");
const IUniswapV2Pair = require("@uniswap/v2-core/build/IUniswapV2Pair.json");
const { abi: erc20Abi } = require('@openzeppelin/contracts/build/contracts/ERC20.json');

function warnAboutEphemeralNetwork() {
    if (network.name === "hardhat") {
        console.warn(
            "\nYou are using the Hardhat Network, which gets automatically created and destroyed every time." +
            " Use the Hardhat option \"--network localhost\" if running outside of tests.\n"
        );
    }
}

/**
 * Sends an RPC request which restores the local EVM state to the fork parameters defined
 * in the hardhat config file. 
 */
async function resetHardhatToFork() {
    return network.provider.request({
        method: "hardhat_reset",
        params: [ { forking: {
                    jsonRpcUrl: hardhatConfig.networks.hardhat.forking.url,
                    blockNumber: hardhatConfig.networks.hardhat.blockNumber,
                },
            },
        ],
    });
}

function getProvider() {
    if (config.PROJECT_SETTINGS.isLocal) 
        return waffle.provider;
    return new ethers.providers.JsonRpcProvider(`wss://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`);
}

/**
 * Configures the signer (wallet inherits signer) for contract function calls within the bot,
 * and instantiates the arbitrage contract.  
 */
 async function configureArbContractAndSigner() {
    let arbitrageContract;
    let signer;
    if (config.PROJECT_SETTINGS.isLocal) {
        const res = await getArbContractAndDeployer();
        arbitrageContract = res.deployedContract;
        // If running locally, use first default signer from helper method. 
        signer = res.deployer;
    } else {
        console.error("You'll need a contract ABI for mainnet.");
        signer = new ethers.Wallet(process.env.ACCOUNT);
    }
    return {arbitrageContract, signer};
}

/**
 * Gets the custom arbitrage contract, and deployer/owner of that contract.
 * Only to be used on local hardhat network! Mainnet needs separate handling.
 */
async function getArbContractAndDeployer() {
    // Use contract factory instead of instantiating ethers.Contract object,
    // since the relevant contract needs to be deployed.  
    // Note: real deploys should use contract factory constructor instead of "getContractFactory". 
    const arbitrageContract = await ethers.getContractFactory("Arbitrage");
    
    // With hardhat-ethers plugin, contract is deployed to first signer by default.
    const deployedContract = await arbitrageContract.deploy(
        config.SUSHISWAP.V2_ROUTER_02_ADDRESS, 
        config.UNISWAP.V2_ROUTER_02_ADDRESS
    );
    
    let deployer;
    [deployer] = await ethers.getSigners();
    
    return { deployedContract, deployer };
}

/**
 * Instantiates and returns two ERC20 contracts for two token addresses. 
 * @param  {} token0Address
 * @param  {} token1Address
 * @param  {} signer
 */
async function getTokenContracts(token0Address, token1Address, signer) {
    const token0Contract = new ethers.Contract(token0Address, erc20Abi, signer);
    const token1Contract = new ethers.Contract(token1Address, erc20Abi, signer);
    return { token0Contract, token1Contract }
}

/**
 * Gets a pair contract address given a uniswap factory contract and token pair.
 * See https://docs.uniswap.org/protocol/V2/reference/smart-contracts/factory#getpair.
 * @param  {} factoryContract
 * @param  {} token0Address
 * @param  {} token1Address
 */
async function getPairAddress(factoryContract, token0Address, token1Address) {
    return factoryContract.getPair(token0Address, token1Address);
}

/**
 * Gets a pair contract from a relevant factory contract and token pair.
 * See: https://docs.uniswap.org/protocol/V2/reference/smart-contracts/pair.
 * @param  {} factoryContract
 * @param  {} token0Address
 * @param  {} token1Address
 * @param  {} signer input to the instantiated pair contract, if desired.
 */
async function getPairContract(factoryContract, token0Address, token1Address, signer) { 
    const pairAddress = await getPairAddress(factoryContract, token0Address, token1Address);
    return new ethers.Contract(pairAddress, IUniswapV2Pair.abi, signer);
}

/**
 * Returns the reserves of token0 and token1 (implicit to a pair contract)
 * used to price trades and distribute liquidity.
 * https://docs.uniswap.org/protocol/V2/reference/smart-contracts/pair#getreserves.
 * @param  {} pairContract
 */
async function getReserves(pairContract) {
    const reserves = await pairContract.getReserves();
    return [reserves.reserve0, reserves.reserve1];
}

/**
 * Calculates the price of a token pair given that pair's contract,
 * using the constant product formula, x*y=k. 
 * See: https://docs.uniswap.org/protocol/V2/concepts/advanced-topics/pricing.
 * @param  {} pairContract
 */
async function calculatePrice(pairContract) {
    const [reserve0, reserve1] = await getReserves(pairContract);
    return Big(reserve0).div(Big(reserve1)).toString();
}

/**
 * Obtains the amount of a token that'd be obtained from a two-dex arbitrage swap, given an amout
 * of input token, relevant router path, and token addresses.
 * 
 * See https://docs.uniswap.org/protocol/V2/reference/smart-contracts/library#getamountsout
 * The uniswap-based function calculates a maximum output token amount given an input amount, accounting for reserves. 
 * 
 * @param  {} amountInToken0 to swap with first DEX, obtain an intermediary token,
 * and swap back with second DEX for original token.
 * @param  {} routerPath
 * @param  {} token0Address
 * @param  {} token1Address
 */
async function getEstimatedReturn(amountInToken0, routerPath, token0Address, token1Address) {
    const trade1 = await routerPath[0].getAmountsOut(amountInToken0, [token0Address, token1Address]);
    const trade2 = await routerPath[1].getAmountsOut(trade1[1], [token1Address, token0Address]);

    console.assert(trade1[0].toString() == amountInToken0.toString(),
        "Input parameter and amount as returned by router functions should match.");
    
    const amountOut = trade2[1];
    return amountOut;
}

module.exports = {
    warnAboutEphemeralNetwork,
    resetHardhatToFork,
    getProvider,
    configureArbContractAndSigner,
    getArbContractAndDeployer,
    getTokenContracts,
    getPairAddress,
    getPairContract,
    getReserves,
    calculatePrice,
    getEstimatedReturn
}