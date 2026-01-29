import { ScopeProxied } from "../../core/scope/interface.js";
import { NgModelController } from "../model/model.js";
export type NgModelControllerProxied = ScopeProxied<NgModelController>;
export type InputTypeHandler = (
  scope: ng.Scope,
  element: HTMLInputElement,
  attr: ng.Attributes,
  ctrl: NgModelControllerProxied,
  $parse: ng.ParseService,
) => void;
