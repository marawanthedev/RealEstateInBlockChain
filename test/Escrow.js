const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
    return ethers.utils.parseUnits(n.toString(), 'ether')
}

describe('Escrow', () => {
    let realEstate, escrow;
    let seller, buyer, lender, inspector;
    let purchasePrice, escrowAmount;


    beforeEach(async () => {
        // this mimic signers that particpate in the consensus process
        const signers = await ethers.getSigners()

        // then we mimic a buyer and a seller
        seller = signers[0]
        buyer = signers[1]
        lender = signers[2]
        inspector = signers[3]


        // getting contract
        const RealEstate = await ethers.getContractFactory("RealEstate")

        //deploying
        realEstate = await RealEstate.deploy()

        // Mint

        // that will do mint function on sellers behave mimics them doing in on blockchain
        let transaction = await realEstate.connect(seller).mint("https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS")

        await transaction.wait()

        const Escrow = await ethers.getContractFactory('Escrow')

        // then we deploy it using those signers and nft addresses
        escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address)

        // Approve property
        // approving property is essential for doing the transfer
        transaction = await realEstate.connect(seller).approve(escrow.address, 1)
        await transaction.wait()

        // list property
        purchasePrice = tokens(10)
        escrowAmount = tokens(5)
        transaction = await escrow.connect(seller).list(1, `${buyer.address}`, purchasePrice, escrowAmount)
        await transaction.wait()
    })


    describe("deployment", () => {
        it('Returns nft address', async () => {
            const result = await escrow.nftAddress()
            expect(result).to.be.equal(realEstate.address)

        })

        it('Returns seller', async () => {
            const result = await escrow.seller()
            expect(result).to.be.equal(seller.address)
        })

        it('Returns lender', async () => {
            const result = await escrow.lender()
            expect(result).to.be.equal(lender.address)
        })

        it('Returns inspector', async () => {
            const result = await escrow.inspector()
            expect(result).to.be.equal(inspector.address)
        })
    })


    describe("listing", () => {
        it('Updates ownership', async () => {
            const owner = await realEstate.ownerOf(1)
            expect(owner).to.be.equal(escrow.address)
        })
        it('Updates Listing state', async () => {
            const isListed = await escrow.isListed(1)
            expect(isListed).to.be.equal(true)
        })
        it('Updates purchase price', async () => {
            const nftPrice = await escrow.purchasePrice(1)
            expect(nftPrice).to.be.equal(purchasePrice)
        })
        it('Updates escrow amount', async () => {
            const nftEscrow = await escrow.escrowAmount(1)
            expect(nftEscrow).to.be.equal(escrowAmount)
        })

        it('Updates buyer address', async () => {
            const buyerAddress = await escrow.buyer(1)
            expect(buyerAddress).to.be.equal(buyer.address)
        })
    })

    describe("deposit", () => {
        it('Deposits realestate ', async () => {
            transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(5) })
            await transaction.wait()
            const result = await escrow.getBalance()
            expect(result).to.be.equal(tokens(5))
        })
    })

    describe("inspection", () => {
        it('updates inspection status ', async () => {
            const inspectionPassed = true
            transaction = await escrow.connect(inspector).updateInspectionStatus(1, inspectionPassed)
            await transaction.wait()
            const inspectionResult = await escrow.inspectionPassed(1)
            expect(inspectionResult).to.be.equal(inspectionPassed)
        })
    })

    describe("approval", () => {
        it('Inspector Approves a sale ', async () => {
            transaction = await escrow.connect(inspector).approveSale(1)
            await transaction.wait()

            const approvalData = await escrow.approval(1, inspector.address)
            expect(approvalData).to.be.equal(true)
        })

        it('Lender Approves a sale ', async () => {
            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            const approvalData = await escrow.approval(1, lender.address)
            expect(approvalData).to.be.equal(true)
        })
        it('Buyer Approves a sale ', async () => {
            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            const approvalData = await escrow.approval(1, buyer.address)
            expect(approvalData).to.be.equal(true)
        })


        it('Inspector Disapproves a sale ', async () => {
            transaction = await escrow.connect(inspector).disApproveSale(1)
            await transaction.wait()
            const approvalData = await escrow.approval(1, inspector.address)
            expect(approvalData).to.be.equal(false)
        })

        it('buyer Disapproves a sale ', async () => {
            transaction = await escrow.connect(buyer).disApproveSale(1)
            await transaction.wait()
            const approvalData = await escrow.approval(1, buyer.address)
            expect(approvalData).to.be.equal(false)
        })

        it('lender Disapproves a sale ', async () => {
            transaction = await escrow.connect(lender).disApproveSale(1)
            await transaction.wait()
            const approvalData = await escrow.approval(1, lender.address)
            expect(approvalData).to.be.equal(false)
        })
    })


    describe("Finalizing a sale", () => {

        beforeEach(async () => {
            transaction = await escrow.connect(inspector).updateInspectionStatus(1, true)
            await transaction.wait()

            transaction = await escrow.connect(buyer).depositEarnest(1, { value: tokens(10) })
            await transaction.wait()

            transaction = await escrow.connect(buyer).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(seller).approveSale(1)
            await transaction.wait()

            transaction = await escrow.connect(lender).approveSale(1)
            await transaction.wait()

            // await lender.sendTransaction({ to: escrow.address, value: tokens(5), gasLimit: 500000 },)

            transaction = await escrow.finalizeSale(1, { gasLimit: 500000 })
            await transaction.wait()


            const isListed = await escrow.isListed(1);
            expect(isListed).to.be.equal(false)
        })

        it('updates ownership', async () => {
            expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address)
        })


        it('confirmed that contract balance is transferred ', async () => {
            expect(await escrow.getBalance()).to.be.equal(0)
        })
    })


})
