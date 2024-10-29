/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { Button as CpdButton, Tooltip } from "@vector-im/compound-web";
import {
  ComponentPropsWithoutRef,
  FC,
  ReactNode,
  useCallback,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "matrix-js-sdk/src/logger";
import { EventType, RelationType } from "matrix-js-sdk/src/matrix";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";

import { useReactions } from "../useReactions";
import { useMatrixRTCSessionMemberships } from "../useMatrixRTCSessionMemberships";

interface InnerButtonButtonProps extends ComponentPropsWithoutRef<"button"> {
  raised: boolean;
}
const InnerButton: FC<InnerButtonButtonProps> = ({ raised, ...props }) => {
  const { t } = useTranslation();

  return (
    <Tooltip label={t("common.raise_hand")}>
      <CpdButton
        kind={raised ? "primary" : "secondary"}
        {...props}
        style={{ paddingLeft: 8, paddingRight: 8 }}
      >
        <p
          role="img"
          aria-label="raised hand"
          style={{
            width: "30px",
            height: "0px",
            display: "inline-block",
            fontSize: "22px",
          }}
        >
          ✋
        </p>
      </CpdButton>
    </Tooltip>
  );
};

interface RaisedHandToggleButton {
  rtcSession: MatrixRTCSession;
  client: MatrixClient;
}

export function RaiseHandToggleButton({
  client,
  rtcSession,
}: RaisedHandToggleButton): ReactNode {
  const {
    raisedHands,
    removeRaisedHand,
    addRaisedHand,
    myReactionId,
    setMyReactionId,
  } = useReactions();
  const [busy, setBusy] = useState(false);
  const userId = client.getUserId()!;
  const isHandRaised = !!raisedHands[userId];
  const memberships = useMatrixRTCSessionMemberships(rtcSession);

  const toggleRaisedHand = useCallback(() => {
    if (isHandRaised) {
      if (myReactionId) {
        setBusy(true);
        client
          .redactEvent(rtcSession.room.roomId, myReactionId)
          .then(() => {
            logger.debug("Redacted raise hand event");
            setMyReactionId(null);
            removeRaisedHand(userId);
          })
          .catch((e) => {
            logger.error("Failed to redact reaction event", e);
          })
          .finally(() => {
            setBusy(false);
          });
      }
    } else {
      const myMembership = memberships.find((m) => m.sender === userId);
      if (!myMembership?.eventId) {
        logger.error("Cannot find own membership event");
        return;
      }
      const parentEventId = myMembership.eventId;
      setBusy(true);
      client
        .sendEvent(rtcSession.room.roomId, EventType.Reaction, {
          "m.relates_to": {
            rel_type: RelationType.Annotation,
            event_id: parentEventId,
            key: "🖐️",
          },
        })
        .then((reaction) => {
          logger.debug("Sent raise hand event", reaction.event_id);
          setMyReactionId(reaction.event_id);
          addRaisedHand(userId, parentEventId, new Date());
        })
        .catch((e) => {
          logger.error("Failed to send reaction event", e);
        })
        .finally(() => {
          setBusy(false);
        });
    }
  }, [
    client,
    isHandRaised,
    memberships,
    myReactionId,
    rtcSession.room.roomId,
    addRaisedHand,
    removeRaisedHand,
    setMyReactionId,
    userId,
  ]);

  return (
    <InnerButton
      disabled={busy}
      onClick={toggleRaisedHand}
      raised={isHandRaised}
    />
  );
}
