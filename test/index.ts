import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, ContractTransaction } from "ethers";
import { Result } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import {
  AcmeERC20,
  AcmeERC20__factory,
  AcmeDAO__factory,
  AcmeDAO,
} from "../typechain";

type ProposalType = [
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  BigNumber,
  string,
  boolean,
  boolean,
  string
] & {
  id: BigNumber;
  amount: BigNumber;
  livePeriod: BigNumber;
  votesFor: BigNumber;
  votesAgainst: BigNumber;
  description: string;
  closed: boolean;
  paid: boolean;
  proposer: string;
};

let ERC20: AcmeERC20__factory;
let erc20: AcmeERC20;
let DAO: AcmeDAO__factory;
let dao: AcmeDAO;

let addr1: SignerWithAddress;
let addr2: SignerWithAddress;
let addr3: SignerWithAddress;
let addr4: SignerWithAddress;

let proposalId: number;

describe("DAO contract", async () => {
  before(() => setup());
  it("Shouldnt allow a stakeholder to create a proposal with amount bigger than treasury", async () => {
    await expect(
      dao.createProposal("Proposal for test", ethers.BigNumber.from("2"))
    ).to.be.revertedWith("Amount bigger than treasury!");
  });
  it("Shouldnt allow a non-stakeholder to create a proposal", async () => {
    await expect(
      dao
        .connect(addr2)
        .createProposal("Proposal for test", ethers.BigNumber.from("2"))
    ).to.be.revertedWith("Only stakeholders are allowed to create proposals");
  });
  it("Should create a proposal successfully", async () => {
    await deposit(dao.address, ethers.BigNumber.from("10"));
    const tx = await dao.createProposal(
      "Proposal for test",
      ethers.BigNumber.from("1")
    );
    const event = (await getFromEvent(tx, "NewProposal")) || [];
    expect(event["proposer"]).to.be.eq(addr1.address);
    expect(getFromArgs(event, "amount")).to.be.eq(1);
    proposalId = getFromArgs(event, "proposalId");
    expect(proposalId).to.be.eq(0);
  });
  it("Shouldnt allow a non-stakeholder to vote", async () => {
    await expect(dao.connect(addr2).vote(proposalId, true)).to.be.revertedWith(
      "Only stakeholders are allowed to vote"
    );
  });
  it("Should successfully make a favor vote", async () => {
    let proposal = await dao.getProposal(proposalId);
    let parsedProp = parseProposal(proposal);
    expect(parsedProp.votesFor).to.be.eq(0);
    expect(parsedProp.votesAgainst).to.be.eq(0);
    await dao.vote(proposalId, true);
    proposal = await dao.getProposal(proposalId);
    parsedProp = parseProposal(proposal);
    expect(parsedProp.votesFor).to.be.eq(1);
    expect(parsedProp.votesAgainst).to.be.eq(0);
  });
  it("Should successfully make a against vote", async () => {
    deposit(addr2.address, ethers.BigNumber.from("1"));
    let proposal = await dao.getProposal(proposalId);
    let parsedProp = parseProposal(proposal);
    expect(parsedProp.votesFor).to.be.eq(1);
    expect(parsedProp.votesAgainst).to.be.eq(0);
    await dao.connect(addr2).vote(proposalId, false);
    proposal = await dao.getProposal(proposalId);
    parsedProp = parseProposal(proposal);
    expect(parsedProp.votesFor).to.be.eq(1);
    expect(parsedProp.votesAgainst).to.be.eq(1);
  });
  it("Shouldnt allow a stakeholder to vote twice in a same proposal", async () => {
    await expect(dao.vote(proposalId, true)).to.be.revertedWith(
      "This stakeholder already voted on this proposal"
    );
  });
  it("Shouldnt pay proposal if doesnt have enough votes to pass", async () => {
    await expect(dao.payProposal(proposalId)).to.be.revertedWith(
      "The proposal doesnt have enough votes to pass"
    );
    const proposal = await dao.getProposal(proposalId);
    const parsedProp = parseProposal(proposal);
    expect(parsedProp.closed).to.be.false;
    expect(parsedProp.paid).to.be.false;
    const proposerBalance = await erc20.balanceOf(parsedProp.proposer);
    const treasury = await dao.treasuryBalance();
    expect(NormalNumber(treasury)).to.be.eq(10);
    expect(NormalNumber(proposerBalance)).to.be.eq(99999999999999999999988);
  });
  it("Shouldnt pay proposal and close sucessfully", async () => {
    await deposit(addr3.address, ethers.BigNumber.from("1"));
    await dao.connect(addr3).vote(proposalId, true);
    await network.provider.send("evm_setNextBlockTimestamp", [1648325187]);
    let proposerBalance = await erc20.balanceOf(addr1.address);
    expect(NormalNumber(proposerBalance)).to.be.eq(99999999999999999999988);
    const tx = await dao.payProposal(proposalId);
    const event = await getFromEvent(tx, "PaymentMade");
    expect(event?.length).to.be.above(0);
    const proposal = await dao.getProposal(proposalId);
    const parsedProp = parseProposal(proposal);
    expect(parsedProp.closed).to.be.true;
    expect(parsedProp.paid).to.be.true;
    proposerBalance = await erc20.balanceOf(parsedProp.proposer);
    const treasury = await dao.treasuryBalance();
    expect(NormalNumber(proposerBalance)).to.be.eq(99999999999999999999989);
    expect(NormalNumber(treasury)).to.be.eq(9);
  });
  it("Shouldnt allow a vote to a closed proposal", async () => {
    await expect(dao.vote(proposalId, true)).to.be.revertedWith(
      "This proposal is no longer valid"
    );
  });
  it("Should get a stakeholder votes", async () => {
    const votes = await dao.getStakeholderVotes();
    expect(votes[0]).to.be.eq(proposalId);
  });
});

const setup = async () => {
  [addr1, addr2, addr3, addr4] = await ethers.getSigners();
  ERC20 = await ethers.getContractFactory("AcmeERC20");
  erc20 = await ERC20.deploy();
  DAO = await ethers.getContractFactory("AcmeDAO");
  dao = await DAO.deploy(erc20.address);
  await erc20.deployed();
  await dao.deployed();
};

const deposit = (address: string, amount: BigNumberish) => {
  return erc20.transfer(address, amount);
};

const getFromEvent = async (tx: ContractTransaction, eventName: string) => {
  const cr = await tx.wait();
  const event = cr.events?.find((e) => e.event === eventName);
  return event?.args;
};

const getFromArgs = (args: Result, argName: string) =>
  NormalNumber(args[argName]);

const NormalNumber = (bigNumber: BigNumber) => {
  const etherNumber = ethers.utils.formatEther(bigNumber);
  return Math.round(parseFloat(etherNumber) * 10 ** 18);
};

const parseProposal = (prop: ProposalType) => ({
  id: NormalNumber(prop.id),
  amout: NormalNumber(prop.amount),
  livePeriod: NormalNumber(prop.livePeriod),
  votesFor: NormalNumber(prop.votesFor),
  votesAgainst: NormalNumber(prop.votesAgainst),
  description: prop.description,
  closed: prop.closed,
  paid: prop.paid,
  proposer: prop.proposer,
});
