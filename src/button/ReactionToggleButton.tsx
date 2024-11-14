/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import {
  Button as CpdButton,
  Tooltip,
  Search,
  Form,
  Alert,
} from "@vector-im/compound-web";
import {
  SearchIcon,
  CloseIcon,
  RaisedHandSolidIcon,
  ReactionIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";
import {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  FC,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "matrix-js-sdk/src/logger";
import classNames from "classnames";

import { useReactions } from "../useReactions";
import styles from "./ReactionToggleButton.module.css";
import { ReactionOption, ReactionSet, ReactionsRowSize } from "../reactions";
import { Modal } from "../Modal";

interface InnerButtonProps extends ComponentPropsWithoutRef<"button"> {
  raised: boolean;
  open: boolean;
}

const InnerButton: FC<InnerButtonProps> = ({ raised, open, ...props }) => {
  const { t } = useTranslation();

  return (
    <Tooltip
      label={t("action.raise_hand_or_send_reaction", { keyboardShortcut: "H" })}
    >
      <CpdButton
        className={classNames(raised && styles.raisedButton)}
        aria-expanded={open}
        aria-haspopup
        aria-keyshortcuts="H"
        aria-label={t("action.raise_hand_or_send_reaction", {
          keyboardShortcut: "H",
        })}
        kind={raised || open ? "primary" : "secondary"}
        iconOnly
        Icon={raised ? RaisedHandSolidIcon : ReactionIcon}
        {...props}
      />
    </Tooltip>
  );
};

export function ReactionPopupMenu({
  sendReaction,
  toggleRaisedHand,
  isHandRaised,
  canReact,
  errorText,
}: {
  sendReaction: (reaction: ReactionOption) => void;
  toggleRaisedHand: () => void;
  errorText?: string;
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
      ).slice(0, ReactionsRowSize),
    [searchText, isSearching],
  );

  const onSearchKeyDown = useCallback<KeyboardEventHandler<never>>(
    (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        if (!canReact) {
          return;
        }
        if (filteredReactionSet.length !== 1) {
          return;
        }
        sendReaction(filteredReactionSet[0]);
        setIsSearching(false);
      } else if (ev.key === "Escape") {
        ev.preventDefault();
        setIsSearching(false);
      }
    },
    [sendReaction, filteredReactionSet, canReact, setIsSearching],
  );
  const label = isHandRaised ? t("action.lower_hand") : t("action.raise_hand");
  return (
    <>
      {errorText && (
        <Alert
          className={styles.alert}
          type="critical"
          title={t("common.something_went_wrong")}
        >
          {errorText}
        </Alert>
      )}
      <div className={styles.reactionPopupMenu}>
        <section className={styles.handRaiseSection}>
          <Tooltip label={label}>
            <CpdButton
              kind={isHandRaised ? "primary" : "secondary"}
              aria-pressed={isHandRaised}
              aria-label={label}
              onClick={() => toggleRaisedHand()}
              iconOnly
              Icon={RaisedHandSolidIcon}
            />
          </Tooltip>
        </section>
        <div className={styles.verticalSeperator} />
        <section>
          {isSearching ? (
            <>
              <Form.Root className={styles.searchForm}>
                <Search
                  required
                  value={searchText}
                  name="reactionSearch"
                  placeholder={t("reaction_search")}
                  onChange={onSearch}
                  onKeyDown={onSearchKeyDown}
                  // This is a reasonable use of autofocus, we are focusing when
                  // the search button is clicked (which matches the Element Web reaction picker)
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                />
                <CpdButton
                  Icon={CloseIcon}
                  aria-label={t("action.close_search")}
                  size="sm"
                  kind="destructive"
                  onClick={() => setIsSearching(false)}
                />
              </Form.Root>
            </>
          ) : null}
          <menu className={styles.reactionsMenu}>
            {filteredReactionSet.map((reaction, index) => (
              <li className={styles.reactionPopupMenuItem} key={reaction.name}>
                {/* Show the keyboard key assigned to the reaction */}
                <Tooltip
                  label={
                    index < ReactionsRowSize
                      ? reaction.name
                      : `${reaction.name} (${index + 1})`
                  }
                  aria-keyshortcuts={
                    index < ReactionsRowSize
                      ? (index + 1).toString()
                      : undefined
                  }
                >
                  <CpdButton
                    kind="secondary"
                    className={styles.reactionButton}
                    disabled={!canReact}
                    onClick={() => sendReaction(reaction)}
                  >
                    {reaction.emoji}
                  </CpdButton>
                </Tooltip>
              </li>
            ))}
          </menu>
        </section>
        {!isSearching ? (
          <section style={{ marginLeft: "var(--cpd-separator-spacing)" }}>
            <li key="search" className={styles.reactionPopupMenuItem}>
              <Tooltip label={t("common.search")}>
                <CpdButton
                  iconOnly
                  aria-label={t("action.open_search")}
                  Icon={SearchIcon}
                  kind="tertiary"
                  onClick={() => setIsSearching(true)}
                />
              </Tooltip>
            </li>
          </section>
        ) : null}
      </div>
    </>
  );
}

interface ReactionToggleButtonProps extends ComponentPropsWithoutRef<"button"> {
  userId: string;
}

export function ReactionToggleButton({
  userId,
  ...props
}: ReactionToggleButtonProps): ReactNode {
  const { t } = useTranslation();
  const { raisedHands, toggleRaisedHand, sendReaction, reactions } =
    useReactions();
  const [busy, setBusy] = useState(false);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [errorText, setErrorText] = useState<string>();

  const isHandRaised = !!raisedHands[userId];
  const canReact = !reactions[userId];

  useEffect(() => {
    // Clear whenever the reactions menu state changes.
    setErrorText(undefined);
  }, [showReactionsMenu]);

  const sendRelation = useCallback(
    async (reaction: ReactionOption) => {
      try {
        setBusy(true);
        await sendReaction(reaction);
        setErrorText(undefined);
        setShowReactionsMenu(false);
      } catch (ex) {
        setErrorText(ex instanceof Error ? ex.message : "Unknown error");
        logger.error("Failed to send reaction", ex);
      } finally {
        setBusy(false);
      }
    },
    [sendReaction],
  );

  const wrappedToggleRaisedHand = useCallback(() => {
    const toggleHand = async (): Promise<void> => {
      try {
        setBusy(true);
        await toggleRaisedHand();
        setShowReactionsMenu(false);
      } catch (ex) {
        setErrorText(ex instanceof Error ? ex.message : "Unknown error");
        logger.error("Failed to raise/lower hand", ex);
      } finally {
        setBusy(false);
      }
    };

    void toggleHand();
  }, [toggleRaisedHand]);

  return (
    <>
      <InnerButton
        disabled={busy}
        onClick={() => setShowReactionsMenu((show) => !show)}
        raised={isHandRaised}
        open={showReactionsMenu}
        {...props}
      />
      <Modal
        open={showReactionsMenu}
        title={t("action.pick_reaction")}
        hideHeader
        classNameModal={styles.reactionPopupMenuModal}
        onDismiss={() => setShowReactionsMenu(false)}
      >
        <ReactionPopupMenu
          errorText={errorText}
          isHandRaised={isHandRaised}
          canReact={canReact}
          sendReaction={(reaction) => void sendRelation(reaction)}
          toggleRaisedHand={wrappedToggleRaisedHand}
        />
      </Modal>
    </>
  );
}
