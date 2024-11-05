/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { test, vi, onTestFinished } from "vitest";
import { map, Observable } from "rxjs";
import { MatrixClient } from "matrix-js-sdk/src/matrix";
import {
  ConnectionState,
  LocalParticipant,
  RemoteParticipant,
} from "livekit-client";
import * as ComponentsCore from "@livekit/components-core";
import {
  CallMembership,
  MatrixRTCSession,
  MatrixRTCSessionEvent,
} from "matrix-js-sdk/src/matrixrtc";

import { CallViewModel, Layout } from "./CallViewModel";
import {
  mockLivekitRoom,
  mockLocalParticipant,
  mockMatrixRoom,
  mockMember,
  mockRemoteParticipant,
  OurRunHelpers,
  withTestScheduler,
} from "../utils/test";
import {
  ECAddonConnectionState,
  ECConnectionState,
} from "../livekit/useECConnectionState";
import { E2eeType } from "../e2ee/e2eeType";
import { MockRoom, MockRTCSession } from "../useReactions.test";

vi.mock("@livekit/components-core");

const carolId = "@carol:example.org";
const carolDev = "CCCC";
const aliceId = "@alice:example.org";
const aliceDev = "AAAA";
const aliceRTCId = aliceId + ":" + aliceDev;

const bobId = "@bob:example.org";
const bobDev = "BBBB";
const bobRTCId = bobId + ":" + bobDev;

const alice = mockMember({ userId: aliceId });
const bob = mockMember({ userId: bobId });
const carol = mockMember({ userId: carolId });

const localParticipant = mockLocalParticipant({ identity: "" });
const aliceParticipant = mockRemoteParticipant({ identity: aliceRTCId });
const aliceSharingScreen = mockRemoteParticipant({
  identity: aliceRTCId,
  isScreenShareEnabled: true,
});
const bobParticipant = mockRemoteParticipant({ identity: bobRTCId });
const bobSharingScreen = mockRemoteParticipant({
  identity: bobRTCId,
  isScreenShareEnabled: true,
});

const members = new Map([
  [alice.userId, alice],
  [bob.userId, bob],
  [carol.userId, carol],
]);

const rtcMemberAlice = { sender: aliceId, deviceId: aliceDev };
const rtcMemberBob = { sender: bobId, deviceId: bobDev };
const rtcMemberCarol = { sender: carolId, deviceId: carolDev };
export interface GridLayoutSummary {
  type: "grid";
  spotlight?: string[];
  grid: string[];
}

export interface SpotlightLandscapeLayoutSummary {
  type: "spotlight-landscape";
  spotlight: string[];
  grid: string[];
}

export interface SpotlightPortraitLayoutSummary {
  type: "spotlight-portrait";
  spotlight: string[];
  grid: string[];
}

export interface SpotlightExpandedLayoutSummary {
  type: "spotlight-expanded";
  spotlight: string[];
  pip?: string;
}

export interface OneOnOneLayoutSummary {
  type: "one-on-one";
  local: string;
  remote: string;
}

export interface PipLayoutSummary {
  type: "pip";
  spotlight: string[];
}

export type LayoutSummary =
  | GridLayoutSummary
  | SpotlightLandscapeLayoutSummary
  | SpotlightPortraitLayoutSummary
  | SpotlightExpandedLayoutSummary
  | OneOnOneLayoutSummary
  | PipLayoutSummary;

function summarizeLayout(l: Layout): LayoutSummary {
  switch (l.type) {
    case "grid":
      return {
        type: l.type,
        spotlight: l.spotlight?.map((vm) => vm.id),
        grid: l.grid.map((vm) => vm.id),
      };
    case "spotlight-landscape":
    case "spotlight-portrait":
      return {
        type: l.type,
        spotlight: l.spotlight.map((vm) => vm.id),
        grid: l.grid.map((vm) => vm.id),
      };
    case "spotlight-expanded":
      return {
        type: l.type,
        spotlight: l.spotlight.map((vm) => vm.id),
        pip: l.pip?.id,
      };
    case "one-on-one":
      return { type: l.type, local: l.local.id, remote: l.remote.id };
    case "pip":
      return { type: l.type, spotlight: l.spotlight.map((vm) => vm.id) };
  }
}

function withCallViewModel(
  { cold }: OurRunHelpers,
  remoteParticipants: Observable<RemoteParticipant[]>,
  rtcMembers: Observable<Partial<CallMembership>[]>,
  connectionState: Observable<ECConnectionState>,
  continuation: (vm: CallViewModel) => void,
): void {
  const room = mockMatrixRoom({
    client: {
      getUserId: () => carolId,
      getDeviceId: () => carolDev,
    } as Partial<MatrixClient> as MatrixClient,
    getMember: (userId) => members.get(userId) ?? null,
  });
  const rtcSession = new MockRTCSession(room as unknown as MockRoom);
  rtcMembers.subscribe((m) => {
    rtcSession.memberships = m;
    rtcSession.emit(MatrixRTCSessionEvent.MembershipsChanged);
  });
  const participantsSpy = vi
    .spyOn(ComponentsCore, "connectedParticipantsObserver")
    .mockReturnValue(remoteParticipants);
  const mediaSpy = vi
    .spyOn(ComponentsCore, "observeParticipantMedia")
    .mockImplementation((p) =>
      cold("a", {
        a: { participant: p } as Partial<
          ComponentsCore.ParticipantMedia<LocalParticipant>
        > as ComponentsCore.ParticipantMedia<LocalParticipant>,
      }),
    );
  const eventsSpy = vi
    .spyOn(ComponentsCore, "observeParticipantEvents")
    .mockImplementation((p) => cold("a", { a: p }));

  const vm = new CallViewModel(
    rtcSession as unknown as MatrixRTCSession,
    mockLivekitRoom({ localParticipant }),
    {
      kind: E2eeType.PER_PARTICIPANT,
    },
    connectionState,
  );

  onTestFinished(() => {
    vm!.destroy();
    participantsSpy!.mockRestore();
    mediaSpy!.mockRestore();
    eventsSpy!.mockRestore();
  });

  continuation(vm);
}

test("participants are retained during a focus switch", () => {
  withTestScheduler((helpers) => {
    const { hot, expectObservable } = helpers;
    // Participants disappear on frame 2 and come back on frame 3
    const partMarbles = "a-ba";
    // The RTC members never disappear
    const rtcMemberMarbles = "a---";
    // Start switching focus on frame 1 and reconnect on frame 3
    const connMarbles = "ab-a";
    // The visible participants should remain the same throughout the switch
    const laytMarbles = "aaaa 2997ms a 56998ms a";

    withCallViewModel(
      helpers,
      hot(partMarbles, {
        a: [aliceParticipant, bobParticipant],
        b: [],
      }),
      hot(rtcMemberMarbles, {
        a: [rtcMemberAlice, rtcMemberBob, rtcMemberCarol],
      }),
      hot(connMarbles, {
        a: ConnectionState.Connected,
        b: ECAddonConnectionState.ECSwitchingFocus,
      }),
      (vm) => {
        expectObservable(vm.layout.pipe(map(summarizeLayout))).toBe(
          laytMarbles,
          {
            a: {
              type: "grid",
              spotlight: undefined,
              grid: ["local:0", `${aliceRTCId}:0`, `${bobRTCId}:0`],
            },
          },
        );
      },
    );
  });
});

test("screen sharing activates spotlight layout", () => {
  withTestScheduler((helpers) => {
    const { hot, schedule, expectObservable } = helpers;
    // Start with no screen shares, then have Alice and Bob share their screens,
    // then return to no screen shares, then have just Alice share for a bit
    const partMarbles = "abc---d---a-b---a";
    // While there are no screen shares, switch to spotlight manually, and then
    // switch back to grid at the end
    const modeMarbles = "-----------a--------b";
    // We should automatically enter spotlight for the first round of screen
    // sharing, then return to grid, then manually go into spotlight, and
    // remain in spotlight until we manually go back to grid
    const laytMarbles = "ab(cc)(dd)ae(bb)(ee)a 59979ms a";

    withCallViewModel(
      helpers,
      hot(partMarbles, {
        a: [aliceParticipant, bobParticipant],
        b: [aliceSharingScreen, bobParticipant],
        c: [aliceSharingScreen, bobSharingScreen],
        d: [aliceParticipant, bobSharingScreen],
      }),
      hot("a", { a: ConnectionState.Connected }),
      (vm) => {
        schedule(modeMarbles, {
          a: () => vm.setGridMode("spotlight"),
          b: () => vm.setGridMode("grid"),
        });

        expectObservable(vm.layout.pipe(map(summarizeLayout))).toBe(
          laytMarbles,
          {
            a: {
              type: "grid",
              spotlight: undefined,
              grid: ["local:0", `${aliceId}:0`, `${bobId}:0`],
            },
            b: {
              type: "spotlight-landscape",
              spotlight: [`${aliceId}:0:screen-share`],
              grid: ["local:0", `${aliceId}:0`, `${bobId}:0`],
            },
            c: {
              type: "spotlight-landscape",
              spotlight: [
                `${aliceId}:0:screen-share`,
                `${bobId}:0:screen-share`,
              ],
              grid: ["local:0", `${aliceId}:0`, `${bobId}:0`],
            },
            d: {
              type: "spotlight-landscape",
              spotlight: [`${bobId}:0:screen-share`],
              grid: ["local:0", `${aliceId}:0`, `${bobId}:0`],
            },
            e: {
              type: "spotlight-landscape",
              spotlight: [`${aliceId}:0`],
              grid: ["local:0", `${aliceId}:0`, `${bobId}:0`],
            },
          },
        );
      },
    );
  });
});
