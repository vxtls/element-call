/*
Copyright 2024 Milton Moura <miltonmoura@gmail.com>

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
} from "react";

interface ReactionsContextType {
  raisedHands: Record<string, Date>;
  addRaisedHand: (userId: string, date: Date) => void;
  removeRaisedHand: (userId: string) => void;
  supportsReactions: boolean;
  setSupportsReactions: React.Dispatch<React.SetStateAction<boolean>>;
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
}: {
  children: ReactNode;
}): JSX.Element => {
  const [raisedHands, setRaisedHands] = useState<Record<string, Date>>({});
  const [supportsReactions, setSupportsReactions] = useState<boolean>(true);

  const addRaisedHand = useCallback(
    (userId: string, time: Date) => {
      setRaisedHands({
        ...raisedHands,
        [userId]: time,
      });
    },
    [raisedHands],
  );

  const removeRaisedHand = useCallback(
    (userId: string) => {
      delete raisedHands[userId];
      setRaisedHands(raisedHands);
    },
    [raisedHands],
  );

  return (
    <ReactionsContext.Provider
      value={{
        raisedHands,
        addRaisedHand,
        removeRaisedHand,
        supportsReactions,
        setSupportsReactions,
      }}
    >
      {children}
    </ReactionsContext.Provider>
  );
};
