/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { TrackReferenceOrPlaceholder } from "@livekit/components-core";
import { animated } from "@react-spring/web";
import { RoomMember } from "matrix-js-sdk/src/matrix";
import {
  ComponentProps,
  ReactNode,
  forwardRef,
  useEffect,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import classNames from "classnames";
import { VideoTrack } from "@livekit/components-react";
import { Text, Tooltip } from "@vector-im/compound-web";
import { ErrorIcon } from "@vector-im/compound-design-tokens/assets/web/icons";

import styles from "./MediaView.module.css";
import { Avatar } from "../Avatar";

interface Props extends ComponentProps<typeof animated.div> {
  className?: string;
  style?: ComponentProps<typeof animated.div>["style"];
  targetWidth: number;
  targetHeight: number;
  video: TrackReferenceOrPlaceholder;
  videoFit: "cover" | "contain";
  mirror: boolean;
  member: RoomMember | undefined;
  videoEnabled: boolean;
  unencryptedWarning: boolean;
  nameTagLeadingIcon?: ReactNode;
  displayName: string;
  primaryButton?: ReactNode;
  raisedHandTime?: Date;
}

export const MediaView = forwardRef<HTMLDivElement, Props>(
  (
    {
      className,
      style,
      targetWidth,
      targetHeight,
      video,
      videoFit,
      mirror,
      member,
      videoEnabled,
      unencryptedWarning,
      nameTagLeadingIcon,
      displayName,
      primaryButton,
      raisedHandTime,
      ...props
    },
    ref,
  ) => {
    const { t } = useTranslation();

    const [raisedHandDuration, setRaisedHandDuration] = useState("");

    useEffect(() => {
      if (!raisedHandTime) {
        return;
      }
      setRaisedHandDuration("00:00");
      const to = setInterval(() => {
        const totalSeconds = Math.ceil(
          (new Date().getTime() - raisedHandTime.getTime()) / 1000,
        );
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60);
        setRaisedHandDuration(
          `${minutes < 10 ? "0" : ""}${minutes}:${seconds < 10 ? "0" : ""}${seconds}`,
        );
      }, 1000);
      return (): void => clearInterval(to);
    }, [setRaisedHandDuration, raisedHandTime]);

    return (
      <animated.div
        className={classNames(styles.media, className, {
          [styles.mirror]: mirror,
          [styles.videoMuted]: !videoEnabled,
          [styles.raisedHandBorder]: !!raisedHandTime,
        })}
        style={style}
        ref={ref}
        data-testid="videoTile"
        data-video-fit={videoFit}
        {...props}
      >
        <div className={styles.bg}>
          <Avatar
            id={member?.userId ?? displayName}
            name={displayName}
            size={Math.round(Math.min(targetWidth, targetHeight) / 2)}
            src={member?.getMxcAvatarUrl()}
            className={styles.avatar}
          />
          {video.publication !== undefined && (
            <VideoTrack
              trackRef={video}
              // There's no reason for this to be focusable
              tabIndex={-1}
              disablePictureInPicture
            />
          )}
        </div>
        <div className={styles.fg}>
          {raisedHandTime && (
            <div className={styles.raisedHandWidget}>
              <div className={styles.raisedHand}>
                <span role="img" aria-label="raised hand">
                  ✋
                </span>
              </div>
              <p>{raisedHandDuration}</p>
            </div>
          )}
          <div className={styles.nameTag}>
            {nameTagLeadingIcon}
            <Text as="span" size="sm" weight="medium" className={styles.name}>
              {displayName}
            </Text>
            {unencryptedWarning && (
              <Tooltip
                label={t("common.unencrypted")}
                placement="bottom"
                isTriggerInteractive={false}
              >
                <ErrorIcon
                  width={20}
                  height={20}
                  className={styles.errorIcon}
                />
              </Tooltip>
            )}
          </div>
          {primaryButton}
        </div>
      </animated.div>
    );
  },
);

MediaView.displayName = "MediaView";
