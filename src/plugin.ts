import streamDeck from "@elgato/streamdeck";

import { StartTracking } from "./actions/start-tracking";
import { StopTracking } from "./actions/stop-tracking";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel("trace");

// Register the start tracking action.
streamDeck.actions.registerAction(new StartTracking());
streamDeck.actions.registerAction(new StopTracking());

// Finally, connect to the Stream Deck.
streamDeck.connect();
