import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    ExternalAddress,
    Sender,
    SendMode,
} from '@ton/core';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { calculateRequestOpcode } from './helper';

export type CounterConfig = {
    id: number;
    address: Maybe<Address | ExternalAddress>;
};

export function counterConfigToCell(config: CounterConfig): Cell {
    return beginCell().storeUint(config.id, 32).storeUint(0, 32).storeAddress(config.address).endCell();
}

export const Opcodes = {
    up: calculateRequestOpcode('op::up'),
    down: calculateRequestOpcode('op::down'),
    reset: calculateRequestOpcode('op::reset'),
};

export class Counter implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromAddress(address: Address) {
        return new Counter(address);
    }

    static createFromConfig(config: CounterConfig, code: Cell, workchain = 0) {
        const data = counterConfigToCell(config);
        const init = { code, data };
        return new Counter(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMsg(
        provider: ContractProvider,
        via: Sender,
        opts: {
            value: bigint;
            opcode: bigint;
        },
    ) {
        await provider.internal(via, {
            value: opts.value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(opts.opcode, 32).endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const result = await provider.get('get_contract_storage_data', []);
        const counterId = result.stack.readNumber();
        const counterValue = result.stack.readNumber();
        const lastAddress = result.stack.readAddress();
        return {
            counterId,
            counterValue,
            lastAddress,
        };
    }
}
