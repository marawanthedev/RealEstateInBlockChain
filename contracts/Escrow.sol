//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(address _from, address _to, uint256 _id) external;
}

contract Escrow {
    // to keep track of current real estate to sell as we are considering it an nft
    address public nftAddress;
    address public lender;
    address public inspector;
    // payable here is added to ensure that this seller can recieve the eth coming from the realestate sales process
    address payable public seller;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => address) public buyer;
    // mapping of token id to approval status including the address of which update approval status and bool val
    mapping(uint256 => mapping(address => bool)) public approval;

    // mapping(uint256 => mapping(address => uint256)) public paidAmounts;
    // mapping(uint256 => mapping(address => uint256))
    //     public remainingAmoutToBePaid;

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }
    modifier onlyBuyer(uint256 _nftID) {
        require(msg.sender == buyer[_nftID], "Only Buyer can call this method");
        _;
    }
    modifier onlyInspector() {
        require(msg.sender == inspector, "Only inspector can call this method");
        _;
    }
    modifier onlyLender() {
        require(msg.sender == lender, "Only Lender can call this method");
        _;
    }

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftAddress = _nftAddress;
        lender = _lender;
        inspector = _inspector;
        seller = _seller;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        // transfer nft from seller to this contract
        IERC721(nftAddress).transferFrom(msg.sender, address(this), _nftID);

        // setting listing state to true
        isListed[_nftID] = true;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        buyer[_nftID] = _buyer;
    }

    // put under contract (only buyer -payable escrow)
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(
            msg.value >= escrowAmount[_nftID],
            "Down payment can not be less than property escrow price"
        );
        require(
            msg.value <= purchasePrice[_nftID],
            "Down payment can not be more than property purchase price"
        );

        // paidAmounts[_nftID][msg.sender] = msg.value;
        // remainingAmoutToBePaid[_nftID][msg.sender] =
        //     purchasePrice[_nftID] -
        //     msg.value;
    }

    // function payRemaining(uint256 _nftID) public payable onlyBuyer(_nftID) {
    //     uint256 _total = paidAmounts[_nftID][msg.sender] + msg.value;
    //     paidAmounts[_nftID][msg.sender] = _total;
    //     remainingAmoutToBePaid[_nftID][msg.sender] =
    //         purchasePrice[_nftID] -
    //         _total;
    // }

    function updateInspectionStatus(
        uint _nftID,
        bool _passed
    ) public onlyInspector {
        inspectionPassed[_nftID] = _passed;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function recieve() external payable {}

    function approveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = true;
    }

    function disApproveSale(uint256 _nftID) public {
        approval[_nftID][msg.sender] = false;
    }

    function cancelSale(uint256 _nftID) public onlyBuyer(_nftID) {
        if (inspectionPassed[_nftID] == false) {
            payable(buyer[_nftID]).transfer(address(this).balance);
        } else {
            payable(seller).transfer(address(this).balance);
        }
    }

    // require insepection status
    // require sales to be authorized
    // required funds to be current amount
    // transfer nft to buyer
    // trasnfers funds to seller
    function finalizeSale(uint256 _nftID) public {
        require(
            inspectionPassed[_nftID],
            "Can not finalize a sale without passing inspection"
        );
        require(
            approval[_nftID][buyer[_nftID]],
            "Can not proceed without buyer approval "
        );
        require(
            approval[_nftID][seller],
            "Can not proceed without seller approval "
        );
        require(
            approval[_nftID][lender],
            "Can not proceed without lender approval "
        );
        require(
            address(this).balance >= purchasePrice[_nftID],
            "No enough balance to complete the sale"
        );

        (bool success, ) = payable(seller).call{value: address(this).balance}(
            ""
        );

        require(success, "transfering eth to seller has failed");

        IERC721(nftAddress).transferFrom(address(this), buyer[_nftID], _nftID);

        isListed[_nftID] = false;
    }
}
