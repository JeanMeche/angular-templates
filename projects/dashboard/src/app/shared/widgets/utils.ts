import { List } from 'immutable';

const CHANNEL_SIZE = 255;

// Predefined colors
const COLORS_ARRAY = [
  'rgb(255, 104, 107)', // Red
  'rgb(162, 215, 41)', // Green
  'rgb(60, 145, 230)', // Blue
  'rgb(255, 190, 11)', // Amber
  'rgb(125, 91, 166)', // Purple
];

/**
 * Returns an array with colors for all bars.
 * If the predefined array is overflowed, the rest
 * of the data item bars will use a generated color.
 */
export function generateColorsArray(data: List<number>): string[] {
  const colors = [...COLORS_ARRAY];
  for (let i = colors.length; i < data.size; i++) {
    const di = data.get(i)!;
    colors.push(colorGenerator(di, i));
  }
  return colors;
}

/**
 * Generates an RGB color by a provided value and index.
 *
 * @param dataValue
 * @param dataIndex
 * @returns RGB color string
 */
export function colorGenerator(dataValue: number, dataIndex: number): string {
  const r = dataValue % CHANNEL_SIZE;
  const g = dataIndex ** dataIndex % CHANNEL_SIZE;
  const b = 100;

  return `rgb(${r}, ${g}, ${b})`;
}

export function getNearestMax(max: number) {
  const digits = max.toString().length - 2;
  const precision = 10 ** digits;

  return Math.ceil(max / precision) * precision;
}
