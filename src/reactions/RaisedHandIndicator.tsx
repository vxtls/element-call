/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { ReactNode, useEffect, useState } from "react";
import "@formatjs/intl-durationformat/polyfill";
import { DurationFormat } from "@formatjs/intl-durationformat";

import { ReactionIndicator } from "./ReactionIndicator";

const durationFormatter = new DurationFormat(undefined, {
  minutesDisplay: "always",
  secondsDisplay: "always",
  hoursDisplay: "auto",
  style: "digital",
});

export function RaisedHandIndicator({
  raisedHandTime,
  miniature,
  showTimer,
}: {
  raisedHandTime?: Date;
  miniature?: boolean;
  showTimer?: boolean;
}): ReactNode {
  const [raisedHandDuration, setRaisedHandDuration] = useState("");

  // This effect creates a simple timer effect.
  useEffect(() => {
    if (!raisedHandTime || !showTimer) {
      return;
    }

    const calculateTime = (): void => {
      const totalSeconds = Math.ceil(
        (new Date().getTime() - raisedHandTime.getTime()) / 1000,
      );
      setRaisedHandDuration(
        durationFormatter.format({
          seconds: totalSeconds % 60,
          minutes: Math.floor(totalSeconds / 60),
        }),
      );
    };
    calculateTime();
    const to = setInterval(calculateTime, 1000);
    return (): void => clearInterval(to);
  }, [setRaisedHandDuration, raisedHandTime, showTimer]);

  if (raisedHandTime) {
    return (
      <ReactionIndicator emoji="✋" miniature={miniature}>
        {showTimer && <p>{raisedHandDuration}</p>}
      </ReactionIndicator>
    );
  }

  return null;
}
