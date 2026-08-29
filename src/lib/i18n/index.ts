import { en } from "./en";
import { ne } from "./ne";

export const dictionaries = { en, ne };
export type Locale = keyof typeof dictionaries;
