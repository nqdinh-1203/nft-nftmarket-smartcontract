import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import { Contract, ContractFactory } from "@ethersproject/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as chai from "chai";
const chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
import { keccak256 } from "ethers/lib/utils";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

function parseEther(amount: Number) {
    return ethers.utils.parseUnits(amount.toString(), 18);
}

describe("Vault contract", () => {
    // const TOTAL_SUPPLY = 100;
    // const TOKEN_URI = "https://example.com/token/";

    let heroContract: Contract;
    let minter: SignerWithAddress;
    let user: SignerWithAddress;
    let owner: SignerWithAddress;

    async function deployVaultFixture() {
        await ethers.provider.send("hardhat_reset", []);

        [owner, minter, user] = await ethers.getSigners();
        const heroFactory: ContractFactory = await ethers.getContractFactory("Hero", owner);
        heroContract = await heroFactory.deploy();
        await heroContract.deployed();

        return { heroContract, owner, minter, user };
    }

    it("Should have the correct name and symbol", async () => {
        const { heroContract } = await loadFixture(deployVaultFixture);

        const name = await heroContract.name();
        expect(name).to.equal("Stickman Hero");

        const symbol = await heroContract.symbol();
        expect(symbol).to.equal("Hero");
    });

    it("Should have a base URI", async () => {
        const { heroContract, owner } = await loadFixture(deployVaultFixture);
        const baseURI = await heroContract.getBaseUrl();
        expect(baseURI).to.be.a("string");
    });

    it("Should set a new base URI", async () => {
        const { heroContract } = await loadFixture(deployVaultFixture);

        const newURI = "https://example.com/new/token/";
        await heroContract.setBaseUrl(newURI);
        const baseURI = await heroContract.getBaseUrl();

        expect(baseURI).to.equal(newURI);
    });

    describe("Minting", () => {
        it("Should mint a new token", async () => {
            const { heroContract, user } = await loadFixture(deployVaultFixture);
            const token = await heroContract.mint(user.address, 0);
            expect(token).to.be.a("object");
            expect(token).to.have.property("hash");
        });

        it("Should fail to mint a new token for non-minter", async () => {
            const { heroContract, user } = await loadFixture(deployVaultFixture);
            const [, sign2] = await ethers.getSigners();
            await expect(heroContract.connect(sign2).mint(user.address, 0)).to.be.revertedWith("Caller is not minter");
        });

        it("should mint a new hero token with the specified hero type", async function () {
            const { heroContract, owner, minter, user } = await loadFixture(deployVaultFixture);

            const heroType = 1;

            await heroContract.setBaseUrl("https://example.com/token/");
            await heroContract.grantRole(await heroContract.MINTER_ROLE(), minter.address);

            const mintTx = await heroContract.connect(minter).mint(user.address, heroType);

            const address0 = "0x0000000000000000000000000000000000000000"
            const tokenId = 0;

            await expect(mintTx).to.emit(heroContract, "Transfer").withArgs(address0, user.address, tokenId);

            const tokenURI = await heroContract.tokenURI(tokenId);

            expect(tokenURI).to.equal(`https://example.com/token/${tokenId}`);
        });
    });

    describe("List Token IDs", () => {
        it("Should return an empty array if the owner does not have any tokens", async () => {
            const { heroContract, user } = await loadFixture(deployVaultFixture);
            const list = await heroContract.listTokenIDs(user.address);
            expect(list).to.be.an("array");
            expect(list).to.be.empty;
        });

        it("Should return an array of token IDs for the owner", async () => {
            const { heroContract, user } = await loadFixture(deployVaultFixture);
            await heroContract.mint(user.address, 0);
            await heroContract.mint(user.address, 1);

            const listBigNumber = await heroContract.listTokenIDs(user.address);
            const list: number[] = [];

            listBigNumber.forEach((n: any) => {
                list.push(n.toNumber());
            });

            console.log(list);

            expect(list).to.have.lengthOf(2);
        });
    });
});