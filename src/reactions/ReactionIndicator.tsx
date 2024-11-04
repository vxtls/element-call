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
  miniature,
  children,
}: PropsWithChildren<{
  miniature?: boolean;
  emoji: string;
}>): ReactNode {
  return (
    <div
      className={classNames(styles.reactionIndicatorWidget, {
        [styles.reactionIndicatorWidgetLarge]: !miniature,
      })}
    >
      <div
        className={classNames(styles.reaction, {
          [styles.reactionLarge]: !miniature,
        })}
      >
        <span role="img" aria-label="reaction indicator">
          {emoji}
        </span>
      </div>
      {children}
    </div>
  );
}
