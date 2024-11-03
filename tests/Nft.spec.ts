import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';
import { expToPoint, NftItem } from '../wrappers/NftItem';
import { NftCollection } from '../wrappers/NftCollection';
import { classPrices, itemPrices } from '../wrappers/config';

describe('Nft', () => {
    let nftItemCode: Cell, nftCollectionCode: Cell;

    beforeAll(async () => {
        nftItemCode = await compile('NftItem');
        nftCollectionCode = await compile('NftCollection');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let nftCollection: SandboxContract<NftCollection>;

    // CONSTANTS
    const COLLECTION_CONTENT_URL = 'https://assets.pigeon-fight.xyz/collection.json';
    const ITEM_BASE_URL = 'https://assets.pigeon-fight.xyz/metadata/';

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        nftCollection = blockchain.openContract(
            NftCollection.createFromConfig(
                {
                    ownerAddress: deployer.address,
                    royaltyPercent: 0.05,
                    royaltyAddress: deployer.address,
                    collectionContentUrl: COLLECTION_CONTENT_URL,
                    commonContentUrl: ITEM_BASE_URL,
                    nftItemCode: nftItemCode,
                },
                nftCollectionCode,
            ),
        );

        const deployResult = await nftCollection.sendDeploy(deployer.getSender(), toNano('0.05'));
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: nftCollection.address,
            deploy: true,
            success: true,
        });
    });

    describe('Collection Restricted Operations', () => {
        it('should deploy nft collection', async () => {
            // Get owner
            const data = await nftCollection.getCollectionData();
            expect(data.collectionContent).toEqual(COLLECTION_CONTENT_URL);
        });

        it('owner can transfer ownership to the other ', async () => {
            const newOwner = await blockchain.treasury('newOwner');
            const result = await nftCollection.sendChangeOwner(deployer.getSender(), {
                value: toNano('0.05'),
                address: newOwner.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: deployer.address,
                to: nftCollection.address,
                success: true,
            });

            // Get new owner
            const data = await nftCollection.getCollectionData();
            expect(data.ownerAddress).toEqualAddress(newOwner.address);
        });

        it('only owner can change owner', async () => {
            const newOwner = await blockchain.treasury('newOwner');
            const someOne = await blockchain.treasury('someOne');
            const result = await nftCollection.sendChangeOwner(someOne.getSender(), {
                value: toNano('0.05'),
                address: newOwner.address,
            });

            expect(result.transactions).toHaveTransaction({
                from: someOne.address,
                to: nftCollection.address,
                success: false,
            });

            // Get owner
            const data = await nftCollection.getCollectionData();
            expect(data.ownerAddress).toEqualAddress(deployer.address);
        });

        it('only owner can withdraw', async () => {
            const balanceBefore = await nftCollection.getBalance();

            const someOne = await blockchain.treasury('someOne');
            // someone withdraw
            const someOneResult = await nftCollection.sendWithdraw(someOne.getSender(), {
                value: toNano('0.01'),
                amount: toNano('0.03'),
            });

            expect(someOneResult.transactions).toHaveTransaction({
                from: someOne.address,
                to: nftCollection.address,
                success: false,
            });

            // check the balance
            let balanceAfter = await nftCollection.getBalance();
            expect(balanceAfter).toEqual(balanceBefore);

            // owner withdraw
            const result = await nftCollection.sendWithdraw(deployer.getSender(), {
                value: toNano('0.01'),
                amount: toNano('0.03'),
            });

            expect(result.transactions).toHaveTransaction({
                from: deployer.address,
                to: nftCollection.address,
                success: true,
            });

            // check the balance
            balanceAfter = await nftCollection.getBalance();
            expect(balanceAfter).toBeLessThan(balanceBefore);
        });
    });

    describe('Purchase', () => {
        let user1: SandboxContract<TreasuryContract>;
        let user2: SandboxContract<TreasuryContract>;
        let nftUser1: SandboxContract<NftItem>;
        let nftUser2: SandboxContract<NftItem>;
        const nftClass1 = 7;
        const nftClass2 = 8;

        const purchaseNft = async (userSeed: string, nftClass: number) => {
            const user = await blockchain.treasury(userSeed);
            const price = classPrices[nftClass].tonPrice;

            const data = await nftCollection.getCollectionData();
            const nextItemIndex = data.nextItemIndex;

            const result = await nftCollection.sendPurchaseNft(user.getSender(), {
                value:
                    toNano(price) + // price
                    toNano('0.05') + // ton in nft
                    toNano('0.05'), // fee
                nftClass,
            });

            expect(result.transactions).toHaveTransaction({
                from: user.address,
                to: nftCollection.address,
                success: true,
            });

            const nftAddress = await nftCollection.getNftAddressByIndex(BigInt(nextItemIndex));
            expect(result.transactions).toHaveTransaction({
                from: nftCollection.address,
                to: nftAddress,
                success: true,
            });
            const nftUser = blockchain.openContract(NftItem.createFromAddress(nftAddress));

            return {
                user,
                nftUser,
            };
        };

        beforeEach(async () => {
            // User 1 Mint
            const r = await purchaseNft('user1', nftClass1);
            user1 = r.user;
            nftUser1 = r.nftUser;

            // User 2 Mint
            const r2 = await purchaseNft('user2', nftClass2);
            user2 = r2.user;
            nftUser2 = r2.nftUser;
        });

        it('should purchase nft', async () => {
            const { isDeployed, collectionAddr, ownerAddress, itemIndex, nftContentCell } = await nftUser1.getNftData();
            expect(isDeployed).toEqual(-1);
            expect(collectionAddr).toEqualAddress(nftCollection.address);
            expect(ownerAddress).toEqualAddress(user1.address);
            const nftContent = await nftCollection.getNftContent(BigInt(itemIndex), nftContentCell);
            expect(nftContent).toEqual(ITEM_BASE_URL + nftClass1.toString());
        });

        it('anyone can purchase healing item for any nft', async () => {
            const itemId = 45;
            const anyone = await blockchain.treasury('anyone');
            const price = itemPrices[itemId].tonPrice;

            const nftData = await nftUser1.getNftData();

            const result = await nftCollection.sendPurchaseItem(anyone.getSender(), {
                value:
                    toNano(price) + // price
                    toNano('0.05'), // fee
                itemId,
                nftIndex: BigInt(nftData.itemIndex),
            });

            expect(result.transactions).toHaveTransaction({
                from: anyone.address,
                to: nftCollection.address,
                success: true,
            });
            expect(result.transactions).toHaveTransaction({
                from: nftCollection.address,
                to: nftUser1.address,
                success: true,
            });
        });

        describe('Battle', () => {
            let stats1BeforeUpgrade: any;

            beforeEach(async () => {
                const stats = await nftUser1.getNftStats();
                stats1BeforeUpgrade = stats;
                const { exp, allocated } = stats;
                expect(exp).toEqual(100); // Default Exp = 100
                expect(allocated).toEqual(0); // Default No Allocated for new NFT
                const unallocatedPoint = expToPoint(exp) - allocated;
                expect(unallocatedPoint).toEqual(5);

                const result = await nftUser1.sendUpgrade(user1.getSender(), {
                    value: toNano('0.05'), // fee
                    atk: 2,
                    def: 1,
                    spd: 0,
                    maxHp: 1,
                    maxEnergy: 1,
                });
                // Check tx success
                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: nftUser1.address,
                    success: true,
                });
            });

            it('should upgrade nft', async () => {
                const statsAfter = await nftUser1.getNftStats();
                expect(statsAfter.atk).toEqual(stats1BeforeUpgrade.atk + 2);
                expect(statsAfter.def).toEqual(stats1BeforeUpgrade.def + 1);
                expect(statsAfter.spd).toEqual(stats1BeforeUpgrade.spd + 0);
                expect(statsAfter.maxHp).toEqual(stats1BeforeUpgrade.maxHp + 1);
                expect(statsAfter.maxEnergy).toEqual(stats1BeforeUpgrade.maxEnergy + 1);
            });

            it('upgrade failed due to not enough point', async () => {
                const { exp, allocated } = await nftUser1.getNftStats();
                expect(exp).toEqual(100);
                expect(allocated).toEqual(5); // Already allocated 5 points
                const unallocatedPoint = expToPoint(exp) - allocated;
                expect(unallocatedPoint).toEqual(0);

                const result = await nftUser1.sendUpgrade(user1.getSender(), {
                    value: toNano('0.05'), // fee
                    atk: 1,
                    def: 0,
                    spd: 0,
                    maxHp: 0,
                    maxEnergy: 0,
                });
                // Check tx success
                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: nftUser1.address,
                    success: false,
                    exitCode: 406, // invalid_points
                });
            });

            it('user1 nft attack user2 nft: user1 win', async () => {
                const statsBefore = await nftUser1.getNftStats();
                const stats2Before = await nftUser2.getNftStats();
                const result = await nftUser1.sendBattle(user1.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser2.address,
                });

                // Check txs success
                // op::battle
                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: nftUser1.address,
                    success: true,
                });
                // op::challenge
                expect(result.transactions).toHaveTransaction({
                    from: nftUser1.address,
                    to: nftUser2.address,
                    success: true,
                });
                // op::battle_end
                expect(result.transactions).toHaveTransaction({
                    from: nftUser2.address,
                    to: nftUser1.address,
                    success: true,
                });

                const statsAfter = await nftUser1.getNftStats();
                const stats2After = await nftUser2.getNftStats();

                // Stats changed
                expect(statsAfter.hp).toBeLessThan(statsBefore.hp);
                expect(statsAfter.energy).toBeLessThan(statsBefore.energy);

                // Not change stats
                expect(statsAfter.allocated).toEqual(statsBefore.allocated);
                expect(statsAfter.atk).toEqual(statsBefore.atk);
                expect(statsAfter.def).toEqual(statsBefore.def);
                expect(statsAfter.spd).toEqual(statsBefore.spd);
                expect(statsAfter.maxHp).toEqual(statsBefore.maxHp);
                expect(statsAfter.maxEnergy).toEqual(statsBefore.maxEnergy);

                // user1 must win because of higher stats
                expect(statsAfter.hp).toBeGreaterThan(0);
                expect(statsAfter.exp).toBeGreaterThan(statsBefore.exp);

                // user2 lose
                expect(stats2After.exp).toEqual(stats2Before.exp);
                expect(stats2After.hp).toEqual(0);
            });

            it('user2 nft attack user1 nft: user2 lose', async () => {
                const statsBefore = await nftUser1.getNftStats();
                const stats2Before = await nftUser2.getNftStats();
                const result = await nftUser2.sendBattle(user2.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser1.address,
                });

                // Check txs success
                // op::battle
                expect(result.transactions).toHaveTransaction({
                    from: user2.address,
                    to: nftUser2.address,
                    success: true,
                });
                // op::challenge
                expect(result.transactions).toHaveTransaction({
                    from: nftUser2.address,
                    to: nftUser1.address,
                    success: true,
                });
                // op::battle_end
                expect(result.transactions).toHaveTransaction({
                    from: nftUser1.address,
                    to: nftUser2.address,
                    success: true,
                });

                const statsAfter = await nftUser1.getNftStats();
                const stats2After = await nftUser2.getNftStats();

                // Stats changed
                expect(statsAfter.hp).toBeLessThan(statsBefore.hp);
                expect(statsAfter.energy).toBeLessThan(statsBefore.energy);

                // Not change stats
                expect(statsAfter.allocated).toEqual(statsBefore.allocated);
                expect(statsAfter.atk).toEqual(statsBefore.atk);
                expect(statsAfter.def).toEqual(statsBefore.def);
                expect(statsAfter.spd).toEqual(statsBefore.spd);
                expect(statsAfter.maxHp).toEqual(statsBefore.maxHp);
                expect(statsAfter.maxEnergy).toEqual(statsBefore.maxEnergy);

                // user1 must win because of higher stats
                expect(statsAfter.hp).toBeGreaterThan(0);
                expect(statsAfter.exp).toBeGreaterThan(statsBefore.exp);

                // user2 lose
                expect(stats2After.exp).toEqual(stats2Before.exp);
                expect(stats2After.hp).toEqual(0);
            });

            it('cannot attack yourself', async () => {
                const result = await nftUser1.sendBattle(user1.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser1.address,
                });

                // Check txs fail
                // op::battle
                expect(result.transactions).toHaveTransaction({
                    from: user1.address,
                    to: nftUser1.address,
                    success: false,
                    exitCode: 411,
                });
            });

            it('user2 faint. Need recover before attack or being attack', async () => {
                // user2 attack and lose -> fainted, hp = 0
                await nftUser2.sendBattle(user2.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser1.address,
                });
                const stats2After = await nftUser2.getNftStats();
                expect(stats2After.hp).toEqual(0);

                // Cannot attack anyone
                const result = await nftUser2.sendBattle(user2.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser1.address,
                });
                expect(result.transactions).toHaveTransaction({
                    from: user2.address,
                    to: nftUser2.address,
                    success: false,
                    exitCode: 410, // no hp
                });

                // Cannot beinng attacked by anyone
                const result2 = await nftUser1.sendBattle(user1.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser2.address,
                });
                expect(result2.transactions).toHaveTransaction({
                    from: nftUser1.address,
                    to: nftUser2.address,
                    success: false,
                    exitCode: 410, // no hp
                });
            });

            it('user2 buy item to recover hp and energy', async () => {
                // user2 attack and lose -> fainted, hp = 0
                await nftUser2.sendBattle(user2.getSender(), {
                    value: toNano('0.05'), // fee
                    opponent: nftUser1.address,
                });

                const stats2Before = await nftUser2.getNftStats();
                expect(stats2Before.hp).toEqual(0);
                expect(stats2Before.energy).toBeLessThan(stats2Before.maxEnergy);

                // Anyone can heal this nft by calling through collection
                const anyone = await blockchain.treasury('anyone');
                const itemId = 45; // full hp - energy
                const price = itemPrices[itemId].tonPrice;

                // Raise error if No TON deposit
                const result = await nftCollection.sendPurchaseItem(anyone.getSender(), {
                    value: toNano('0.05'), // fee
                    itemId: 45, // full hp - energy
                    nftIndex: 2n,
                });
                expect(result.transactions).toHaveTransaction({
                    from: anyone.address,
                    to: nftCollection.address,
                    success: false,
                    exitCode: 400, // not enough balance
                });

                // Require TON deposit = Item Price
                const result2 = await nftCollection.sendPurchaseItem(anyone.getSender(), {
                    value:
                        toNano(price) + // price
                        toNano('0.05'), // fee
                    itemId: 45, // full hp - energy
                    nftIndex: 2n,
                });
                expect(result2.transactions).toHaveTransaction({
                    from: nftCollection.address,
                    to: nftUser2.address,
                    success: true,
                });

                const stats2After = await nftUser2.getNftStats();
                expect(stats2After.hp).toEqual(stats2After.maxHp);
                expect(stats2After.energy).toEqual(stats2After.maxEnergy);
            });
        });
    });
});
