import { Address, toNano } from '@ton/core';
import { Counter, Opcodes } from '../../wrappers/Counter';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse('EQCT7EyteVrHosfCELFaZp57VCxjymXykeW7aTpzdgwB-xAn');
    // const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Counter address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const counter = provider.open(Counter.createFromAddress(address));

    const counterBefore = await counter.getData();
    ui.write(`Counter Data Before: ${counterBefore.counterValue}`);

    await counter.sendMsg(provider.sender(), {
        value: toNano('0.001'),
        opcode: Opcodes.up,
    });

    ui.write('Waiting for counter to increase...');

    let counterAfter = await counter.getData();

    let attempt = 1;
    while (counterAfter === counterBefore) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(2000);
        counterAfter = await counter.getData();
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write(`Counter Data After: ${counterBefore.counterValue}`);
    ui.write('Counter increased successfully!');
}
