/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { RelationType } from "matrix-js-sdk/src/types";

import catSoundOgg from "../sound/reactions/cat.ogg?url";
import catSoundMp3 from "../sound/reactions/cat.mp3?url";
import clapSoundOgg from "../sound/reactions/clap.ogg?url";
import clapSoundMp3 from "../sound/reactions/clap.mp3?url";
import cricketsSoundOgg from "../sound/reactions/crickets.ogg?url";
import cricketsSoundMp3 from "../sound/reactions/crickets.mp3?url";
import dogSoundOgg from "../sound/reactions/dog.ogg?url";
import dogSoundMp3 from "../sound/reactions/dog.mp3?url";
import genericSoundOgg from "../sound/reactions/generic.ogg?url";
import genericSoundMp3 from "../sound/reactions/generic.mp3?url";
import lightbulbSoundOgg from "../sound/reactions/lightbulb.ogg?url";
import lightbulbSoundMp3 from "../sound/reactions/lightbulb.mp3?url";
import partySoundOgg from "../sound/reactions/party.ogg?url";
import partySoundMp3 from "../sound/reactions/party.mp3?url";

export const ElementCallReactionEventType = "io.element.call.reaction";

export interface ReactionOption {
  emoji: string;
  name: string;
  alias?: string[];
  sound?: {
    mp3?: string;
    ogg: string;
  };
}

export interface ECallReactionEventContent {
  "m.relates_to": {
    rel_type: RelationType.Reference;
    event_id: string;
  };
  emoji: string;
  name: string;
}

export const GenericReaction: ReactionOption = {
  name: "generic",
  emoji: "", // Filled in by user
  sound: {
    mp3: genericSoundMp3,
    ogg: genericSoundOgg,
  },
};

// The first 6 reactions are always visible.
export const ReactionSet: ReactionOption[] = [
  {
    emoji: "👍",
    name: "thumbsup",
    alias: ["+1", "yes", "thumbs up"],
  },
  {
    emoji: "🎉",
    name: "party",
    alias: ["hurray", "success"],
    sound: {
      ogg: partySoundOgg,
      mp3: partySoundMp3,
    },
  },
  {
    emoji: "👏",
    name: "clapping",
    alias: ["celebrate", "success"],
    sound: {
      ogg: clapSoundOgg,
      mp3: clapSoundMp3,
    },
  },
  {
    emoji: "🐶",
    name: "dog",
    alias: ["doggo", "pupper", "woofer"],
    sound: {
      ogg: dogSoundOgg,
      mp3: dogSoundMp3,
    },
  },
  {
    emoji: "🐱",
    name: "cat",
    alias: ["meow", "kitty"],
    sound: {
      ogg: catSoundOgg,
      mp3: catSoundMp3,
    },
  },
  {
    emoji: "💡",
    name: "lightbulb",
    alias: ["bulb", "light", "idea", "ping"],
    sound: {
      ogg: lightbulbSoundOgg,
      mp3: lightbulbSoundMp3,
    },
  },
  {
    emoji: "🦗",
    name: "crickets",
    alias: ["awkward", "silence"],
    sound: {
      ogg: cricketsSoundOgg,
      mp3: cricketsSoundMp3,
    },
  },
  {
    emoji: "👎",
    name: "thumbsdown",
    alias: ["-1", "no", "thumbs no"],
  },
  {
    emoji: "😵‍💫",
    name: "dizzy",
    alias: ["dazed", "confused"],
  },
  {
    emoji: "👌",
    name: "ok",
    alias: ["okay", "cool"],
  },
  {
    emoji: "🥰",
    name: "heart",
    alias: ["heart", "love", "smiling"],
  },
  {
    emoji: "😄",
    name: "laugh",
    alias: ["giggle", "joy", "smiling"],
  },
];
