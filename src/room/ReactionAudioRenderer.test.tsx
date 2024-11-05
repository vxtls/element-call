/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { act, render } from "@testing-library/react";
import { expect, test } from "vitest";
import { TooltipProvider } from "@vector-im/compound-web";
import { ReactNode } from "react";

import {
  MockRoom,
  MockRTCSession,
  TestReactionsWrapper,
} from "../utils/testReactions";
import { ReactionsAudioRenderer } from "./ReactionAudioRenderer";
import { ReactionSet } from "../reactions";

const memberUserIdAlice = "@alice:example.org";
const memberUserIdBob = "@bob:example.org";
const memberUserIdCharlie = "@charlie:example.org";
const memberEventAlice = "$membership-alice:example.org";
const memberEventBob = "$membership-bob:example.org";
const memberEventCharlie = "$membership-charlie:example.org";

const membership: Record<string, string> = {
  [memberEventAlice]: memberUserIdAlice,
  [memberEventBob]: memberUserIdBob,
  [memberEventCharlie]: memberUserIdCharlie,
};

function TestComponent({
  rtcSession,
}: {
  rtcSession: MockRTCSession;
}): ReactNode {
  return (
    <TooltipProvider>
      <TestReactionsWrapper rtcSession={rtcSession}>
        <ReactionsAudioRenderer />
      </TestReactionsWrapper>
    </TooltipProvider>
  );
}

test("defaults to no audio elements", () => {
  const rtcSession = new MockRTCSession(
    new MockRoom(memberUserIdAlice),
    membership,
  );
  const { container } = render(<TestComponent rtcSession={rtcSession} />);
  expect(container.getElementsByTagName("audio")).toHaveLength(0);
});

test("will play an audio sound when there is a reaction", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { container } = render(<TestComponent rtcSession={rtcSession} />);

  // Find the first reaction with a sound effect
  const chosenReaction = ReactionSet.find((r) => !!r.sound);
  if (!chosenReaction) {
    throw Error(
      "No reactions have sounds configured, this test cannot succeed",
    );
  }
  act(() => {
    room.testSendReaction(memberEventAlice, chosenReaction, membership);
  });
  const elements = container.getElementsByTagName("audio");
  expect(elements).toHaveLength(1);
  const audioElement = elements[0];

  expect(audioElement.autoplay).toBe(true);

  const sources = audioElement.getElementsByTagName("source");
  expect(sources).toHaveLength(2);

  // The element will be the full URL, whereas the chosenReaction will have the path.
  expect(sources[0].src).toContain(chosenReaction.sound?.ogg);
  expect(sources[1].src).toContain(chosenReaction.sound?.mp3);
});

test("will play multiple audio sounds when there are multiple different reactions", () => {
  const room = new MockRoom(memberUserIdAlice);
  const rtcSession = new MockRTCSession(room, membership);
  const { container } = render(<TestComponent rtcSession={rtcSession} />);

  // Find the first reaction with a sound effect
  const [reaction1, reaction2] = ReactionSet.filter((r) => !!r.sound);
  if (!reaction1 || !reaction2) {
    throw Error(
      "No reactions have sounds configured, this test cannot succeed",
    );
  }
  act(() => {
    room.testSendReaction(memberEventAlice, reaction1, membership);
    room.testSendReaction(memberEventBob, reaction2, membership);
    room.testSendReaction(memberEventCharlie, reaction1, membership);
  });
  const elements = container.getElementsByTagName("audio");
  // Do not play the same reaction twice.
  expect(elements).toHaveLength(2);
});
