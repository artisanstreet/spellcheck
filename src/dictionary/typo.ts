const rows = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

const key_positions = new Map(
  rows.flatMap((row, row_index) => Array.from(row, (letter, column) => [letter, { row: row_index, column: column + row_index * 0.5 }] as const)),
);

const vowels = new Set("aeiouy");

const adjacent = (left: string, right: string): boolean => {
  const from = key_positions.get(left);
  const to = key_positions.get(right);
  return from !== undefined && to !== undefined && Math.abs(from.row - to.row) <= 1 && Math.abs(from.column - to.column) <= 1;
};

const substitution_cost = (left: string, right: string): number =>
  left === right ? 0 : adjacent(left, right) || (vowels.has(left) && vowels.has(right)) ? 0.6 : 1;

const doubling_cost = (text: string, index: number): number =>
  text[index] !== undefined && (text[index] === text[index - 1] || text[index] === text[index + 1]) ? 0.4 : 1;

export const typo_cost = (typed: string, intended: string): number => {
  const source = typed.toLowerCase();
  const target = intended.toLowerCase();
  const table: Array<Array<number>> = Array.from({ length: source.length + 1 }, () => Array(target.length + 1).fill(0));
  for (let row = 0; row <= source.length; row++) {
    for (let column = 0; column <= target.length; column++) {
      table[row]![column] =
        row === 0 && column === 0
          ? 0
          : Math.min(
              row > 0 ? table[row - 1]![column]! + doubling_cost(source, row - 1) : Infinity,
              column > 0 ? table[row]![column - 1]! + doubling_cost(target, column - 1) : Infinity,
              row > 0 && column > 0 ? table[row - 1]![column - 1]! + substitution_cost(source[row - 1]!, target[column - 1]!) : Infinity,
              row > 1 && column > 1 && source[row - 1] === target[column - 2] && source[row - 2] === target[column - 1]
                ? table[row - 2]![column - 2]! + 0.6
                : Infinity,
            );
    }
  }
  return table[source.length]![target.length]!;
};
