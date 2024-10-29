import { toNano } from '@ton/core';
import { Counter } from '../../wrappers/Counter';
import { compile, NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const counter = provider.open(
        Counter.createFromConfig(
            {
                id: 58,
                address: provider.sender().address,
            },
            await compile('Counter'),
        ),
    );

    await counter.sendDeploy(provider.sender(), toNano('0.001'));

    await provider.waitForDeploy(counter.address);

    console.log('ID', await counter.getData());
}
