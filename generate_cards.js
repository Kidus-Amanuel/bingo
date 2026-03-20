const crypto = require('crypto');

function generateCard() {
    const ranges = [
        [1, 15],  // B
        [16, 30], // I
        [31, 45], // N
        [46, 60], // G
        [61, 75]  // O
    ];

    const grid = [[], [], [], [], []];

    for (let col = 0; col < 5; col++) {
        const [min, max] = ranges[col];
        const numbers = [];
        while (numbers.length < 5) {
            const num = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!numbers.includes(num)) {
                numbers.push(num);
            }
        }
        numbers.sort((a, b) => a - b);
        for (let row = 0; row < 5; row++) {
            grid[row][col] = numbers[row];
        }
    }

    // Set Center to "FREE"
    grid[2][2] = "FREE";
    return grid;
}

const templates = [];
const hashes = new Set();
const count = 400;

console.log('-- Auto-generated 400 Unique Bingo Cards');
console.log('INSERT INTO public.card_templates (grid, grid_hash) VALUES');

while (templates.length < count) {
    const card = generateCard();
    const gridStr = JSON.stringify(card);
    const hash = crypto.createHash('sha256').update(gridStr).digest('hex');

    if (!hashes.has(hash)) {
        hashes.add(hash);
        templates.push(`('${gridStr}', '${hash}')`);
    }
}

console.log(templates.join(',\n') + '\nON CONFLICT (grid_hash) DO NOTHING;');
