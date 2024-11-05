/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { act, fireEvent, render } from "@testing-library/react";
import { expect, test } from "vitest";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc";
import { TooltipProvider } from "@vector-im/compound-web";
import { userEvent } from "@testing-library/user-event";
import { ReactNode } from "react";

import {
  MockRoom,
  MockRTCSession,
  TestReactionsWrapper,
} from "../utils/testReactions";
import { ReactionToggleButton } from "./ReactionToggleButton";
import { ElementCallReactionEventType } from "../reactions";

const memberUserIdAlice = "@alice:example.org";
const memberEventAlice = "$membership-alice:example.org";

const membership: Record<string, string> = {
  [memberEventAlice]: memberUserIdAlice,
};

function TestComponent({
  rtcSession,
  room,
}: {
  rtcSession: MockRTCSession;
  room: MockRoom;
}): ReactNode {
  return (
    <TooltipProvider>
      <TestReactionsWrapper rtcSession={rtcSession}>
        <ReactionToggleButton
          rtcSession={rtcSession as unknown as MatrixRTCSession}
          client={room.client}
        />
      </TestReactionsWrapper>
    </TooltipProvider>
  );
}

test("Can open menu", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => getByRole("button").click());
  expect(container).toMatchSnapshot();
});

test("Can close menu", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => getByRole("button", { expanded: true }).click());
  expect(container).toMatchSnapshot();
});

test("Can raise hand", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, getByText, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByText("🖐️").click();
  });
  expect(room.testSentEvents).toEqual([
    [
      undefined,
      "m.reaction",
      {
        "m.relates_to": {
          event_id: memberEventAlice,
          key: "🖐️",
          rel_type: "m.annotation",
        },
      },
    ],
  ]);
  expect(container).toMatchSnapshot();
});

test("Can can lower hand", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, getByText, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  const reactionEvent = room.testSendReaction(memberEventAlice, membership);
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByText("🖐️").click();
  });
  expect(room.testRedactedEvents).toEqual([[undefined, reactionEvent]]);
  expect(container).toMatchSnapshot();
});

test("Can react with emoji", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, getByText } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByText("🐶").click();
  });
  expect(room.testSentEvents).toEqual([
    [
      undefined,
      ElementCallReactionEventType,
      {
        "m.relates_to": {
          event_id: memberEventAlice,
          rel_type: "m.reference",
        },
        name: "dog",
        emoji: "🐶",
      },
    ],
  ]);
});

test("Can search for and send emoji", async () => {
  const user = userEvent.setup();
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByText, getByRole, getByPlaceholderText, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByRole("button", {
      name: "Search",
    }).click();
  });
  await act(async () => {
    getByPlaceholderText("Search reactions…").focus();
    await user.keyboard("crickets");
  });
  expect(container).toMatchSnapshot();
  act(() => {
    getByText("🦗").click();
  });
  expect(room.testSentEvents).toEqual([
    [
      undefined,
      ElementCallReactionEventType,
      {
        "m.relates_to": {
          event_id: memberEventAlice,
          rel_type: "m.reference",
        },
        name: "crickets",
        emoji: "🦗",
      },
    ],
  ]);
});

test("Can search for and send emoji with the keyboard", async () => {
  const user = userEvent.setup();
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByText, getByRole, getByPlaceholderText, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByRole("button", {
      name: "Search",
    }).click();
  });
  const searchField = getByPlaceholderText("Search reactions…");
  await act(async () => {
    searchField.focus();
    await user.keyboard("crickets");
  });
  expect(container).toMatchSnapshot();
  act(() => {
    fireEvent.keyDown(searchField, { key: "Enter" });
  });
  expect(room.testSentEvents).toEqual([
    [
      undefined,
      ElementCallReactionEventType,
      {
        "m.relates_to": {
          event_id: memberEventAlice,
          rel_type: "m.reference",
        },
        name: "crickets",
        emoji: "🦗",
      },
    ],
  ]);
});

test("Can close search", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, container } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByRole("button", {
      name: "Search",
    }).click();
  });
  act(() => {
    getByRole("button", {
      name: "close search",
    }).click();
  });
  expect(container).toMatchSnapshot();
});

test("Can close search with the escape key", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { getByRole, container, getByPlaceholderText } = render(
    <TestComponent rtcSession={rtcSession} room={room} />,
  );
  act(() => {
    getByRole("button").click();
  });
  act(() => {
    getByRole("button", {
      name: "Search",
    }).click();
  });
  const searchField = getByPlaceholderText("Search reactions…");
  act(() => {
    fireEvent.keyDown(searchField, { key: "Escape" });
  });
  expect(container).toMatchSnapshot();
});
