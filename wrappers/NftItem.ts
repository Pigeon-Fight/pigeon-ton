import { Address, beginCell, Cell, Contract, ContractProvider, Sender, SendMode } from '@ton/core';
import { calculateRequestOpcode } from './helper';

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
}
