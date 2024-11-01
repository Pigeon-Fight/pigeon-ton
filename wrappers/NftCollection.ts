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
import { calculateRequestOpcode, encodeOffChainContent } from './helper';
import { PriceDictValue, PriceDictValueSerializer } from './dict';
import { nftPrices } from './config';

export type NftCollectionConfig = {
    ownerAddress: Address;
    saleAddress: Address;
    royaltyPercent: number;
    royaltyAddress: Address;
    collectionContentUrl: string;
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
    for (const [itemId, { tonPrice, healHp, healEnergy }] of Object.entries(nftPrices)) {
        priceDict.set(parseInt(itemId), {
            price: toNano(tonPrice),
            healHp,
            healEnergy,
        });
    }

    // Data Cell
    const dataCell = beginCell();
    dataCell
        .storeAddress(config.ownerAddress) // ownerAddress
        .storeUint(1, 64) // nextItemIndex
        .storeDict(priceDict, Dictionary.Keys.Uint(8), PriceDictValueSerializer)
        .storeRef(beginCell().storeRef(encodeOffChainContent(config.collectionContentUrl))) // contentCell
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

    async createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = await nftCollectionConfigToCell(config);
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

    async sendPurchase(
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
}
