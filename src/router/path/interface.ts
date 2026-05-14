import type { Param } from "../params/param.ts";
import type { PathNode } from "./path-node.ts";

export type GetParamsFn = (pathNode: PathNode) => Param[];
