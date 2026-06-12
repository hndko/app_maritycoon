export const boardSize = 40;

export function getBoardTrack(index: number): { gridColumn: number; gridRow: number } {
  if (index < 0 || index >= boardSize) {
    throw new Error('Board index must be between 0 and 39');
  }

  if (index <= 10) {
    return { gridColumn: 11 - index, gridRow: 11 };
  }

  if (index <= 20) {
    return { gridColumn: 1, gridRow: 21 - index };
  }

  if (index <= 30) {
    return { gridColumn: index - 19, gridRow: 1 };
  }

  return { gridColumn: 11, gridRow: index - 29 };
}
