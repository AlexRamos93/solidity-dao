import { ethers } from "hardhat";

async function main() {
  const ERC20 = await ethers.getContractFactory("AcmeERC20");
  const erc20 = await ERC20.deploy();
  const DAO = await ethers.getContractFactory("AcmeDAO");
  const dao = await DAO.deploy(erc20.address);
  await erc20.deployed();
  await dao.deployed();

  console.log("Contracts deployed to:", {
    erc20: erc20.address,
    dao: dao.address,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
