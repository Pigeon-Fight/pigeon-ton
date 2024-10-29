import { Address, toNano } from '@ton/core';
import { HelloWorld } from '../../wrappers/HelloWorld';
import { NetworkProvider, sleep } from '@ton/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    // EQAtm26jmENHSWDl-x8W1PN0F23lvVeQZ3HENAtovDs_zfp3
    const address = Address.parse(args.length > 0 ? args[0] : await ui.input('HelloWorld address'));

    if (!(await provider.isContractDeployed(address))) {
        ui.write(`Error: Contract at address ${address} is not deployed!`);
        return;
    }

    const helloWorld = provider.open(HelloWorld.createFromAddress(address));

    const counterBefore = await helloWorld.getCounter();
    console.log(counterBefore);
}
