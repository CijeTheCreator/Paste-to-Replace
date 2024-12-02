/* eslint-disable @typescript-eslint/no-unused-vars */
import { Board, Group, ImageData, Shape } from "@penpot/plugin-types";
import type { PluginMessageEvent } from "./model";

penpot.ui.open("Paste to Replace", `?theme=${penpot.theme},`, {
  width: 320,
  height: 630,
});

penpot.on("themechange", (theme) => {
  sendMessage({ type: "theme", content: theme });
});

function getCurrentSelectionDetails(selection: Shape) {
  return {
    x: selection.x,
    y: selection.y,
    width: selection.width,
    height: selection.height,
    parent: selection.parent,
    selection: selection,
  };
}

function sendMessage(message: PluginMessageEvent) {
  penpot.ui.sendMessage(message);
}
type TCopySelection = {
  message: string;
  selection: Shape;
};
type TPasteSelection = {
  message: string;
  selection: Shape;
};
type TCopyToReplace = {
  message: string;
  file_uint: Uint8Array;
  file_blob: Blob;
};
function isCopySelection(message: unknown): message is TCopySelection {
  return (
    typeof message === "object" && message !== null && "purpose" in message
  );
}
function isPasteSelection(message: unknown): message is TPasteSelection {
  return (
    typeof message === "object" && message !== null && "selection" in message
  );
}
function isCopyToReplace(message: unknown): message is TCopyToReplace {
  return (
    typeof message === "object" &&
    message !== null &&
    "file_uint" in message &&
    "file_blob" in message
  );
}
penpot.ui.onMessage<TCopyToReplace | string | TPasteSelection>(
  async (message) => {
    console.log("message sent");
    if (isCopyToReplace(message) && message.message === "paste-to-replace") {
      console.log("paste-to-replace received");
      const imageData = await penpot.uploadMediaData(
        "Pasted Image",
        message.file_uint,
        message.file_blob.type,
      );

      processSelection((selectionDetails) => {
        applyNewComponent(selectionDetails, imageData);
      });

      penpot.ui.sendMessage({
        hasFinishedReplacing: true,
      });
    }

    if (isCopySelection(message)) {
      console.log("copy selection hit");
      const selections = penpot.selection;
      if (selections.length == 0) {
        return penpot.ui.sendMessage({
          selection: {
            error: "Select an object first",
          },
        });
      }
      if (selections.length > 1) {
        return penpot.ui.sendMessage({
          selection: {
            error: "Select a single object",
          },
        });
      }

      const selection = selections[0];
      penpot.ui.sendMessage({
        selection: selection,
      });
    }

    if (isPasteSelection(message)) {
      processSelection((selectionDetails) => {
        applyNewShape(selectionDetails, message.selection);
      });
    }
  },
);

function processSelection(
  onFinsihedProcessing: (selectionDetails: {
    x: number;
    y: number;
    width: number;
    height: number;
    parent: Shape | null;
    selection: Shape;
  }) => void,
) {
  const selections = penpot.selection;
  if (selections.length == 0) {
    return penpot.ui.sendMessage({
      replacingError: "Select one or more objects first",
    });
  }

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    const selectionDetails = getCurrentSelectionDetails(selection);
    onFinsihedProcessing(selectionDetails);
    selection.remove();
  }
}

function applyNewShape(
  {
    x,
    y,
    width,
    height,
    parent,
    selection,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    parent: Shape | null;
    selection: Shape;
  },
  shape_og: Shape,
) {
  const shape_old = penpot.currentPage?.getShapeById(shape_og.id);
  if (!shape_old) return console.log("No shape with that id");
  const newShape = shape_old.clone();
  newShape.resize(width, height);
  newShape.x = x;
  newShape.y = y;

  placeNewElementInParent(parent, selection, newShape);
}

function placeNewElementInParent(
  parent: Shape | null,
  shape_old: Shape,
  newShape: Shape,
) {
  if (parent) {
    console.log("Hit parent");
    const parentAsContainer = parent as Group | Board;
    const oldShapeIndex = parentAsContainer.children.findIndex((shape) => {
      return shape.id == shape_old.id;
    });
    console.log("Parent: ", oldShapeIndex, " is old shape index");
    console.log("Parents children are: \n");
    console.log(parentAsContainer.children.map((child) => child.name));
    console.log("Current selection is: ", shape_old.name);
    if (oldShapeIndex == -1) {
      return;
    }

    console.log("About to insert");
    parentAsContainer.insertChild(oldShapeIndex, newShape);
  }
}

function applyNewComponent(
  {
    x,
    y,
    width,
    height,
    parent,
    selection,
  }: {
    x: number;
    y: number;
    width: number;
    height: number;
    parent: Shape | null;
    selection: Shape;
  },
  imageData: ImageData,
) {
  const board = penpot.createBoard();
  const flex = board.addFlexLayout();
  board.x = x;
  board.y = y;
  board.horizontalSizing = "auto";
  board.verticalSizing = "auto";
  flex.horizontalSizing = "fill";
  flex.verticalSizing = "fill";

  const shape = penpot.createRectangle();
  board.appendChild(shape);
  shape.resize(width, height);
  shape.fills = [{ fillOpacity: 1, fillImage: imageData }];
  placeNewElementInParent(parent, selection, board);
}
