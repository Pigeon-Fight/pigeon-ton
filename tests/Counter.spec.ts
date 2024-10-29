import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Counter, Opcodes } from '../wrappers/Counter';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Counter', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Counter');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let counter: SandboxContract<Counter>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');

        counter = blockchain.openContract(
            Counter.createFromConfig(
                {
                    id: 69,
                    address: deployer.address,
                },
                code,
            ),
        );

        const deployResult = await counter.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: counter.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and helloWorld are ready to use
    });

    it('should increase counter', async () => {
        const increaseTimes = 3;
        for (let i = 0; i < increaseTimes; i++) {
            console.log(`increase ${i + 1}/${increaseTimes}`);

            const increaser = await blockchain.treasury('increaser' + i);

            const counterBefore = await counter.getData();

            console.log('counter before increasing', counterBefore.counterValue);

            const increaseResult = await counter.sendMsg(increaser.getSender(), {
                value: toNano('0.05'),
                opcode: Opcodes.up,
            });

            expect(increaseResult.transactions).toHaveTransaction({
                from: increaser.address,
                to: counter.address,
                success: true,
            });

            const counterAfter = await counter.getData();

            console.log('counter after increasing', counterAfter.counterValue);

            expect(counterAfter.counterValue).toBe(counterBefore.counterValue + 1);
        }
    });

    it('anyone can deposit', async () => {
        const anyone = await blockchain.treasury('anyone');

        const balanceBefore = await counter.getBalance();

        console.log('balance before deposit', balanceBefore.balance);

        const depositAmount = toNano('5');

        const despoitResult = await counter.sendMsg(anyone.getSender(), {
            value: depositAmount,
            opcode: Opcodes.deposit,
        });

        expect(despoitResult.transactions).toHaveTransaction({
            from: anyone.address,
            to: counter.address,
            success: true,
        });

        const balanceAfter = await counter.getBalance();

        console.log('balance after withdraw', balanceAfter.balance);

        expect(balanceAfter.balance).toBeGreaterThan((depositAmount * 95n) / 100n);
    });

    it('owner can withdraw', async () => {
        const owner = await blockchain.treasury('deployer');

        const balanceBefore = await counter.getBalance();

        console.log('balance before withdraw', balanceBefore.balance);

        const withdrawAmount = toNano('0.07');
        const sendAmount = toNano('0.05');

        const withdrawResult = await counter.sendWithdraw(owner.getSender(), {
            value: sendAmount,
            amount: withdrawAmount,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: owner.address,
            to: counter.address,
            success: true,
        });

        const balanceAfter = await counter.getBalance();

        console.log('balance after withdraw', balanceAfter.balance);

        expect(balanceAfter.balance).toBeLessThan(balanceBefore.balance);
    });

    it('fail if non-owner withdraw', async () => {
        const someone = await blockchain.treasury('someone');

        const balanceBefore = await counter.getBalance();

        console.log('balance before withdraw', balanceBefore.balance);

        const withdrawAmount = toNano('0.07');
        const sendAmount = toNano('0.05');

        const withdrawResult = await counter.sendWithdraw(someone.getSender(), {
            value: sendAmount,
            amount: withdrawAmount,
        });

        expect(withdrawResult.transactions).toHaveTransaction({
            from: someone.address,
            to: counter.address,
            success: false,
            exitCode: 403, // unauthorized
        });

        const balanceAfter = await counter.getBalance();

        console.log('balance after withdraw', balanceAfter.balance);

        expect(balanceAfter.balance).toBe(balanceBefore.balance);
    });
});
