import { Address, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../../wrappers/NftCollection';

const NFT_COLLECTION_ADDR = 'EQATjJt5Sd3J_7JGz4NIfkdonw2q6Y2PFknQSFwtvYjghUhN'; // testnet

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
        value: toNano('0.001'),
        amount: toNano('1'),
    });
    await provider.waitForDeploy(nftAddress);
}
