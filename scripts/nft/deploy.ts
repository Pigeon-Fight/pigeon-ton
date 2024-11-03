import { toNano } from '@ton/core';
import { compile, NetworkProvider } from '@ton/blueprint';
import { NftCollection } from '../../wrappers/NftCollection';

export async function run(provider: NetworkProvider) {
    const COLLECTION_CONTENT_URL = 'https://assets.pigeon-fight.xyz/collection.json';
    const ITEM_BASE_URL = 'https://assets.pigeon-fight.xyz/metadata/';

    const nftCollection = provider.open(
        NftCollection.createFromConfig(
            {
                ownerAddress: provider.sender().address!,
                royaltyPercent: 0.05,
                royaltyAddress: provider.sender().address!,
                collectionContentUrl: COLLECTION_CONTENT_URL,
                commonContentUrl: ITEM_BASE_URL,
                nftItemCode: await compile('NftItem'),
            },
            await compile('NftCollection'),
        ),
    );

    await nftCollection.sendDeploy(provider.sender(), toNano('0.05'));
    await provider.waitForDeploy(nftCollection.address);
    console.table(await nftCollection.getCollectionData());
}
