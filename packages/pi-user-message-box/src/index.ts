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

  const install = () => {
    patchNativeUserMessagePrototype(getPrototype(), () => activeTheme, () => true);
  };

  install();

  pi.on("session_start", (_event, ctx) => {
    activeTheme = ctx.ui.theme as unknown as UserMessageTheme;
    install();
  });

  pi.on("session_shutdown", () => {
    unregisterUserMessageRenderPrototypePatch(getPrototype());
    activeTheme = undefined;
  });
}
