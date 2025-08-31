export interface SeatLayoutCell {
    type: 'seat' | 'label' | 'space';
    number?: number;
    text?: string;
    span?: number; // for colSpan-like behavior in flex rows
}

export type RoomLayout = SeatLayoutCell[][];

export const roomLayouts: { [key: string]: RoomLayout } = {
    '영글터 집중학습실': [
        [{ type: 'label', text: '칠판', span: 4 }],
        [{ type: 'space', span: 4 }],
        [{ type: 'seat', number: 1 }, { type: 'seat', number: 2 }, { type: 'seat', number: 3 }, { type: 'seat', number: 4 }],
        [{ type: 'seat', number: 5 }, { type: 'seat', number: 6 }, { type: 'seat', number: 7 }, { type: 'seat', number: 8 }],
        [{ type: 'space', span: 4 }],
        [{ type: 'space' }, { type: 'label', text: '입구', span: 2 }, { type: 'space' }]
    ],
    '영글터 자율학습실': [ 
        [{ type: 'label', text: '칠판', span: 7 }],
        [{ type: 'space', span: 7 }],
        [{ type: 'seat', number: 1 }, { type: 'seat', number: 2 }, { type: 'space' }, { type: 'seat', number: 3 }, { type: 'seat', number: 4 }, { type: 'space' }, { type: 'seat', number: 5 }],
        [{ type: 'seat', number: 6 }, { type: 'seat', number: 7 }, { type: 'space' }, { type: 'seat', number: 8 }, { type: 'seat', number: 9 }, { type: 'space' }, { type: 'seat', number: 10 }],
        [{ type: 'seat', number: 11 }, { type: 'seat', number: 12 }, { type: 'space' }, { type: 'seat', number: 13 }, { type: 'seat', number: 14 }, { type: 'space' }, { type: 'seat', number: 15 }],
        [{ type: 'seat', number: 16 }, { type: 'seat', number: 17 }, { type: 'space' }, { type: 'seat', number: 18 }, { type: 'seat', number: 19 }, { type: 'space' }, { type: 'seat', number: 20 }],
        [{ type: 'seat', number: 21 }, { type: 'seat', number: 22 }, { type: 'space' }, { type: 'seat', number: 23 }, { type: 'seat', number: 24 }, { type: 'space' }, { type: 'seat', number: 25 }],
        [{ type: 'space', span: 7 }],
        [{ type: 'space', span: 3 }, { type: 'label', text: '입구' }, { type: 'space', span: 3 }]
    ],
    '채움터': [
        [{ type: 'label', text: '창문', span: 3 }],
        [{ type: 'seat', number: 1 }, { type: 'seat', number: 2 }, { type: 'seat', number: 3 }],
        [{ type: 'seat', number: 4 }, { type: 'seat', number: 5 }, { type: 'seat', number: 6 }],
        [{ type: 'seat', number: 7 }, { type: 'seat', number: 8 }, { type: 'seat', number: 9 }],
        [{ type: 'space' }, { type: 'label', text: '입구' }, { type: 'space' }]
    ]
};