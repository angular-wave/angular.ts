import { Param } from "../params/param.ts";
import { PathNode } from "./path-node.ts";

export type GetParamsFn = (pathNode: PathNode) => Param[];
