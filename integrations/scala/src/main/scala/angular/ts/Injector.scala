package angular.ts

final class Injector private[ts] (private val raw: RuntimeInjector):
  def get[A](token: Token[A]): A =
    raw.get(token.name).asInstanceOf[A]

object Injector:
  private[ts] def apply(raw: RuntimeInjector): Injector = new Injector(raw)
