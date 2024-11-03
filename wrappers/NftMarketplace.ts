// https://github.com/ton-blockchain/token-contract/blob/main/nft/nft-marketplace.fc
import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

type NftMarketplaceConfig = {
    ownerAddress: Address;
};

function nftMarketplaceConfigToCell(config: NftMarketplaceConfig): Cell {
    const dataCell = beginCell();
    dataCell.storeAddress(config.ownerAddress);
    return dataCell.endCell();
}

function createCodeCell(): Cell {
    const NftMarketplaceCodeBoc =
        'te6cckEBBAEAbQABFP8A9KQT9LzyyAsBAgEgAgMAqtIyIccAkVvg0NMDAXGwkVvg+kDtRND6QDASxwXy4ZEB0x8BwAGOK/oAMAHU1DAh+QBwyMoHy//J0Hd0gBjIywXLAljPFlAE+gITy2vMzMlx+wCRW+IABPIwjvfM5w==';
    return Cell.fromBase64(NftMarketplaceCodeBoc);
}

export class NftMarketplace implements Contract {
    constructor(
        readonly address: Address,
        readonly init?: { code: Cell; data: Cell },
    ) {}

    static createFromConfig(config: NftMarketplaceConfig, workchain = 0) {
        const data = nftMarketplaceConfigToCell(config);
        const init = { code: createCodeCell(), data };
        return new NftMarketplace(contractAddress(workchain, init), init);
    }

    public async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: '0.5',
            sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
