const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Escrow", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployFixture() {
    // Contracts are deployed using the first signer/account by default
    const [owner, depositer, benifecray, claimer, ...otheraccounts] =
      await ethers.getSigners();

    const Escrow = await ethers.getContractFactory("Escrow");
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const erc20Token = await ERC20Mock.deploy(owner.address);

    const escrow = await Escrow.deploy();

    return {
      escrow,
      erc20Token,
      owner,
      depositer,
      benifecray,
      claimer,
      otheraccounts,
    };
  }

  describe("Deposit and Claim ETH", function () {
    it("Should deposit the ETH funds to escrow", async function () {
      const { escrow, depositer, benifecray } = await loadFixture(
        deployFixture
      );

      const amount = ethers.parseEther("1");

      const hashBenifecray = ethers.keccak256(benifecray.address);

      await expect(
        escrow
          .connect(depositer)
          .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
            value: amount,
          })
      )
        .to.emit(escrow, "Deposit")
        .withArgs(hashBenifecray, amount);
    });

    it("Should claim the ETH funds ", async function () {
      const { escrow, claimer, benifecray, depositer } = await loadFixture(
        deployFixture
      );

      const amount = ethers.parseEther("1");

      const hashBenifecray = ethers.keccak256(benifecray.address);

      escrow
        .connect(depositer)
        .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
          value: amount,
        });

      const nonce = await escrow.nonce();

      const signhash = await escrow.getRelaseFundDataHash(
        claimer.address,
        amount,
        nonce
      );
      const signature = await benifecray.signMessage(ethers.getBytes(signhash));
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      await expect(
        escrow
          .connect(claimer)
          .claim(v, r, s, depositer.address, claimer.address)
      )
        .to.emit(escrow, "Claim")
        .withArgs(claimer.address, amount);
    });
  });

  describe("Multiple Deposit", function () {
    it("Should deposit funds to one benifecy by diffrent despositer ", async function () {
      const { escrow, otheraccounts, benifecray } = await loadFixture(
        deployFixture
      );

      const amount = ethers.parseEther("1");

      const hashBenifecray1 = ethers.keccak256(otheraccounts[1].address);
      const hashBenifecray2 = ethers.keccak256(otheraccounts[2].address);

      await escrow
        .connect(otheraccounts[0])
        .deposit(hashBenifecray1, ethers.ZeroAddress, amount, {
          value: amount,
        });

      await escrow
        .connect(otheraccounts[1])
        .deposit(hashBenifecray2, ethers.ZeroAddress, amount, {
          value: amount,
        });

      const Deposit1 = await escrow.Beneficiaries(otheraccounts[0].address);
      const Deposit2 = await escrow.Beneficiaries(otheraccounts[1].address);

      expect(Deposit1.isDeposit).to.equal(true);
      expect(Deposit2.isDeposit).to.equal(true);
    });
  });

  describe("Deposit and Claim ERC20 Tokens ", function () {
    it("Should deposit the erc20 funds to escrow", async function () {
      const { escrow, erc20Token, depositer, benifecray } = await loadFixture(
        deployFixture
      );
      await erc20Token.transfer(
        depositer.address,
        ethers.parseEther("10", "ether")
      );
      await erc20Token
        .connect(depositer)
        .approve(escrow.target, ethers.parseEther("10"));

      const amount = ethers.parseEther("5");

      const hashBenifecray = ethers.keccak256(benifecray.address);

      await expect(
        escrow
          .connect(depositer)
          .deposit(hashBenifecray, erc20Token.target, amount)
      )
        .to.emit(escrow, "Deposit")
        .withArgs(hashBenifecray, amount);
    });

    it("Should claim the erc20 funds ", async function () {
      const { escrow, claimer, benifecray, depositer, erc20Token } =
        await loadFixture(deployFixture);

      const amount = ethers.parseEther("5");

      await erc20Token.transfer(
        depositer.address,
        ethers.parseEther("10", "ether")
      );
      await erc20Token
        .connect(depositer)
        .approve(escrow.target, ethers.parseEther("10"));

      const hashBenifecray = ethers.keccak256(benifecray.address);

      escrow
        .connect(depositer)
        .deposit(hashBenifecray, erc20Token.target, amount);

      const nonce = await escrow.nonce();

      const signhash = await escrow.getRelaseFundDataHash(
        claimer.address,
        amount,
        nonce
      );
      const signature = await benifecray.signMessage(ethers.getBytes(signhash));
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      await expect(
        escrow
          .connect(claimer)
          .claim(v, r, s, depositer.address, claimer.address)
      )
        .to.emit(escrow, "Claim")
        .withArgs(claimer.address, amount);
    });
  });

  describe(" Deposit reverts  ", function () {
    const amount = ethers.parseEther("1");
    it("should revert when already in deposit", async function () {
      const { escrow, depositer, benifecray, otheraccounts } =
        await loadFixture(deployFixture);

      const hashBenifecray = ethers.keccak256(otheraccounts[1].address);

      await escrow
        .connect(otheraccounts[0])
        .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
          value: amount,
        });

      await expect(
        escrow
          .connect(otheraccounts[0])
          .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
            value: amount,
          })
      ).to.be.revertedWith("Already in deposit");
    });

    it("should revert when incorrect ETH amount is sent", async function () {
      const { escrow, otheraccounts } = await loadFixture(deployFixture);
      const hashBenifecray = ethers.keccak256(otheraccounts[1].address);
      await expect(
        escrow
          .connect(otheraccounts[0])
          .deposit(hashBenifecray, ethers.ZeroAddress, amount)
      ).to.be.revertedWith("ETH amount is incorrect");
    });

    it("should revert when deposit is in ERC20 but  value is sent by mistake", async function () {
      const { escrow, erc20Token, otheraccounts } = await loadFixture(
        deployFixture
      );
      const hashBenifecray = ethers.keccak256(otheraccounts[1].address);
      await expect(
        escrow
          .connect(otheraccounts[0])
          .deposit(hashBenifecray, erc20Token.target, amount, {
            value: amount,
          })
      ).to.be.revertedWith("Save your ETH, this is ERC20");
    });

    it("should revert when failed to deposit ERC20 tokens", async function () {
      const { escrow, erc20Token, otheraccounts } = await loadFixture(
        deployFixture
      );
      const hashBenifecray = ethers.keccak256(otheraccounts[1].address);
      await erc20Token.transfer(
        otheraccounts[0].address,
        ethers.parseEther("10", "ether")
      );
      await erc20Token
        .connect(otheraccounts[0])
        .approve(escrow.target, ethers.parseEther("10"));

      // Now, when trying to deposit, it should fail due to insufficient allowance
      await expect(
        escrow
          .connect(otheraccounts[0])
          .deposit(hashBenifecray, erc20Token.target, ethers.parseEther("11"))
      )
        .to.be.revertedWithCustomError(erc20Token, "ERC20InsufficientAllowance")
        .withArgs(
          escrow.target,
          ethers.parseEther("10"),
          ethers.parseEther("11")
        );
    });
  });

  describe(" Claim reverts", function () {
    it("should revert if the user is invalid", async function () {
      const { escrow, claimer, benifecray, depositer, otheraccounts } =
        await loadFixture(deployFixture);

      const amount = ethers.parseEther("1");

      const hashBenifecray = ethers.keccak256(benifecray.address);

      escrow
        .connect(depositer)
        .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
          value: amount,
        });

      const nonce = await escrow.nonce();

      const signhash = await escrow.getRelaseFundDataHash(
        claimer.address,
        amount,
        nonce
      );
      const signature = await otheraccounts[1].signMessage(
        ethers.getBytes(signhash)
      );
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      await expect(
        escrow
          .connect(claimer)
          .claim(v, r, s, depositer.address, claimer.address)
      ).to.revertedWith("Invalid user");
    });

    it("should revert if recipient address is zero", async function () {
      const { escrow, claimer, benifecray, depositer, otheraccounts } =
        await loadFixture(deployFixture);

      const amount = ethers.parseEther("1");

      const hashBenifecray = ethers.keccak256(benifecray.address);

      escrow
        .connect(depositer)
        .deposit(hashBenifecray, ethers.ZeroAddress, amount, {
          value: amount,
        });

      const nonce = await escrow.nonce();

      const signhash = await escrow.getRelaseFundDataHash(
        ethers.ZeroAddress,
        amount,
        nonce
      );
      const signature = await benifecray.signMessage(ethers.getBytes(signhash));
      const r = signature.slice(0, 66);
      const s = "0x" + signature.slice(66, 130);
      const v = parseInt(signature.slice(130, 132), 16);

      await expect(
        escrow
          .connect(claimer)
          .claim(v, r, s, depositer.address, ethers.ZeroAddress)
      ).to.revertedWith("Recipient not be zero");
    });
  });
});
