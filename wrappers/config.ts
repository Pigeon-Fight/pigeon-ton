export const classPrices: {
    [key: number]: { tonPrice: string; boostAtk: number; boostDef: number; boostSpd: number };
} = {
    // Class
    8: { tonPrice: '1', boostAtk: 3, boostDef: 0, boostSpd: 0 },
    6: { tonPrice: '1', boostAtk: 0, boostDef: 3, boostSpd: 0 },
    5: { tonPrice: '1', boostAtk: 0, boostDef: 0, boostSpd: 3 },
    7: { tonPrice: '1', boostAtk: 1, boostDef: 1, boostSpd: 1 },
    9: { tonPrice: '0', boostAtk: 0, boostDef: 0, boostSpd: 0 },
    37: { tonPrice: '5', boostAtk: 5, boostDef: 0, boostSpd: 0 },
    38: { tonPrice: '5', boostAtk: 5, boostDef: 0, boostSpd: 0 },
    39: { tonPrice: '5', boostAtk: 5, boostDef: 0, boostSpd: 0 },
    40: { tonPrice: '5', boostAtk: 0, boostDef: 5, boostSpd: 0 },
    41: { tonPrice: '5', boostAtk: 0, boostDef: 5, boostSpd: 0 },
    42: { tonPrice: '5', boostAtk: 0, boostDef: 0, boostSpd: 5 },
    43: { tonPrice: '5', boostAtk: 0, boostDef: 0, boostSpd: 5 },
    44: { tonPrice: '20', boostAtk: 3, boostDef: 3, boostSpd: 3 },
};

export const itemPrices: { [key: number]: { tonPrice: string; healHp: number; healEnergy: number } } = {
    // Item
    45: { tonPrice: '0.14', healHp: 100, healEnergy: 100 },
    46: { tonPrice: '0.05', healHp: 50, healEnergy: 0 },
    47: { tonPrice: '0.08', healHp: 100, healEnergy: 0 },
    48: { tonPrice: '0.05', healHp: 0, healEnergy: 50 },
    49: { tonPrice: '0.08', healHp: 0, healEnergy: 100 },
};
