/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { ReactNode, useDeferredValue, useEffect, useRef } from "react";

import {
  playReactionsSound,
  soundEffectVolumeSetting as effectSoundVolumeSetting,
  useSetting,
} from "../settings/settings";
import { CallViewModel } from "../state/CallViewModel";
import { useObservableEagerState } from "observable-hooks";

// TODO: These need replacing with something more pleasant.
import enterCallSoundMp3 from "../sound/start_talk_local.mp3";
import enterCallSoundOgg from "../sound/start_talk_local.ogg";
import leftCallSoundMp3 from "../sound/start_talk_remote.mp3";
import leftCallSoundOgg from "../sound/start_talk_remote.ogg";

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
  }, [callEntered, callLeft, memberIds, previousMembers]);

  // Do not render any audio elements if playback is disabled. Will save
  // audio file fetches.
  if (!shouldPlay) {
    return null;
  }

  return (
    <>
      <audio ref={callEntered} preload="auto" hidden>
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
