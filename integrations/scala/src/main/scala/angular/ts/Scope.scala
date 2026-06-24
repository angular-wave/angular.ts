package angular.ts

import scala.scalajs.js

type ListenerDeregister = () => Unit
type ListenerFn = js.Function2[js.UndefOr[js.Any], js.UndefOr[js.Object], Unit]

@js.native
trait ScopeEvent extends js.Object:
  val targetScope: js.Object = js.native
  val currentScope: js.Object | Null = js.native
  val name: String = js.native
  def stopPropagation(): Unit = js.native
  def preventDefault(): Unit = js.native
  val stopped: Boolean = js.native
  val defaultPrevented: Boolean = js.native

@js.native
trait Scope extends js.Object:
  def $watch(expression: String, listener: ListenerFn): ListenerDeregister =
    js.native
  def $on(name: String, listener: js.Function): ListenerDeregister = js.native
  def $destroy(): Unit = js.native
