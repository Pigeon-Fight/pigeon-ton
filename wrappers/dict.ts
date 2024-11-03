import { beginCell, Builder, Slice } from '@ton/core';
import { flattenSnakeCell, ParseChunkDict } from './helper';

interface ChunkDictValue {
    content: Buffer;
}

interface NFTDictValue {
    content: Buffer;
}

export const ChunkDictValueSerializer = {
    serialize(src: ChunkDictValue, builder: Builder) {},
    parse(src: Slice): ChunkDictValue {
        const snake = flattenSnakeCell(src.loadRef());
        return { content: snake };
    },
};

export const NFTDictValueSerializer = {
    serialize(src: NFTDictValue, builder: Builder) {},
    parse(src: Slice): NFTDictValue {
        const ref = src.loadRef().asSlice();

        const start = ref.loadUint(8);
        if (start === 0) {
            const snake = flattenSnakeCell(ref.asCell());
            return { content: snake };
        }

        if (start === 1) {
            return { content: ParseChunkDict(ref) };
        }

        return { content: Buffer.from([]) };
    },
};

export interface PriceDictValue {
    price: bigint;
    attr1: number;
    attr2: number;
    attr3: number;
}

export const PriceDictValueSerializer = {
    serialize: (src: PriceDictValue, builder: Builder) => {
        builder.storeCoins(src.price).storeUint(src.attr1, 16).storeUint(src.attr2, 16).storeUint(src.attr3, 16);
    },
    parse: (src: Slice): PriceDictValue => {
        return {
            price: src.loadCoins(),
            attr1: src.loadUint(16),
            attr2: src.loadUint(16),
            attr3: src.loadUint(16),
        };
    },
};
