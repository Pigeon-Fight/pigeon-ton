import * as crc32 from 'crc-32';
import { beginCell, Cell, BitBuilder, BitReader, Slice, Dictionary } from '@ton/ton';
import { ChunkDictValueSerializer } from './dict';

export function calculateRequestOpcode(str: string) {
    return BigInt(crc32.str(str)) & BigInt(0xffffffff);
}

function bufferToChunks(buff: Buffer, chunkSize: number) {
    const chunks: Buffer[] = [];
    while (buff.byteLength > 0) {
        chunks.push(buff.subarray(0, chunkSize));
        buff = buff.subarray(chunkSize);
    }
    return chunks;
}

function makeSnakeCell(data: Buffer): Cell {
    const chunks = bufferToChunks(data, 127);

    if (chunks.length === 0) {
        return beginCell().endCell();
    }

    if (chunks.length === 1) {
        return beginCell().storeBuffer(chunks[0]).endCell();
    }

    let curCell = beginCell();

    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i];

        curCell.storeBuffer(chunk);

        if (i - 1 >= 0) {
            const nextCell = beginCell();
            nextCell.storeRef(curCell);
            curCell = nextCell;
        }
    }

    return curCell.endCell();
}

export function encodeOffChainContent(content: string) {
    let data = Buffer.from(content);
    // https://github.com/ton-blockchain/TEPs/blob/master/text/0064-token-data-standard.md#informal-tl-b-scheme
    // onchainPrefix = 00, offChainPrefix = 01
    const offChainPrefix = Buffer.from([0x01]);
    data = Buffer.concat([offChainPrefix, data]);
    return makeSnakeCell(data);
}

export function flattenSnakeCell(cell: Cell) {
    let c: Cell | null = cell;

    const bitResult = new BitBuilder();
    while (c) {
        const cs = c.beginParse();
        if (cs.remainingBits === 0) {
            break;
        }

        const data = cs.loadBits(cs.remainingBits);
        bitResult.writeBits(data);
        c = c.refs && c.refs[0];
    }

    const endBits = bitResult.build();
    const reader = new BitReader(endBits);

    return reader.loadBuffer(reader.remaining / 8);
}

export function ParseChunkDict(cell: Slice): Buffer {
    const dict = cell.loadDict(Dictionary.Keys.Uint(32), ChunkDictValueSerializer);

    let buf = Buffer.alloc(0);
    for (const [_, v] of dict) {
        buf = Buffer.concat([buf, v.content]);
    }
    return buf;
}
