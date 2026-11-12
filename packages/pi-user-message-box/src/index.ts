import {
  type ExtensionAPI,
  UserMessageComponent,
} from "@earendil-works/pi-coding-agent";
import {
  patchNativeUserMessagePrototype,
  type PatchableUserMessagePrototype,
  type UserMessageTheme,
} from "./renderer.js";
import { unregisterUserMessageRenderPrototypePatch } from "./patch.js";

function getPrototype(): PatchableUserMessagePrototype {
  return UserMessageComponent.prototype as unknown as PatchableUserMessagePrototype;
}

export default function userMessageBox(pi: ExtensionAPI): void {
  let activeTheme: UserMessageTheme | undefined;
  let installed = false;

  const install = () => {
    patchNativeUserMessagePrototype(getPrototype(), () => activeTheme, () => true);
  };

  pi.on("session_start", (_event, ctx) => {
    if (ctx.mode !== "tui") return;
    activeTheme = ctx.ui.theme as unknown as UserMessageTheme;
    install();
    installed = true;
  });

  pi.on("session_shutdown", () => {
    if (installed) unregisterUserMessageRenderPrototypePatch(getPrototype());
    installed = false;
    activeTheme = undefined;
  });
}
