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
} from "react";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";

import { useMatrixRTCSessionMemberships } from "./useMatrixRTCSessionMemberships";
import { useClientState } from "./ClientContext";

interface ReactionsContextType {
  raisedHands: Record<string, Date>;
  raisedHandCount: number;
  addRaisedHand: (userId: string, date: Date) => void;
  removeRaisedHand: (userId: string) => void;
  supportsReactions: boolean;
  myReactionId: string | null;
  setMyReactionId: (id: string | null) => void;
}

const ReactionsContext = createContext<ReactionsContextType | undefined>(
  undefined,
);

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
  const [raisedHands, setRaisedHands] = useState<Record<string, Date>>({});
  const [myReactionId, setMyReactionId] = useState<string | null>(null);
  const [raisedHandCount, setRaisedHandCount] = useState(0);
  const memberships = useMatrixRTCSessionMemberships(rtcSession);
  const clientState = useClientState();
  const supportsReactions =
    clientState?.state === "valid" && clientState.supportedFeatures.reactions;
  const room = rtcSession.room;

  const addRaisedHand = useCallback(
    (userId: string, time: Date) => {
      setRaisedHands({
        ...raisedHands,
        [userId]: time,
      });
      setRaisedHandCount(Object.keys(raisedHands).length + 1);
    },
    [raisedHands],
  );

  const removeRaisedHand = useCallback(
    (userId: string) => {
      delete raisedHands[userId];
      setRaisedHands(raisedHands);
      setRaisedHandCount(Object.keys(raisedHands).length);
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

    for (const m of memberships) {
      if (!m.sender || !m.eventId) {
        continue;
      }
      const reaction = getLastReactionEvent(m.eventId);
      const eventId = reaction?.getId();
      if (!eventId) {
        continue;
      }
      if (reaction && reaction.getType() === EventType.Reaction) {
        const content = reaction.getContent() as ReactionEventContent;
        if (content?.["m.relates_to"]?.key === "🖐️") {
          addRaisedHand(m.sender, new Date(m.createdTs()));
          if (m.sender === room.client.getUserId()) {
            setMyReactionId(eventId);
          }
        }
      }
    }
    // Deliberately ignoring addRaisedHand which was causing looping.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, memberships]);

  useEffect(() => {
    const handleReactionEvent = (event: MatrixEvent): void => {
      const sender = event.getSender();
      if (!sender) {
        // Skip any event without a sender.
        return;
      }
      if (event.getType() === EventType.Reaction) {
        // TODO: check if target of reaction is a call membership event
        const content = event.getContent() as ReactionEventContent;
        if (content?.["m.relates_to"].key === "🖐️") {
          addRaisedHand(sender, new Date(event.localTimestamp));
        }
      }
      if (event.getType() === EventType.RoomRedaction && event.getSender()) {
        // TODO: check target of redaction event
        removeRaisedHand(sender);
      }
    };

    room.on(MatrixRoomEvent.Timeline, handleReactionEvent);
    room.on(MatrixRoomEvent.Redaction, handleReactionEvent);

    return (): void => {
      room.off(MatrixRoomEvent.Timeline, handleReactionEvent);
      room.off(MatrixRoomEvent.Redaction, handleReactionEvent);
    };
  }, [room, raisedHands, addRaisedHand, removeRaisedHand]);

  return (
    <ReactionsContext.Provider
      value={{
        raisedHands,
        raisedHandCount,
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
