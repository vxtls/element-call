/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { render } from "@testing-library/react";
import { FC, ReactNode } from "react";
import { describe, expect, test } from "vitest";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";
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

const membership = [
  "@alice:example.org",
  "@bob:example.org",
  "@charlie:example.org",
];

const TestComponent: FC = () => {
  const { raisedHands } = useReactions();
  return (
    <ul>
      {Object.entries(raisedHands).map(([userId, date]) => (
        <li key={userId}>
          <span>{userId}</span>
          <time>{date.getTime()}</time>
        </li>
      ))}
    </ul>
  );
};

const TestComponentWrapper = ({ room }: { room: MockRoom }): ReactNode => {
  const fakeRtcSession = {
    on: () => {},
    off: () => {},
    room,
    memberships: membership.map((sender) => ({
      sender,
      eventId: "!fake:event",
      createdTs: (): Date => new Date(),
    })),
  } as unknown as MatrixRTCSession;

  return (
    <ReactionsProvider rtcSession={fakeRtcSession}>
      <TestComponent />
    </ReactionsProvider>
  );
};

function createReaction(sender: string): MatrixEvent {
  return new MatrixEvent({
    sender,
    type: EventType.Reaction,
    origin_server_ts: new Date().getTime(),
    content: {
      "m.relates_to": {
        key: "🖐️",
      },
    },
    event_id: randomUUID(),
  });
}

function createRedaction(sender: string): MatrixEvent {
  return new MatrixEvent({
    sender,
    type: EventType.RoomRedaction,
    origin_server_ts: new Date().getTime(),
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
      getUserId: (): string => "@alice:example.org",
    } as unknown as MatrixClient;
  }

  public get relations(): Room["relations"] {
    return {
      getChildEventsForEvent: () => ({
        getRelations: () => this.existingRelations,
      }),
    } as unknown as Room["relations"];
  }

  public testSendReaction(sender: string): void {
    this.emit(
      RoomEvent.Timeline,
      createReaction(sender),
      this,
      undefined,
      false,
      {
        timeline: new EventTimeline(new EventTimelineSet(undefined)),
      },
    );
  }
}

describe("useReactions", () => {
  test("starts with an empty list", () => {
    const room = new MockRoom();
    const { queryByRole } = render(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles incoming raised hand", () => {
    const room = new MockRoom();
    const { queryByRole, rerender } = render(
      <TestComponentWrapper room={room} />,
    );
    room.testSendReaction("@foo:bar");
    rerender(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    room.testSendReaction("@baz:bar");
    rerender(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(2);
  });
  test("handles incoming unraised hand", () => {
    const room = new MockRoom();
    const { queryByRole, rerender } = render(
      <TestComponentWrapper room={room} />,
    );
    room.testSendReaction("@foo:bar");
    rerender(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    room.emit(
      RoomEvent.Redaction,
      createRedaction("@foo:bar"),
      room,
      undefined,
    );
    rerender(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles loading events from cold", () => {
    const room = new MockRoom([createReaction(membership[0])]);
    const { queryByRole } = render(<TestComponentWrapper room={room} />);
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
  });
});
