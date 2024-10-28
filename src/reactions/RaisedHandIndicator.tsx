/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { ReactNode, useEffect, useState } from "react";

import styles from "./RaisedHandIndicator.module.css";
import classNames from "classnames";

export function RaisedHandIndicator({
  raisedHandTime,
  minature,
}: {
  raisedHandTime?: Date;
  minature?: boolean;
}): ReactNode {
  const [raisedHandDuration, setRaisedHandDuration] = useState("");

  useEffect(() => {
    if (!raisedHandTime) {
      return;
    }
    const calculateTime = (): void => {
      const totalSeconds = Math.ceil(
        (new Date().getTime() - raisedHandTime.getTime()) / 1000,
      );
      const seconds = totalSeconds % 60;
      const minutes = Math.floor(totalSeconds / 60);
      setRaisedHandDuration(
        `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
      );
    };
    calculateTime();
    const to = setInterval(calculateTime, 1000);
    return (): void => clearInterval(to);
  }, [setRaisedHandDuration, raisedHandTime]);

  if (raisedHandTime) {
    return (
      <div
        className={classNames(styles.raisedHandWidget, {
          [styles.raisedHandWidgetLarge]: !minature,
        })}
      >
        <div
          className={classNames(styles.raisedHand, {
            [styles.raisedHandLarge]: !minature,
          })}
        >
          <span role="img" aria-label="raised hand">
            ✋
          </span>
        </div>
        <p>{raisedHandDuration}</p>
      </div>
    );
  }

  return null;
}
