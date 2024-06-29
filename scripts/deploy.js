// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

async function main() {

  const signers = await ethers.getSigners()

  // then we mimic a buyer and a seller
  seller = signers[0]
  buyer = signers[1]
  lender = signers[2]
  inspector = signers[3]

  const RealEstate = await ethers.getContractFactory("RealEstate")
  realEstate = await RealEstate.deploy()
  await realEstate.deployed()

  console.log('Deoployed realestate contract at:', realEstate.address)
  console.log('minting 3 properties')


  for (let i = 0; i < 3; i++) {
    const trx = await realEstate.connect(seller).mint(`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i + 1}`)
    await trx.wait()
  }

  const Escrow = await ethers.getContractFactory('Escrow')
  escrow = await Escrow.deploy(realEstate.address, seller.address, inspector.address, lender.address)
  await escrow.deployed()


  for (let i = 0; i < 3; i++) {
    // approve properties
    let transaction = await realEstate.connect(seller).approve(escrow.address, i + 1)
    await transaction.wait()
  }

  // listing props
  transaction = await escrow.connect(seller).list(1, buyer.address, tokens(20), tokens(10))
  await transaction.wait()

  transaction = await escrow.connect(seller).list(2, buyer.address, tokens(10), tokens(5))
  await transaction.wait()

  transaction = await escrow.connect(seller).list(3, buyer.address, tokens(25), tokens(15))
  await transaction.wait()


  console.log("finished")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
