/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { PropsWithChildren, ReactNode } from "react";
import classNames from "classnames";
import "@formatjs/intl-durationformat/polyfill";

import styles from "./ReactionIndicator.module.css";

export function ReactionIndicator({
  emoji,
  minature,
  children,
}: PropsWithChildren<{
  minature?: boolean;
  emoji: string;
}>): ReactNode {
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
          {emoji}
        </span>
      </div>
      {children}
    </div>
  );
}
