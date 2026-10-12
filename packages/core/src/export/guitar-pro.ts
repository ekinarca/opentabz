/**
 * A score saved as a Guitar Pro 7/8 file (EDIT-064), the format Guitar Pro itself saves: alphaTab's
 * GPIF writer, the score's stylesheet and layout as Guitar Pro keeps them. The score is read, not
 * changed: saving leaves the document as it is.
 */
import * as alphaTab from '@coderline/alphatab';

export function saveGuitarPro(score: alphaTab.model.Score): Uint8Array {
  return new alphaTab.exporter.Gp7Exporter().export(score, new alphaTab.Settings());
}
