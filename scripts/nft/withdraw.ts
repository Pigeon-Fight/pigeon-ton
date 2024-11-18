import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../../wrappers/NftCollection';

const NFT_COLLECTION_ADDR = 'EQBuz5raFksipFH3ltcn0B2DNFq_-mTyTuRi-AAqd0YZeEbU'; // testnet

export async function run(provider: NetworkProvider) {
    const nftCollection = provider.open(
        NftCollection.createFromAddress(
            Address.parse(
                NFT_COLLECTION_ADDR, // testnet
            ),
        ),
    );

    const collectionData = await nftCollection.getCollectionData();
    const nftAddress = await nftCollection.getNftAddressByIndex(BigInt(collectionData.nextItemIndex));

    // fee: ~
    // tx:
    await nftCollection.sendWithdraw(provider.sender(), {
        value: toNano('0.002'),
        amount: toNano('2.032'),
    });
    await provider.waitForDeploy(nftAddress);
}
