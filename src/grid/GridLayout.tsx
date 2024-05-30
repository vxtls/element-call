/*
Copyright 2024 New Vector Ltd

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { CSSProperties, forwardRef, useCallback, useMemo } from "react";
import { distinctUntilChanged } from "rxjs";
import { useObservableEagerState } from "observable-hooks";

import { GridLayout as GridLayoutModel } from "../state/CallViewModel";
import styles from "./GridLayout.module.css";
import { useReactiveState } from "../useReactiveState";
import { useInitial } from "../useInitial";
import { CallLayout, GridTileModel, TileModel } from "./CallLayout";
import { DragCallback } from "./Grid";

interface GridCSSProperties extends CSSProperties {
  "--gap": string;
  "--width": string;
  "--height": string;
}

const slotMinHeight = 130;
const slotMaxAspectRatio = 17 / 9;
const slotMinAspectRatio = 4 / 3;

export const makeGridLayout: CallLayout<GridLayoutModel> = ({
  minBounds,
  floatingAlignment,
}) => ({
  // The "fixed" (non-scrolling) part of the layout is where the spotlight tile
  // lives
  fixed: forwardRef(function GridLayoutFixed({ model, Slot }, ref) {
    const { width, height } = useObservableEagerState(minBounds);
    const alignment = useObservableEagerState(
      useInitial(() =>
        floatingAlignment.pipe(
          distinctUntilChanged(
            (a1, a2) => a1.block === a2.block && a1.inline === a2.inline,
          ),
        ),
      ),
    );
    const tileModel: TileModel | undefined = useMemo(
      () =>
        model.spotlight && {
          type: "spotlight",
          vms: model.spotlight,
          maximised: false,
        },
      [model.spotlight],
    );
    const [generation] = useReactiveState<number>(
      (prev) => (prev === undefined ? 0 : prev + 1),
      [model.spotlight === undefined, width, height, alignment],
    );

    const onDragSpotlight: DragCallback = useCallback(
      ({ xRatio, yRatio }) =>
        floatingAlignment.next({
          block: yRatio < 0.5 ? "start" : "end",
          inline: xRatio < 0.5 ? "start" : "end",
        }),
      [],
    );

    return (
      <div
        ref={ref}
        className={styles.fixed}
        data-generation={generation}
        style={{ height }}
      >
        {tileModel && (
          <Slot
            className={styles.slot}
            id="spotlight"
            model={tileModel}
            onDrag={onDragSpotlight}
            data-block-alignment={alignment.block}
            data-inline-alignment={alignment.inline}
          />
        )}
      </div>
    );
  }),

  // The scrolling part of the layout is where all the grid tiles live
  scrolling: forwardRef(function GridLayout({ model, Slot }, ref) {
    const { width, height: minHeight } = useObservableEagerState(minBounds);

    // The goal here is to determine the grid size and padding that maximizes
    // use of screen space for n tiles without making those tiles too small or
    // too cropped (having an extreme aspect ratio)
    const [gap, slotWidth, slotHeight] = useMemo(() => {
      const gap = width < 800 ? 16 : 20;
      const slotMinWidth = width < 500 ? 150 : 180;

      let columns = Math.min(
        // Don't create more columns than we have items for
        model.grid.length,
        // The ideal number of columns is given by a packing of equally-sized
        // squares into a grid.
        // width / column = height / row.
        // columns * rows = number of squares.
        // ∴ columns = sqrt(width / height * number of squares).
        // Except we actually want 16:9-ish slots rather than squares, so we
        // divide the width-to-height ratio by the target aspect ratio.
        Math.ceil(
          Math.sqrt(
            (width / minHeight / slotMaxAspectRatio) * model.grid.length,
          ),
        ),
      );
      let rows = Math.ceil(model.grid.length / columns);

      let slotWidth = (width - (columns - 1) * gap) / columns;
      let slotHeight = (minHeight - (rows - 1) * gap) / rows;

      // Impose a minimum width and height on the slots
      if (slotWidth < slotMinWidth) {
        // In this case we want the slot width to determine the number of columns,
        // not the other way around. If we take the above equation for the slot
        // width (w = (W - (c - 1) * g) / c) and solve for c, we get
        // c = (W + g) / (w + g).
        columns = Math.floor((width + gap) / (slotMinWidth + gap));
        rows = Math.ceil(model.grid.length / columns);
        slotWidth = (width - (columns - 1) * gap) / columns;
        slotHeight = (minHeight - (rows - 1) * gap) / rows;
      }
      if (slotHeight < slotMinHeight) slotHeight = slotMinHeight;
      // Impose a minimum and maximum aspect ratio on the slots
      const slotAspectRatio = slotWidth / slotHeight;
      if (slotAspectRatio > slotMaxAspectRatio)
        slotWidth = slotHeight * slotMaxAspectRatio;
      else if (slotAspectRatio < slotMinAspectRatio)
        slotHeight = slotWidth / slotMinAspectRatio;
      // TODO: We might now be hitting the minimum height or width limit again

      return [gap, slotWidth, slotHeight];
    }, [width, minHeight, model.grid.length]);

    const [generation] = useReactiveState<number>(
      (prev) => (prev === undefined ? 0 : prev + 1),
      [model.grid, width, minHeight],
    );

    const tileModels: GridTileModel[] = useMemo(
      () => model.grid.map((vm) => ({ type: "grid", vm })),
      [model.grid],
    );

    return (
      <div
        ref={ref}
        data-generation={generation}
        className={styles.scrolling}
        style={
          {
            width,
            "--gap": `${gap}px`,
            "--width": `${Math.floor(slotWidth)}px`,
            "--height": `${Math.floor(slotHeight)}px`,
          } as GridCSSProperties
        }
      >
        {tileModels.map((m) => (
          <Slot key={m.vm.id} className={styles.slot} id={m.vm.id} model={m} />
        ))}
      </div>
    );
  }),
});
