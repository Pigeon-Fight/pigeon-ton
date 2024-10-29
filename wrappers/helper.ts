import * as crc32 from 'crc-32';

export function calculateRequestOpcode(str: string) {
    return BigInt(crc32.str(str)) & BigInt(0xffffffff);
}
