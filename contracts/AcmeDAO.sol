//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAcmeERC20 is IERC20 {}

contract AcmeDAO is ReentrancyGuard {
    bytes32 public constant STAKEHOLDER_ROLE = keccak256("STAKEHOLDER");
    uint32 constant minVotingPeriod = 2 weeks;
    uint256 numOfProposals;
    IAcmeERC20 public erc20;

    constructor(address _erc20Addr) {
        erc20 = IAcmeERC20(_erc20Addr);
    }

    mapping(uint256 => Proposal) private proposals;
    mapping(address => uint256[]) private stakeholderVotes;
    mapping(address => uint256) private stakeholders;

    struct Proposal {
        uint256 id;
        uint256 amount;
        uint256 livePeriod;
        uint256 votesFor;
        uint256 votesAgainst;
        string description;
        bool closed;
        bool paid;
        address payable proposer;
    }

    event NewProposal(
        address indexed proposer,
        uint256 amount,
        uint256 proposalId
    );
    event PaymentMade(
        address indexed proposer,
        uint256 amount,
        uint256 proposalId
    );

    modifier onlyStakeholder(string memory message) {
        require(erc20.balanceOf(msg.sender) > 0, message);
        _;
    }

    function createProposal(string calldata description, uint256 _amount)
        external
        onlyStakeholder("Only stakeholders are allowed to create proposals")
    {
        require(treasuryBalance() >= _amount, "Amount bigger than treasury!");
        uint256 proposalId = numOfProposals++;
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = payable(msg.sender);
        proposal.description = description;
        proposal.amount = _amount;
        proposal.livePeriod = block.timestamp + minVotingPeriod;
        emit NewProposal(msg.sender, _amount, proposalId);
    }

    function vote(uint256 _proposalId, bool _voteType)
        external
        onlyStakeholder("Only stakeholders are allowed to vote")
    {
        Proposal storage proposal = proposals[_proposalId];
        _isProposalValid(proposal);
        if (_voteType) proposal.votesFor++;
        else proposal.votesAgainst++;
        stakeholderVotes[msg.sender].push(proposal.id);
    }

    function _isProposalValid(Proposal storage proposal) internal view {
        if (proposal.closed || proposal.livePeriod <= block.timestamp) {
            revert("This proposal is no longer valid");
        }
        uint256[] memory votes = stakeholderVotes[msg.sender];
        for (uint256 i = 0; i < votes.length; i++) {
            if (proposal.id == votes[i]) {
                revert("This stakeholder already voted on this proposal");
            }
        }
    }

    function payProposal(uint256 _proposalId)
        external
        onlyStakeholder("Only stakeholders are allowed to pay proposals")
    {
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.paid, "Payment has already been made");
        require(
            proposal.votesFor > proposal.votesAgainst,
            "The proposal doesnt have enough votes to pass"
        );
        require(
            proposal.livePeriod <= block.timestamp,
            "The proposal still ongoing"
        );
        require(
            erc20.transfer(proposal.proposer, proposal.amount),
            "Payment failed"
        );
        proposal.paid = true;
        proposal.closed = true;
        emit PaymentMade(proposal.proposer, proposal.amount, proposal.id);
    }

    function treasuryBalance() public view returns (uint256) {
        return erc20.balanceOf(address(this));
    }

    function getProposals() external view returns (Proposal[] memory props) {
        props = new Proposal[](numOfProposals);
        for (uint256 index = 0; index < numOfProposals; index++) {
            props[index] = proposals[index];
        }
    }

    function getProposal(uint256 _proposalId)
        external
        view
        returns (Proposal memory)
    {
        return proposals[_proposalId];
    }

    function getStakeholderVotes()
        external
        view
        onlyStakeholder("User is not a stakeholder")
        returns (uint256[] memory)
    {
        return stakeholderVotes[msg.sender];
    }
}
