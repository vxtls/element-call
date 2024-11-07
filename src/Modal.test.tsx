/*
Copyright 2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { afterAll, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { act, ReactNode, useState } from "react";

import { Modal } from "./Modal";

test("that nothing is rendered when the modal is closed", () => {
  const { queryByRole } = render(
    <Modal title="My modal" open={false}>
      <p>This is the content.</p>
    </Modal>,
  );
  expect(queryByRole("dialog")).toBeNull();
});

test("the content is rendered when the modal is open", () => {
  const { queryByRole } = render(
    <Modal title="My modal" open={true}>
      <p>This is the content.</p>
    </Modal>,
  );
  expect(queryByRole("dialog")).toMatchSnapshot();
});

test("the modal can be closed by clicking the close button", () => {
  function ModalFn(): ReactNode {
    const [isOpen, setOpen] = useState(true);
    return (
      <Modal title="My modal" open={isOpen} onDismiss={() => setOpen(false)}>
        <p>This is the content.</p>
      </Modal>
    );
  }
  const { queryByRole, getByLabelText } = render(<ModalFn />);
  act(() => {
    getByLabelText("action.close").click();
  });
  expect(queryByRole("dialog")).toBeNull();
});

const originalMatchMedia = window.matchMedia;

afterAll(() => {
  window.matchMedia = originalMatchMedia;
});

test("the modal renders as a drawer in mobile viewports", () => {
  window.matchMedia = function (query): MediaQueryList {
    return {
      matches: query.includes("hover: none"),
      addEventListener(): MediaQueryList {
        return this as MediaQueryList;
      },
      removeEventListener(): MediaQueryList {
        return this as MediaQueryList;
      },
    } as unknown as MediaQueryList;
  };

  const { queryByRole } = render(
    <Modal title="My modal" open={true}>
      <p>This is the content.</p>
    </Modal>,
  );
  expect(queryByRole("dialog")).toMatchSnapshot();
});
