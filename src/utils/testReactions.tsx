/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { PropsWithChildren, ReactNode } from "react";
import { randomUUID } from "crypto";
import EventEmitter from "events";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { EventType, RoomEvent } from "matrix-js-sdk/src/matrix";
import {
  MatrixEvent,
  EventTimeline,
  EventTimelineSet,
  Room,
} from "matrix-js-sdk/src/matrix";
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
} from "matrix-js-sdk/src/matrixrtc";

import { ReactionsProvider } from "../useReactions";

export const TestReactionsWrapper = ({
  rtcSession,
  children,
}: PropsWithChildren<{
  rtcSession: MockRTCSession;
}>): ReactNode => {
  return (
    <ReactionsProvider rtcSession={rtcSession as unknown as MatrixRTCSession}>
      {children}
    </ReactionsProvider>
  );
};

export class MockRTCSession extends EventEmitter {
  public memberships: {
    sender: string;
    eventId: string;
    createdTs: () => Date;
  }[];

  public constructor(
    public readonly room: MockRoom,
    membership: Record<string, string>,
  ) {
    super();
    this.memberships = Object.entries(membership).map(([eventId, sender]) => ({
      sender,
      eventId,
      createdTs: (): Date => new Date(),
    }));
  }

  public testRemoveMember(userId: string): void {
    this.memberships = this.memberships.filter((u) => u.sender !== userId);
    this.emit(MatrixRTCSessionEvent.MembershipsChanged);
  }

  public testAddMember(sender: string): void {
    this.memberships.push({
      sender,
      eventId: `!fake-${randomUUID()}:event`,
      createdTs: (): Date => new Date(),
    });
    this.emit(MatrixRTCSessionEvent.MembershipsChanged);
  }
}

export function createReaction(
  parentMemberEvent: string,
  membershipOrOverridenSender: Record<string, string> | string,
): MatrixEvent {
  return new MatrixEvent({
    sender:
      typeof membershipOrOverridenSender === "string"
        ? membershipOrOverridenSender
        : membershipOrOverridenSender[parentMemberEvent],
    type: EventType.Reaction,
    origin_server_ts: new Date().getTime(),
    content: {
      "m.relates_to": {
        key: "🖐️",
        event_id: parentMemberEvent,
      },
    },
    event_id: randomUUID(),
  });
}

export function createRedaction(
  sender: string,
  reactionEventId: string,
): MatrixEvent {
  return new MatrixEvent({
    sender,
    type: EventType.RoomRedaction,
    origin_server_ts: new Date().getTime(),
    redacts: reactionEventId,
    content: {},
    event_id: randomUUID(),
  });
}

export class MockRoom extends EventEmitter {
  public readonly testSentEvents: Parameters<MatrixClient["sendEvent"]>[] = [];
  public readonly testRedactedEvents: Parameters<
    MatrixClient["redactEvent"]
  >[] = [];

  public constructor(
    private readonly ownUserId: string,
    private readonly existingRelations: MatrixEvent[] = [],
  ) {
    super();
  }

  public get client(): MatrixClient {
    return {
      getUserId: (): string => this.ownUserId,
      sendEvent: async (
        ...props: Parameters<MatrixClient["sendEvent"]>
      ): ReturnType<MatrixClient["sendEvent"]> => {
        this.testSentEvents.push(props);
        return Promise.resolve({ event_id: randomUUID() });
      },
      redactEvent: async (
        ...props: Parameters<MatrixClient["redactEvent"]>
      ): ReturnType<MatrixClient["redactEvent"]> => {
        this.testRedactedEvents.push(props);
        return Promise.resolve({ event_id: randomUUID() });
      },
    } as unknown as MatrixClient;
  }

  public get relations(): Room["relations"] {
    return {
      getChildEventsForEvent: (membershipEventId: string) => ({
        getRelations: (): MatrixEvent[] => {
          return this.existingRelations.filter(
            (r) =>
              r.getContent()["m.relates_to"]?.event_id === membershipEventId,
          );
        },
      }),
    } as unknown as Room["relations"];
  }

  public testSendReaction(
    parentMemberEvent: string,
    overridenSender: string,
  ): string;
  public testSendReaction(
    parentMemberEvent: string,
    membershipOrOverridenSender: Record<string, string>,
  ): string;
  public testSendReaction(
    parentMemberEvent: string,
    membershipOrOverridenSender: Record<string, string> | string,
  ): string {
    const evt = createReaction(parentMemberEvent, membershipOrOverridenSender);
    this.emit(RoomEvent.Timeline, evt, this, undefined, false, {
      timeline: new EventTimeline(new EventTimelineSet(undefined)),
    });
    return evt.getId()!;
  }
}
