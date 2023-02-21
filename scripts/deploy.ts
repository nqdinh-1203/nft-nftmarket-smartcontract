import { ethers, hardhatArguments } from "hardhat";
import * as Config from "./config";

async function main() {
  await Config.initConfig();
  const network = hardhatArguments.network ? hardhatArguments.network : "dev";
  const [deployer] = await ethers.getSigners();
  console.log("Deploying from address: ", deployer.address);

  // const Hero = await ethers.getContractFactory("Hero");
  // const hero = await Hero.deploy();
  // console.log("Hero address: ", await hero.address);
  // Config.setConfig(network + '.Hero', await hero.address);

  const MKP = await ethers.getContractFactory("HeroMarketplace");
  const mkp = await MKP.deploy("0xbb9bfab8fED247886061Adb5236b898C74D49706", "0xD4885A25901767d10dDb7a83195aa2afA6252Cf7");
  console.log("Marketplace address: ", await mkp.address);
  Config.setConfig(network + '.HeroMarketplace', await mkp.address);

  await Config.updateConfig();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
