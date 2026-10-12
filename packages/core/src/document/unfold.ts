/**
 * A score with its repeats and jumps written out (REND-319): every bar in the order it is played,
 * as often as it is played, with no repeat signs, endings or jumps left to follow. Sections, tempo
 * changes and everything a bar holds go with each pass of it.
 */
import * as alphaTab from '@coderline/alphatab';

type JsonMap = Map<string, unknown>;

function isMap(value: unknown): value is JsonMap {
  return value instanceof Map;
}

function list(map: JsonMap, key: string): JsonMap[] {
  const value = map.get(key);
  return Array.isArray(value) ? value.filter(isMap) : [];
}

/** A copy of a bar's JSON with no ids: the score read from it numbers its beats and notes anew. */
function withoutIds(bar: JsonMap): JsonMap {
  const copy = structuredClone(bar);
  copy.delete('id');
  for (const voice of list(copy, 'voices')) {
    voice.delete('id');
    for (const beat of list(voice, 'beats')) {
      beat.delete('id');
      for (const note of list(beat, 'notes')) note.delete('id');
    }
  }
  return copy;
}

/** Whether a score has anything to unfold: repeats, endings or jumps. */
export function hasRepeats(score: alphaTab.model.Score): boolean {
  return score.masterBars.some(
    bar =>
      bar.isRepeatStart ||
      bar.repeatCount > 0 ||
      bar.alternateEndings !== 0 ||
      (bar.directions !== null && bar.directions.size > 0),
  );
}

/**
 * The score played in `order` (master bar indexes, as playback visits them), written out. The
 * score itself is left as it is.
 */
export function unfoldScore(score: alphaTab.model.Score, order: readonly number[]): alphaTab.model.Score {
  const json = alphaTab.model.JsonConverter.scoreToJsObject(score) as JsonMap;
  const masterBars = list(json, 'masterbars');
  json.set(
    'masterbars',
    order.map((index, position) => {
      const source = masterBars[index];
      if (source === undefined) throw new RangeError(`There is no bar ${index + 1}.`);
      const bar = structuredClone(source);
      // Played through: no repeat signs, endings or jumps; a pickup only where the music starts.
      bar.set('isrepeatstart', false);
      bar.set('repeatcount', 0);
      bar.set('alternateendings', 0);
      bar.delete('directions');
      bar.delete('start');
      bar.set('isanacrusis', position === 0 && source.get('isanacrusis') === true);
      return bar;
    }),
  );
  // Bars per system were counted for the score as written.
  json.delete('systemslayout');
  for (const track of list(json, 'tracks')) {
    track.delete('systemslayout');
    // The lyrics stay on the beats they were sung on, pass by pass.
    track.delete('lyrics');
    for (const staff of list(track, 'staves')) {
      const bars = list(staff, 'bars');
      staff.set(
        'bars',
        order.map(index => {
          const bar = bars[index];
          if (bar === undefined) throw new RangeError(`There is no bar ${index + 1}.`);
          return withoutIds(bar);
        }),
      );
    }
  }
  return alphaTab.model.JsonConverter.jsObjectToScore(json, new alphaTab.Settings());
}
