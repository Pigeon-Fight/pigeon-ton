import { Address, toNano } from '@ton/core';
import { Counter } from '../../wrappers/Counter';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const address = Address.parse('kQDhdpSSVxWJ0DtGqhYOcfw41gZQ6yOC1Oyq1hpeF7qSW0dH');
    // const address = Address.parse(args.length > 0 ? args[0] : await ui.input('Counter address'));

    const counter = provider.open(Counter.createFromAddress(address));

    const counterBefore = await counter.getData();
    console.log(counterBefore);
    // ui.write(`Counter Data Before: ${counterBefore}`);
}
