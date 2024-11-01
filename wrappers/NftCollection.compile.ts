import { CompilerConfig } from '@ton/blueprint';

export const compile: CompilerConfig = {
    lang: 'func',
    targets: ['contracts/nft-utils.fc', 'contracts/nft-collection.fc'],
};
