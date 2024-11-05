/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { act, render } from "@testing-library/react";
import { FC } from "react";
import { describe, expect, test } from "vitest";

import { useReactions } from "./useReactions";
import {
  createReaction,
  createRedaction,
  MockRoom,
  MockRTCSession,
  TestComponentWrapper,
} from "./utils/test-reactions";
import { RoomEvent } from "matrix-js-sdk/src/matrix";

const memberUserIdAlice = "@alice:example.org";
const memberEventAlice = "$membership-alice:example.org";
const memberUserIdBob = "@bob:example.org";
const memberEventBob = "$membership-bob:example.org";

const membership: Record<string, string> = {
  [memberEventAlice]: memberUserIdAlice,
  [memberEventBob]: memberUserIdBob,
  "$membership-charlie:example.org": "@charlie:example.org",
};

/**
 * Test explanation.
 * This test suite checks that the useReactions hook appropriately reacts
 * to new reactions, redactions and membership changesin the room. There is
 * a large amount of test structure used to construct a mock environment.
 */

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

describe("useReactions", () => {
  test("starts with an empty list", () => {
    const rtcSession = new MockRTCSession(
      new MockRoom(memberUserIdAlice),
      membership,
    );
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles own raised hand", async () => {
    const room = new MockRoom(memberUserIdAlice);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByText } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    await act(() => room.testSendReaction(memberEventAlice, membership));
    expect(queryByText("Local reaction")).toBeTruthy();
  });
  test("handles incoming raised hand", async () => {
    const room = new MockRoom(memberUserIdAlice);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    await act(() => room.testSendReaction(memberEventAlice, membership));
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    await act(() => room.testSendReaction(memberEventBob, membership));
    expect(queryByRole("list")?.children).to.have.lengthOf(2);
  });
  test("handles incoming unraised hand", async () => {
    const room = new MockRoom(memberUserIdAlice);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    const reactionEventId = await act(() =>
      room.testSendReaction(memberEventAlice, membership),
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    await act(() =>
      room.emit(
        RoomEvent.Redaction,
        createRedaction(memberUserIdAlice, reactionEventId),
        room,
        undefined,
      ),
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("handles loading prior raised hand events", () => {
    const room = new MockRoom(memberUserIdAlice, [
      createReaction(memberEventAlice, membership),
    ]);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
  });
  // If the membership event changes for a user, we want to remove
  // the raised hand event.
  test("will remove reaction when a member leaves the call", () => {
    const room = new MockRoom(memberUserIdAlice, [
      createReaction(memberEventAlice, membership),
    ]);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    act(() => rtcSession.testRemoveMember(memberUserIdAlice));
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("will remove reaction when a member joins via a new event", () => {
    const room = new MockRoom(memberUserIdAlice, [
      createReaction(memberEventAlice, membership),
    ]);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(1);
    // Simulate leaving and rejoining
    act(() => {
      rtcSession.testRemoveMember(memberUserIdAlice);
      rtcSession.testAddMember(memberUserIdAlice);
    });
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("ignores invalid sender for historic event", () => {
    const room = new MockRoom(memberUserIdAlice, [
      createReaction(memberEventAlice, membership),
    ]);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
  test("ignores invalid sender for new event", async () => {
    const room = new MockRoom(memberUserIdAlice);
    const rtcSession = new MockRTCSession(room, membership);
    const { queryByRole } = render(
      <TestComponentWrapper rtcSession={rtcSession}>
        <TestComponent />
      </TestComponentWrapper>,
    );
    await act(() => room.testSendReaction(memberEventAlice, memberUserIdBob));
    expect(queryByRole("list")?.children).to.have.lengthOf(0);
  });
});
