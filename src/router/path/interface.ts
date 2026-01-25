import { Param } from "../params/param.js";
import { PathNode } from "./path-node.js";

export type GetParamsFn = (pathNode: PathNode) => Param[];
