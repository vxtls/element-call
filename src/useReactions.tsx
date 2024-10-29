/*
Copyright 2024 Milton Moura <miltonmoura@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import {
  EventType,
  MatrixEvent,
  RelationType,
  RoomEvent as MatrixRoomEvent,
} from "matrix-js-sdk/src/matrix";
import { ReactionEventContent } from "matrix-js-sdk/src/types";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";

import { useMatrixRTCSessionMemberships } from "./useMatrixRTCSessionMemberships";
import { useClientState } from "./ClientContext";
import { logger } from "matrix-js-sdk/src/logger";

interface ReactionsContextType {
  raisedHands: Record<string, Date>;
  addRaisedHand: (userId: string, info: RaisedHandInfo) => void;
  removeRaisedHand: (userId: string) => void;
  supportsReactions: boolean;
  myReactionId: string | null;
  setMyReactionId: (id: string | null) => void;
}

const ReactionsContext = createContext<ReactionsContextType | undefined>(
  undefined,
);

interface RaisedHandInfo {
  membershipEventId: string;
  reactionEventId: string;
  time: Date;
}

export const useReactions = (): ReactionsContextType => {
  const context = useContext(ReactionsContext);
  if (!context) {
    throw new Error("useReactions must be used within a ReactionsProvider");
  }
  return context;
};

export const ReactionsProvider = ({
  children,
  rtcSession,
}: {
  children: ReactNode;
  rtcSession: MatrixRTCSession;
}): JSX.Element => {
  const [raisedHands, setRaisedHands] = useState<
    Record<string, RaisedHandInfo>
  >({});
  const [myReactionId, setMyReactionId] = useState<string | null>(null);
  const memberships = useMatrixRTCSessionMemberships(rtcSession);
  const clientState = useClientState();
  const supportsReactions =
    clientState?.state === "valid" && clientState.supportedFeatures.reactions;
  const room = rtcSession.room;

  const myUserId = room.client.getUserId();

  const addRaisedHand = useCallback(
    (userId: string, info: RaisedHandInfo) => {
      setRaisedHands({
        ...raisedHands,
        [userId]: info,
      });
    },
    [raisedHands],
  );

  const removeRaisedHand = useCallback(
    (userId: string) => {
      delete raisedHands[userId];
      if (userId === myUserId) {
        setMyReactionId(null);
      }
      setRaisedHands({ ...raisedHands });
    },
    [raisedHands],
  );

  // Load any existing reactions.
  useEffect(() => {
    const getLastReactionEvent = (eventId: string): MatrixEvent | undefined => {
      const relations = room.relations.getChildEventsForEvent(
        eventId,
        RelationType.Annotation,
        EventType.Reaction,
      );
      const allEvents = relations?.getRelations() ?? [];
      return allEvents.length > 0 ? allEvents[0] : undefined;
    };

    console.log(memberships, raisedHands);
    // Remove any raised hands for users no longer joined to the call.
    for (const userId of Object.keys(raisedHands).filter(
      (rhId) => !memberships.find((u) => u.sender == rhId),
    )) {
      removeRaisedHand(userId);
    }

    for (const m of memberships) {
      if (!m.sender || !m.eventId) {
        continue;
      }
      if (
        raisedHands[m.sender] &&
        raisedHands[m.sender].membershipEventId !== m.eventId
      ) {
        // Membership event for sender has changed.
        removeRaisedHand(m.sender);
      }
      const reaction = getLastReactionEvent(m.eventId);
      const eventId = reaction?.getId();
      if (!eventId) {
        continue;
      }
      if (reaction && reaction.getType() === EventType.Reaction) {
        const content = reaction.getContent() as ReactionEventContent;
        if (content?.["m.relates_to"]?.key === "🖐️") {
          console.log("found key, raising hand", m.sender);
          addRaisedHand(m.sender, {
            membershipEventId: m.eventId,
            reactionEventId: eventId,
            time: new Date(reaction.localTimestamp),
          });
          if (m.sender === room.client.getUserId()) {
            setMyReactionId(eventId);
          }
        }
      }
    }
    console.log("After", raisedHands);
    // Deliberately ignoring addRaisedHand, raisedHands which was causing looping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, memberships]);

  useEffect(() => {
    const handleReactionEvent = (event: MatrixEvent): void => {
      const sender = event.getSender();
      const reactionEventId = event.getId();
      if (!sender || !reactionEventId) {
        // Skip any event without a sender or event ID.
        return;
      }

      if (event.getType() === EventType.Reaction) {
        const content = event.getContent() as ReactionEventContent;
        const membershipEventId = content["m.relates_to"].event_id;

        if (
          !memberships.some(
            (e) => e.eventId === membershipEventId && e.sender === sender,
          )
        ) {
          logger.warn(
            `Reaction target was not a membership event for ${sender}, ignoring`,
          );
          return;
        }

        if (content?.["m.relates_to"].key === "🖐️") {
          addRaisedHand(sender, {
            reactionEventId,
            membershipEventId,
            time: new Date(event.localTimestamp),
          });
        }
      } else if (event.getType() === EventType.RoomRedaction) {
        const targetEvent = event.event.redacts;
        const targetUser = Object.entries(raisedHands).find(
          ([u, r]) => r.reactionEventId === targetEvent,
        )?.[0];
        console.log(targetEvent, raisedHands);
        if (!targetUser) {
          // Reaction target was not for us, ignoring
          return;
        }
        removeRaisedHand(targetUser);
      }
    };

    room.on(MatrixRoomEvent.Timeline, handleReactionEvent);
    room.on(MatrixRoomEvent.Redaction, handleReactionEvent);

    return (): void => {
      room.off(MatrixRoomEvent.Timeline, handleReactionEvent);
      room.off(MatrixRoomEvent.Redaction, handleReactionEvent);
    };
  }, [room, addRaisedHand, removeRaisedHand]);

  // Reduce the data down for the consumers.
  const resultRaisedHands = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(raisedHands).map(([uid, data]) => [uid, data.time]),
      ),
    [raisedHands],
  );

  return (
    <ReactionsContext.Provider
      value={{
        raisedHands: resultRaisedHands,
        addRaisedHand,
        removeRaisedHand,
        supportsReactions,
        myReactionId,
        setMyReactionId,
      }}
    >
      {children}
    </ReactionsContext.Provider>
  );
};
