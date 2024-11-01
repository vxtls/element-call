import dogSoundOgg from "../sound/reactions/dog.ogg?url";
import dogSoundMp3 from "../sound/reactions/dog.mp3?url";
import { RelationType } from "matrix-js-sdk/src/types";

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
};

export const ReactionSet: ReactionOption[] = [
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
    emoji: "👍",
    name: "thumbsup",
    alias: ["+1", "yes", "thumbs up"],
  },
  {
    emoji: "👎",
    name: "thumbsdown",
    alias: ["-1", "no", "thumbs no"],
  },
  {
    emoji: "🎉",
    name: "party",
    alias: ["hurray", "success"],
  },
  {
    emoji: "🦗",
    name: "crickets",
    alias: ["awkward", "silence"],
  },
  {
    emoji: "🐱",
    name: "cat",
    alias: ["meow", "kitty"],
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
];
