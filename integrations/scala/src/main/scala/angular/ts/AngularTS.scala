package angular.ts

import org.scalajs.dom
import scala.scalajs.js
import scala.scalajs.js.JSConverters.*

object AngularTS:
  def module(name: String, requires: Seq[String] = Seq.empty): NgModule =
    val raw = RuntimeAngular.module(name, requires.toJSArray)

    NgModule(raw)

  def existingModule(name: String): NgModule =
    NgModule(RuntimeAngular.module(name))

  def bootstrap(
      element: dom.Element,
      modules: Seq[String],
  ): Injector =
    Injector(RuntimeAngular.bootstrap(element, modules.toJSArray))

  def token[A](name: String): Token[A] = Token(name)

  def defineWorkflow[
      TData <: js.Object,
      TCommands <: js.Object,
  ](
      config: WorkflowConfig[TData, TCommands],
  ): WorkflowConfig[TData, TCommands] = config

  def inject0[A](factory: () => A): InjectableFactory[A] =
    InjectableFactory(Nil, () => factory().asInstanceOf[js.Any])

  def inject1[A, R](tokenA: Token[A])(factory: A => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(tokenA.name),
      (a: js.Any) => factory(a.asInstanceOf[A]).asInstanceOf[js.Any],
    )

  def inject2[A, B, R](
      tokenA: Token[A],
      tokenB: Token[B],
  )(factory: (A, B) => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(tokenA.name, tokenB.name),
      (a: js.Any, b: js.Any) =>
        factory(a.asInstanceOf[A], b.asInstanceOf[B]).asInstanceOf[js.Any],
    )

  def inject3[A, B, C, R](
      tokenA: Token[A],
      tokenB: Token[B],
      tokenC: Token[C],
  )(factory: (A, B, C) => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(tokenA.name, tokenB.name, tokenC.name),
      (a: js.Any, b: js.Any, c: js.Any) =>
        factory(
          a.asInstanceOf[A],
          b.asInstanceOf[B],
          c.asInstanceOf[C],
        ).asInstanceOf[js.Any],
    )

  def inject4[A, B, C, D, R](
      tokenA: Token[A],
      tokenB: Token[B],
      tokenC: Token[C],
      tokenD: Token[D],
  )(factory: (A, B, C, D) => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(tokenA.name, tokenB.name, tokenC.name, tokenD.name),
      (a: js.Any, b: js.Any, c: js.Any, d: js.Any) =>
        factory(
          a.asInstanceOf[A],
          b.asInstanceOf[B],
          c.asInstanceOf[C],
          d.asInstanceOf[D],
        ).asInstanceOf[js.Any],
    )

  def inject5[A, B, C, D, E, R](
      tokenA: Token[A],
      tokenB: Token[B],
      tokenC: Token[C],
      tokenD: Token[D],
      tokenE: Token[E],
  )(factory: (A, B, C, D, E) => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(tokenA.name, tokenB.name, tokenC.name, tokenD.name, tokenE.name),
      (a: js.Any, b: js.Any, c: js.Any, d: js.Any, e: js.Any) =>
        factory(
          a.asInstanceOf[A],
          b.asInstanceOf[B],
          c.asInstanceOf[C],
          d.asInstanceOf[D],
          e.asInstanceOf[E],
        ).asInstanceOf[js.Any],
    )

  def inject6[A, B, C, D, E, F, R](
      tokenA: Token[A],
      tokenB: Token[B],
      tokenC: Token[C],
      tokenD: Token[D],
      tokenE: Token[E],
      tokenF: Token[F],
  )(factory: (A, B, C, D, E, F) => R): InjectableFactory[R] =
    InjectableFactory(
      Seq(
        tokenA.name,
        tokenB.name,
        tokenC.name,
        tokenD.name,
        tokenE.name,
        tokenF.name,
      ),
      (a: js.Any, b: js.Any, c: js.Any, d: js.Any, e: js.Any, f: js.Any) =>
        factory(
          a.asInstanceOf[A],
          b.asInstanceOf[B],
          c.asInstanceOf[C],
          d.asInstanceOf[D],
          e.asInstanceOf[E],
          f.asInstanceOf[F],
        ).asInstanceOf[js.Any],
    )
