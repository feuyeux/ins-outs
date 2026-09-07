import { Game } from "../shared/game";
import { decide } from "../shared/ai";
import type { Command } from "../shared/types";

let game = new Game();
let timer: ReturnType<typeof setTimeout> | undefined;
const publish = () => postMessage({ type: "state", state: game.snapshot(0) });
function schedule() {
  clearTimeout(timer);
  if (!game.active) return;
  const actor = game.actor;
  if (actor < 0) return;
  timer = setTimeout(
    () => {
      try {
        const view = game.snapshot(actor);
        const action = game.players[actor].bot
          ? decide(view)
          : {
              action: view.legal.includes("check")
                ? ("check" as const)
                : ("fold" as const),
            };
        game.act(
          actor,
          action.action,
          "amount" in action ? action.amount : undefined,
        );
        publish();
        schedule();
      } catch (error) {
        postMessage({ type: "error", error: String(error) });
      }
    },
    game.players[actor].bot
      ? (900 + Math.random() * 550) / game.speed
      : Math.max(0, game.deadline - Date.now()),
  );
}
onmessage = (event: MessageEvent<Command | { type: "init"; name: string }>) => {
  try {
    if (event.data.type === "init") {
      clearTimeout(timer);
      game = new Game(event.data.name);
    } else game.execute(0, event.data);
    publish();
    schedule();
  } catch (error) {
    postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
