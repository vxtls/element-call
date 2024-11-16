/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { ReactNode, useDeferredValue, useEffect, useRef } from "react";
import { useObservableEagerState } from "observable-hooks";

import {
  playReactionsSound,
  soundEffectVolumeSetting as effectSoundVolumeSetting,
  useSetting,
} from "../settings/settings";
import { CallViewModel } from "../state/CallViewModel";
import enterCallSoundMp3 from "../sound/join_call.mp3";
import enterCallSoundOgg from "../sound/join_call.ogg";
import leftCallSoundMp3 from "../sound/left_call.mp3";
import leftCallSoundOgg from "../sound/left_call.ogg";

// Do not play any sounds if the participant count has exceeded this
// number.
export const MAX_PARTICIPANT_COUNT_FOR_SOUND = 8;

export function CallEventAudioRenderer({
  vm,
}: {
  vm: CallViewModel;
}): ReactNode {
  const [shouldPlay] = useSetting(playReactionsSound);
  const [effectSoundVolume] = useSetting(effectSoundVolumeSetting);
  const memberIds = useObservableEagerState(vm.userMediaIds);
  const previousMembers = useDeferredValue(memberIds);
  const callEntered = useRef<HTMLAudioElement>(null);
  const callLeft = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (memberIds.length > MAX_PARTICIPANT_COUNT_FOR_SOUND) {
      return;
    }

    const memberLeft = !!previousMembers.filter((m) => !memberIds.includes(m))
      .length;
    const memberJoined = !!memberIds.filter((m) => !previousMembers.includes(m))
      .length;

    if (callEntered.current && callEntered.current?.paused && memberJoined) {
      callEntered.current.volume = effectSoundVolume;
      void callEntered.current.play();
    }

    if (callLeft.current && callLeft.current?.paused && memberLeft) {
      callLeft.current.volume = effectSoundVolume;
      void callLeft.current.play();
    }
  }, [callEntered, callLeft, memberIds, previousMembers, effectSoundVolume]);

  // Do not render any audio elements if playback is disabled. Will save
  // audio file fetches.
  if (!shouldPlay) {
    return null;
  }

  return (
    // Will play as soon as it's mounted, which is what we want as this will
    // play when the call is entered.
    <>
      <audio autoPlay ref={callEntered} preload="auto" hidden>
        <source src={enterCallSoundOgg} type="audio/ogg; codecs=vorbis" />
        <source src={enterCallSoundMp3} type="audio/mpeg" />
      </audio>
      <audio ref={callLeft} preload="auto" hidden>
        <source src={leftCallSoundOgg} type="audio/ogg; codecs=vorbis" />
        <source src={leftCallSoundMp3} type="audio/mpeg" />
      </audio>
    </>
  );
}
