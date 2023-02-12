import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "@ethersproject/contracts";
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
    let owner: SignerWithAddress;
    let alice: SignerWithAddress;
    let bob: SignerWithAddress;
    let carol: SignerWithAddress;

    let vault: Contract;
    let token: Contract;

    async function deployVaultFixture() {
        await ethers.provider.send("hardhat_reset", []);
        [owner, alice, bob, carol] = await ethers.getSigners();

        const Vault = await ethers.getContractFactory("Vault", owner);
        vault = await Vault.deploy();
        const Token = await ethers.getContractFactory("Token", owner);
        token = await Token.deploy();
        await token.deployed();

        await vault.setToken(token.address);
        await vault.deployed();

        return { vault, token, owner, alice, bob, carol };
    }

    // Happy Path
    describe('Happy Path', () => {
        it('Should set right Token', async () => {
            const { vault, token } = await loadFixture(deployVaultFixture);

            await vault.setToken(token.address);

            expect(await vault.getTokenAddress()).equal(token.address)
        });

        it("Should deposit into Vault", async () => {
            const { vault, token, alice } = await loadFixture(deployVaultFixture);

            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));
            expect(await token.balanceOf(vault.address)).equal(parseEther(500 * 10 ** 3));
            //expect(await token.balanceOf(alice.address)).equal(parseEther(50 * 10**9) - parseEther(500 * 10**3));

            // console.log(await token.balanceOf(vault.address));
            // console.log(bob.address);
        });

        it("Should withdraw", async () => {
            const { vault, token, alice, bob } = await loadFixture(deployVaultFixture);

            // Gán quyền rút tiền cho Bob
            let WITHDRAW_ROLE = keccak256(Buffer.from("WITHDRAWER_ROLE")).toString();
            await vault.grantRole(WITHDRAW_ROLE, bob.address);

            // Mở chức năng rút tiền của quỹ
            await vault.setWithdrawEnable(true);
            await vault.setMaxWithdrawAmount(parseEther(1 * 10 ** 6));

            // // Alice nạp tiền vào quỹ để chuyển cho Bob
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));

            // Bob rút tiền vào ví
            await vault.connect(bob).withdraw(bob.address, parseEther(300 * 10 ** 3));
            expect(await token.balanceOf(vault.address)).equal(parseEther(200 * 10 ** 3));
            expect(await token.balanceOf(bob.address)).equal(parseEther(300 * 10 ** 3));
        });
    });

    // Unhappy path
    describe('Unhappy Path', () => {
        it("Should not deposit, Insufficient account balance", async () => {
            const { vault, token, alice } = await loadFixture(deployVaultFixture);
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await expect(vault.connect(alice).deposit(parseEther(2 * 10 ** 6))).revertedWith('Insufficient account balance');
        });

        it("Should not withdraw, Withdraw is not available", async () => {
            const { vault, token, alice, bob } = await loadFixture(deployVaultFixture);

            // Cấp quyền rút tiền cho Bob
            let WITHDRAW_ROLE = keccak256(Buffer.from("WITHDRAWER_ROLE")).toString();
            await vault.grantRole(WITHDRAW_ROLE, bob.address);

            // Tắt chức năng rút tiền của quỹ
            await vault.setWithdrawEnable(false);
            await vault.setMaxWithdrawAmount(parseEther(1 * 10 ** 6));

            // Alice nạp tiền vào quỹ để chuyển cho Bob
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));

            // Bob rút tiền vào ví
            await expect(vault.connect(bob).withdraw(bob.address, parseEther(300 * 10 ** 3))).revertedWith("Withdraw is not available");
        });

        it("Should not withdraw, Exceed maximum amount", async () => {
            const { vault, token, alice, bob } = await loadFixture(deployVaultFixture);

            // Cấp quyền rút tiền cho Bob
            let WITHDRAW_ROLE = keccak256(Buffer.from("WITHDRAWER_ROLE")).toString();
            await vault.grantRole(WITHDRAW_ROLE, bob.address);

            // Tắt chức năng rút tiền của quỹ
            await vault.setWithdrawEnable(true);
            await vault.setMaxWithdrawAmount(parseEther(1 * 10 ** 3));

            // Alice nạp tiền vào quỹ để chuyển cho Bob
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));

            // Bob rút tiền vào ví
            await expect(vault.connect(bob).withdraw(bob.address, parseEther(300 * 10 ** 3))).revertedWith("Exceed maximum amount");
        });

        it("Should not withdraw, Caller is not a withdrawer", async () => {
            const { vault, token, alice, bob, carol } = await loadFixture(deployVaultFixture);

            // Cấp quyền rút tiền cho Bob
            let WITHDRAW_ROLE = keccak256(Buffer.from("WITHDRAWER_ROLE")).toString();
            await vault.grantRole(WITHDRAW_ROLE, bob.address);

            // Tắt chức năng rút tiền của quỹ
            await vault.setWithdrawEnable(true);
            await vault.setMaxWithdrawAmount(parseEther(1 * 10 ** 3));

            // Alice nạp tiền vào quỹ để chuyển cho Bob
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));

            // Bob rút tiền vào ví
            await expect(vault.connect(carol).withdraw(bob.address, parseEther(300 * 10 ** 3))).revertedWith("Caller is not a withdrawer");
        });

        it("Should not withdraw, ERC20: transfer amount exceeds balance", async () => {
            const { vault, token, alice, bob } = await loadFixture(deployVaultFixture);

            // Cấp quyền rút tiền cho Bob
            let WITHDRAW_ROLE = keccak256(Buffer.from("WITHDRAWER_ROLE")).toString();
            await vault.grantRole(WITHDRAW_ROLE, bob.address);

            // Tắt chức năng rút tiền của quỹ
            await vault.setWithdrawEnable(true);
            await vault.setMaxWithdrawAmount(parseEther(1 * 10 ** 6));

            // Alice nạp tiền vào quỹ để chuyển cho Bob
            await token.transfer(alice.address, parseEther(1 * 10 ** 6));
            await token.connect(alice).approve(vault.address, token.balanceOf(alice.address));
            await vault.connect(alice).deposit(parseEther(500 * 10 ** 3));

            // Bob rút tiền vào ví
            await expect(vault.connect(bob).withdraw(bob.address, parseEther(700 * 10 ** 3))).revertedWith("ERC20: transfer amount exceeds balance");
        });
    });
})