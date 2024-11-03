import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    toNano,
} from '@ton/core';
import { calculateRequestOpcode, encodeContent, encodeOffChainContent, flattenSnakeCell } from './helper';
import { PriceDictValue, PriceDictValueSerializer } from './dict';
import { classPrices, itemPrices } from './config';

export type NftCollectionConfig = {
    ownerAddress: Address;
    royaltyPercent: number;
    royaltyAddress: Address;
    collectionContentUrl: string;
    commonContentUrl: string;
    nftItemCode: Cell;
};

export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    // Royalty Cell
    const royaltyCell = beginCell();
    const royaltyBase = 1000;
    const royaltyFactor = Math.floor(config.royaltyPercent * royaltyBase);
    royaltyCell.storeUint(royaltyFactor, 16);
    royaltyCell.storeUint(royaltyBase, 16);
    royaltyCell.storeAddress(config.royaltyAddress);

    // Price Dict
    const priceDict = Dictionary.empty<number, PriceDictValue>();
    for (const [itemId, { tonPrice, boostAtk, boostDef, boostSpd }] of Object.entries(classPrices)) {
        priceDict.set(parseInt(itemId), {
            price: toNano(tonPrice),
            attr1: boostAtk,
            attr2: boostDef,
            attr3: boostSpd,
        });
    }

    for (const [itemId, { tonPrice, healHp, healEnergy }] of Object.entries(itemPrices)) {
        priceDict.set(parseInt(itemId), {
            price: toNano(tonPrice),
            attr1: healHp,
            attr2: healEnergy,
            attr3: 0,
        });
    }

    // Data Cell
    const dataCell = beginCell();
    dataCell
        .storeAddress(config.ownerAddress) // ownerAddress
        .storeUint(1, 64) // nextItemIndex
        .storeDict(priceDict, Dictionary.Keys.Uint(8), PriceDictValueSerializer)
        .storeRef(
            beginCell()
                .storeRef(encodeOffChainContent(config.collectionContentUrl))
                .storeRef(encodeContent(config.commonContentUrl)),
        ) // contentCell
        .storeRef(config.nftItemCode) // nftItemCodeCell
        .storeRef(royaltyCell); // royaltyCell

    return dataCell.endCell();
}

const Opcodes = {
    changeOwner: calculateRequestOpcode('op::change_owner'),
    purchase: calculateRequestOpcode('op::purchase'),
    withdraw: calculateRequestOpcode('op::withdraw'),
    updatePrice: calculateRequestOpcode('op::update_price'),
};

export class NftCollection implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendPurchaseNft(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            nftClass: number;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.purchase, 32) // opcode
                .storeUint(0, 64) // query
                .storeUint(opts.nftClass, 8) // class
                .endCell(),
        });
    }

    async sendPurchaseItem(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            itemId: number;
            nftIndex: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.purchase, 32) // opcode
                .storeUint(0, 64) // query
                .storeUint(opts.itemId, 8) // class
                .storeUint(opts.nftIndex, 64) // nftItemIndex
                .endCell(),
        });
    }

    async sendSetPrice(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            nftClass: number;
            price: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.updatePrice, 32) // opcode
                .storeUint(0, 64) // query
                .storeUint(opts.nftClass, 8) // nftClass
                .storeCoins(opts.price) // Price
                .endCell(),
        });
    }

    async sendChangeOwner(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            address: Address;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.changeOwner, 32) // opcode
                .storeUint(0, 64) // query
                .storeAddress(opts.address) // new owner address
                .endCell(),
        });
    }

    async sendWithdraw(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            amount: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.withdraw, 32) // opcode
                .storeUint(0, 64) // query
                .storeCoins(opts.amount) // withdraw amount
                .endCell(),
        });
    }

    async getCollectionData(provider: ContractProvider) {
        const result = await provider.get('get_collection_data', []);
        // NextItem Index
        const nextItemIndex = result.stack.readNumber();
        // Collection Content
        const collectionContentCell = result.stack.readCell();
        const contentBuffer = flattenSnakeCell(collectionContentCell);
        const collectionContent = contentBuffer.slice(1).toString('utf8');
        // Owner Address
        const ownerAddress = result.stack.readAddress();
        return {
            nextItemIndex,
            collectionContent,
            ownerAddress,
        };
    }

    async getBalance(provider: ContractProvider) {
        const result = await provider.get('balance', []);
        const balance = result.stack.readNumber();
        return balance;
    }

    async getNftAddressByIndex(provider: ContractProvider, index: bigint) {
        const result = await provider.get('get_nft_address_by_index', [
            {
                type: 'int',
                value: index,
            },
        ]);
        return result.stack.readAddress();
    }

    async getNftContent(provider: ContractProvider, index: bigint, nftContent: Cell) {
        const result = await provider.get('get_nft_content', [
            {
                type: 'int',
                value: index,
            },
            {
                type: 'cell',
                cell: nftContent,
            },
        ]);
        const contentBuffer = flattenSnakeCell(result.stack.readCell());
        return contentBuffer.slice(1).toString('utf8');
    }
}
