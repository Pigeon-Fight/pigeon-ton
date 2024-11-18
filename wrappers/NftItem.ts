import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';
import { calculateRequestOpcode } from './helper';

const BASE_EXP = 10;
export function expToPoint(exp: number) {
    return Math.floor((3 * (exp - BASE_EXP)) / 50);
}

const Opcodes = {
    transfer: 0x5fcc3d14,
    upgrade: calculateRequestOpcode('op::upgrade'),
    battle: calculateRequestOpcode('op::battle'),
};

export class NftItem implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new NftItem(address);
    }

    async sendUpgrade(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            atk: number;
            def: number;
            spd: number;
            maxHp: number;
            maxEnergy: number;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.upgrade, 32) // opcode
                .storeUint(0, 64) // query
                .storeUint(opts.atk, 16) // atk
                .storeUint(opts.def, 16) // def
                .storeUint(opts.spd, 16) // spd
                .storeUint(opts.maxHp, 16) // max_hp
                .storeUint(opts.maxEnergy, 16) // max_energy
                .endCell(),
        });
    }

    async sendBattle(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            opponent: Address;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(Opcodes.battle, 32) // opcode
                .storeUint(0, 64) // query
                .storeAddress(opts.opponent) // opponent
                .endCell(),
        });
    }

    async sendTransfer(
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
                .storeUint(Opcodes.transfer, 32) // opcode
                .storeUint(0, 64) // query
                .storeAddress(opts.address) // new owner address
                // Address: response_destination
                // Int1: CustomPayload
                // Coin: forward_amount
                .endCell(),
        });
    }

    async getNftData(provider: ContractProvider) {
        const result = await provider.get('get_nft_data', []);
        // Is Deployed
        const isDeployed = result.stack.readNumber();
        // Item Index
        const itemIndex = result.stack.readNumber();
        // Collection Address
        const collectionAddr = result.stack.readAddress();
        // Owner Address
        const ownerAddress = result.stack.readAddress();
        // NFT Content
        const nftContentCell = result.stack.readCell();
        return {
            isDeployed,
            itemIndex,
            collectionAddr,
            ownerAddress,
            nftContentCell,
        };
    }

    async getNftStats(provider: ContractProvider) {
        const result = await provider.get('get_nft_stats', []);

        const index = result.stack.readNumber(); // index
        const classId = result.stack.readNumber(); // class
        const stats = result.stack.readCell().asSlice();
        const hp = stats.loadUint(16);
        const energy = stats.loadUint(16);
        const exp = stats.loadUint(16);
        const allocated = stats.loadUint(16);
        const atk = stats.loadUint(16);
        const def = stats.loadUint(16);
        const spd = stats.loadUint(16);
        const maxHp = stats.loadUint(16);
        const maxEnergy = stats.loadUint(16);
        return {
            index,
            classId,
            hp,
            energy,
            exp,
            allocated,
            atk,
            def,
            spd,
            maxHp,
            maxEnergy,
        };
    }
}
