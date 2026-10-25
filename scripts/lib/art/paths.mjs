// Paths and piece IDs for the illustration script (I2-art). The 54 IDs are fixed by the data
// model: pc_01 to pc_54, so T0 needs no mock.json.
import path from 'node:path';
import { ROOT } from '../common.mjs';

export const IMAGES_DIR = path.join(ROOT, 'public', 'images');
export const MOCK_JSON = path.join(ROOT, 'artifacts', 'mock', 'mock.json');
export const ART_DIR = path.join(ROOT, 'artifacts', 'art');

export const PIECE_COUNT = 54;

/** pc_01 to pc_54, in order. */
export const PIECE_IDS = Array.from({ length: PIECE_COUNT }, (_, i) => `pc_${String(i + 1).padStart(2, '0')}`);

export function isPieceId(id) {
  return PIECE_IDS.includes(id);
}

export function imagePath(pieceId) {
  return path.join(IMAGES_DIR, `${pieceId}.svg`);
}
