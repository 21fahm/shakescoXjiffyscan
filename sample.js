const { BigNumber } = require("@ethersproject/bignumber");
const { default: axios } = require("axios");
const { ethers } = require("ethers");
require("dotenv").config();
const fs = require("fs");

async function sample() {
  const AUTOFACTORYABI = JSON.parse(
    fs.readFileSync(
      "../javascript/src/artifacts/autopayment_factory_abi.json",
      "utf8"
    )
  );

  const CONTRACTS = JSON.parse(
    fs.readFileSync(
      "../javascript/src/artifacts/contract_addresses.json",
      "utf8"
    )
  );
  const REGISTERAUTOABI = JSON.parse(
    fs.readFileSync(
      "../javascript/src/artifacts/register_auto_abi.json",
      "utf8"
    )
  );
  const regeisterAutoABI = new ethers.Interface(REGISTERAUTOABI);

  const OTHER = JSON.parse(
    fs.readFileSync("../javascript/src/artifacts/other_abi.json", "utf8")
  );

  const otherInterface = new ethers.Interface(OTHER);

  const SWAP = JSON.parse(
    fs.readFileSync("../javascript/src/artifacts/swap_abi.json", "utf8")
  );

  const swapInterface = new ethers.Interface(SWAP);

  const ERC20ABI = JSON.parse(
    fs.readFileSync("../javascript/src/artifacts/IERC20_abi.json", "utf8")
  );

  const erc20ABI = new ethers.Interface(ERC20ABI);

  const ACCOUNTABI = JSON.parse(
    fs.readFileSync("../javascript/src/artifacts/account_abi.json", "utf8")
  ); // you can use your own smart contract account abi

  const accountABI = new ethers.Interface(ACCOUNTABI);

  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_URL);

  const autoFactoryABI = new ethers.Interface(AUTOFACTORYABI);
  const Autocall = new ethers.Contract(
    CONTRACTS[137]["auto"],
    autoFactoryABI,
    provider
  );

  const attacksafe = 281474976710655;
  const sender = /**You smart contract address */ "";
  const compute = await Autocall.computeAddress(sender, attacksafe);

  const wrapAddress = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
  const linkAddress = "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39";
  const swapToERC677 = "0xAA1DC356dc4B18f30C347798FD5379F3D77ABC5b";
  const readRates = JSON.parse(
    fs.readFileSync("../javascript/src/artifacts/currency_rates.json", "utf8")
  );
  const value = 7; // this value is in usd
  const inusd = Number(value) - 1; //We minus 1 so as to set the minimum we should receive from the swap
  const inlink = Number(readRates["rates"]["LINK"]) * inusd;

  const inmatic = Number(readRates["rates"]["MATIC"]) * Number(value);

  const calldata = accountABI.encodeFunctionData("executeBatch", [
    [
      CONTRACTS[137]["auto"],
      wrapAddress,
      wrapAddress,
      CONTRACTS[137]["swap"],
      linkAddress,
      swapToERC677,
      "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
      CONTRACTS[137]["automain"],
    ],
    [0, ethers.parseEther(inmatic.toString()), 0, 0, 0, 0, 0, 0],
    [
      autoFactoryABI.encodeFunctionData("deployWallet", [sender, attacksafe]),
      otherInterface.encodeFunctionData("deposit", []),
      erc20ABI.encodeFunctionData("transfer", [
        CONTRACTS[137]["swap"],
        ethers.parseEther(inmatic.toString()),
      ]),
      swapInterface.encodeFunctionData("swapExactInputSingle", [
        ethers.parseEther(inmatic.toString()),
        ethers.parseEther(inlink.toString()),
      ]),
      erc20ABI.encodeFunctionData("approve", [
        swapToERC677,
        ethers.parseEther(inlink.toString()),
      ]),
      otherInterface.encodeFunctionData("swap", [
        ethers.parseEther(inlink.toString()),
        linkAddress,
        "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
      ]),
      erc20ABI.encodeFunctionData("transfer", [
        CONTRACTS[137]["automain"],
        ethers.parseEther(inlink.toString()),
      ]),
      regeisterAutoABI.encodeFunctionData("register", [
        [
          "Shakesco",
          "0x",
          compute,
          300000,
          CONTRACTS[137]["automain"],
          0,
          "0x",
          "0x",
          "0x",
          ethers.parseEther(inlink.toString()),
        ],
      ]),
    ],
  ]);

  return calldata;
}

async function sampleTwo() {
  const calldata = await sample();

  const sender = process.env.SHAKESCOMAINADDRESS;

  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_URL);
  //You can use your own gas estimate here
  const callGasEstimate = 1223661;

  const preVerificationGas =
    BigNumber.from(callGasEstimate).add("21000").toNumber() > 56639
      ? BigNumber.from(callGasEstimate).add("0x5208")._hex
      : "0xdd3f";

  const callGasLimit =
    "0x" + BigNumber.from(callGasEstimate).add("0xc350").toString();

  const verificationGasLimit = "0x0186a0";

  const block = await provider.getBlock("latest");

  const maxFeePerGas = BigNumber.from(block.baseFeePerGas)
    .add((await provider.getFeeData()).maxFeePerGas)
    .toString();

  const maxPriorityFeePerGas = (
    await provider.getFeeData()
  ).maxPriorityFeePerGas.toString();

  const getUserOpHash = () => {
    const packed = ethers.AbiCoder.defaultAbiCoder().encode(
      [
        "address",
        "uint256",
        "bytes32",
        "bytes32",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "uint256",
        "bytes32",
      ],
      [
        sender,
        1,
        ethers.keccak256("0x"),
        ethers.keccak256(calldata),
        callGasLimit,
        verificationGasLimit,
        preVerificationGas,
        Number(maxPriorityFeePerGas) > Number(maxFeePerGas)
          ? maxPriorityFeePerGas
          : maxFeePerGas,
        maxPriorityFeePerGas,
        ethers.keccak256("0x"),
      ]
    );

    const enc = ethers.AbiCoder.defaultAbiCoder().encode(
      ["bytes32", "address", "uint256"],
      [
        ethers.keccak256(packed),
        "0x5ff137d4b0fdcd49dca30c7cf57e578a026d2789",
        "137",
      ]
    );

    return ethers.keccak256(enc);
  };

  const arraifiedHash = ethers.getBytes(getUserOpHash()); //sign this with you smart account

  //send
  const options = {
    method: "POST",
    url: "https://polygon.jiffyscan.xyz",
    headers: {
      "x-api-key": process.env.JIFFYSCANAPIKEY,
      accept: "application/json",
      "content-type": "application/json",
    },
    data: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "eth_sendUserOperation",
      params: [
        {
          sender: sender,
          nonce: "1",
          initCode: "0x",
          callData: calldata,
          callGasLimit: callGasLimit,
          verificationGasLimit: verificationGasLimit,
          preVerificationGas: preVerificationGas,
          maxFeePerGas:
            Number(maxPriorityFeePerGas) > Number(maxFeePerGas)
              ? maxPriorityFeePerGas
              : maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas,
          signature:
            "0x1cfc0cf6afb41dc1c14ce6abc4eb491707f6a8b7f89f542838c3a43f1ccad8cb1db8eef83b126d123fbef33b04b5463932b0cb5cc40ef9902e541d8e50291c191b", //SIG HERE
          paymasterAndData: "0x",
        },
        "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789",
      ],
    }),
  };

  await axios
    .request(options)
    .then((response) => {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error.request.data);
    });
}

sampleTwo();
