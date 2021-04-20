pragma solidity ^0.6.7;


import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "@openzeppelin/contracts/proxy/Initializable.sol";

import "./RaffleTicket.sol";

contract Raffle is Initializable, IERC721Receiver {
    RaffleTicket public ticketMaker;
    uint public numInitialTickets;
    uint public ticketPrice;
    uint public numTicketsSold;

    uint256 public prizeTokenId;
    address public prizeAddress;

    address public manager;
    address payable public benefactor;
    address public donor;

    event nftReceived(string msg);

    function getTicketOwner(uint256 ticketId) public view returns (address) {
        return ticketMaker.ownerOf(ticketId);
    }

    function initialize(
        uint  initialNumTickets, 
        uint  initialTicketPrice,
        address raffleManager,
        address payable raffleBenefactor
    ) public {
        manager = raffleManager;
        benefactor = raffleBenefactor;

        ticketMaker = new RaffleTicket();
        
        numInitialTickets = initialNumTickets;
        ticketPrice = initialTicketPrice;
        numTicketsSold = 0;

        // TODO figure out if it's possible to approve and transfer
        // prize NFT in the init call, or at least through the Raffle interface
        // ERC721(prizeAddress).safeTransferFrom(
        //     msg.sender,
        //     address(this),
        //     prizeTokenId
        // );
    }

    function sendAvailableTicket(address sender) private {
        // juuust in case require here too
        require(numTicketsSold < numInitialTickets);

        // ID of the NFT is the # of the sold ticket, starting with 0
        ticketMaker.sendTicket(sender, numTicketsSold);
        numTicketsSold ++;
    }

    // To be replaced with chainlink
    function dangerousPseudoRandom() private view returns (uint) {
        // NOTE: this is theoretically gameable, 
        // all of the inputs are public
        // if you can predict the time at which it will be executed
        // TLDR this is a toy only
        // look into chainlink VRF for true randomness
        //https://docs.chain.link/docs/get-a-random-number
        return uint(keccak256(abi.encodePacked(
            block.difficulty,
            block.timestamp
        )));
    }

    function enter() public payable {
        uint numTickets = msg.value / ticketPrice;
        
        require(
            (numInitialTickets - numTicketsSold) >= numTickets, 
            "No more tickets available"
        );

        for (uint i=0; i < numTickets; i++) {
            sendAvailableTicket(msg.sender);
        }
    }


    function drawWinner() public managerOnly {
        // winner can't be an unsold ticket
        uint winningTicketIndex = dangerousPseudoRandom() % numTicketsSold;
        // charity gets the prize moneys
        // TODO use safetransfer instead
        benefactor.send(address(this).balance);

        // owner of the winning ticket gets the prize NFT
        address winner = ticketMaker.ownerOf(winningTicketIndex);

        ERC721(prizeAddress).safeTransferFrom(
            address(this),
            winner,
            prizeTokenId
        );
    }

    // Not perfect, ideally we can receive the NFT in the same step as initializing
    // the contract, or *at least* through an interface that lives on the raffle itself.
    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data) public override returns (bytes4) {
        emit nftReceived("");

        // kinda janky, decline any tokens past the first one donated
        require(prizeAddress == address(0), "Already have a prize");

        donor = from;

        // now our prize can be uniquely identified
        // regardless of which "collection" it belongs to
        prizeAddress = msg.sender;
        prizeTokenId = tokenId;
        return this.onERC721Received.selector;
    }

    modifier managerOnly() {
        require(msg.sender == manager, 'This action can only be performed by contract manager.');
        _;
    }
}