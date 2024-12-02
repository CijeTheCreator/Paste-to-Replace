/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import "./App.css";
import FileUpload from "./components/FileUpload";
import Seperator from "./components/Seperator";
import { Button } from "@/components/ui/button";
import { Shape } from "@penpot/plugin-types";

function App() {
  const url = new URL(window.location.href);
  const initialTheme = url.searchParams.get("theme");
  const [handling, setHandling] = useState(false);
  const [selection, setSelection] = useState<Shape | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [selectionInfo, setSelectionInfo] = useState<string | null>(null);
  const [replacingError, setReplacingError] = useState<string | null>(null);

  const [theme] = useState(initialTheme || null);
  /**
   * This handler retrieves the images from the clipboard as a blob and returns it in a callback.
   *
   * @param pasteEvent
   * @param callback
   */
  function retrieveImageFromClipboardAsBlob(
    pasteEvent: ClipboardEvent,
    callback: (blob: File | null | Blob | undefined) => void,
  ) {
    if (!pasteEvent.clipboardData)
      return console.log("Pulling out because the clipboard is empty");

    console.log("ClipbardData: ", pasteEvent.clipboardData);
    const items = pasteEvent.clipboardData.items;

    if (items == undefined) {
      if (typeof callback == "function") {
        callback(undefined);
      }
    }

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") == -1) continue;
      const blob = items[i].getAsFile();

      if (typeof callback == "function") {
        callback(blob);
      }
    }
  }

  window.addEventListener(
    "paste",
    function (e) {
      console.log("Paste event fired");
      retrieveImageFromClipboardAsBlob(
        e,
        async function (blob: Blob | File | null | undefined) {
          console.log("Blob: ", blob);
          if (blob) {
            await processBlob(blob);
          }
        },
      );
    },
    false,
  );

  window.addEventListener("message", (event) => {
    const message = event.data;
    if (!message) return console.log("No message sent");
    if (message.replacingError) {
      setHandling(false);
      setReplacingError(message.replacingError);
    }
    if (message.hasFinishedReplacing) {
      setHandling(false);
    }
    if (message.selection) {
      if (message.selection.error)
        return setSelectionError(message.selection.error);

      setSelectionError(null);
      setSelection(message.selection);
      console.log("Selection set \n");
      console.log(message.selection);
      setSelectionInfo(`Selected: ${message.selection.name}`);
    }
  });

  function pasteInPlace() {
    if (!selection) {
      setSelectionError("You have to select something first");
      return;
    }
    parent.postMessage(
      {
        message: "paste-selection",
        selection: selection,
      },
      "*",
    );
  }

  function copySelection() {
    parent.postMessage(
      {
        message: "copy-selection",
        purpose: "copy",
      },
      "*",
    );
  }

  return (
    <div
      data-theme={theme}
      className="flex flex-col gap-4 items-center py-4 dark"
    >
      <div className="flex flex-col gap-4 items-center w-full">
        <div className="flex flex-col gap-4 items-center">
          <div>
            <p className="text-center">
              Copy one element using Copy Selection and paste into multiple
              selections with Paste in Place, preserving size and alignment
            </p>
          </div>
          <div className="flex flex-col items-center w-full">
            {selectionInfo ? (
              <span className="text-primary">{selectionInfo}</span>
            ) : (
              ""
            )}
            {selectionError ? (
              <span className="text-destructive w-full text-center">
                {selectionError}
              </span>
            ) : (
              ""
            )}
            <div className="flex flex-row gap-4 items-center">
              <Button onClick={() => copySelection()}>Copy</Button>
              <Button onClick={() => pasteInPlace()}>Paste in Place</Button>
            </div>
          </div>
        </div>

        <Seperator />

        <div className="flex flex-col gap-4 items-center">
          <div>
            <p className="text-center">
              Easily replace elements by dragging or importing a picture. Drop
              it onto selected elements to paste in place, maintaining size and
              alignment
            </p>
          </div>
          <div className="flex flex-col items-center w-full">
            {replacingError ? (
              <span className="text-destructive w-full text-center">
                {replacingError}
              </span>
            ) : (
              ""
            )}
            <FileUpload
              handleChange={(file: File) => {
                setHandling(true);
                setReplacingError(null);
                processBlob(file);
              }}
              handling={handling}
            />
          </div>
        </div>
      </div>
    </div>
  );

  async function processBlob(blob: File | Blob) {
    const blobArrayBuffer = await blob.arrayBuffer();
    const uint8ArrayBuffer = new Uint8Array(blobArrayBuffer);

    parent.postMessage(
      {
        message: "paste-to-replace",
        file_uint: uint8ArrayBuffer,
        file_blob: blob,
      },
      "*",
    );
  }
}

export default App;
