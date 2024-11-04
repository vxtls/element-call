/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { ReactNode } from "react";

import { useReactions } from "../useReactions";
import { playReactionsSound, useSetting } from "../settings/settings";

export function ReactionsAudioRenderer(): ReactNode {
  const { reactions } = useReactions();
  const [shouldPlay] = useSetting(playReactionsSound);

  const expectedReactions = shouldPlay
    ? [...new Set([...Object.values(reactions)])]
    : [];
  return (
    <>
      {expectedReactions.map(
        (r) =>
          r.sound && (
            <audio key={r.name} autoPlay hidden>
              <source src={r.sound.ogg} type="audio/ogg; codecs=vorbis" />
              {r.sound.mp3 ? (
                <source src={r.sound.mp3} type="audio/mpeg" />
              ) : null}
            </audio>
          ),
      )}
    </>
  );
}
