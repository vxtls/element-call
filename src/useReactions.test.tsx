/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { render } from "@testing-library/react";
import { FC, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import {
  MatrixRTCSession,
  MatrixRTCSessionEvent,
} from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";
import {
  EventTimeline,
  EventTimelineSet,
  EventType,
  MatrixClient,
  MatrixEvent,
  Room,
  RoomEvent,
} from "matrix-js-sdk/src/matrix";
import EventEmitter from "events";
import { randomUUID } from "crypto";

import { ReactionsProvider, useReactions } from "./useReactions";

const memberUserIdAlice = "@alice:example.org";
const memberEventAlice = "$membership-alice:example.org";
const memberUserIdBob = "@bob:example.org";
const memberEventBob = "$membership-bob:example.org";

const membership: Record<string, string> = {
  [memberEventAlice]: memberUserIdAlice,
  [memberEventBob]: memberUserIdBob,
  "$membership-charlie:example.org": "@charlie:example.org",
};

const TestComponent: FC = () => {
  const { raisedHands, myReactionId } = useReactions();
  return (
    <div>
      <ul>
        {Object.entries(raisedHands).map(([userId, date]) => (
          <li key={userId}>
            <span>{userId}</span>
            <time>{date.getTime()}</time>
          </li>
        ))}
      </ul>
      <p>{myReactionId ? "Local reaction" : "No local reaction"}</p>
    </div>
  );
};

const TestComponentWrapper = ({
  rtcSession,
}: {
  rtcSession: MockRTCSession;
}): ReactNode => {
  return (
    <ReactionsProvider rtcSession={rtcSession as unknown as MatrixRTCSession}>
      <TestComponent />
    </ReactionsProvider>
  );
};

export class MockRTCSession extends EventEmitter {
  public memberships = Object.entries(membership).map(([eventId, sender]) => ({
    sender,
    eventId,
    createdTs: (): Date => new Date(),
  }));

  public constructor(public readonly room: MockRoom) {
    super();
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

function createReaction(parentMemberEvent: string): MatrixEvent {
  return new MatrixEvent({
    sender: membership[parentMemberEvent],
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

function createRedaction(sender: string, reactionEventId: string): MatrixEvent {
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
  public constructor(private readonly existingRelations: MatrixEvent[] = []) {
    super();
  }

  public get client(): MatrixClient {
    return {
      getUserId: (): string => memberUserIdAlice,
    } as unknown as MatrixClient;
  }

  public get relations(): Room["relations"] {
    return {
      getChildEventsForEvent: (membershipEventId: string) => ({
        getRelations: (): MatrixEvent[] => {
          const sender = membership[membershipEventId];
          return this.existingRelations.filter((r) => r.getSender() === sender);
        },
      }),
    } as unknown as Room["relations"];
  }

  public testSendReaction(parentMemberEvent: string): string {
    const evt = createReaction(parentMemberEvent);
    this.emit(RoomEvent.Timeline, evt, this, undefined, false, {
      timeline: new EventTimeline(new EventTimelineSet(undefined)),
    });
    return evt.getId()!;
  }
}

describe("useReactions", () => {
  test("starts with an empty list", () => {
    const rtcSession = new MockRTCSession(new MockRoom());
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles own raised hand", () => {
    const room = new MockRoom();
    const rtcSession = new MockRTCSession(room);
    const { queryByText, rerender } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    room.testSendReaction(memberEventAlice);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByText("Local reaction")).toBeTruthy();
  });
  test("handles incoming raised hand", () => {
    const room = new MockRoom();
    const rtcSession = new MockRTCSession(room);
    const { queryByRole, rerender } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    room.testSendReaction(memberEventAlice);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    room.testSendReaction(memberEventBob);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(2);
  });
  test("handles incoming unraised hand", () => {
    const room = new MockRoom();
    const rtcSession = new MockRTCSession(room);
    const { queryByRole, rerender } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    const reactionEventId = room.testSendReaction(memberEventAlice);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    room.emit(
      RoomEvent.Redaction,
      createRedaction(memberUserIdAlice, reactionEventId),
      room,
      undefined,
    );
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles loading events from cold", () => {
    const room = new MockRoom([createReaction(memberEventAlice)]);
    const rtcSession = new MockRTCSession(room);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
  });
  test("will remove reaction when a member leaves the call", () => {
    const room = new MockRoom([createReaction(memberEventAlice)]);
    const rtcSession = new MockRTCSession(room);
    const { queryByRole, rerender } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    rtcSession.testRemoveMember(memberUserIdAlice);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("will remove reaction when a member joins via a new event", () => {
    const room = new MockRoom([createReaction(memberEventAlice)]);
    const rtcSession = new MockRTCSession(room);
    const { queryByRole, rerender } = render(
      <TestComponentWrapper rtcSession={rtcSession} />,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    rtcSession.testRemoveMember(memberUserIdAlice);
    rtcSession.testAddMember(memberUserIdAlice);
    rerender(<TestComponentWrapper rtcSession={rtcSession} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
});
