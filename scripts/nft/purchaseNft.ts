import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../../wrappers/NftCollection';
import { classPrices } from '../../wrappers/config';

const NFT_COLLECTION_ADDR = 'EQBuz5raFksipFH3ltcn0B2DNFq_-mTyTuRi-AAqd0YZeEbU'; // testnet

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(NftCollection.createFromAddress(Address.parse(NFT_COLLECTION_ADDR)));

    const collectionData = await nftCollection.getCollectionData();
    const nftAddress = await nftCollection.getNftAddressByIndex(BigInt(collectionData.nextItemIndex));

    // fee:
    //  - 1 (nftPrice)
    //  - 0.003119668 (Wallet fee)
    //  - 0.010932303 (NFT collection charge fee)
    //  - 0.0020984 (deploy NFT Item fee)
    // tx: https://testnet.tonscan.org/tx/6V9s4drnnfiZkL+JZTPGHJUU07A0Y%2FSETWtZ3SPI15c=
    const nftClass = 5;
    const tonPrice = classPrices[nftClass].tonPrice;
    console.log(`Buy NFT class ${nftClass} with price = ${tonPrice} TON`);
    await nftCollection.sendPurchaseNft(provider.sender(), {
        value: toNano(tonPrice) + toNano('0.06'),
        nftClass,
    });
    await provider.waitForDeploy(nftAddress);
}
