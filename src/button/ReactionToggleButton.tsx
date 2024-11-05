/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import {
  Button as CpdButton,
  Tooltip,
  Separator,
  Search,
  Form,
} from "@vector-im/compound-web";
import {
  SearchIcon,
  CloseIcon,
  RaisedHandSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "matrix-js-sdk/src/logger";
import { EventType, RelationType } from "matrix-js-sdk/src/matrix";
import { MatrixClient } from "matrix-js-sdk/src/client";
import { MatrixRTCSession } from "matrix-js-sdk/src/matrixrtc/MatrixRTCSession";

import { useReactions } from "../useReactions";
import { useMatrixRTCSessionMemberships } from "../useMatrixRTCSessionMemberships";
import styles from "./ReactionToggleButton.module.css";
import {
  ReactionOption,
  ReactionSet,
  ElementCallReactionEventType,
} from "../reactions";
import classNames from "classnames";

interface InnerButtonProps extends ComponentPropsWithoutRef<"button"> {
  raised: boolean;
}

const InnerButton: FC<InnerButtonProps> = ({ raised, ...props }) => {
  const { t } = useTranslation();

  return (
    <Tooltip label={t("action.raise_hand_or_send_reaction")}>
      <CpdButton
        className={classNames(raised && styles.raisedButton)}
        kind={raised ? "primary" : "secondary"}
        iconOnly
        Icon={RaisedHandSolidIcon}
        {...props}
      />
    </Tooltip>
  );
};

export function ReactionPopupMenu({
  sendRelation,
  toggleRaisedHand,
  isHandRaised,
  canReact,
}: {
  sendRelation: (reaction: ReactionOption) => void;
  toggleRaisedHand: () => void;
  isHandRaised: boolean;
  canReact: boolean;
}): ReactNode {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const onSearch = useCallback<ChangeEventHandler<HTMLInputElement>>((ev) => {
    ev.preventDefault();
    setSearchText(ev.target.value.trim().toLocaleLowerCase());
  }, []);

  const filteredReactionSet = useMemo(
    () =>
      ReactionSet.filter(
        (reaction) =>
          !isSearching ||
          (!!searchText &&
            (reaction.name.startsWith(searchText) ||
              reaction.alias?.some((a) => a.startsWith(searchText)))),
      ).slice(0, 6),
    [searchText, isSearching],
  );

  return (
    <div className={styles.reactionPopupMenu}>
      <section className={styles.handRaiseSection}>
        <Tooltip label={t("common.raise_hand")}>
          <CpdButton
            kind={isHandRaised ? "primary" : "secondary"}
            className={styles.reactionButton}
            key="raise-hand"
            onClick={() => toggleRaisedHand()}
          >
            🖐️
          </CpdButton>
        </Tooltip>
      </section>
      <div className={styles.verticalSeperator} />
      <section>
        {isSearching ? (
          <>
            <Form.Root
              className={styles.searchForm}
              onSubmit={(e) => e.preventDefault()}
            >
              <Search
                value={searchText}
                name="reactionSearch"
                placeholder="Search reactions…"
                onChange={onSearch}
                autoFocus
              />
              <CpdButton
                Icon={CloseIcon}
                size="sm"
                kind="destructive"
                onClick={() => setIsSearching(false)}
              />
            </Form.Root>
            <Separator />
          </>
        ) : null}
        <menu>
          {filteredReactionSet.map((reaction) => (
            <li className={styles.reactionPopupMenuItem}>
              <Tooltip label={reaction.name}>
                <CpdButton
                  kind="secondary"
                  className={styles.reactionButton}
                  key={reaction.name}
                  disabled={!canReact}
                  onClick={() => sendRelation(reaction)}
                >
                  {reaction.emoji}
                </CpdButton>
              </Tooltip>
            </li>
          ))}
          {!isSearching ? (
            <li key="search" className={styles.reactionPopupMenuItem}>
              <Tooltip label="Search">
                <CpdButton
                  iconOnly
                  Icon={SearchIcon}
                  kind="tertiary"
                  onClick={() => setIsSearching(true)}
                />
              </Tooltip>
            </li>
          ) : null}
        </menu>
      </section>
    </div>
  );
}

interface ReactionToggleButtonProps {
  rtcSession: MatrixRTCSession;
  client: MatrixClient;
}

export function ReactionToggleButton({
  client,
  rtcSession,
}: ReactionToggleButtonProps): ReactNode {
  const { raisedHands, myReactionId, reactions } = useReactions();
  const [busy, setBusy] = useState(false);
  const userId = client.getUserId()!;
  const isHandRaised = !!raisedHands[userId];
  const memberships = useMatrixRTCSessionMemberships(rtcSession);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);

  const canReact = !reactions[userId];

  const sendRelation = useCallback(
    async (reaction: ReactionOption) => {
      const myMembership = memberships.find((m) => m.sender === userId);
      if (!myMembership?.eventId) {
        logger.error("Cannot find own membership event");
        return;
      }
      const parentEventId = myMembership.eventId;
      try {
        setBusy(true);
        await client.sendEvent(
          rtcSession.room.roomId,
          null,
          ElementCallReactionEventType,
          {
            "m.relates_to": {
              rel_type: RelationType.Reference,
              event_id: parentEventId,
            },
            emoji: reaction.emoji,
            name: reaction.name,
          },
          undefined,
        );
        // Do NOT close the menu after this.
      } catch (ex) {
        logger.error("Failed to send reaction", ex);
      } finally {
        setBusy(false);
      }
    },
    [memberships, client, userId, rtcSession],
  );

  const toggleRaisedHand = useCallback(() => {
    const raiseHand = async (): Promise<void> => {
      if (isHandRaised) {
        if (!myReactionId) {
          logger.warn(`Hand raised but no reaction event to redact!`);
          return;
        }
        try {
          setBusy(true);
          await client.redactEvent(rtcSession.room.roomId, myReactionId);
          logger.debug("Redacted raise hand event");
        } catch (ex) {
          logger.error("Failed to redact reaction event", myReactionId, ex);
        } finally {
          setBusy(false);
        }
      } else {
        const myMembership = memberships.find((m) => m.sender === userId);
        if (!myMembership?.eventId) {
          logger.error("Cannot find own membership event");
          return;
        }
        const parentEventId = myMembership.eventId;
        try {
          setBusy(true);
          const reaction = await client.sendEvent(
            rtcSession.room.roomId,
            EventType.Reaction,
            {
              "m.relates_to": {
                rel_type: RelationType.Annotation,
                event_id: parentEventId,
                key: "🖐️",
              },
            },
          );
          logger.debug("Sent raise hand event", reaction.event_id);
        } catch (ex) {
          logger.error("Failed to send reaction event", ex);
        } finally {
          setBusy(false);
          setShowReactionsMenu(false);
        }
      }
    };

    void raiseHand();
  }, [
    client,
    isHandRaised,
    memberships,
    myReactionId,
    rtcSession.room.roomId,
    userId,
  ]);

  return (
    <>
      <InnerButton
        disabled={busy}
        onClick={() => setShowReactionsMenu((show) => !show)}
        raised={isHandRaised || showReactionsMenu}
      />
      {showReactionsMenu && (
        <ReactionPopupMenu
          isHandRaised={isHandRaised}
          canReact={canReact}
          sendRelation={(reaction) => void sendRelation(reaction)}
          toggleRaisedHand={toggleRaisedHand}
        />
      )}
    </>
  );
}
