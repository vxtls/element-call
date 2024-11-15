/*
Copyright 2022-2024 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only
Please see LICENSE in the repository root for full details.
*/

import { useMediaQuery } from "./useMediaQuery";

/**
 * @returns Whether the device is a touchscreen device.
 */
// Empirically, Chrome on Android can end up not matching (hover: none), but
// still matching (pointer: coarse) :/
export const useIsTouchscreen = (): boolean =>
  useMediaQuery("(hover: none) or (pointer: coarse)");
